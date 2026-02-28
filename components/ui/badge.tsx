import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        /** Soft red — overdue / needs attention / Sakit */
        overdue:
          "bg-[hsl(var(--status-bg-overdue))] text-[hsl(var(--status-overdue))]",
        /** Soft amber — due soon / monitor / Kurang Baik */
        "due-soon":
          "bg-[hsl(var(--status-bg-due-soon))] text-[hsl(var(--status-due-soon))]",
        /** Soft green — ok / healthy / Baik */
        ok: "bg-[hsl(var(--status-bg-ok))] text-[hsl(var(--status-ok))]",
        /** Cat status: Baik → same as ok */
        baik: "bg-[hsl(var(--status-bg-ok))] text-[hsl(var(--status-ok))]",
        /** Cat status: Kurang Baik → same as due-soon */
        kurang_baik:
          "bg-[hsl(var(--status-bg-due-soon))] text-[hsl(var(--status-due-soon))]",
        /** Cat status: Sakit → same as overdue */
        sakit:
          "bg-[hsl(var(--status-bg-overdue))] text-[hsl(var(--status-overdue))]",
        /** Lokasi: Rumah — hijau lembut */
        location_rumah:
          "bg-[hsl(var(--status-bg-ok))] text-[hsl(var(--status-ok))] border border-[hsl(var(--status-ok)/0.2)]",
        /** Lokasi: Toko — amber lembut */
        location_toko:
          "bg-[hsl(var(--status-bg-due-soon))] text-[hsl(var(--status-due-soon))] border border-[hsl(var(--status-due-soon)/0.2)]",
        /** Lokasi: Klinik — biru/netral mewah */
        location_klinik:
          "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.25)]",
        /** Neutral outline */
        outline: "border border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
