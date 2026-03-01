"use client";
import * as React from "react";
import * as CommandPrimitive from "cmdk";
import { Search, User, FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { SearchData } from "@/components/layout/shell";

type GlobalCommandProps = {
  searchData?: SearchData | null;
  sidebar?: boolean;
};

export function GlobalCommand({ searchData, sidebar }: GlobalCommandProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname() ?? "/cats";

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const cats = searchData?.cats ?? [];
  const inventoryItems = searchData?.inventoryItems ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm shadow-sm focus:outline-none",
          sidebar
            ? "text-muted-foreground hover:text-foreground [&_kbd]:text-muted-foreground/80"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Cari…</span>
        <kbd className="hidden text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/20 px-4 pt-20 backdrop-blur-md"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <CommandPrimitive.Command
            className={cn(
              "max-h-[70vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border shadow-lg",
              "bg-[hsl(38,22%,97%)] text-foreground",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <CommandPrimitive.CommandInput
              autoFocus
              placeholder="Nama kucing, ID, inventory, atau halaman…"
              className="h-11 w-full border-b border-border bg-[hsl(38,22%,97%)] px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <CommandPrimitive.CommandList className="max-h-[320px] overflow-y-auto bg-[hsl(38,22%,97%)] text-sm text-foreground">
              <CommandPrimitive.CommandEmpty className="px-4 py-6 text-center text-xs text-muted-foreground">
                Tidak ada hasil. Coba kata kunci lain.
              </CommandPrimitive.CommandEmpty>

              <CommandPrimitive.CommandGroup
                heading="Navigasi"
                className="px-1 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                {[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/cats", label: "Cats" },
                  { href: "/health", label: "Health" },
                  { href: "/grooming", label: "Grooming" },
                  { href: "/inventory", label: "Inventory" },
                  { href: "/activity", label: "Activity" },
                ].map(({ href, label }) => (
                  <CommandItemLink
                    key={href}
                    href={href}
                    label={label}
                    value={label}
                    setOpen={setOpen}
                  />
                ))}
              </CommandPrimitive.CommandGroup>

              {cats.length > 0 ? (
                <CommandPrimitive.CommandGroup
                  heading="Kucing — Profil & Laporan"
                  className="px-1 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {cats.map((cat) => (
                    <React.Fragment key={cat.id}>
                      <CommandItemLink
                        href={`/cats/${cat.id}?returnTo=${encodeURIComponent(pathname)}`}
                        label={`Profil: ${cat.name}`}
                        value={`profil ${cat.name}`}
                        setOpen={setOpen}
                        icon={<User className="h-4 w-4" />}
                      />
                    </React.Fragment>
                  ))}
                </CommandPrimitive.CommandGroup>
              ) : null}

              {inventoryItems.length > 0 ? (
                <CommandPrimitive.CommandGroup
                  heading="Inventory"
                  className="px-1 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {inventoryItems.map((item) => (
                    <CommandItemLink
                      key={item.id}
                      href={`/inventory?q=${encodeURIComponent(item.name)}`}
                      label={item.name}
                      value={`${item.name} ${item.categoryName} inventory`}
                      setOpen={setOpen}
                      icon={<Package className="h-4 w-4" />}
                      subLabel={item.categoryName}
                    />
                  ))}
                </CommandPrimitive.CommandGroup>
              ) : null}
            </CommandPrimitive.CommandList>
            <div className="flex items-center justify-between border-t border-border bg-[hsl(38,22%,97%)] px-3 py-2 text-[10px] text-muted-foreground">
              <span>Profil kucing, laporan, inventory, dan halaman</span>
              <span>Esc tutup</span>
            </div>
          </CommandPrimitive.Command>
        </div>
      ) : null}
    </>
  );
}

function CommandItemLink({
  href,
  label,
  value,
  setOpen,
  icon,
  subLabel,
}: {
  href: string;
  label: string;
  value: string;
  setOpen: (open: boolean) => void;
  icon?: React.ReactNode;
  subLabel?: string;
}) {
  const router = useRouter();
  return (
    <CommandPrimitive.CommandItem
      value={value}
      onSelect={() => {
        setOpen(false);
        router.push(href);
      }}
      className="group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm data-[selected=true]:bg-muted"
    >
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <Link href={href} className="flex flex-1 items-center justify-between gap-2 text-foreground" tabIndex={-1}>
        <span className="font-medium">{label}</span>
        {subLabel ? (
          <span className="truncate text-xs text-muted-foreground">{subLabel}</span>
        ) : null}
      </Link>
    </CommandPrimitive.CommandItem>
  );
}
