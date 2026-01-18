import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/toaster";

/**
 * Root Layout
 *
 * This is the top-level layout that wraps the entire application.
 * It provides:
 * - Font loading (Inter for clean, readable UI)
 * - Dark mode class on html element (default for Foxhole players)
 * - Session provider for NextAuth client-side hooks
 * - Toast notifications
 */

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Foxhole Quartermaster",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
