import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const businessesTable = pgTable("autobiz_businesses", {
  id: id(),
  ownerUserId: text("owner_user_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("General Business"),
  city: text("city").notNull().default("Pune"),
  currency: text("currency").notNull().default("INR"),
  createdAt: createdAt(),
}, (table) => ({
  ownerIdx: uniqueIndex("autobiz_business_owner_idx").on(table.ownerUserId),
}));

export const categoriesTable = pgTable("autobiz_categories", {
  id: id(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#1e7a68"),
  createdAt: createdAt(),
});

export const productsTable = pgTable("autobiz_products", {
  id: id(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  category: text("category").notNull().default("General"),
  brand: text("brand").notNull().default(""),
  unit: text("unit").notNull().default("pcs"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
  currentStock: integer("current_stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  status: text("status").notNull().default("active"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const customersTable = pgTable("autobiz_customers", {
  id: id(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  totalPurchases: numeric("total_purchases", { precision: 12, scale: 2 }).notNull().default("0"),
  outstanding: numeric("outstanding", { precision: 12, scale: 2 }).notNull().default("0"),
  lastPurchaseAt: timestamp("last_purchase_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const suppliersTable = pgTable("autobiz_suppliers", {
  id: id(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  city: text("city").notNull().default(""),
  payable: numeric("payable", { precision: 12, scale: 2 }).notNull().default("0"),
  lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const salesTable = pgTable("autobiz_sales", {
  id: id(),
  businessId: uuid("business_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: uuid("customer_id"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentStatus: text("payment_status").notNull().default("paid"),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: createdAt(),
});

export const saleItemsTable = pgTable("autobiz_sale_items", {
  id: id(),
  businessId: uuid("business_id").notNull(),
  saleId: uuid("sale_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
});

export const expensesTable = pgTable("autobiz_expenses", {
  id: id(),
  businessId: uuid("business_id").notNull(),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: createdAt(),
});

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true });

export type Business = typeof businessesTable.$inferSelect;
export type Category = typeof categoriesTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type Customer = typeof customersTable.$inferSelect;
export type Supplier = typeof suppliersTable.$inferSelect;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
export type Expense = typeof expensesTable.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;