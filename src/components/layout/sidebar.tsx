"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Package,
  Target,
  Factory,
  Truck,
  History,
  Trophy,
  Activity,
  Settings,
  Users,
  Shield,
} from "lucide-react";

/**
 * Sidebar Navigation
 *
 * Desktop sidebar with navigation links. Hidden on mobile.
 * Uses route-based active state highlighting.
 * Displays regiment branding (Discord server icon + name) in header.
 *
 * Navigation structure:
 * - Dashboard (overview)
 * - Upload (OCR screenshot upload)
 * - Stockpiles (inventory management)
 * - Operations (planning)
 * - Settings (user/regiment config)
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stockpiles", label: "Stockpiles", icon: Package },
  { href: "/operations", label: "Operations", icon: Target },
  { href: "/orders/production", label: "Production Orders", icon: Factory },
  { href: "/orders/transport", label: "Transport Orders", icon: Truck },
  { href: "/history", label: "Scan History", icon: History },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/roles", label: "Roles", icon: Shield, adminOnly: true },
];

// Dynamic font sizing for regiment names based on length
function getRegimentNameClasses(name: string | null | undefined): string {
  const length = name?.length || 0;
  if (length <= 16) {
    // Short names: normal size, single line
    return "text-base truncate";
  } else if (length <= 28) {
    // Medium names: slightly smaller, allow 2 lines
    return "text-sm line-clamp-2";
  } else {
    // Long names: smaller, allow 2 lines
    return "text-xs line-clamp-2";
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const regimentName = session?.user?.regimentName;
  const regimentIcon = session?.user?.regimentIcon;
  const isAdmin = session?.user?.permissions?.includes("admin.manage_roles") ||
    session?.user?.permissions?.includes("admin.manage_users");

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border/50">
      {/* Regiment Branding + App Name */}
      <div className="flex flex-col px-6 py-4 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          {regimentIcon ? (
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-faction/20 transition-all duration-150 group-hover:ring-faction/40">
              <AvatarImage src={regimentIcon} alt={regimentName || "Regiment"} />
              <AvatarFallback className="bg-faction-muted text-faction">
                {regimentName?.substring(0, 2).toUpperCase() || "QM"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-full bg-faction-muted flex items-center justify-center transition-all duration-150 group-hover:bg-faction/20">
              <Package className="h-5 w-5 text-faction" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span
              className={cn("font-semibold leading-tight", getRegimentNameClasses(regimentName))}
              title={regimentName || undefined}
            >
              {regimentName || "Select Regiment"}
            </span>
            <span className="text-xs text-muted-foreground">Quartermaster</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ease-out",
                  isActive
                    ? "bg-faction text-primary-foreground shadow-glow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary-foreground")} />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Footer with version */}
      <div className="px-6 py-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Foxhole Quartermaster v0.1.0
        </p>
      </div>
    </aside>
  );
}
