'use client';

import { cn } from '@/lib/utils';
import { CheckSquare, Square, Search, Pencil, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/liveflow/primitives';
import type { Shipment, ShipmentStatus } from '@/types';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'IN_TRANSIT', label: 'En camino' },
  { id: 'DELIVERED', label: 'Entregados' },
] as const;

const CARRIER_PRESETS = [
  'Envio Local / Moto',
  'Estafeta',
  'DHL Express',
  'FedEx',
  '99Minutos',
  'Uber Flash / Didi',
  'Entrega Personal',
  'Recoge en tienda',
];

const STATUS_TONE: Record<ShipmentStatus, 'pending' | 'transit' | 'success' | 'live' | 'neutral'> = {
  PENDING: 'pending',
  IN_TRANSIT: 'transit',
  DELIVERED: 'success',
  RETURNED: 'pending',
  LOST: 'live',
};

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  PENDING: 'Pendiente',
  IN_TRANSIT: 'En camino',
  DELIVERED: 'Entregado',
  RETURNED: 'Devuelto',
  LOST: 'Perdido',
};

interface ShipmentTableProps {
  shipments: Shipment[];
  filteredShipments: Shipment[];
  loading: boolean;
  filter: string;
  query: string;
  busyId: string | null;
  editingId: string | null;
  draft: { trackingNumber: string; carrier: string; notes: string };
  selectedIds: string[];
  onFilterChange: (f: string) => void;
  onQueryChange: (q: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onStartEdit: (s: Shipment) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDraftChange: (d: { trackingNumber: string; carrier: string; notes: string }) => void;
  onCancelEdit: () => void;
}

export function ShipmentTable({
  filteredShipments,
  loading,
  filter,
  query,
  busyId,
  editingId,
  draft,
  selectedIds,
  onFilterChange,
  onQueryChange,
  onToggleSelect,
  onToggleSelectAll,
  onStartEdit,
  onUpdate,
  onDraftChange,
  onCancelEdit,
}: ShipmentTableProps) {
  return (
    <section aria-label="Movimientos de Envios" className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
        <div role="tablist" aria-label="Filtrar por estado" className="flex gap-1 rounded-md bg-muted p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              type="button"
              aria-selected={filter === f.id}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'h-6 rounded px-2.5 text-xs font-medium transition-colors',
                filter === f.id
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="relative">
          <span className="sr-only">Buscar por cliente o destino</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cliente, ciudad o guia..."
            className="h-7 w-60 rounded-md border border-input bg-background pr-2 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <tr>
              <th scope="col" className="w-8 px-3 py-2.5">
                <button type="button" onClick={onToggleSelectAll} className="flex size-4 items-center justify-center">
                  {selectedIds.length > 0 && selectedIds.length === filteredShipments.length ? (
                    <CheckSquare className="size-4 text-primary" />
                  ) : (
                    <Square className="size-4 text-muted-foreground/60" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">Folio</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Destinatario</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Direccion</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Prendas</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Metodo</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Estado</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredShipments.map((shipment) => {
              const isEditing = editingId === shipment.id;
              const isSelected = selectedIds.includes(shipment.id);

              return (
                <tr key={shipment.id} className={cn('transition-colors hover:bg-muted/30', isSelected && 'bg-muted/50')}>
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => onToggleSelect(shipment.id)} className="flex size-4 items-center justify-center">
                      {isSelected ? <CheckSquare className="size-4 text-primary" /> : <Square className="size-4 text-muted-foreground/60" />}
                    </button>
                  </td>

                  <td className="px-3 py-2.5 font-semibold text-foreground">
                    {shipment.paymentOrder?.id ? `LF-${shipment.paymentOrder.id.slice(0, 8).toUpperCase()}` : 'LF-ENV'}
                  </td>

                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-foreground">{shipment.lead?.name || 'Clienta'}</p>
                    <p className="text-[11px] text-muted-foreground">{shipment.lead?.phone}</p>
                  </td>

                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground max-w-56 truncate">
                    {shipment.lead?.addressStreet
                      ? `${shipment.lead.addressStreet} ${shipment.lead.addressNumber || ''}, ${shipment.lead.addressCity || ''}`
                      : 'Sin capturar'}
                  </td>

                  <td className="px-3 py-2.5 text-foreground max-w-48 truncate">
                    {shipment.paymentOrder?.concept || 'Prendas Live'}
                  </td>

                  <td className="px-3 py-2.5 text-muted-foreground">
                    {isEditing ? (
                      <input
                        list={`carrier-opts-${shipment.id}`}
                        value={draft.carrier}
                        onChange={(e) => onDraftChange({ ...draft, carrier: e.target.value })}
                        placeholder="Metodo..."
                        className="h-6 w-32 rounded border border-input bg-background px-1.5 text-xs"
                      />
                    ) : (
                      <span>{shipment.carrier || 'Estafeta'}</span>
                    )}
                    <datalist id={`carrier-opts-${shipment.id}`}>
                      {CARRIER_PRESETS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </td>

                  <td className="px-3 py-2.5">
                    <Badge tone={STATUS_TONE[shipment.status]}>
                      {STATUS_LABEL[shipment.status] || shipment.status}
                    </Badge>
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isEditing ? (
                        <>
                          <Button size="xs" variant="default" disabled={busyId === shipment.id} onClick={() => onUpdate(shipment.id, draft)} className="h-6 px-2 text-[11px]">
                            Guardar
                          </Button>
                          <Button size="xs" variant="ghost" onClick={onCancelEdit} className="h-6 px-2 text-[11px]">
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => onStartEdit(shipment)} className="size-6 text-muted-foreground hover:text-foreground">
                            <Pencil className="size-3" />
                          </Button>

                          {shipment.status === 'PENDING' && (
                            <Button size="xs" variant="default" disabled={busyId === shipment.id} onClick={() => onUpdate(shipment.id, { status: 'IN_TRANSIT' })} className="h-6 px-2 text-[11px] gap-1 font-semibold">
                              <Send className="size-2.5" /> Despachar
                            </Button>
                          )}

                          {shipment.status === 'IN_TRANSIT' && (
                            <Button size="xs" variant="success" disabled={busyId === shipment.id} onClick={() => onUpdate(shipment.id, { status: 'DELIVERED' })} className="h-6 px-2 text-[11px] gap-1 font-semibold">
                              <Check className="size-2.5" /> Entregado
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && filteredShipments.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                  No hay envios en este filtro.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-border bg-muted/40">
            <tr>
              <td colSpan={8} className="px-3 py-2.5 text-xs text-muted-foreground">
                {filteredShipments.length} paquetes mostrados
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
