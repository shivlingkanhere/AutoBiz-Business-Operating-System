import { useEffect, useState } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetBusinessQueryKey, getGetDashboardSummaryQueryKey, useGetBusiness, useUpdateBusiness } from '@workspace/api-client-react';
import { ArrowUpRight, Check, ShieldCheck, Store } from 'lucide-react';
import { AppShell, Button, PageHeader, QueryState } from '@/components/app-shell';

const currencies = [
  ['INR', 'Indian Rupee'],
  ['USD', 'US Dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'Pound Sterling'],
  ['CAD', 'Canadian Dollar'],
] as const;

export function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const queryClient = useQueryClient();
  const { data: business, isLoading, isError, refetch } = useGetBusiness();
  const updateBusiness = useUpdateBusiness();
  const [form, setForm] = useState({ name: '', type: '', city: '', currency: 'INR' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        type: business.type,
        city: business.city,
        currency: business.currency,
      });
    }
  }, [business]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateBusiness.mutate(
      { data: form },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
          ]);
          setSaved(true);
        },
      },
    );
  };

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Workspace owner';
  const email = user?.primaryEmailAddress?.emailAddress || 'Signed-in account';

  return (
    <AppShell>
      <PageHeader eyebrow="Workspace" title="Settings" description="The details that keep your workspace feeling like yours." />
      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} hasData={!!business}>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="surface rounded-2xl p-5 md:p-7">
            <div className="mb-7 flex items-center gap-3 border-b border-border pb-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Store size={18} /></div>
              <div><h2 className="text-sm font-bold">Business profile</h2><p className="mt-1 text-[11px] text-muted-foreground">Changes are shared across your workspace.</p></div>
            </div>
            <form onSubmit={submit} className="max-w-xl space-y-5">
              <label className="block"><span className="mb-1.5 block text-xs font-bold">Business name</span><input required minLength={1} value={form.name} onChange={(event) => update('name', event.target.value)} className="focus-ring h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-business-name" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-xs font-bold">Business type</span><input required minLength={1} value={form.type} onChange={(event) => update('type', event.target.value)} className="focus-ring h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-business-type" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-bold">City</span><input required minLength={1} value={form.city} onChange={(event) => update('city', event.target.value)} className="focus-ring h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-business-city" /></label>
              </div>
              <label className="block"><span className="mb-1.5 block text-xs font-bold">Currency</span><select value={form.currency} onChange={(event) => update('currency', event.target.value)} className="focus-ring h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-business-currency">{currencies.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select></label>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" disabled={updateBusiness.isPending} data-testid="button-save-business">{updateBusiness.isPending ? 'Saving…' : 'Save profile'}</Button>
                {saved && <span className="flex items-center gap-1.5 text-xs font-bold text-primary"><Check size={14} /> Saved to workspace</span>}
                {updateBusiness.isError && <span className="text-xs font-semibold text-destructive">Couldn’t save changes. Try again.</span>}
              </div>
            </form>
          </div>
          <div className="space-y-5">
            <div className="surface rounded-2xl p-6">
              <p className="mono text-[10px] uppercase tracking-[.15em] text-primary">Account</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">{(displayName[0] || 'A').toUpperCase()}</div>
                <div><p className="text-sm font-bold">{displayName}</p><p className="mt-1 text-[11px] text-muted-foreground">{email}</p></div>
              </div>
              <button onClick={() => openUserProfile()} className="focus-ring mt-6 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-xs font-bold hover:bg-secondary" data-testid="button-manage-account">Manage account <ArrowUpRight size={14} /></button>
            </div>
            <div className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground"><ShieldCheck className="text-sidebar-primary" size={19} /><h3 className="mt-5 text-sm font-bold">Your data, kept close.</h3><p className="mt-2 text-xs leading-5 text-sidebar-foreground/60">AutoBiz keeps your workspace data scoped to your signed-in business account.</p></div>
          </div>
        </div>
      </QueryState>
    </AppShell>
  );
}