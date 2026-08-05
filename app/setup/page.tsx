import { isSupabaseConfigured, missingEnvVars } from "@/lib/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/dashboard");

  const missing = missingEnvVars();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-xl space-y-4">
        <h1 className="text-xl font-bold">Not configured yet</h1>

        <p className="text-sm text-slate-600">
          The app cannot reach Supabase because{" "}
          {missing.length === 1 ? "this environment variable is" : "these environment variables are"}{" "}
          missing:
        </p>

        <ul className="space-y-1">
          {missing.map((name) => (
            <li key={name} className="rounded bg-slate-100 px-3 py-2 font-mono text-sm">
              {name}
            </li>
          ))}
        </ul>

        <div className="space-y-2 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">To fix on Vercel</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Project → Settings → Environment Variables → add the names above.</li>
            <li>Tick all three environments (Production, Preview, Development).</li>
            <li>
              Deployments → latest → Redeploy. These are build-time values, so an
              existing deployment will not pick them up on its own.
            </li>
          </ol>
        </div>

        <p className="text-xs text-slate-500">
          Values come from Supabase → Project Settings → API: the Project URL and the
          publishable (anon) key.
        </p>
      </div>
    </main>
  );
}
