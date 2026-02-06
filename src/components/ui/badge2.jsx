import * as React from "react"
import { cva } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const badge2Variants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        success: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
        info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
        destructive: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
        outline: "border-current bg-transparent text-foreground",
        progressing: "border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge2({ className, variant, children, ...props }) {
  return (
    <div className={cn(badge2Variants({ variant }), className)} {...props}>
      {/* <div className="w-2 h-2 aspect-square rounded-full bg-amber-500"></div> */}
      {variant === "progressing" && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {children}
    </div>
  )
}

export { Badge2, badge2Variants }
