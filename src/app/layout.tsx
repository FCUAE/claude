import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrendSnipe — Daily Trending Product Scanner",
  description:
    "Discover 5 trending products daily, scored by PMF signals and vibe-code difficulty.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
