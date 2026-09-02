import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Download, FileText, Package, Printer, Search, Trash2, UserRound, WalletCards, X } from 'lucide-react';
import { Link, useLocation, useRoute } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCustomersQueryKey,
  getGetDashboardActivityQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetInvoicesQueryKey,
  getGetInvoiceQueryKey,
  getGetLowStockProductsQueryKey,
  getGetProductsQueryKey,
  getGetSalesQueryKey,
  getGetSalesReportQueryKey,
  useCreateInvoice,
  useGetBusiness,
  useGetCustomers,
  useGetInvoice,
  useGetInvoices,
  useGetProducts,
  getInvoice,
  type InvoiceDetail,
} from '@workspace/api-client-react';
import { AppShell, Button, EmptyState, PageHeader, QueryState, SearchInput } from '@/components/app-shell';
import { dateLabel, money } from '@/lib/format';

type DraftItem = { productId: string; quantity: number; unitPrice: number };
type Business = { name?: string; type?: string; city?: string; currency?: string };

const fallbackBusiness: Business = { name: 'Northline Supply Co.', type: 'Business', city: '', currency: 'INR' };

function amount(value: number, currency = 'INR') {
  return money(value, currency);
}

function invoiceTotals(items: DraftItem[], discountType: 'fixed' | 'percentage', discountValue: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = discountType === 'percentage' ? subtotal * discountValue / 100 : discountValue;
  return { subtotal, discount: Math.min(Math.max(0, discount), subtotal), grandTotal: Math.max(0, subtotal - discount) };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

function printInvoice(invoice: InvoiceDetail) {
  const currency = invoice.business.currency || 'INR';

  const popup = window.open(
    '',
    '_blank',
    'width=900,height=800,scrollbars=yes,resizable=yes'
  );

  if (!popup) {
    window.alert('Please allow pop-ups to print this invoice.');
    return;
  }

  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td>
            ${escapeHtml(item.productName)}
            <small>${escapeHtml(item.productSku || '')}</small>
          </td>
          <td>${item.quantity}</td>
          <td>${amount(item.unitPrice, currency)}</td>
          <td>${amount(item.lineTotal, currency)}</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(invoice.invoiceNumber)} - AutoBiz</title>
        <style>
          @page {
            size: A4;
            margin: 16mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #18353b;
            margin: 0;
            font-size: 13px;
          }

          header {
            display: flex;
            justify-content: space-between;
            border-bottom: 3px solid #1e7a68;
            padding-bottom: 22px;
            margin-bottom: 28px;
          }

          h1 {
            font-size: 30px;
            margin: 0 0 8px;
          }

          h2 {
            font-size: 15px;
            margin: 0 0 7px;
          }

          p {
            margin: 4px 0;
            color: #64777b;
          }

          small {
            display: block;
            color: #829094;
            font-size: 10px;
            margin-top: 4px;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 24px;
          }

          th {
            text-align: left;
            color: #64777b;
            font-size: 10px;
            text-transform: uppercase;
            padding: 10px 8px;
            border-bottom: 1px solid #d7e1de;
          }

          td {
            padding: 14px 8px;
            border-bottom: 1px solid #e8efed;
          }

          th:not(:first-child),
          td:not(:first-child) {
            text-align: right;
          }

          .meta {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 22px;
          }

          .meta > div {
            flex: 1;
          }

          .status {
            display: inline-block;
            border-radius: 999px;
            background: #e6f1ed;
            color: #1e7a68;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: bold;
            text-transform: capitalize;
          }

          .summary {
            margin: 28px 0 0 auto;
            width: 290px;
          }

          .line {
            display: flex;
            justify-content: space-between;
            padding: 7px 0;
            color: #64777b;
          }

          .total {
            border-top: 2px solid #18353b;
            margin-top: 7px;
            padding-top: 12px;
            font-size: 18px;
            font-weight: bold;
            color: #18353b;
          }

          .footer {
            margin-top: 52px;
            padding-top: 16px;
            border-top: 1px solid #d7e1de;
            color: #829094;
            font-size: 11px;
          }
        </style>
      </head>

      <body>
        <header>
          <div>
            <h1>${escapeHtml(invoice.business.name || 'AutoBiz Business')}</h1>
            <p>
              ${escapeHtml(invoice.business.type || 'Business')}
              ${
                invoice.business.city
                  ? ` · ${escapeHtml(invoice.business.city)}`
                  : ''
              }
            </p>
          </div>

          <div style="text-align:right">
            <div style="font-size:22px;font-weight:bold">
              INVOICE
            </div>
            <p>${escapeHtml(invoice.invoiceNumber)}</p>
            <p>${dateLabel(invoice.invoiceDate)}</p>
          </div>
        </header>

        <div class="meta">
          <div>
            <h2>Bill to</h2>
            <p><strong>${escapeHtml(invoice.customerName)}</strong></p>
            <p>${escapeHtml(invoice.customerPhone || 'No phone provided')}</p>
            <p>${escapeHtml(invoice.customerAddress || 'No address provided')}</p>
          </div>

          <div style="text-align:right">
            <h2>Payment</h2>
            <p>
              <span class="status">
                ${escapeHtml(invoice.paymentStatus)}
              </span>
            </p>
            <p>${escapeHtml(invoice.paymentMethod.toUpperCase())}</p>
            <p>
              ${amount(invoice.amountPaid, currency)} paid ·
              ${amount(invoice.balanceDue, currency)} due
            </p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Line total</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="summary">
          <div class="line">
            <span>Subtotal</span>
            <strong>${amount(invoice.subtotal, currency)}</strong>
          </div>

          <div class="line">
            <span>
              Discount
              ${
                invoice.discountType === 'percentage'
                  ? `(${invoice.discountValue}%)`
                  : ''
              }
            </span>
            <strong>-${amount(invoice.discountAmount, currency)}</strong>
          </div>

          <div class="line total">
            <span>Total</span>
            <strong>${amount(invoice.grandTotal, currency)}</strong>
          </div>
        </div>

        <div class="footer">
          Generated by AutoBiz · This invoice reflects the saved transaction record.
        </div>
      </body>
    </html>
  `;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  popup.focus();

  setTimeout(() => {
    popup.print();
  }, 500);
}

function InvoicePreview({ invoice, business = fallbackBusiness, draft }: { invoice?: InvoiceDetail; business?: Business; draft?: { items: (DraftItem & { name: string; sku: string })[]; customerName: string; customerPhone: string; customerAddress: string; invoiceDate: string; discountType: 'fixed' | 'percentage'; discountValue: number; paymentMethod: string; paymentStatus: string; amountPaid: number } }) {
  const currency = business.currency || 'INR';
  const totals = draft ? invoiceTotals(draft.items, draft.discountType, draft.discountValue) : null;
  const items = invoice
    ? invoice.items.map((item) => ({ productId: item.productId, productName: item.productName, productSku: item.productSku, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal }))
    : draft?.items.map((item) => ({ productId: item.productId, productName: item.name, productSku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.quantity * item.unitPrice })) ?? [];
  const customerName = invoice?.customerName ?? draft?.customerName ?? 'Customer name';
  const customerPhone = invoice?.customerPhone ?? draft?.customerPhone ?? '';
  const customerAddress = invoice?.customerAddress ?? draft?.customerAddress ?? '';
  const invoiceDate = invoice?.invoiceDate ?? draft?.invoiceDate ?? new Date().toISOString();
  const subtotal = invoice?.subtotal ?? totals?.subtotal ?? 0;
  const discountAmount = invoice?.discountAmount ?? totals?.discount ?? 0;
  const grandTotal = invoice?.grandTotal ?? totals?.grandTotal ?? 0;
  const paymentStatus = invoice?.paymentStatus ?? draft?.paymentStatus ?? 'pending';
  const paymentMethod = invoice?.paymentMethod ?? draft?.paymentMethod ?? 'cash';
  const amountPaid = invoice?.amountPaid ?? draft?.amountPaid ?? 0;
  const balanceDue = invoice?.balanceDue ?? Math.max(0, grandTotal - amountPaid);
  return <div className="surface overflow-hidden rounded-2xl border border-border bg-card" data-testid="invoice-preview">
    <div className="border-b border-border bg-secondary/35 p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row">
        <div><p className="text-lg font-bold tracking-[-.04em]">{business.name || 'Your business'}</p><p className="mt-1 text-xs text-muted-foreground">{business.type || 'Business'}{business.city ? ` · ${business.city}` : ''}</p></div>
        <div className="sm:text-right"><p className="mono text-[10px] font-bold uppercase tracking-[.18em] text-primary">Invoice</p><p className="mono mt-1 text-lg font-bold">{invoice?.invoiceNumber || 'Draft invoice'}</p><p className="mt-1 text-[11px] text-muted-foreground">{dateLabel(invoiceDate)}</p></div>
      </div>
    </div>
    <div className="p-5 sm:p-7">
      <div className="grid gap-5 border-b border-border pb-5 sm:grid-cols-2">
        <div><p className="mono text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">Bill to</p><p className="mt-2 text-sm font-bold">{customerName}</p><p className="mt-1 text-xs text-muted-foreground">{customerPhone || 'No phone provided'}</p><p className="mt-1 text-xs text-muted-foreground">{customerAddress || 'No address provided'}</p></div>
        <div className="sm:text-right"><p className="mono text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">Payment</p><p className="mt-2 text-sm font-bold capitalize">{paymentMethod} · <span className={paymentStatus === 'paid' ? 'text-primary' : paymentStatus === 'partial' ? 'text-[#a76619]' : 'text-destructive'}>{paymentStatus}</span></p><p className="mt-1 text-xs text-muted-foreground">{amount(amountPaid, currency)} paid · {amount(balanceDue, currency)} due</p></div>
      </div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[430px] text-left"><thead><tr className="border-b border-border">{['Item', 'Qty', 'Unit price', 'Line total'].map((heading) => <th key={heading} className="px-2 py-2 text-[9px] font-bold uppercase tracking-[.13em] text-muted-foreground">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{items.length ? items.map((item) => <tr key={item.productId}><td className="px-2 py-3 text-xs font-semibold">{item.productName}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{item.productSku}</span></td><td className="px-2 py-3 mono text-xs">{item.quantity}</td><td className="px-2 py-3 mono text-xs">{amount(item.unitPrice, currency)}</td><td className="px-2 py-3 text-right mono text-xs font-bold">{amount(item.lineTotal, currency)}</td></tr>) : <tr><td colSpan={4} className="px-2 py-10 text-center text-xs text-muted-foreground">Add products to see the invoice.</td></tr>}</tbody></table></div>
      <div className="mt-6 ml-auto max-w-[260px] space-y-2 text-xs"><div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="mono font-semibold text-foreground">{amount(subtotal, currency)}</span></div><div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="mono font-semibold text-foreground">−{amount(discountAmount, currency)}</span></div><div className="flex justify-between border-t-2 border-foreground/15 pt-3 text-base font-bold"><span>Grand total</span><span className="mono">{amount(grandTotal, currency)}</span></div></div>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold">{label}</span>{children}</label>;
}

function NewInvoicePage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: business } = useGetBusiness();
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'pending'>('paid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [error, setError] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());
  const customers = useGetCustomers({ search: customerSearch || undefined, page: 1, pageSize: 20 }, { query: { queryKey: getGetCustomersQueryKey({ search: customerSearch || undefined, page: 1, pageSize: 20 }) } });
  const products = useGetProducts({ search: productSearch || undefined, status: 'active', page: 1, pageSize: 100 }, { query: { queryKey: getGetProductsQueryKey({ search: productSearch || undefined, status: 'active', page: 1, pageSize: 100 }) } });
  const create = useCreateInvoice();
  const productMap = useMemo(() => new Map((products.data?.items ?? []).map((product) => [product.id, product])), [products.data?.items]);
  const totals = invoiceTotals(items, discountType, discountValue);
  const draft = {
    items: items.map((item) => ({ ...item, name: productMap.get(item.productId)?.name ?? 'Product', sku: productMap.get(item.productId)?.sku ?? '' })),
    customerName, customerPhone, customerAddress, invoiceDate: new Date().toISOString(), discountType, discountValue, paymentMethod, paymentStatus, amountPaid: paymentStatus === 'paid' ? totals.grandTotal : amountPaid,
  };
  const selectCustomer = (customer: NonNullable<typeof customers.data>['items'][number]) => {
    setCustomerId(customer.id); setCustomerName(customer.name); setCustomerPhone(customer.phone); setCustomerAddress(customer.city); setCustomerSearch('');
  };
  const addProduct = () => {
    const product = productMap.get(productId);
    if (!product) return;
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      return existing ? current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { productId: product.id, quantity, unitPrice: product.sellingPrice }];
    });
    setProductId(''); setProductSearch(''); setQuantity(1);
  };
  const reset = () => {
    setCustomerId(null); setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); setItems([]); setDiscountType('fixed'); setDiscountValue(0); setPaymentMethod('cash'); setPaymentStatus('paid'); setAmountPaid(0); setError(''); idempotencyKey.current = crypto.randomUUID();
  };
  const submit = () => {
    setError('');
    if (!customerName.trim()) { setError('Add a customer name before saving the invoice.'); return; }
    if (!items.length) { setError('Add at least one product to the invoice.'); return; }
    if (discountType === 'percentage' && discountValue > 100) { setError('Percentage discount cannot exceed 100%.'); return; }
    const paid = paymentStatus === 'paid' ? totals.grandTotal : amountPaid;
    create.mutate({ data: { idempotencyKey: idempotencyKey.current, customerId, customerName: customerName.trim(), customerPhone: customerPhone.trim(), customerAddress: customerAddress.trim(), invoiceDate: new Date().toISOString(), items, discountType, discountValue: Math.max(0, discountValue), paymentMethod, paymentStatus, amountPaid: paid } }, {
      onSuccess: (invoice) => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoice.id) });
        queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLowStockProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesReportQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardActivityQueryKey() });
        setLocation(`/billing/${invoice.id}`);
      },
      onError: (requestError: any) => setError(requestError?.response?.data?.error || requestError?.message || 'The invoice could not be saved.'),
    });
  };
  return <AppShell><PageHeader eyebrow="Billing" title="Create invoice" description="Turn a basket into one accurate, traceable transaction." action={<Link href="/billing" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-bold hover:bg-secondary"><ArrowLeft size={14} /> Invoice history</Link>} /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(390px,.8fr)]">
    <div className="space-y-5">
      <section className="surface rounded-2xl p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><UserRound size={17} /></div><div><h2 className="text-sm font-bold">Customer</h2><p className="text-[11px] text-muted-foreground">Reuse a customer or create one as you save.</p></div></div>{customerId ? <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-secondary/45 p-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{customerName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{customerName}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{customerPhone || 'No phone'}{customerAddress ? ` · ${customerAddress}` : ''}</p></div><button onClick={() => setCustomerId(null)} className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-card" data-testid="button-clear-invoice-customer"><X size={15} /></button></div> : <div className="relative"><SearchInput value={customerSearch} onChange={setCustomerSearch} placeholder="Search customers or type a new name" />{customerSearch && <div className="absolute left-0 right-0 top-12 z-10 rounded-xl border border-border bg-card p-1 shadow-xl">{customers.data?.items.map((customer) => <button key={customer.id} onClick={() => selectCustomer(customer)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-secondary" data-testid={`button-select-customer-${customer.id}`}><div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-[10px] font-bold text-primary">{customer.name.slice(0, 2).toUpperCase()}</div><div><p className="text-xs font-bold">{customer.name}</p><p className="text-[10px] text-muted-foreground">{customer.phone} · {customer.city}</p></div></button>)}<button onClick={() => { setCustomerName(customerSearch); setCustomerSearch(''); }} className="flex w-full items-center gap-2 border-t border-border p-3 text-left text-xs font-bold text-primary hover:bg-secondary" data-testid="button-use-new-customer"><UserRound size={14} /> Use “{customerSearch}” as a new customer</button></div>}</div>}{!customerId && customerName && <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Customer name"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-invoice-customer-name" /></Field><Field label="Phone"><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-invoice-customer-phone" /></Field><Field label="Address / city"><input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary sm:col-span-2" data-testid="input-invoice-customer-address" /></Field></div>}</section>
      <section className="surface rounded-2xl p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Package size={17} /></div><div><h2 className="text-sm font-bold">Items</h2><p className="text-[11px] text-muted-foreground">Prices default to the catalog price and can be adjusted.</p></div></div><div className="grid gap-3 sm:grid-cols-[1fr_90px_auto]"><div className="relative"><input value={productSearch || productId} onChange={(event) => { setProductSearch(event.target.value); setProductId(''); }} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Search product" data-testid="input-invoice-product-search" />{productSearch && <div className="absolute left-0 right-0 top-12 z-10 max-h-56 overflow-auto rounded-xl border border-border bg-card p-1 shadow-xl">{products.data?.items.map((product) => <button key={product.id} onClick={() => { setProductId(product.id); setProductSearch(product.name); }} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-secondary" data-testid={`button-select-invoice-product-${product.id}`}><span><span className="block text-xs font-bold">{product.name}</span><span className="mt-1 block text-[10px] text-muted-foreground">{product.sku} · {product.currentStock} {product.unit} in stock</span></span><span className="mono text-xs font-bold">{amount(product.sellingPrice, business?.currency)}</span></button>)}</div>}</div><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} className="focus-ring h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-invoice-quantity" /><Button variant="secondary" onClick={addProduct} disabled={!productId} data-testid="button-add-invoice-item">Add</Button></div>{items.length > 0 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[570px] text-left"><thead><tr className="border-b border-border">{['Product', 'Qty', 'Unit price', 'Line total', ''].map((heading) => <th key={heading} className="px-2 py-2 text-[9px] font-bold uppercase tracking-[.13em] text-muted-foreground">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{items.map((item) => { const product = productMap.get(item.productId); return <tr key={item.productId}><td className="px-2 py-3"><p className="text-xs font-bold">{product?.name || 'Product'}</p><p className="mt-1 text-[10px] text-muted-foreground">{product?.sku} · {product?.currentStock} in stock</p></td><td className="px-2 py-3"><input type="number" min="1" value={item.quantity} onChange={(event) => setItems((current) => current.map((line) => line.productId === item.productId ? { ...line, quantity: Math.max(1, Number(event.target.value)) } : line))} className="focus-ring h-8 w-16 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary" data-testid={`input-invoice-item-quantity-${item.productId}`} /></td><td className="px-2 py-3"><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setItems((current) => current.map((line) => line.productId === item.productId ? { ...line, unitPrice: Math.max(0, Number(event.target.value)) } : line))} className="focus-ring h-8 w-24 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary" data-testid={`input-invoice-item-price-${item.productId}`} /></td><td className="px-2 py-3 mono text-xs font-bold">{amount(item.quantity * item.unitPrice, business?.currency)}</td><td className="px-2 py-3 text-right"><button onClick={() => setItems((current) => current.filter((line) => line.productId !== item.productId))} className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-[#fbe5df] hover:text-destructive" data-testid={`button-remove-invoice-item-${item.productId}`}><Trash2 size={14} /></button></td></tr>; })}</tbody></table></div>}</section>
      <section className="surface rounded-2xl p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0d9] text-[#a76619]"><WalletCards size={17} /></div><div><h2 className="text-sm font-bold">Discount & payment</h2><p className="text-[11px] text-muted-foreground">The final amount is checked again by the server.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Discount type"><select value={discountType} onChange={(event) => setDiscountType(event.target.value as typeof discountType)} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-invoice-discount-type"><option value="fixed">No / fixed amount</option><option value="percentage">Percentage</option></select></Field><Field label={discountType === 'percentage' ? 'Discount %' : 'Discount amount'}><input type="number" min="0" max={discountType === 'percentage' ? 100 : undefined} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(Math.max(0, Number(event.target.value)))} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-invoice-discount" /></Field><Field label="Payment method"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-invoice-payment-method"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="other">Other</option></select></Field><Field label="Payment status"><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-invoice-payment-status"><option value="paid">Paid in full</option><option value="partial">Partially paid</option><option value="pending">Pending</option></select></Field>{paymentStatus !== 'paid' && <Field label="Amount paid"><input type="number" min="0" max={totals.grandTotal} step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(Math.max(0, Number(event.target.value)))} className="focus-ring h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary sm:col-span-2" data-testid="input-invoice-amount-paid" /></Field>}</div><div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5"><div><p className="text-[10px] text-muted-foreground">Subtotal</p><p className="mono mt-1 text-sm font-bold">{amount(totals.subtotal, business?.currency)}</p></div><div><p className="text-[10px] text-muted-foreground">Discount</p><p className="mono mt-1 text-sm font-bold text-[#a76619]">−{amount(totals.discount, business?.currency)}</p></div><div className="text-right"><p className="text-[10px] text-muted-foreground">Grand total</p><p className="mono mt-1 text-lg font-bold text-primary">{amount(totals.grandTotal, business?.currency)}</p></div></div>{error && <p className="mt-4 rounded-lg bg-[#fbe5df] px-3 py-2 text-xs font-semibold text-destructive" role="alert">{error}</p>}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={reset} disabled={create.isPending}>Clear</Button><Button onClick={submit} disabled={create.isPending} data-testid="button-save-invoice">{create.isPending ? 'Saving transaction…' : 'Save & finalize invoice'} <ArrowUpRight size={15} /></Button></div></section>
    </div>
    <div className="xl:sticky xl:top-24 xl:self-start"><div className="mb-3 flex items-center justify-between"><p className="mono text-[10px] font-bold uppercase tracking-[.16em] text-primary">Live preview</p><span className="text-[10px] text-muted-foreground">Updates as you type</span></div><InvoicePreview business={business || fallbackBusiness} draft={draft} /></div>
  </div></AppShell>;
}

export function BillingPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const { data: business } = useGetBusiness();
  const query = useGetInvoices({ search: search || undefined, status: status === 'all' ? undefined : status, page: 1, pageSize: 50 }, { query: { queryKey: getGetInvoicesQueryKey({ search: search || undefined, status: status === 'all' ? undefined : status, page: 1, pageSize: 50 }) } });
  const download = async (id: string) => {
    try { printInvoice(await getInvoice(id)); } catch { window.alert('This invoice could not be loaded for printing.'); }
  };
  return <AppShell><PageHeader eyebrow="Billing" title="Invoices" description="Create, find and share accurate bills without losing the transaction trail." action={<Link href="/billing/new" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90" data-testid="button-create-invoice"><FileText size={15} /> Create invoice</Link>} /><div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="w-full sm:max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search invoice number or customer" /></div><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="focus-ring h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold outline-none" data-testid="select-invoice-status"><option value="all">All payment status</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="pending">Pending</option></select></div><div className="surface overflow-hidden rounded-2xl"><QueryState isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} hasData={!!query.data?.items.length} empty={<EmptyState icon={FileText} title="No invoices yet" description="Your finalized invoices will appear here with their sales and payment trail." action={<Link href="/billing/new" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground"><FileText size={14} /> Create your first invoice</Link>} />}><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border bg-muted/45"><tr>{['Invoice', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Actions'].map((heading) => <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{query.data?.items.map((invoice) => <tr key={invoice.id} className="table-row" data-testid={`row-invoice-${invoice.id}`}><td className="px-5 py-4 mono text-xs font-bold">{invoice.invoiceNumber}</td><td className="px-5 text-xs font-semibold">{invoice.customerName}</td><td className="px-5 text-[11px] text-muted-foreground">{dateLabel(invoice.invoiceDate)}</td><td className="px-5 text-xs text-muted-foreground">{invoice.itemCount}</td><td className="px-5 mono text-xs font-bold">{amount(invoice.grandTotal, business?.currency)}</td><td className="px-5"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${invoice.paymentStatus === 'paid' ? 'bg-secondary text-primary' : invoice.paymentStatus === 'partial' ? 'bg-[#fff0d9] text-[#a76619]' : 'bg-[#fbe5df] text-destructive'}`}>{invoice.paymentStatus}</span></td><td className="px-5"><div className="flex justify-end gap-1"><Link href={`/billing/${invoice.id}`} className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title="View invoice" data-testid={`button-view-invoice-${invoice.id}`}><ArrowUpRight size={15} /></Link><button onClick={() => void download(invoice.id)} className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Print or save as PDF" data-testid={`button-download-invoice-${invoice.id}`}><Download size={15} /></button></div></td></tr>)}</tbody></table></div></QueryState></div></AppShell>;
}

export function InvoiceDetailPage() {
  const [, params] = useRoute('/billing/:id');
  const [, setLocation] = useLocation();
  const { data: invoice, isLoading, isError, refetch } = useGetInvoice(params?.id || '');
  const business = invoice?.business;
  return <AppShell><PageHeader eyebrow="Billing" title={invoice ? invoice.invoiceNumber : 'Invoice detail'} description={invoice ? `${invoice.customerName} · ${dateLabel(invoice.invoiceDate)}` : 'Loading the saved invoice record.'} action={<div className="flex gap-2"><Link href="/billing" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-bold hover:bg-secondary"><ArrowLeft size={14} /> History</Link>{invoice && <><Button variant="secondary" onClick={() => printInvoice(invoice)} data-testid="button-print-invoice"><Printer size={14} /> Print</Button><Button onClick={() => printInvoice(invoice)} data-testid="button-download-detail-invoice"><Download size={14} /> Download PDF</Button></>}</div>} /><QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} hasData={!!invoice}>{invoice ? <div className="mx-auto max-w-4xl"><InvoicePreview invoice={invoice} business={business} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Check size={14} className="text-primary" /> Saved transaction · linked sale {invoice.saleId ? 'created' : 'not available'}</span><Link href="/billing/new" className="font-bold text-primary hover:underline">Create another invoice <ArrowUpRight className="inline" size={13} /></Link></div></div> : null}</QueryState></AppShell>;
}

export { NewInvoicePage };