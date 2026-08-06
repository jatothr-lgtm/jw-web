import Image from "next/image";

const BRANDS = [
  { src: "/brands/farmley.png", alt: "Farmley", width: 95, height: 75 },
  { src: "/brands/date-bites.png", alt: "Date Bites", width: 85, height: 63 },
  { src: "/brands/makha-shaka.png", alt: "Makha Shaka", width: 102, height: 60 },
] as const;

/**
 * The three house brands, shown as one lockup.
 *
 * `tone="light"` sits them on a white plate, because all three wordmarks are
 * navy and would disappear against the navy panel. `w-fit`/`self-start` keep
 * that plate hugging its contents — inside a flex column it would otherwise
 * stretch the full width.
 */
export default function Logo({
  className = "",
  tone = "navy",
  compact = false,
}: {
  className?: string;
  tone?: "navy" | "light";
  compact?: boolean;
}) {
  const brands = compact ? BRANDS.slice(0, 1) : BRANDS;

  return (
    <span
      className={
        tone === "light"
          ? `inline-flex w-fit shrink-0 items-center gap-4 self-start rounded-2xl bg-white px-4 py-2.5 shadow-sm sm:gap-6 ${className}`
          : `inline-flex w-fit shrink-0 items-center gap-3.5 sm:gap-5 ${className}`
      }
    >
      {brands.map((brand) => (
        <Image
          key={brand.src}
          src={brand.src}
          alt={brand.alt}
          width={brand.width}
          height={brand.height}
          priority
          // Source art is already tiny; re-encoding it only softens the edges.
          unoptimized
          className="h-full w-auto object-contain"
        />
      ))}
    </span>
  );
}
