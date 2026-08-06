"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BrandBar from "@/components/BrandBar";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", adminOnly: false },
  { href: "/entry", label: "Monthly entry", adminOnly: false },
  { href: "/revenue", label: "Revenue import", adminOnly: false },
  { href: "/admin", label: "Access", adminOnly: true },
];

export default function AppShell({
  email,
  isAdmin = false,
  children,
}: {
  email: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV.filter((item) => isAdmin || !item.adminOnly);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (email.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3 sm:px-8">
          <Link href="/dashboard" className="shrink-0" aria-label="Farmley home">
            <Logo className="h-10" />
          </Link>

          <span className="hidden h-6 w-px bg-navy-100 lg:block" />

          <nav className="hidden items-center gap-1 lg:flex">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "relative rounded-lg px-3.5 py-2 text-sm font-semibold text-navy-900"
                      : "rounded-lg px-3.5 py-2 text-sm font-medium text-navy-500 transition hover:bg-navy-50 hover:text-navy-800"
                  }
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-amber-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">
                {initial}
              </div>
              <div className="leading-tight">
                <p className="max-w-[14rem] truncate text-sm font-medium text-navy-800">
                  {email}
                </p>
                {isAdmin && <span className="badge-amber">Admin</span>}
              </div>
            </div>

            <button onClick={signOut} className="btn-ghost hidden sm:inline-flex">
              Sign out
            </button>

            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="btn-ghost px-3 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-navy-100 bg-white px-5 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={
                    pathname === item.href
                      ? "rounded-lg bg-navy-50 px-3 py-2.5 text-sm font-semibold text-navy-900"
                      : "rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 hover:bg-navy-50"
                  }
                >
                  {item.label}
                </Link>
              ))}
              <button onClick={signOut} className="btn-ghost mt-2 w-full">
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl animate-fade-up px-5 py-8 sm:px-8 sm:py-10">
        {children}
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-navy-100 pt-6">
          <BrandBar size="sm" />
          <p className="text-xs text-navy-400">Job work cost tracking</p>
        </div>
      </footer>
    </div>
  );
}
