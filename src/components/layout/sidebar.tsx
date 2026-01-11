"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  Package,
  Map,
  Target,
  Settings,
} from "lucide-react";

/**
 * Sidebar Navigation
 *
 * Desktop sidebar with navigation links. Hidden on mobile.
 * Uses route-based active state highlighting.
 *
 * Navigation structure:
 * - Dashboard (overview)
 * - Upload (OCR screenshot upload)
 * - Stockpiles (inventory management)
 * - Cities (location management)
 * - Operations (planning)
 * - Settings (user/guild config)
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/stockpiles", label: "Stockpiles", icon: Package },
  { href: "/cities", label: "Cities", icon: Map },
  { href: "/operations", label: "Operations", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-card border-r">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Quartermaster</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
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

      {/* Footer with version */}
      <div className="px-6 py-4 border-t">
        <p className="text-xs text-muted-foreground">
          Foxhole Quartermaster v0.1.0
        </p>
      </div>
    </aside>
  );
}
