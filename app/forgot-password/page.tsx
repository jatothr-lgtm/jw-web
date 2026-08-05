"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setBusy(false);
      return;
    }

    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="text-sm text-slate-600">
          If an account exists for <strong>{email}</strong>, a reset message is on its
          way. Open it and click the link to choose a new password.
        </p>
        <p className="text-sm text-slate-600">
          If your email shows a 6-digit code instead of a link, enter it on the reset
          page.
        </p>
        <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="btn-ghost w-full">
          I have a code
        </Link>
        <Link href="/login" className="block text-center text-sm text-slate-500 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-bold">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-500">
          We&apos;ll email you a link to set a new one.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Sending…" : "Send reset email"}
      </button>

      <Link href="/login" className="block text-center text-sm text-slate-500 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
