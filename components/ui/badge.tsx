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
        /** Kondisi kucing — tiap status warna beda dan sesuai makna */
        sehat: "bg-emerald-100 text-emerald-800 border border-emerald-200/80",
        membaik: "bg-green-100 text-green-800 border border-green-200/80",
        hampir_sembuh: "bg-teal-100 text-teal-800 border border-teal-200/80",
        observasi: "bg-slate-100 text-slate-700 border border-slate-200/80",
        memburuk: "bg-amber-100 text-amber-800 border border-amber-200/80",
        sakit: "bg-rose-100 text-rose-800 border border-rose-200/80",
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
