'use client';

import { Zap } from 'lucide-react';
import { money } from '@/lib/format';
import type { Product } from '@/types';

interface FlashCatalogProps {
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export function FlashCatalog({ products, onSelect, onClose }: FlashCatalogProps) {
  return (
    <div className="border-b border-border bg-card p-3 shadow-lg max-h-52 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1">
          <Zap className="size-3.5 text-amber-500" /> Catalogo en Vivo (Clic para agregar a la orden):
        </span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          x
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="flex items-center justify-between rounded-lg border border-border p-2 text-left text-xs hover:bg-accent transition-all"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{p.name}</p>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                  Stock: {p.stock ?? 10}
                </span>
              </div>
              {p.description && (
                <p className="text-[10px] text-muted-foreground">{p.description}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="font-bold text-emerald-500">{money(Number(p.price))}</span>
              <span className="block text-[10px] text-primary font-medium">Cobrar →</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
