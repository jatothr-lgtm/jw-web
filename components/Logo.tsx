import Image from "next/image";

/**
 * The real Farmley mark, cropped from the supplied brand sheet.
 *
 * The artwork is navy-on-yellow, so it reads correctly on light surfaces as-is.
 * On the navy auth panel the yellow blob still carries it, but `tone="light"`
 * adds a subtle white plate so the navy wordmark inside never muddies.
 */
export default function Logo({
  className = "",
  tone = "navy",
}: {
  className?: string;
  tone?: "navy" | "light";
}) {
  return (
    <span
      className={
        tone === "light"
          ? `inline-flex items-center rounded-xl bg-white/95 px-2.5 py-1.5 ${className}`
          : `inline-flex items-center ${className}`
      }
    >
      <Image
        src="/brands/farmley.png"
        alt="Farmley"
        width={95}
        height={75}
        priority
        unoptimized
        className="h-full w-auto object-contain"
      />
    </span>
  );
}
