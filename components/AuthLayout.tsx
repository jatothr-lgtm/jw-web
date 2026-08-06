import Logo from "@/components/Logo";

const HIGHLIGHTS = [
  "Pick a plant — MFG type fills itself in",
  "Revenue pulled straight from your sales file",
  "JW/kg, PPP and cost ratios calculated as you type",
];

/**
 * Split layout: brand story on the left, the form on the right.
 *
 * The left panel is backed by a photo of the production floor. If that file is
 * absent the layer simply paints nothing and the navy base plus its gradient
 * washes show through, so the page never renders a broken image.
 */
const PANEL_PHOTO = "/brands/plant-floor.jpg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative isolate overflow-hidden bg-navy-900 px-6 py-8 sm:px-10 lg:w-[52%] lg:px-14 lg:py-12">
        {/* Photo, graded cool and dimmed so white type stays legible. */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage: `url('${PANEL_PHOTO}')`,
            filter: "saturate(0.75) contrast(1.05) brightness(0.85)",
          }}
          aria-hidden
        />
        {/* Navy wash: heavy at the bottom where the text sits, lighter at the top
            so the machinery still reads. */}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/75 via-navy-950/80 to-navy-950/95"
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/70 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex h-full min-h-[26rem] flex-col">
          <Logo className="h-12 sm:h-14" tone="light" />

          <div className="mt-auto pt-10">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm lg:text-4xl">
              Job work costs,
              <br />
              <span className="text-amber-300">one month at a time.</span>
            </h2>

            <ul className="mt-6 space-y-3">
              {HIGHLIGHTS.map((line) => (
                <li key={line} className="flex items-start gap-3 text-navy-100">
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/25"
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
                  <span className="text-sm leading-relaxed drop-shadow-sm">{line}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs tracking-wide text-navy-200">
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
