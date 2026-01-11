"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  Package,
  Target,
} from "lucide-react";

/**
 * Mobile Bottom Navigation
 *
 * Fixed bottom navigation bar for mobile devices.
 * Shows the 4 most important navigation items:
 * - Dashboard
 * - Upload (primary action)
 * - Stockpiles
 * - Operations
 *
 * Design decisions:
 * - 44px min tap targets for accessibility
 * - Active state with filled icons
 * - Hidden on desktop (md breakpoint)
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mobileNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/stockpiles", label: "Stockpiles", icon: Package },
  { href: "/operations", label: "Ops", icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] h-full px-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
