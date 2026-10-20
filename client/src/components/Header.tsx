import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpenIcon, MenuIcon, SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { holidayPhase } from "@/lib/holiday";
import { useNow } from "@/lib/useNow";

const navLinkClass =
  "px-3 py-2 rounded-md text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-lg px-1 py-1" aria-label="StoryBloom home" data-testid="link-logo">
      <span className="h-8 w-8 bg-gradient-to-br from-primary to-chart-2 rounded-lg flex items-center justify-center">
        <BookOpenIcon className="h-5 w-5 text-primary-foreground" aria-hidden />
      </span>
      <span className="text-xl font-display font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
        StoryBloom
      </span>
    </Link>
  );
}

export default function Header() {
  const { isAuthenticated, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const holiday = holidayPhase(useNow()) !== "off";

  const links = [
    ...(holiday ? [{ href: "/christmas-book-for-kids", label: "Holiday books" }] : []),
    { href: "/examples", label: "Examples" },
    { href: "/pricing", label: "Pricing" },
    ...(isAuthenticated ? [{ href: "/mystories", label: "My Stories" }] : []),
  ];

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Main" className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={navLinkClass}>
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={navLinkClass}>
                  Account
                </Link>
                <button type="button" onClick={handleSignOut} className={navLinkClass}>
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/signin" className={navLinkClass}>
                Sign in
              </Link>
            )}
            <Button asChild className="ml-2 gap-2">
              <Link href="/create" data-testid="button-create-story">
                <SparklesIcon className="h-4 w-4" aria-hidden />
                Create a book
              </Link>
            </Button>
          </nav>

          <div className="flex md:hidden items-center gap-2">
            <Button asChild size="sm" className="gap-1">
              <Link href="/create">
                <SparklesIcon className="h-4 w-4" aria-hidden />
                Create
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Main" className="md:hidden flex flex-col gap-1 pt-3 pb-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={navLinkClass} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={navLinkClass} onClick={() => setOpen(false)}>
                  Account
                </Link>
                <button type="button" onClick={handleSignOut} className={`${navLinkClass} text-left`}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className={navLinkClass} onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link href="/signup" className={navLinkClass} onClick={() => setOpen(false)}>
                  Create an account
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
