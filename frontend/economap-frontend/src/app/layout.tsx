import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconoMap",
  description: "Plan grocery and gas station trips with optimized routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
