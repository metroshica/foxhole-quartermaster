"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  Target,
  Factory,
  Truck,
  History,
  Settings,
} from "lucide-react";

/**
 * Dashboard Layout
 *
 * Main application layout with:
 * - Desktop: Fixed sidebar + scrollable content area
 * - Mobile: Header with hamburger menu + bottom navigation + slide-out drawer
 *
 * Layout structure:
 * - Sidebar (hidden on mobile)
 * - Main content area with header
 * - Mobile bottom nav (hidden on desktop)
 * - Mobile drawer (triggered by hamburger)
 */

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/stockpiles", label: "Stockpiles", icon: Package },
  { href: "/operations", label: "Operations", icon: Target },
  { href: "/orders/production", label: "Production", icon: Factory },
  { href: "/orders/transport", label: "Transport", icon: Truck },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const regimentName = session?.user?.regimentName;
  const regimentIcon = session?.user?.regimentIcon;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col px-6 py-4 border-b">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => setMobileMenuOpen(false)}
            >
              {regimentIcon ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={regimentIcon} alt={regimentName || "Regiment"} />
                  <AvatarFallback>
                    {regimentName?.substring(0, 2).toUpperCase() || "QM"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-base truncate">
                  {regimentName || "Select Regiment"}
                </span>
                <span className="text-xs text-muted-foreground">Quartermaster</span>
              </div>
            </Link>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
