import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        faction:
          "border-transparent bg-faction text-primary-foreground hover:brightness-110",
        // Status badges with subtle glow effects
        success:
          "border-transparent bg-green-500/20 text-green-400 dark:bg-green-500/15 dark:text-green-400",
        warning:
          "border-transparent bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400",
        danger:
          "border-transparent bg-red-500/20 text-red-600 dark:bg-red-500/15 dark:text-red-400",
        info:
          "border-transparent bg-blue-500/20 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
      },
      glow: {
        none: "",
        active: "shadow-glow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      glow: "none",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, glow, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, glow }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
