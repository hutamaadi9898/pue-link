import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-sm px-2 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "border bg-card",
      warning: "bg-amber-100 text-amber-700",
      success: "bg-emerald-100 text-emerald-700",
      destructive: "bg-red-100 text-destructive"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
