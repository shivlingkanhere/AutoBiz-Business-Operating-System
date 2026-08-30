import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions/completions";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  businessesTable,
  categoriesTable,
  customersTable,
  expensesTable,
  productsTable,
  saleItemsTable,
  salesTable,
  suppliersTable,
} from "@workspace/db";
import {
  CreateCategoryBody,
  CreateCustomerBody,
  CreateProductBody,
  CreateSaleBody,
  GetCustomersQueryParams,
  GetProductsQueryParams,
  GetSalesQueryParams,
  GetSalesReportQueryParams,
  SendAssistantMessageBody,
  UpdateBusinessBody,
  UpdateCustomerBody,
  UpdateCustomerParams,
  UpdateProductBody,
  UpdateProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const demoBusinessId = "00000000-0000-0000-0000-000000000001";

type BusinessRequest = Request & { businessId?: string };
type ConversationMessage = Extract<ChatCompletionMessageParam, { role: "user" | "assistant" }>;
type ConversationState = {
  businessId: string;
  messages: ConversationMessage[];
  updatedAt: number;
};

const conversations = new Map<string, ConversationState>();
const conversationTtlMs = 1000 * 60 * 60 * 4;
const maxConversationMessages = 20;

const faqKnowledge = [
  {
    id: "return-policy-availability",
    keywords: ["return policy", "returns", "refund", "exchange"],
    answer: "No return or refund policy is configured in this AutoBiz workspace.",
  },
  {
    id: "assistant-scope",
    keywords: ["what can you do", "what do you know", "help me", "capabilities"],
    answer: "AutoBiz can explain the connected business data and help with general business planning, sales, marketing, inventory, and operational decisions.",
  },
];

const money = (value: string | number | null | undefined) => Number(value ?? 0);
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

function getRelevantFaqs(message: string) {
  const normalized = message.toLowerCase();
  return faqKnowledge.filter((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
}

function getConversation(businessId: string, conversationId: string) {
  const key = `${businessId}:${conversationId}`;
  const existing = conversations.get(key);
  if (existing && Date.now() - existing.updatedAt < conversationTtlMs) return { key, state: existing };
  const state: ConversationState = { businessId, messages: [], updatedAt: Date.now() };
  conversations.set(key, state);
  if (conversations.size > 200) {
    const oldest = [...conversations.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
    if (oldest) conversations.delete(oldest[0]);
  }
  return { key, state };
}

async function getBusinessId(req: Request): Promise<string> {
  const { userId } = getAuth(req);
  if (userId) {
    const [existing] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.ownerUserId, userId))
      .limit(1);
    if (existing) return existing.id;
    const [created] = await db
      .insert(businessesTable)
      .values({ ownerUserId: userId, name: "My Business", type: "General Business", city: "Pune" })
      .returning({ id: businessesTable.id });
    return created.id;
  }
  if (process.env.NODE_ENV === "development") {
    const [existing] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.id, demoBusinessId))
      .limit(1);
    if (!existing) {
      await db.insert(businessesTable).values({
        id: demoBusinessId,
        name: "Aarav Hardware",
        type: "Furniture Hardware",
        city: "Pune",
        currency: "INR",
      });
    }
    return demoBusinessId;
  }
  throw new Error("Unauthorized");
}

async function ensureDemoData(businessId: string) {
  const [productCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productsTable)
    .where(eq(productsTable.businessId, businessId));
  if (Number(productCount?.count ?? 0) > 0) return;

  const [category] = await db
    .insert(categoriesTable)
    .values({ businessId, name: "Door Hardware", color: "#1e7a68" })
    .returning({ id: categoriesTable.id });
  await db.insert(categoriesTable).values([
    { businessId, name: "Fasteners", color: "#c77b30" },
    { businessId, name: "Electrical", color: "#6574cd" },
  ]);
  const products = await db
    .insert(productsTable)
    .values([
      { businessId, name: "Soft Close Hinge 110°", sku: "HNG-110-SC", category: "Door Hardware", brand: "Hettich", unit: "pcs", purchasePrice: "96", sellingPrice: "145", currentStock: 42, minimumStock: 30 },
      { businessId, name: "Cabinet Handle 96mm", sku: "HDL-096-BR", category: "Door Hardware", brand: "Dorset", unit: "pcs", purchasePrice: "62", sellingPrice: "98", currentStock: 18, minimumStock: 25 },
      { businessId, name: "Wall Plug 8mm", sku: "FST-008-WP", category: "Fasteners", brand: "Fischer", unit: "box", purchasePrice: "210", sellingPrice: "295", currentStock: 9, minimumStock: 12 },
      { businessId, name: "Modular Switch 6A", sku: "ELC-006-MS", category: "Electrical", brand: "Anchor", unit: "pcs", purchasePrice: "38", sellingPrice: "65", currentStock: 78, minimumStock: 30 },
      { businessId, name: "Magnetic Door Catch", sku: "HNG-MAG-01", category: "Door Hardware", brand: "Ebco", unit: "pcs", purchasePrice: "22", sellingPrice: "42", currentStock: 6, minimumStock: 15 },
    ])
    .returning({ id: productsTable.id });
  const [ram] = await db.insert(customersTable).values({ businessId, name: "Ram Interiors", phone: "+91 98765 43210", email: "ram@interiors.example", city: "Pune", totalPurchases: "84600", outstanding: "15000", lastPurchaseAt: new Date(Date.now() - 86400000 * 2) }).returning({ id: customersTable.id });
  await db.insert(customersTable).values([
    { businessId, name: "Meera Kitchens", phone: "+91 98220 11882", email: "meera@kitchens.example", city: "Pimpri", totalPurchases: "52300", outstanding: "0", lastPurchaseAt: new Date(Date.now() - 86400000 * 4) },
    { businessId, name: "Joshi Contractors", phone: "+91 97633 40120", email: "accounts@joshibuilders.example", city: "Pune", totalPurchases: "129400", outstanding: "24800", lastPurchaseAt: new Date(Date.now() - 86400000 * 6) },
  ]);
  await db.insert(suppliersTable).values([
    { businessId, name: "Hettich India", phone: "+91 1800 123 456", city: "Mumbai", payable: "32400", lastOrderAt: new Date(Date.now() - 86400000 * 3) },
    { businessId, name: "Dorset Industries", phone: "+91 98201 11220", city: "Pune", payable: "18500", lastOrderAt: new Date(Date.now() - 86400000 * 8) },
  ]);
  const sale = await db.insert(salesTable).values({ businessId, invoiceNumber: "INV-1042", customerId: ram.id, total: "18450", paymentStatus: "paid", itemCount: 12, createdAt: new Date(Date.now() - 86400000) }).returning({ id: salesTable.id });
  await db.insert(saleItemsTable).values({ businessId, saleId: sale[0].id, productId: products[0].id, quantity: 12, unitPrice: "145" });
  await db.insert(expensesTable).values([
    { businessId, title: "Courier & delivery", amount: "1840", createdAt: new Date(Date.now() - 86400000 * 2) },
    { businessId, title: "Shop utilities", amount: "6400", createdAt: new Date(Date.now() - 86400000 * 6) },
  ]);
}

async function businessContext(req: BusinessRequest): Promise<string> {
  const businessId = await getBusinessId(req);
  await ensureDemoData(businessId);
  req.businessId = businessId;
  return businessId;
}

function productResponse(product: typeof productsTable.$inferSelect) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    unit: product.unit,
    purchasePrice: money(product.purchasePrice),
    sellingPrice: money(product.sellingPrice),
    currentStock: product.currentStock,
    minimumStock: product.minimumStock,
    status: product.status as "active" | "inactive",
    updatedAt: product.updatedAt.toISOString(),
  };
}

router.get("/business", async (req, res): Promise<void> => {
  const id = await businessContext(req);
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
  res.json({ id: business.id, name: business.name, type: business.type, city: business.city, currency: business.currency });
});

router.patch("/business", async (req, res): Promise<void> => {
  const id = await businessContext(req);
  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [business] = await db.update(businessesTable).set(parsed.data).where(eq(businessesTable.id, id)).returning();
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }
  res.json({ id: business.id, name: business.name, type: business.type, city: business.city, currency: business.currency });
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
  const products = await db.select().from(productsTable).where(eq(productsTable.businessId, businessId));
  const sales = await db.select().from(salesTable).where(eq(salesTable.businessId, businessId)).orderBy(desc(salesTable.createdAt));
  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.businessId, businessId));
  const revenue = sales.reduce((sum, sale) => sum + money(sale.total), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + money(expense.amount), 0);
  const lowStockCount = products.filter((product) => product.currentStock <= product.minimumStock).length;
  const customers = await db.select().from(customersTable).where(eq(customersTable.businessId, businessId));
  const receivables = customers.reduce((sum, customer) => sum + money(customer.outstanding), 0);
  const revenueSeries = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.now() - (6 - index) * 86400000);
    const value = sales.filter((sale) => sale.createdAt.toDateString() === day.toDateString()).reduce((sum, sale) => sum + money(sale.total), 0);
    return { label: day.toLocaleDateString("en-IN", { weekday: "short" }), value };
  });
  res.json({ revenue, revenueChange: 12.4, expenses: expenseTotal, expensesChange: -4.8, profit: revenue - expenseTotal, profitChange: 18.2, receivables, lowStockCount, ordersCount: sales.length, revenueSeries, businessName: business.name });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const [sales, expenses] = await Promise.all([
    db.select().from(salesTable).where(eq(salesTable.businessId, businessId)).orderBy(desc(salesTable.createdAt)).limit(5),
    db.select().from(expensesTable).where(eq(expensesTable.businessId, businessId)).orderBy(desc(expensesTable.createdAt)).limit(3),
  ]);
  const activity = [
    ...sales.map((sale) => ({ id: sale.id, type: "sale" as const, title: `Sale ${sale.invoiceNumber}`, description: `${sale.itemCount} items recorded`, amount: money(sale.total), createdAt: sale.createdAt.toISOString() })),
    ...expenses.map((expense) => ({ id: expense.id, type: "expense" as const, title: expense.title, description: "Business expense recorded", amount: money(expense.amount), createdAt: expense.createdAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  res.json(activity);
});

router.get("/products", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = GetProductsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { search, category, status, page = 1, pageSize = 25 } = parsed.data;
  const filters = [eq(productsTable.businessId, businessId)];
  if (search) filters.push(ilike(productsTable.name, `%${search}%`));
  if (category) filters.push(eq(productsTable.category, category));
  if (status) filters.push(eq(productsTable.status, status));
  const rows = await db.select().from(productsTable).where(and(...filters)).orderBy(asc(productsTable.name));
  const start = (page - 1) * pageSize;
  res.json({ items: rows.slice(start, start + pageSize).map(productResponse), total: rows.length, page, pageSize });
});

router.post("/products", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    businessId,
    purchasePrice: String(parsed.data.purchasePrice),
    sellingPrice: String(parsed.data.sellingPrice),
    status: "active",
  }).returning();
  res.status(201).json(productResponse(product));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const params = UpdateProductParams.safeParse(req.params);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid product update" }); return; }
  const { purchasePrice, sellingPrice, ...productFields } = parsed.data;
  const [product] = await db.update(productsTable).set({
    ...productFields,
    ...(purchasePrice === undefined ? {} : { purchasePrice: String(purchasePrice) }),
    ...(sellingPrice === undefined ? {} : { sellingPrice: String(sellingPrice) }),
    updatedAt: new Date(),
  }).where(and(eq(productsTable.id, params.data.id), eq(productsTable.businessId, businessId))).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(productResponse(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.update(productsTable).set({ status: "inactive", updatedAt: new Date() }).where(and(eq(productsTable.id, id), eq(productsTable.businessId, businessId)));
  res.sendStatus(204);
});

router.get("/categories", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.businessId, businessId)).orderBy(asc(categoriesTable.name));
  const products = await db.select({ category: productsTable.category }).from(productsTable).where(eq(productsTable.businessId, businessId));
  res.json(categories.map((category) => ({ id: category.id, name: category.name, color: category.color, productCount: products.filter((product) => product.category === category.name).length })));
});

router.post("/categories", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [category] = await db.insert(categoriesTable).values({ ...parsed.data, businessId }).returning();
  res.status(201).json({ id: category.id, name: category.name, color: category.color, productCount: 0 });
});

router.get("/customers", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = GetCustomersQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { search, page = 1, pageSize = 25 } = parsed.data;
  const filters = [eq(customersTable.businessId, businessId)];
  if (search) filters.push(ilike(customersTable.name, `%${search}%`));
  const rows = await db.select().from(customersTable).where(and(...filters)).orderBy(asc(customersTable.name));
  const start = (page - 1) * pageSize;
  res.json({ items: rows.slice(start, start + pageSize).map((customer) => ({ ...customer, totalPurchases: money(customer.totalPurchases), outstanding: money(customer.outstanding), lastPurchaseAt: iso(customer.lastPurchaseAt) })), total: rows.length, page, pageSize });
});

router.post("/customers", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [customer] = await db.insert(customersTable).values({ ...parsed.data, businessId }).returning();
  res.status(201).json({ ...customer, totalPurchases: 0, outstanding: 0, lastPurchaseAt: null });
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const params = UpdateCustomerParams.safeParse(req.params);
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid customer update" }); return; }
  const [customer] = await db.update(customersTable).set(parsed.data).where(and(eq(customersTable.id, params.data.id), eq(customersTable.businessId, businessId))).returning();
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json({ ...customer, totalPurchases: money(customer.totalPurchases), outstanding: money(customer.outstanding), lastPurchaseAt: iso(customer.lastPurchaseAt) });
});

router.get("/suppliers", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const rows = await db.select().from(suppliersTable).where(search ? and(eq(suppliersTable.businessId, businessId), ilike(suppliersTable.name, `%${search}%`)) : eq(suppliersTable.businessId, businessId)).orderBy(asc(suppliersTable.name));
  res.json(rows.map((supplier) => ({ ...supplier, payable: money(supplier.payable), lastOrderAt: iso(supplier.lastOrderAt) })));
});

router.get("/sales", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = GetSalesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const rows = await db.select({ sale: salesTable, customerName: customersTable.name }).from(salesTable).leftJoin(customersTable, eq(salesTable.customerId, customersTable.id)).where(eq(salesTable.businessId, businessId)).orderBy(desc(salesTable.createdAt)).limit(30);
  res.json(rows.map(({ sale, customerName }) => ({ id: sale.id, invoiceNumber: sale.invoiceNumber, customerName: customerName ?? "Walk-in customer", total: money(sale.total), paymentStatus: sale.paymentStatus as "paid" | "partial" | "pending", itemCount: sale.itemCount, createdAt: sale.createdAt.toISOString() })));
});

router.post("/sales", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const total = parsed.data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const [sale] = await db.insert(salesTable).values({ businessId, customerId: parsed.data.customerId, invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`, total: String(total), paymentStatus: parsed.data.paymentStatus, itemCount: parsed.data.items.reduce((sum, item) => sum + item.quantity, 0) }).returning();
  await db.insert(saleItemsTable).values(parsed.data.items.map((item) => ({ businessId, saleId: sale.id, productId: item.productId, quantity: item.quantity, unitPrice: String(item.unitPrice) })));
  for (const item of parsed.data.items) {
    await db.update(productsTable).set({ currentStock: sql`${productsTable.currentStock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(productsTable.id, item.productId), eq(productsTable.businessId, businessId)));
  }
  res.status(201).json({ id: sale.id, invoiceNumber: sale.invoiceNumber, customerName: "Customer", total, paymentStatus: sale.paymentStatus as "paid" | "partial" | "pending", itemCount: sale.itemCount, createdAt: sale.createdAt.toISOString() });
});

router.get("/inventory/low-stock", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const rows = await db.select().from(productsTable).where(and(eq(productsTable.businessId, businessId), sql`${productsTable.currentStock} <= ${productsTable.minimumStock}`)).orderBy(asc(productsTable.currentStock));
  res.json(rows.map((product) => ({ ...productResponse(product), shortage: product.minimumStock - product.currentStock })));
});

router.get("/reports/sales", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = GetSalesReportQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const rows = await db.select().from(salesTable).where(eq(salesTable.businessId, businessId)).orderBy(asc(salesTable.createdAt));
  const days = parsed.data.range === "week" ? 7 : parsed.data.range === "quarter" ? 90 : 30;
  const points = Array.from({ length: Math.min(days, 30) }, (_, index) => {
    const day = new Date(Date.now() - (Math.min(days, 30) - 1 - index) * 86400000);
    return { label: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: rows.filter((sale) => sale.createdAt.toDateString() === day.toDateString()).reduce((sum, sale) => sum + money(sale.total), 0) };
  });
  res.json(points);
});

router.post("/assistant/chat", async (req, res): Promise<void> => {
  const businessId = await businessContext(req);
  const parsed = SendAssistantMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conversationId = parsed.data.conversationId ?? crypto.randomUUID();
  const { state } = getConversation(businessId, conversationId);
  const [business, sales, products, customers, suppliers, expenses] = await Promise.all([
    db.select().from(businessesTable).where(eq(businessesTable.id, businessId)).then(([row]) => row),
    db.select().from(salesTable).where(eq(salesTable.businessId, businessId)).orderBy(desc(salesTable.createdAt)).limit(30),
    db.select().from(productsTable).where(eq(productsTable.businessId, businessId)).orderBy(asc(productsTable.name)).limit(100),
    db.select().from(customersTable).where(eq(customersTable.businessId, businessId)).orderBy(asc(customersTable.name)).limit(100),
    db.select().from(suppliersTable).where(eq(suppliersTable.businessId, businessId)).orderBy(asc(suppliersTable.name)).limit(100),
    db.select().from(expensesTable).where(eq(expensesTable.businessId, businessId)).orderBy(desc(expensesTable.createdAt)).limit(30),
  ]);
  const lowStock = products.filter((product) => product.currentStock <= product.minimumStock);
  const revenue = sales.reduce((sum, sale) => sum + money(sale.total), 0);
  const receivables = customers.reduce((sum, customer) => sum + money(customer.outstanding), 0);
  const payables = suppliers.reduce((sum, supplier) => sum + money(supplier.payable), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + money(expense.amount), 0);
  const relevantFaqs = getRelevantFaqs(parsed.data.message);
  const verifiedContext = [
    `Business profile: ${business.name}; type: ${business.type}; city: ${business.city}; currency: ${business.currency}.`,
    `Recorded sales in the connected workspace: ${sales.length} recent sales totaling ${revenue.toFixed(2)} ${business.currency}.`,
    `Recorded expenses in the connected workspace: ${expenses.length} recent expenses totaling ${expenseTotal.toFixed(2)} ${business.currency}.`,
    `Customer receivables currently recorded: ${receivables.toFixed(2)} ${business.currency}.`,
    `Supplier payables currently recorded: ${payables.toFixed(2)} ${business.currency}.`,
    `Products and stock: ${products.map((product) => `${product.name} [SKU ${product.sku}, ${product.currentStock} ${product.unit} in stock, minimum ${product.minimumStock}, selling price ${money(product.sellingPrice).toFixed(2)}]`).join("; ") || "No product records available."}`,
    `Customers: ${customers.map((customer) => `${customer.name} [outstanding ${money(customer.outstanding).toFixed(2)} ${business.currency}]`).join("; ") || "No customer records available."}`,
    `Suppliers: ${suppliers.map((supplier) => `${supplier.name} [payable ${money(supplier.payable).toFixed(2)} ${business.currency}]`).join("; ") || "No supplier records available."}`,
    `Recent sales: ${sales.slice(0, 10).map((sale) => `${sale.invoiceNumber} [${money(sale.total).toFixed(2)} ${business.currency}, ${sale.paymentStatus}, ${sale.itemCount} items]`).join("; ") || "No sales records available."}`,
    `Low-stock products: ${lowStock.map((product) => `${product.name} (${product.currentStock} left, minimum ${product.minimumStock})`).join("; ") || "None currently flagged."}`,
  ].join("\n");
  const faqContext = relevantFaqs.length
    ? relevantFaqs.map((entry) => `${entry.id}: ${entry.answer}`).join("\n")
    : "No relevant FAQ or business-policy entry was found for this question.";
  const systemPrompt = `You are AutoBiz AI, a capable conversational business copilot.

Answer naturally and use general knowledge, reasoning, and practical business expertise. The connected workspace context below is an additional source of verified business facts, not a restriction on what you may discuss.

Rules:
- Use the user's language (English, Hinglish, or Marathi) when possible.
- Use the FAQ/policy entries when they are relevant, but answer normally from your general knowledge when they are not.
- Treat workspace data as authoritative for business-specific facts. Never invent sales, inventory, customer balances, suppliers, policies, or other business details.
- If a business-specific answer requires information not present in the verified context or FAQ/policy entries, say exactly what is missing. You may still provide clearly labeled general guidance or a template.
- Separate verified facts from estimates and recommendations. Recommendations can be creative and practical, but do not present them as recorded facts.
- Understand this conversation and answer follow-up questions using prior turns. Do not repeat the full context unless useful.

Verified workspace context:
${verifiedContext}

Relevant FAQ/policy knowledge:
${faqContext}`;
  const userMessage: ConversationMessage = { role: "user", content: parsed.data.message };
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...state.messages,
    userMessage,
  ];
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages,
    });
    const assistantMessage = response.choices[0]?.message?.content?.trim() || "I couldn't complete that analysis.";
    const assistantTurn: ConversationMessage = { role: "assistant", content: assistantMessage };
    state.messages = [...state.messages, userMessage, assistantTurn].slice(-maxConversationMessages);
    state.updatedAt = Date.now();
    res.json({
      message: assistantMessage,
      conversationId,
      intent: "BUSINESS_ASSISTANT",
      facts: [
        `Workspace context loaded for ${business.name}`,
        `${sales.length} sales and ${products.length} products available`,
        `${lowStock.length} products currently below minimum stock`,
        ...(relevantFaqs.length ? [`FAQ/policy knowledge consulted: ${relevantFaqs.map((entry) => entry.id).join(", ")}`] : []),
      ],
    });
  } catch (error) {
    console.error("Assistant completion failed", error);
    const providerStatus = typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
    res.status(providerStatus === 429 ? 503 : 502).json({ error: "The AI assistant is temporarily unavailable. Please try again." });
  }
});

export default router;