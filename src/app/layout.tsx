import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Root Layout
 *
 * This is the top-level layout that wraps the entire application.
 * It provides:
 * - Font loading (Inter for clean, readable UI)
 * - Dark mode class on html element (default for Foxhole players)
 * - Global providers will be added here (auth, theme, etc.)
 */

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Foxhole Quartermaster",
  description: "Regiment logistics tracking for Foxhole",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
