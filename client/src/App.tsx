import { Suspense, useEffect, useRef } from "react";
import { Redirect, Route, Router, Switch, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HolidayBanner from "@/components/HolidayBanner";
import NotFound from "@/pages/NotFound";
import { AuthProvider, useAuth } from "@/lib/auth";
import { trackPageView } from "@/lib/track";
import { applyHead } from "@/seo/seo";
import { ROUTES, pageMetaFor, type RouteDef } from "./routes";

function PageLoading() {
  return (
    <div className="py-24 text-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mx-auto" aria-label="Loading" />
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  if (loading) return <PageLoading />;
  if (!isAuthenticated) return <Redirect to={`/signin?next=${encodeURIComponent(location)}`} />;
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

function renderRoute(route: RouteDef) {
  const Page = route.component;
  return route.access === "protected" ? (
    <Protected>
      <Page />
    </Protected>
  ) : (
    <Page />
  );
}

/** Keeps <head>, scroll position and analytics in step with client-side navigation. */
function RouteEffects() {
  const [location] = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const meta = pageMetaFor(location);
    applyHead(meta);
    if (!first.current) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    first.current = false;
    trackPageView(location, meta.title);
  }, [location]);
  return null;
}

function Shell() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-3 focus:bg-background">
        Skip to content
      </a>
      <HolidayBanner />
      <Header />
      <main id="main" className="flex-1">
        <Switch>
          {ROUTES.map((route) => (
            <Route key={route.path} path={route.path}>
              {renderRoute(route)}
            </Route>
          ))}
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </main>
      <Footer />
      <Toaster />
      <RouteEffects />
    </div>
  );
}

export default function App({ ssrPath }: { ssrPath?: string }) {
  return (
    <AuthProvider>
      <Router ssrPath={ssrPath} ssrSearch={ssrPath === undefined ? undefined : ""}>
        <Shell />
      </Router>
    </AuthProvider>
  );
}
