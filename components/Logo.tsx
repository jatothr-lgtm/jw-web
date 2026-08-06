/**
 * Farmley mark, drawn inline so it stays crisp at any size and needs no asset
 * request. `tone` switches between the navy badge (light backgrounds) and a
 * knocked-out white version (navy backgrounds).
 */
export default function Logo({
  className = "",
  tone = "navy",
}: {
  className?: string;
  tone?: "navy" | "light";
}) {
  const badge = tone === "navy" ? "#1b2c4f" : "#ffffff";
  const text = tone === "navy" ? "#ffffff" : "#1b2c4f";

  return (
    <svg
      viewBox="0 0 168 56"
      className={className}
      role="img"
      aria-label="Farmley"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rounded badge with the leaf-style notch on the lower right. */}
      <path
        fill={badge}
        d="M10 4h148c3.3 0 6 2.7 6 6v25c0 8-6.5 14.5-14.5 14.5H33c-9 0-13.5 6-19 6H10c-3.3 0-6-2.7-6-6V10c0-3.3 2.7-6 6-6z"
      />
      <text
        x="20"
        y="30"
        fill={text}
        fontFamily="ui-sans-serif, system-ui, Segoe UI, Roboto, Arial, sans-serif"
        fontSize="21"
        fontWeight="700"
        letterSpacing="-0.4"
      >
        Farmley
      </text>
      <text
        x="20"
        y="42"
        fill={text}
        fillOpacity="0.85"
        fontFamily="ui-sans-serif, system-ui, Segoe UI, Roboto, Arial, sans-serif"
        fontSize="9"
        fontWeight="500"
        letterSpacing="1.6"
      >
        wholesome snacking
      </text>
    </svg>
  );
}
