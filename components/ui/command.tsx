"use client";
import * as React from "react";
import * as CommandPrimitive from "cmdk";
import { Search, User, FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SearchData } from "@/components/layout/shell";

type GlobalCommandProps = {
  searchData?: SearchData | null;
  sidebar?: boolean;
};

export function GlobalCommand({ searchData, sidebar }: GlobalCommandProps) {
  const [open, setOpen] = React.useState(false);

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
          "flex h-9 w-full items-center gap-2 bg-transparent px-0 text-left text-sm focus:outline-none",
          sidebar
            ? "border-b border-border text-muted-foreground hover:text-foreground [&_kbd]:text-muted-foreground/80"
            : "border-b border-border text-muted-foreground hover:text-foreground",
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
          className="fixed inset-0 z-40 flex items-start justify-center bg-background/80 px-4 pt-20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <CommandPrimitive.Command
            className={cn(
              "max-h-[70vh] w-full max-w-lg overflow-hidden border border-border bg-background",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <CommandPrimitive.CommandInput
              autoFocus
              placeholder="Nama kucing, ID, inventory, atau halaman…"
              className="h-11 w-full border-b border-border px-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <CommandPrimitive.CommandList className="max-h-[320px] overflow-y-auto text-sm">
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
                        href={`/cats/${cat.id}`}
                        label={`Profil: ${cat.name}`}
                        value={`profil ${cat.name} ${cat.cat_id}`}
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
            <div className="flex items-center justify-between border-t px-3 py-2 text-[10px] text-muted-foreground">
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
      <Link href={href} className="flex flex-1 items-center justify-between gap-2" tabIndex={-1}>
        <span>{label}</span>
        {subLabel ? (
          <span className="truncate text-xs text-muted-foreground">{subLabel}</span>
        ) : null}
      </Link>
    </CommandPrimitive.CommandItem>
  );
}
