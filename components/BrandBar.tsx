import Image from "next/image";

/**
 * The three house brands, cropped from the supplied brand sheet.
 * Rendered as one row, matching the reference layout.
 */
const BRANDS = [
  { src: "/brands/farmley.png", alt: "Farmley", width: 95, height: 75 },
  { src: "/brands/date-bites.png", alt: "Date Bites", width: 85, height: 63 },
  { src: "/brands/makha-shaka.png", alt: "Makha Shaka", width: 102, height: 60 },
] as const;

export default function BrandBar({
  className = "",
  size = "md",
  onDark = false,
}: {
  className?: string;
  size?: "sm" | "md";
  onDark?: boolean;
}) {
  const height = size === "sm" ? "h-7" : "h-10";

  return (
    <div
      className={
        onDark
          ? `inline-flex items-center gap-5 rounded-2xl bg-white/95 px-5 py-3 sm:gap-7 ${className}`
          : `inline-flex items-center gap-5 rounded-2xl border border-navy-100 bg-white px-5 py-3 sm:gap-7 ${className}`
      }
    >
      {BRANDS.map((brand) => (
        <Image
          key={brand.src}
          src={brand.src}
          alt={brand.alt}
          width={brand.width}
          height={brand.height}
          // Source art is already tiny; re-encoding it only softens the edges.
          unoptimized
          className={`${height} w-auto object-contain`}
        />
      ))}
    </div>
  );
}
