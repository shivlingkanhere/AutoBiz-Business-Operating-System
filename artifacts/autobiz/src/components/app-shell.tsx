import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import {
  Activity, ArrowUpRight, BarChart3, Boxes, ChevronDown, CircleHelp, FileText,
  ClipboardList, LayoutDashboard, Menu, Package, PanelLeftClose, PanelLeftOpen,
  Settings, ShoppingCart, Sparkles, Store, Truck, Users, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGetBusiness } from '@workspace/api-client-react';
import { initials } from '@/lib/format';

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/sales', label: 'Sales', icon: ShoppingCart },
      { href: '/billing', label: 'Billing', icon: FileText },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    label: 'Relationships',
    items: [
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    label: 'Understand',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/assistant', label: 'Ask AutoBiz', icon: Sparkles },
    ],
  },
];

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-autobiz">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${light ? 'bg-[#dbe86a] text-[#16343b]' : 'bg-primary text-primary-foreground'}`}>
        <span className="mono text-sm font-bold tracking-[-.12em]">ab</span>
      </div>
      <span className={`text-[17px] font-bold tracking-[-.04em] ${light ? 'text-sidebar-foreground' : 'text-foreground'}`}>AutoBiz</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { signOut: clerkSignOut } = useClerk();
  const { data: business } = useGetBusiness();
  const businessName = business?.name || 'Northline Supply Co.';

  const signOut = () => {
    void clerkSignOut({ redirectUrl: import.meta.env.BASE_URL || '/' });
  };

  const sidebar = (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col bg-sidebar px-3.5 py-5 text-sidebar-foreground transition-transform duration-200 md:translate-x-0 ${collapsed ? 'md:w-[82px]' : ''} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`mb-8 flex items-center px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <BrandMark light />
        {!collapsed && <button className="focus-ring rounded-lg p-1.5 text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={18} /></button>}
      </div>
      <div className={`mb-5 flex items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-2.5 ${collapsed ? 'justify-center' : ''}`} data-testid="business-switcher">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary/15 text-xs font-bold text-sidebar-primary">{initials(businessName)}</div>
        {!collapsed && <><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{businessName}</p><p className="text-[10px] text-sidebar-foreground/55">Operator workspace</p></div><ChevronDown size={14} className="text-sidebar-foreground/45" /></>}
      </div>
      <nav className="flex-1 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-sidebar-foreground/40">{group.label}</p>}
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = location === href;
                return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-foreground'} ${collapsed ? 'justify-center' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} strokeWidth={active ? 2.3 : 1.8} /><span className={collapsed ? 'sr-only' : ''}>{label}</span>{label === 'Ask AutoBiz' && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}</Link>;
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border pt-4">
        <Link href="/settings" className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-foreground ${collapsed ? 'justify-center' : ''}`} data-testid="link-nav-settings"><Settings size={17} /><span className={collapsed ? 'sr-only' : ''}>Settings</span></Link>
        <button onClick={() => window.alert('AutoBiz support is ready at support@autobiz.app')} className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-foreground ${collapsed ? 'justify-center' : ''}`} data-testid="button-help"><CircleHelp size={17} /><span className={collapsed ? 'sr-only' : ''}>Help center</span></button>
        {!collapsed && <div className="mt-3 rounded-xl bg-sidebar-accent/70 p-3"><div className="flex items-start gap-2"><Activity size={15} className="mt-0.5 text-sidebar-primary" /><div><p className="text-xs font-semibold">All systems steady</p><p className="mt-0.5 text-[10px] leading-4 text-sidebar-foreground/50">Your workspace is synced and up to date.</p></div></div></div>}
        <button onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }} className="focus-ring mt-2 hidden w-full items-center justify-center rounded-xl p-2 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex" data-testid="button-toggle-sidebar">{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
      </div>
    </aside>
  );

  return <div className="noise flex min-h-[100dvh] overflow-x-hidden bg-background"><div className={`hidden shrink-0 md:block ${collapsed ? 'w-[82px]' : 'w-[258px]'}`} aria-hidden="true" /><div className="min-h-[100dvh] min-w-0 flex-1"><div className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md md:px-8"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary md:hidden" data-testid="button-open-menu"><Menu size={20} /></button><div className="md:hidden"><BrandMark /></div><div className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground md:flex"><span className="mono shrink-0 text-[10px] uppercase tracking-[.18em]">Workspace</span><span className="shrink-0">/</span><span className="truncate font-semibold text-foreground">{navGroups.flatMap(g => g.items).find(i => i.href === location)?.label || (location === '/settings' ? 'Settings' : 'Overview')}</span></div></div><div className="flex shrink-0 items-center gap-3"><button onClick={() => setLocation('/assistant')} className="focus-ring hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:border-primary/40 sm:flex" data-testid="button-quick-assistant"><Sparkles size={14} className="text-primary" /> Ask your co-pilot <span className="mono ml-1 text-[9px] text-muted-foreground">⌘K</span></button><div className="hidden h-7 w-px bg-border sm:block" /><button onClick={() => setLocation('/settings')} className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground" data-testid="button-profile">{initials('Maya Chen')}</button><button onClick={signOut} className="hidden text-xs font-semibold text-muted-foreground hover:text-foreground sm:block" data-testid="button-sign-out">Sign out</button></div></div><main className="mx-auto min-w-0 max-w-[1480px] px-5 py-7 md:px-8 md:py-9">{children}</main></div>{sidebar}{mobileOpen && <button className="fixed inset-0 z-30 bg-sidebar/40 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-dismiss-menu" />}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-rise"><div><div className="mb-2 flex items-center gap-2">{eyebrow && <span className="mono text-[10px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</span>}<span className="h-px w-7 bg-accent" /></div><h1 className="text-[28px] font-bold tracking-[-.055em] text-foreground md:text-[34px]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; className?: string; [key: string]: unknown }) {
  const style = variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : variant === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : variant === 'secondary' ? 'border border-border bg-card text-foreground hover:bg-secondary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground';
  return <button className={`focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold transition-all active:scale-[.98] ${style} ${className}`} {...props}>{children}</button>;
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input className="focus-ring h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/60" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid="input-search" /></div>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/40 p-4 backdrop-blur-[2px]" onMouseDown={onClose}><div className="surface max-h-[90vh] w-full max-w-[620px] overflow-auto rounded-2xl p-5 sm:p-7" onMouseDown={(e) => e.stopPropagation()}><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-bold tracking-[-.03em]">{title}</h2><button onClick={onClose} className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" data-testid="button-close-modal"><X size={18} /></button></div>{children}</div></div>;
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return <div className="space-y-2">{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>;
}

export function QueryState({ isLoading, isError, onRetry, children, empty, hasData = true }: { isLoading?: boolean; isError?: boolean; onRetry?: () => void; children: ReactNode; empty?: ReactNode; hasData?: boolean }) {
  if (isLoading) return <SkeletonRows />;
  if (isError) return <div className="surface rounded-2xl p-10 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive"><Activity size={20} /></div><h3 className="mt-4 text-sm font-bold">Couldn’t load this view</h3><p className="mt-1 text-xs text-muted-foreground">The signal dropped. Try refreshing the data.</p><Button onClick={onRetry} variant="secondary" className="mt-4">Retry</Button></div>;
  if (!hasData && empty) return <>{empty}</>;
  return <>{children}</>;
}

export function EmptyState({ icon: Icon = ClipboardList, title, description, action }: { icon?: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="surface rounded-2xl p-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><Icon size={21} /></div><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}