"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    // With email confirmation switched on, signUp returns no session.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setNotice("Account created. Check your inbox to confirm the address, then sign in.");
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">Create an account</h1>
          <p className="mt-1 text-sm text-slate-500">JW monthly cost entry</p>
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

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
