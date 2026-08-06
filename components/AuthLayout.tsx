import Logo from "@/components/Logo";

const HIGHLIGHTS = [
  "Pick a plant — MFG type fills itself in",
  "Revenue pulled straight from your sales file",
  "JW/kg, PPP and cost ratios calculated as you type",
];

/** Split layout: brand story on the left, the form on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative overflow-hidden bg-navy-900 px-8 py-10 lg:w-[46%] lg:px-14 lg:py-16">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-navy-500/25 blur-3xl"
          aria-hidden
        />

        <div className="relative flex h-full flex-col">
          <Logo className="h-11 w-auto" tone="light" />

          <div className="mt-10 lg:mt-auto lg:pb-6">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
              Job work costs,
              <br />
              <span className="text-amber-300">one month at a time.</span>
            </h2>

            <ul className="mt-8 space-y-3.5">
              {HIGHLIGHTS.map((line) => (
                <li key={line} className="flex items-start gap-3 text-navy-100">
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/20"
                    aria-hidden
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6.2l2.3 2.3 4.7-5"
                        stroke="#eabd63"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-sm leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>

            <p className="mt-10 hidden text-xs text-navy-300 lg:block">
              Indore · Purnia · Kundli · UD · Rebela
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[26rem] animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
