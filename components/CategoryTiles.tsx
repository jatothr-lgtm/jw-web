/**
 * Decorative category tiles for the auth panel.
 *
 * The palette and the bold display type echo farmley.com's product grid, but
 * the artwork here is original — gradients and a seed motif rather than any
 * copied product photography.
 */
const TILES = [
  { name: "Date Bites", from: "#1d6fa5", to: "#2f95c9", seeds: 5 },
  { name: "Dry Fruit Mixes", from: "#7b1740", to: "#b02a5c", seeds: 7 },
  { name: "Roasted Makhana", from: "#5f2483", to: "#9243b0", seeds: 6 },
  { name: "Premium Seeds", from: "#241a63", to: "#3f2f9e", seeds: 8 },
] as const;

export default function CategoryTiles({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`} aria-hidden>
      {TILES.map((tile) => (
        <div
          key={tile.name}
          className="relative overflow-hidden rounded-2xl px-4 py-5"
          style={{ backgroundImage: `linear-gradient(135deg, ${tile.from}, ${tile.to})` }}
        >
          {/* Scattered seed shapes, deterministic so the layout never jumps. */}
          {Array.from({ length: tile.seeds }).map((_, index) => {
            const size = 6 + ((index * 5) % 11);
            return (
              <span
                key={index}
                className="absolute rounded-full bg-white/15"
                style={{
                  width: size,
                  height: size * 0.68,
                  top: `${(index * 37) % 80 + 6}%`,
                  left: `${(index * 53) % 78 + 14}%`,
                  transform: `rotate(${(index * 47) % 180}deg)`,
                }}
              />
            );
          })}

          <p className="relative text-sm font-extrabold uppercase leading-tight tracking-wide text-white">
            {tile.name}
          </p>
        </div>
      ))}
    </div>
  );
}
