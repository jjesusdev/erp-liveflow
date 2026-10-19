"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { CATALOG, type Product } from "@/lib/liveflow-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/liveflow/primitives";

export function ProductDrawer({
  open,
  onClose,
  bag,
  onAdd,
  onRemove,
  onOpenCharge,
}: {
  open: boolean;
  onClose: () => void;
  bag: Product[];
  onAdd: (p: Product) => void;
  onRemove: (p: Product) => void;
  onOpenCharge: () => void;
}) {
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<string | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bag.length === 0) setBagOpen(false);
  }, [bag.length]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSize(null);
    const t = setTimeout(() => searchRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sizes = useMemo(() => Array.from(new Set(CATALOG.map((p) => p.size))), []);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((p) => {
      if (size && p.size !== size) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q)
      );
    });
  }, [query, size]);

  const bagTotal = bag.reduce((s, p) => s + p.price, 0);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 top-14 z-30 bg-foreground/20 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        id="product-drawer"
        aria-label="Catálogo de prendas"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "absolute bottom-0 right-0 top-14 z-40 flex w-full max-w-[380px] flex-col border-l border-border bg-popover text-popover-foreground shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider">Catálogo en vivo</h3>
            <Badge>{CATALOG.length} prendas</Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar catálogo"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU o talla…"
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          {sizes.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize((cur) => (cur === s ? null : s))}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    size === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  Talla {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3">
          {products.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Search className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-xs font-semibold">Sin prendas que coincidan</p>
              <p className="text-[11px] text-muted-foreground">
                Prueba con otro nombre, SKU o talla.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {products.map((p) => {
                const inBag = bag.filter((b) => b.sku === p.sku).length;
                return (
                  <div
                    key={p.sku}
                    className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-2 transition-all hover:border-foreground/20 hover:bg-accent/50"
                  >
                    <button
                      type="button"
                      onClick={() => onAdd(p)}
                      className="flex flex-col gap-2 text-left"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                        <Image
                          src={p.img}
                          alt={p.name}
                          fill
                          sizes="160px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {p.stock <= 3 && (
                          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-md">
                            <span className="size-1.5 rounded-full bg-pending" />
                            Quedan {p.stock}
                          </span>
                        )}
                        {inBag > 0 && (
                          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground font-mono text-[10px] font-bold text-background">
                            {inBag}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Talla {p.size} · {p.stock} disp.
                        </p>
                      </div>
                    </button>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-mono text-sm font-bold">{money(p.price)}</span>
                      {inBag > 0 ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onRemove(p)}
                            aria-label={`Quitar una unidad de ${p.name}`}
                            className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Minus className="size-3" aria-hidden />
                          </button>
                          <span className="w-4 text-center font-mono text-xs font-bold">
                            {inBag}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAdd(p)}
                            aria-label={`Agregar una unidad de ${p.name}`}
                            className="flex size-6 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success transition-colors hover:bg-success/25"
                          >
                            <Plus className="size-3" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAdd(p)}
                          aria-label={`Agregar ${p.name} a la bolsa`}
                          className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background"
                        >
                          <Plus className="size-3" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-border">
          {bagOpen && bag.length > 0 && (
            <ul className="max-h-44 divide-y divide-border overflow-y-auto border-b border-border scrollbar-thin">
              {bag.map((p, i) => (
                <li key={`${p.sku}-${i}`} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Talla {p.size} · {p.sku}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono font-semibold">{money(p.price)}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(p)}
                    aria-label={`Quitar ${p.name} de la bolsa`}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-3 p-3">
            <button
              type="button"
              onClick={() => setBagOpen((o) => !o)}
              disabled={bag.length === 0}
              aria-expanded={bagOpen}
              className="flex min-w-0 flex-1 items-start gap-1.5 rounded-md text-left transition-colors hover:bg-muted/50 disabled:hover:bg-transparent"
            >
              <ShoppingBag className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="flex items-center gap-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Bolsa Live
                  <ChevronRight
                    className={cn(
                      "size-3 transition-transform duration-200",
                      bagOpen && "rotate-90"
                    )}
                    aria-hidden
                  />
                </p>
                <p className="mt-0.5 text-xs">
                  <span className="font-semibold">{bag.length} prendas</span>
                  {bag.length > 0 && (
                    <>
                      <span className="text-muted-foreground"> · </span>
                      <span className="font-mono font-bold">{money(bagTotal)}</span>
                    </>
                  )}
                </p>
              </div>
            </button>
            <Button
              variant="success"
              size="sm"
              disabled={bag.length === 0}
              onClick={() => {
                onClose();
                onOpenCharge();
              }}
            >
              Cobrar
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}
