"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  Briefcase,
  Heart,
  Lightbulb,
  LogOut,
  Menu,
  Repeat,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { RelationshipSessionSwitcher } from "@/components/relationship-session-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SelectedRelationshipProvider, useSelectedRelationship } from "@/contexts/selected-relationship-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function AppShellInner({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();
  const { healingLoopHref, insightsHref, briefingsHref, cyclesHref } = useSelectedRelationship();

  const navItems = [
    { href: healingLoopHref, label: "Healing Loop", icon: Heart },
    { href: cyclesHref, label: "Cycles", icon: Repeat },
    { href: insightsHref, label: "Insights", icon: Lightbulb },
    { href: briefingsHref, label: "Briefings", icon: Briefcase },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isNavActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href.includes("/loop")) {
      return pathname.includes("/loop");
    }
    if (href.includes("/cycles")) {
      return pathname.includes("/cycles");
    }
    if (href.startsWith("/insights")) {
      return pathname === "/insights" || pathname.startsWith("/insights/");
    }
    if (href.startsWith("/briefings")) {
      return pathname === "/briefings" || pathname.startsWith("/briefings/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden font-serif text-lg font-semibold tracking-tight sm:inline">
              Aura & Anchor
            </span>
          </Link>

          <RelationshipSessionSwitcher />

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isNavActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {userName && (
              <span className="hidden text-sm text-muted-foreground md:inline">
                {userName}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-border/60 px-4 py-3 lg:hidden">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm",
                  isNavActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string | null;
  /** @deprecated Nav uses selected relationship from context */
  healingLoopHref?: string;
}) {
  return (
    <SelectedRelationshipProvider>
      <AppShellInner userName={userName}>{children}</AppShellInner>
    </SelectedRelationshipProvider>
  );
}

export function LandingNav() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400/20 to-teal-400/20">
            <Anchor className="h-5 w-5 text-primary" />
          </div>
          <span className="font-serif text-lg font-semibold">Aura & Anchor</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="#pricing">Pricing</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href={`/login?redirect=${encodeURIComponent("/subscribe?plan=monthly")}`}>
              <Sparkles className="h-4 w-4" />
              Get started
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
