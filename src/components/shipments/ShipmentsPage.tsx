'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDate, formatCurrency } from '@/lib/date-utils';
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
  MapPin,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, SectionLabel } from '@/components/liveflow/primitives';
import { toast } from 'sonner';
import type { Shipment, ShipmentStatus } from '@/types';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'IN_TRANSIT', label: 'En camino' },
  { id: 'DELIVERED', label: 'Entregados' },
  { id: 'RETURNED', label: 'Devueltos' },
  { id: 'LOST', label: 'Perdidos' },
];

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
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ trackingNumber: '', carrier: '', notes: '' });

  // Selección múltiple para despacho e impresión masiva
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

  const filteredShipments = shipments.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (s.lead?.name && s.lead.name.toLowerCase().includes(term)) ||
      (s.lead?.phone && s.lead.phone.includes(term)) ||
      (s.carrier && s.carrier.toLowerCase().includes(term)) ||
      (s.trackingNumber && s.trackingNumber.toLowerCase().includes(term)) ||
      (s.lead?.addressCity && s.lead.addressCity.toLowerCase().includes(term)) ||
      (s.lead?.addressColonia && s.lead.addressColonia.toLowerCase().includes(term))
    );
  });

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
    toast.success('Manifiesto exportado', { description: `${list.length} envíos listos para despacho.` });
  };

  const printBulkLabels = () => {
    setShowBulkPrintView(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Superior */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Logística & Despacho de Envíos
              </h1>
              <Badge tone="transit">Estafeta · Moto Local · En mano</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Impresión masiva de etiquetas térmicas, control de guías y manifiestos de paquetería.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={printBulkLabels}
                className="h-8 gap-1.5 font-bold text-xs shadow-sm"
              >
                <Printer className="size-3.5" />
                Imprimir {selectedIds.length} Etiquetas
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={exportManifestCSV}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Download className="size-3.5" />
              Descargar Manifiesto CSV
            </Button>
          </div>
        </header>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cliente, colonia o paquetería..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div role="tablist" className="flex gap-1 overflow-x-auto scrollbar-thin w-full sm:w-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors whitespace-nowrap',
                  filter === f.id
                    ? 'border-foreground/20 bg-foreground text-background font-semibold shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Envíos Estilizada Cockpit */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10">
                  <button type="button" onClick={toggleSelectAll} className="flex size-4 items-center justify-center">
                    {selectedIds.length > 0 && selectedIds.length === filteredShipments.length ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Clienta & Destino</th>
                <th className="py-2.5 px-3">Dirección de Entrega</th>
                <th className="py-2.5 px-3">Prendas / Pedido</th>
                <th className="py-2.5 px-3">Método / Paquetería</th>
                <th className="py-2.5 px-3">Guía (Opcional)</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
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
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3">
                      <button type="button" onClick={() => toggleSelect(shipment.id)} className="flex size-4 items-center justify-center">
                        {isSelected ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4 text-muted-foreground/60" />
                        )}
                      </button>
                    </td>

                    {/* Clienta */}
                    <td className="py-3 px-3 font-medium">
                      <p className="font-semibold text-foreground truncate">{shipment.lead?.name || 'Cliente'}</p>
                      <p className="text-[11px] text-muted-foreground">{shipment.lead?.phone}</p>
                    </td>

                    {/* Dirección */}
                    <td className="py-3 px-3 text-[11px]">
                      {shipment.lead?.addressStreet ? (
                        <div className="max-w-[220px]">
                          <p className="font-medium text-foreground truncate">
                            {shipment.lead.addressStreet} {shipment.lead.addressNumber}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {shipment.lead.addressColonia ? `Col. ${shipment.lead.addressColonia}, ` : ''}
                            {shipment.lead.addressCity || ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Sin dirección capturada</span>
                      )}
                    </td>

                    {/* Pedido */}
                    <td className="py-3 px-3">
                      <p className="font-semibold text-foreground truncate max-w-[200px]">
                        {shipment.paymentOrder?.concept || 'Prendas del Live'}
                      </p>
                      <p className="text-[11px] text-emerald-500 font-bold">
                        {money(Number(shipment.paymentOrder?.amount || 0))}
                      </p>
                    </td>

                    {/* Método */}
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <div>
                          <input
                            list={`carrier-options-${shipment.id}`}
                            value={draft.carrier}
                            onChange={(e) => setDraft({ ...draft, carrier: e.target.value })}
                            placeholder="Paquetería o método"
                            className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                          />
                          <datalist id={`carrier-options-${shipment.id}`}>
                            {CARRIER_PRESETS.map((p) => (
                              <option key={p} value={p} />
                            ))}
                          </datalist>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          {shipment.carrier?.toLowerCase().includes('moto') ? (
                            <Bike className="size-3.5 text-amber-500" />
                          ) : shipment.carrier?.toLowerCase().includes('tienda') || shipment.carrier?.toLowerCase().includes('personal') ? (
                            <UserCheck className="size-3.5 text-purple-500" />
                          ) : (
                            <Truck className="size-3.5 text-blue-500" />
                          )}
                          {shipment.carrier || <span className="text-muted-foreground italic">Sin asignar</span>}
                        </span>
                      )}
                    </td>

                    {/* Guía */}
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <input
                          value={draft.trackingNumber}
                          onChange={(e) => setDraft({ ...draft, trackingNumber: e.target.value })}
                          placeholder="Número de guía"
                          className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {shipment.trackingNumber || <span className="italic text-[11px]">N/A</span>}
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3">
                      <Badge tone={STATUS_TONE[shipment.status]}>
                        {STATUS_LABEL[shipment.status] || shipment.status}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={busyId === shipment.id}
                              onClick={() => updateShipment(shipment.id, draft)}
                              className="h-6 px-2 text-[11px]"
                            >
                              {busyId === shipment.id ? '...' : 'Guardar'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
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
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Editar detalles"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            {shipment.status === 'PENDING' && (
                              <Button
                                variant="default"
                                size="sm"
                                disabled={busyId === shipment.id}
                                onClick={() => updateShipment(shipment.id, { status: 'IN_TRANSIT' })}
                                className="h-7 px-2.5 text-xs font-bold gap-1"
                              >
                                {busyId === shipment.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="size-3" /> Despachar
                                  </>
                                )}
                              </Button>
                            )}

                            {shipment.status === 'IN_TRANSIT' && (
                              <Button
                                variant="success"
                                size="sm"
                                disabled={busyId === shipment.id}
                                onClick={() => updateShipment(shipment.id, { status: 'DELIVERED' })}
                                className="h-7 px-2.5 text-xs font-bold gap-1"
                              >
                                {busyId === shipment.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="size-3" /> Entregado
                                  </>
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && filteredShipments.length === 0 && (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No hay envíos en este filtro. Los paquetes se generan automáticamente al confirmar pagos.
            </div>
          )}
        </div>
      </div>

      {/* Vista de Impresión Masiva de Etiquetas Térmicas */}
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