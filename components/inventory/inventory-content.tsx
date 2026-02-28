"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  createInventoryCategoryWithState,
  deleteInventoryCategoryWithState,
  createInventoryItemWithState,
  deleteInventoryItemWithState,
  adjustInventoryStockWithState,
  type InventoryFormState,
} from "@/app/actions/inventory";
import type { Tables } from "@/lib/types";

type InventoryCategory = Tables<"inventory_categories">;
type InventoryItem = Tables<"inventory_items">;

const initialFormState: InventoryFormState = { error: null };

function getStockStatus(item: InventoryItem): "ok" | "low" | "out" {
  const stock = Number(item.stock_qty);
  const min = item.min_stock_qty != null ? Number(item.min_stock_qty) : null;
  if (min == null) return stock <= 0 ? "out" : "ok";
  if (stock <= 0) return "out";
  if (stock <= min) return "low";
  return "ok";
}

export function InventoryContent({
  categories,
  items,
  admin,
  lowCount,
  outCount,
}: {
  categories: InventoryCategory[];
  items: InventoryItem[];
  admin: boolean;
  lowCount: number;
  outCount: number;
}) {
  const router = useRouter();
  const byCategoryId = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const list = byCategoryId.get(item.category_id) ?? [];
    list.push(item);
    byCategoryId.set(item.category_id, list);
  }

  return (
    <>
      {admin && (
        <section className="card border-b border-border pb-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Kelola kategori
          </h2>
          <CreateCategoryForm onSuccess={() => router.refresh()} />
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card px-5 py-4">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{items.length}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Total item</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-[hsl(var(--status-due-soon))]">{lowCount}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Stok rendah</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-[hsl(var(--status-overdue))]">{outCount}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Habis</p>
        </div>
      </section>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <InventorySection
            key={category.id}
            category={category}
            items={byCategoryId.get(category.id) ?? []}
            admin={admin}
            onSuccess={() => router.refresh()}
          />
        ))}
      </div>
    </>
  );
}

function CreateCategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction] = useActionState(createInventoryCategoryWithState, initialFormState);
  const prevError = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const nowNull = state?.error === null;
    const hadError = prevError.current != null;
    if (nowNull && hadError) onSuccess();
    prevError.current = state?.error ?? null;
  }, [state?.error, onSuccess]);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {state?.error && (
        <p className="w-full text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <label className="sr-only" htmlFor="cat-name">Nama kategori baru</label>
      <Input
        id="cat-name"
        name="name"
        placeholder="Nama kategori (mis. Litter, Food, Medicine)"
        className="h-9 w-48 text-sm"
        required
      />
      <Button type="submit" size="sm">
        Tambah kategori
      </Button>
    </form>
  );
}

function InventorySection({
  category,
  items,
  admin,
  onSuccess,
}: {
  category: InventoryCategory;
  items: InventoryItem[];
  admin: boolean;
  onSuccess: () => void;
}) {
  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {category.name}
        </h2>
      </div>
      <div className="px-5 py-4">
        {admin && <AddItemForm categoryId={category.id} onSuccess={onSuccess} />}
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada item.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <InventoryItemCard key={item.id} item={item} admin={admin} onSuccess={onSuccess} />
            ))}
          </ul>
        )}
        {admin && items.length === 0 && (
          <DeleteCategoryForm categoryId={category.id} onSuccess={onSuccess} />
        )}
      </div>
    </section>
  );
}

function DeleteCategoryForm({ categoryId, onSuccess }: { categoryId: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(deleteInventoryCategoryWithState, initialFormState);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const prevError = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const nowNull = state?.error === null;
    const hadError = prevError.current != null;
    if (nowNull && hadError) onSuccess();
    prevError.current = state?.error ?? null;
  }, [state?.error, onSuccess]);
  return (
    <>
      <form ref={formRef} action={formAction} className="mt-4 hidden">
        <input type="hidden" name="id" value={categoryId} />
      </form>
      {state?.error && (
        <p className="mb-2 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-destructive"
        onClick={() => setDialogOpen(true)}
      >
        Hapus kategori
      </Button>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Hapus kategori"
        description="Kategori dan semua item di dalamnya akan dihapus. Lanjutkan?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}

function AddItemForm({ categoryId, onSuccess }: { categoryId: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(createInventoryItemWithState, initialFormState);
  const prevError = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const nowNull = state?.error === null;
    const hadError = prevError.current != null;
    if (nowNull && hadError) onSuccess();
    prevError.current = state?.error ?? null;
  }, [state?.error, onSuccess]);
  return (
    <form action={formAction} className="mb-4 border-b border-border pb-4 text-sm">
      <input type="hidden" name="category_id" value={categoryId} />
      {state?.error && (
        <p className="mb-2 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Input name="name" placeholder="Nama item" className="mb-1.5 h-8 text-xs" required />
      <div className="flex gap-1.5">
        <Input name="unit" placeholder="Unit (kg, pcs, dll)" className="h-8 flex-1 text-xs" required />
        <Input name="min_stock_qty" type="number" min="0" step="1" placeholder="Min" className="h-8 w-16 text-xs" />
        <Input name="initial_stock" type="number" min="0" step="1" placeholder="Stok awal" className="h-8 w-20 text-xs" defaultValue="0" />
      </div>
      <Button type="submit" size="sm" className="mt-1.5 h-7 text-xs">
        Tambah item
      </Button>
    </form>
  );
}

function InventoryItemCard({
  item,
  admin,
  onSuccess,
}: {
  item: InventoryItem;
  admin: boolean;
  onSuccess: () => void;
}) {
  const status = getStockStatus(item);
  const stock = Number(item.stock_qty);
  const min = item.min_stock_qty != null ? Number(item.min_stock_qty) : null;
  const unit = item.unit;
  const statusVariant = status === "ok" ? "ok" : status === "low" ? "due-soon" : "overdue";
  const statusLabel = status === "ok" ? "Aman" : status === "low" ? "Rendah" : "Habis";

  return (
    <li className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {stock} {unit}
          {min != null && ` · min ${min}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={statusVariant} className={cn(status === "ok" && "opacity-80")}>
          {statusLabel}
        </Badge>
        {admin && (
          <>
            <QuickAdjustForm item={item} delta={-1} onSuccess={onSuccess} />
            <QuickAdjustForm item={item} delta={1} onSuccess={onSuccess} />
            <DeleteItemForm itemId={item.id} onSuccess={onSuccess} />
          </>
        )}
      </div>
    </li>
  );
}

function QuickAdjustForm({
  item,
  delta,
  onSuccess,
}: {
  item: InventoryItem;
  delta: number;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(adjustInventoryStockWithState, initialFormState);
  const prevError = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const nowNull = state?.error === null;
    const hadError = prevError.current != null;
    if (nowNull && hadError) onSuccess();
    prevError.current = state?.error ?? null;
  }, [state?.error, onSuccess]);
  const label = delta > 0 ? "Tambah 1" : "Kurangi 1";
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="item_id" value={item.id} />
      <input type="hidden" name="delta" value={delta} />
      <input type="hidden" name="reason" value={delta > 0 ? "PURCHASE" : "USAGE"} />
      <input type="hidden" name="note" value="" />
      {state?.error && <span className="sr-only" role="alert">{state.error}</span>}
      <Button
        type="submit"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0 text-sm font-medium"
        title={label}
        aria-label={label}
      >
        {delta > 0 ? "+" : ""}{delta}
      </Button>
    </form>
  );
}

function DeleteItemForm({ itemId, onSuccess }: { itemId: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(deleteInventoryItemWithState, initialFormState);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const prevError = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const nowNull = state?.error === null;
    const hadError = prevError.current != null;
    if (nowNull && hadError) onSuccess();
    prevError.current = state?.error ?? null;
  }, [state?.error, onSuccess]);
  return (
    <>
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="id" value={itemId} />
      </form>
      {state?.error && <span className="sr-only" role="alert">{state.error}</span>}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        title="Hapus item"
        onClick={() => setDialogOpen(true)}
      >
        ×
      </Button>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Hapus item"
        description="Item ini dan riwayat movement-nya akan dihapus. Lanjutkan?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
