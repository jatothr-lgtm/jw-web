import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farmley — Job Work Cost Entry",
  description: "Monthly job-work cost and revenue capture across Farmley plants",
  icons: {
    // Inline SVG favicon: the Farmley navy badge with an F, no asset request.
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
               <rect width="64" height="64" rx="16" fill="#1b2c4f"/>
               <text x="32" y="45" font-family="system-ui,Segoe UI,Arial" font-size="38"
                     font-weight="700" fill="#eabd63" text-anchor="middle">F</text>
             </svg>`,
          ),
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1b2c4f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
