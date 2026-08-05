"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/dashboard" className="text-lg font-bold text-brand-700">
            JW Web
          </Link>

          <nav className="flex gap-1">
            {NAV.filter((item) => isAdmin || !item.adminOnly).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href
                    ? "rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700"
                    : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {email}
              {isAdmin && (
                <span className="ml-2 rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  admin
                </span>
              )}
            </span>
            <button onClick={signOut} className="btn-ghost">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
