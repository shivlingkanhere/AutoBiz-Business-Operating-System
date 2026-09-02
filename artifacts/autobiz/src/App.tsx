import { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';

import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import {
  AssistantPage,
  BillingPage,
  CustomersPage,
  DashboardPage,
  InventoryPage,
  InvoiceDetailPage,
  NewInvoicePage,
  LandingPage,
  NotFoundPage,
  ProductsPage,
  ReportsPage,
  SalesPage,
  SettingsPage,
  SuppliersPage,
} from '@/pages/pages';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in the environment.');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#1e7a68',
    colorForeground: '#18353b',
    colorMutedForeground: '#64777b',
    colorDanger: '#c9574b',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#18353b',
    colorNeutral: '#d7e1de',
    fontFamily: 'DM Sans, ui-sans-serif, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground',
    footerActionLink: 'text-primary',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-primary',
    alertText: 'text-destructive',
    logoBox: 'h-10',
    logoImage: 'h-9 w-9',
    socialButtonsBlockButton: 'border-border bg-card hover:bg-secondary',
    formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    formFieldInput: 'border-border bg-card text-foreground',
    footerAction: 'text-muted-foreground',
    dividerLine: 'bg-border',
    alert: 'border-destructive/30 bg-destructive/10',
    otpCodeFieldInput: 'border-border bg-card text-foreground',
    formFieldRow: 'gap-1.5',
    main: 'gap-5',
  },
};

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function AuthCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const nextUserId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) {
        client.clear();
      }
      previousUserId.current = nextUserId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  return isSignedIn ? <Redirect to="/dashboard" /> : <LandingPage />;
}

function LoadingScreen() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background">
      <div className="skeleton h-12 w-12 rounded-2xl" aria-label="Loading AutoBiz" />
    </div>
  );
}

function AuthenticatedRoutes() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/" />;

  return (
    <Switch>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/billing/new" component={NewInvoicePage} />
      <Route path="/billing/:id" component={InvoiceDetailPage} />
      <Route path="/sales" component={SalesPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/suppliers" component={SuppliersPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/assistant" component={AssistantPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route component={AuthenticatedRoutes} />
    </Switch>
  );
}

function App() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Sign in to access your business workspace',
          },
        },
        signUp: {
          start: {
            title: 'Create your AutoBiz account',
            subtitle: 'Get started with a clearer operating rhythm',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <AuthCacheInvalidator />
      <Router />
    </ClerkProvider>
  );
}

export default function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <App />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}