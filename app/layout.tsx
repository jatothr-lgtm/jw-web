import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JW Web — Job Work Cost Entry",
  description: "Monthly job-work cost and revenue capture across plants",
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
