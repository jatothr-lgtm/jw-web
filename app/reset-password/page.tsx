"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // Arriving via the emailed link leaves a recovery session in place; arriving
  // by hand means proving ownership with the 6-digit code first.
  const [verified, setVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setVerified(Boolean(data.session));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "recovery",
    });

    if (otpError) {
      setError(otpError.message);
      setBusy(false);
      return;
    }

    setVerified(true);
    setBusy(false);
  }

  async function setNewPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (verified === null) {
    return <div className="card w-full max-w-sm text-sm text-slate-500">Checking your link…</div>;
  }

  if (!verified) {
    return (
      <form onSubmit={verifyCode} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">Enter your code</h1>
          <p className="mt-1 text-sm text-slate-500">
            Paste the 6-digit code from the reset email. If your email had a link
            instead, click that link and you will skip this step.
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

        <div>
          <label className="label" htmlFor="code">6-digit code</label>
          <input
            id="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="input tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Verifying…" : "Verify code"}
        </button>

        <Link href="/forgot-password" className="block text-center text-sm text-slate-500 hover:underline">
          Send a new email
        </Link>
      </form>
    );
  }

  return (
    <form onSubmit={setNewPassword} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-bold">Choose a new password</h1>
        <p className="mt-1 text-sm text-slate-500">At least 8 characters.</p>
      </div>

      <div>
        <label className="label" htmlFor="password">New password</label>
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
        <label className="label" htmlFor="confirm">Confirm new password</label>
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

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : "Set password and sign in"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
