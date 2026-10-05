'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate } from '@/lib/date-utils';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Truck,
  Package,
  CheckCircle,
  RotateCcw,
  XCircle,
  Pencil,
  Loader2,
  Bike,
  Send,
  UserCheck,
  Printer,
  Download,
  CheckSquare,
  Square,
  Search,
  PackageCheck,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/liveflow/primitives';
import { toast } from 'sonner';
import type { Shipment, ShipmentStatus } from '@/types';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'IN_TRANSIT', label: 'En camino' },
  { id: 'DELIVERED', label: 'Entregados' },
] as const;

const CARRIER_PRESETS = [
  'Envío Local / Moto',
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

export function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ trackingNumber: '', carrier: '', notes: '' });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPrintView, setShowBulkPrintView] = useState(false);

  const fetchShipments = useCallback(async () => {
    try {
      const url = filter === 'all' ? '/api/shipments' : `/api/shipments?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los envíos');
      setShipments(await res.json());
    } catch {
      toast.error('Error al cargar los envíos');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchShipments();
  }, [fetchShipments]);

  const updateShipment = async (id: string, data: Record<string, unknown>) => {
    setBusyId(id);

    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'No se pudo actualizar el envío');

      if (data.status === 'IN_TRANSIT') {
        toast.success('Paquete despachado', { description: 'Notificación enviada a la clienta por WhatsApp.' });
      } else {
        toast.success('Estado actualizado');
      }

      setEditingId(null);
      fetchShipments();
    } catch {
      toast.error('No se pudo actualizar el envío');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (shipment: Shipment) => {
    setEditingId(shipment.id);
    setDraft({
      trackingNumber: shipment.trackingNumber || '',
      carrier: shipment.carrier || '',
      notes: shipment.notes || '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShipments.map((s) => s.id));
    }
  };

  const filteredShipments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter((s) => {
      return (
        (!q ||
          (s.lead?.name && s.lead.name.toLowerCase().includes(q)) ||
          (s.lead?.phone && s.lead.phone.includes(q)) ||
          (s.carrier && s.carrier.toLowerCase().includes(q)) ||
          (s.trackingNumber && s.trackingNumber.toLowerCase().includes(q)) ||
          (s.lead?.addressCity && s.lead.addressCity.toLowerCase().includes(q)) ||
          (s.lead?.addressColonia && s.lead.addressColonia.toLowerCase().includes(q)))
      );
    });
  }, [shipments, query]);

  const stats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter((s) => s.status === 'PENDING').length;
    const inTransit = shipments.filter((s) => s.status === 'IN_TRANSIT').length;
    const delivered = shipments.filter((s) => s.status === 'DELIVERED').length;
    return { total, pending, inTransit, delivered };
  }, [shipments]);

  const exportManifestCSV = () => {
    const list = selectedIds.length > 0
      ? shipments.filter((s) => selectedIds.includes(s.id))
      : filteredShipments;

    if (list.length === 0) return;

    const headers = ['ID Envio', 'Cliente', 'Telefono', 'Calle', 'Numero', 'Colonia', 'Ciudad', 'CP', 'Paqueteria', 'Guia', 'Notas', 'Estado'];
    const rows = list.map((s) => [
      s.id.slice(0, 8).toUpperCase(),
      `"${s.lead?.name || 'Cliente'}"`,
      `"${s.lead?.phone || ''}"`,
      `"${s.lead?.addressStreet || ''}"`,
      `"${s.lead?.addressNumber || ''}"`,
      `"${s.lead?.addressColonia || ''}"`,
      `"${s.lead?.addressCity || ''}"`,
      `"${s.lead?.addressZipCode || ''}"`,
      `"${s.carrier || ''}"`,
      `"${s.trackingNumber || ''}"`,
      `"${s.notes?.replace(/"/g, '""') || ''}"`,
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `manifiesto_envios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Manifiesto exportado', { description: `${list.length} paquetes descargados.` });
  };

  const printBulkLabels = () => {
    setShowBulkPrintView(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        {/* Header exacto de CuadreView */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
              LOGÍSTICA · {stats.total} PAQUETES REGISTRADOS
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Despacho & Envíos
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button size="sm" onClick={printBulkLabels} className="gap-1.5 text-xs font-bold shadow-xs">
                <Printer className="size-3.5" aria-hidden />
                Imprimir {selectedIds.length} etiquetas
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportManifestCSV} className="gap-1.5 text-xs">
              <Download className="size-3.5" aria-hidden />
              Exportar Manifiesto CSV
            </Button>
          </div>
        </header>

        {/* 4 Tarjetas de Resumen estilo Cuadre */}
        <section aria-label="Resumen de Envíos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Por empaquetar</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-pending">{stats.pending}</p>
            <p className="mt-1 text-xs text-muted-foreground">Pagos confirmados en espera</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">En camino</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-transit">{stats.inTransit}</p>
            <p className="mt-1 text-xs text-muted-foreground">Despachados con chofer / guía</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entregados con éxito</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-success">{stats.delivered}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ciclo completado</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total de envíos</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">Histórico acumulado</p>
          </div>
        </section>

        {/* Sección de Movimientos de Envíos (Tabla Idéntica a Cuadre) */}
        <section aria-label="Movimientos de Envíos" className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
            <div role="tablist" aria-label="Filtrar por estado" className="flex gap-1 rounded-md bg-muted p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  type="button"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cliente, ciudad o guía…"
                className="h-7 w-60 rounded-md border border-input bg-background pr-2 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th scope="col" className="w-8 px-3 py-2.5">
                    <button type="button" onClick={toggleSelectAll} className="flex size-4 items-center justify-center">
                      {selectedIds.length > 0 && selectedIds.length === filteredShipments.length ? (
                        <CheckSquare className="size-4 text-primary" />
                      ) : (
                        <Square className="size-4 text-muted-foreground/60" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Folio</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Destinatario</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Dirección</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Prendas</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Método</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredShipments.map((shipment) => {
                  const isEditing = editingId === shipment.id;
                  const isSelected = selectedIds.includes(shipment.id);

                  return (
                    <tr
                      key={shipment.id}
                      className={cn(
                        'transition-colors hover:bg-muted/30',
                        isSelected && 'bg-muted/50'
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={() => toggleSelect(shipment.id)} className="flex size-4 items-center justify-center">
                          {isSelected ? (
                            <CheckSquare className="size-4 text-primary" />
                          ) : (
                            <Square className="size-4 text-muted-foreground/60" />
                          )}
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
                            onChange={(e) => setDraft({ ...draft, carrier: e.target.value })}
                            placeholder="Método..."
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
                              <Button
                                size="xs"
                                variant="default"
                                disabled={busyId === shipment.id}
                                onClick={() => updateShipment(shipment.id, draft)}
                                className="h-6 px-2 text-[11px]"
                              >
                                Guardar
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                className="h-6 px-2 text-[11px]"
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEdit(shipment)}
                                className="size-6 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="size-3" />
                              </Button>

                              {shipment.status === 'PENDING' && (
                                <Button
                                  size="xs"
                                  variant="default"
                                  disabled={busyId === shipment.id}
                                  onClick={() => updateShipment(shipment.id, { status: 'IN_TRANSIT' })}
                                  className="h-6 px-2 text-[11px] gap-1 font-semibold"
                                >
                                  <Send className="size-2.5" /> Despachar
                                </Button>
                              )}

                              {shipment.status === 'IN_TRANSIT' && (
                                <Button
                                  size="xs"
                                  variant="success"
                                  disabled={busyId === shipment.id}
                                  onClick={() => updateShipment(shipment.id, { status: 'DELIVERED' })}
                                  className="h-6 px-2 text-[11px] gap-1 font-semibold"
                                >
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
                      No hay envíos en este filtro.
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
      </div>

      {/* Vista de Impresión Térmica Masiva */}
      {showBulkPrintView && (
        <div className="fixed inset-0 z-50 bg-white text-black p-8 overflow-y-auto">
          <div className="no-print flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="font-bold text-lg">Impresión Masiva ({selectedIds.length} Etiquetas)</h2>
            <Button variant="default" size="sm" onClick={() => setShowBulkPrintView(false)}>
              Cerrar Vista de Impresión
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {shipments
              .filter((s) => selectedIds.includes(s.id))
              .map((s) => (
                <div key={s.id} className="rounded-xl border-2 border-dashed border-black p-4 space-y-2.5 break-inside-avoid">
                  <div className="flex justify-between items-start border-b border-black pb-1.5">
                    <div>
                      <h3 className="font-black text-xs uppercase">📦 LIVEFLOW BOUTIQUE</h3>
                      <p className="text-[11px]">Destino: <strong>{s.lead?.name || s.lead?.phone}</strong></p>
                      <p className="text-[11px]">Tel: <strong>{s.lead?.phone}</strong></p>
                    </div>
                    <span className="text-xs font-bold border border-black px-1.5 py-0.5 rounded">
                      {s.paymentOrder?.id?.slice(0, 8)?.toUpperCase() || 'REF-LIVE'}
                    </span>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p className="font-bold">
                      {s.lead?.addressStreet} {s.lead?.addressNumber}
                    </p>
                    <p>
                      {s.lead?.addressColonia ? `Col. ${s.lead.addressColonia}, ` : ''}
                      {s.lead?.addressCity} {s.lead?.addressState}
                    </p>
                    <p className="font-bold">CP: {s.lead?.addressZipCode || 'N/A'}</p>
                    {s.lead?.addressNotes && <p className="italic text-[10px] bg-gray-100 p-1 rounded mt-1">Ref: {s.lead.addressNotes}</p>}
                  </div>

                  <div className="border-t border-black pt-1.5 text-[11px] flex justify-between">
                    <span>Prendas: <strong>{s.paymentOrder?.concept}</strong></span>
                    <span>Método: <strong>{s.carrier || 'Estafeta'}</strong></span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}