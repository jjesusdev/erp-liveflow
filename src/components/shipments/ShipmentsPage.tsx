'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDate, formatCurrency, cn } from '@/lib/date-utils';
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
} from 'lucide-react';
import type { Shipment, ShipmentStatus } from '@/types';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'IN_TRANSIT', label: 'En camino / Despachados' },
  { id: 'DELIVERED', label: 'Entregados' },
  { id: 'RETURNED', label: 'Devueltos' },
  { id: 'LOST', label: 'Perdidos' },
];

const CARRIER_PRESETS = [
  'Envío Local / Moto',
  'Estafeta',
  'DHL',
  'FedEx',
  '99Minutos',
  'Uber Flash / Didi',
  'Entrega Personal / Punto de entrega',
  'Recoge en tienda',
];

const STATUS_META: Record<ShipmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'bg-orange-100 text-orange-800' },
  IN_TRANSIT: { label: 'En camino', className: 'bg-blue-100 text-blue-800' },
  DELIVERED: { label: 'Entregado', className: 'bg-green-100 text-green-800' },
  RETURNED: { label: 'Devuelto', className: 'bg-yellow-100 text-yellow-800' },
  LOST: { label: 'Perdido', className: 'bg-red-100 text-red-800' },
};

function StatusIcon({ status }: { status: ShipmentStatus }) {
  if (status === 'DELIVERED') return <CheckCircle className="h-4 w-4 text-green-600" />;
  if (status === 'IN_TRANSIT') return <Truck className="h-4 w-4 text-blue-600" />;
  if (status === 'RETURNED') return <RotateCcw className="h-4 w-4 text-yellow-600" />;
  if (status === 'LOST') return <XCircle className="h-4 w-4 text-red-600" />;
  return <Package className="h-4 w-4 text-orange-600" />;
}

export function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ trackingNumber: '', carrier: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Selección múltiple para despacho e impresión masiva
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPrintView, setShowBulkPrintView] = useState(false);

  const fetchShipments = useCallback(async () => {
    try {
      const url = filter === 'all' ? '/api/shipments' : `/api/shipments?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los envios');
      setShipments(await res.json());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los envios');
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
    setError(null);

    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'No se pudo actualizar el envio');

      if (data.status === 'IN_TRANSIT') {
        setSuccessToast('🚚 ¡Paquete despachado y notificación enviada a la clienta por WhatsApp!');
        setTimeout(() => setSuccessToast(null), 4000);
      }

      setEditingId(null);
      fetchShipments();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el envio');
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
    setError(null);
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
  };

  const printBulkLabels = () => {
    setShowBulkPrintView(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Envíos y Logística</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Impresión masiva de etiquetas, manifiestos de despacho y control de reparto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={printBulkLabels}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir {selectedIds.length} Etiquetas
            </button>
          )}

          <button
            onClick={exportManifestCSV}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar Manifiesto CSV
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Búsqueda */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cliente, colonia, ciudad o paquetería..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filtros de estado */}
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold',
                  filter === f.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {successToast && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-sm font-medium text-green-900 border border-green-300">
          {successToast}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Tabla de Envíos */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left w-10">
                <button onClick={toggleSelectAll} className="p-0.5">
                  {selectedIds.length > 0 && selectedIds.length === filteredShipments.length ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">Cliente & Contacto</th>
              <th className="px-4 py-3 text-left">Dirección de Entrega</th>
              <th className="px-4 py-3 text-left">Pedido / Concepto</th>
              <th className="px-4 py-3 text-left">Método / Paquetería</th>
              <th className="px-4 py-3 text-left">Guía (Opcional)</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredShipments.map((shipment) => {
              const isEditing = editingId === shipment.id;
              const isSelected = selectedIds.includes(shipment.id);

              return (
                <tr key={shipment.id} className={cn('hover:bg-muted/30', isSelected && 'bg-primary/5')}>
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(shipment.id)} className="p-0.5">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3 font-medium">
                    <p className="truncate">{shipment.lead?.name || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">{shipment.lead?.phone}</p>
                  </td>

                  {/* Dirección */}
                  <td className="px-4 py-3 text-xs">
                    {shipment.lead?.addressStreet ? (
                      <div>
                        <p className="font-semibold text-foreground truncate max-w-[200px]">
                          {shipment.lead.addressStreet} {shipment.lead.addressNumber}
                        </p>
                        <p className="text-muted-foreground truncate max-w-[200px]">
                          {shipment.lead.addressColonia ? `Col. ${shipment.lead.addressColonia}, ` : ''}
                          {shipment.lead.addressCity || ''}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Sin dirección registrada</span>
                    )}
                  </td>

                  {/* Pedido */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{shipment.paymentOrder?.concept || '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(shipment.paymentOrder?.amount || 0).toFixed(2)} {shipment.paymentOrder?.currency || 'MXN'}
                    </p>
                  </td>

                  {/* Método */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div>
                        <input
                          list={`carrier-options-${shipment.id}`}
                          value={draft.carrier}
                          onChange={(e) => setDraft({ ...draft, carrier: e.target.value })}
                          placeholder="Ej: Moto local, Estafeta..."
                          className="w-full rounded-md border px-2 py-1 text-xs"
                        />
                        <datalist id={`carrier-options-${shipment.id}`}>
                          {CARRIER_PRESETS.map((p) => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                        {shipment.carrier?.toLowerCase().includes('moto') ? (
                          <Bike className="h-3.5 w-3.5 text-amber-600" />
                        ) : shipment.carrier?.toLowerCase().includes('tienda') || shipment.carrier?.toLowerCase().includes('personal') ? (
                          <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                        ) : (
                          <Truck className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        {shipment.carrier || <span className="text-muted-foreground italic">Sin asignar</span>}
                      </span>
                    )}
                  </td>

                  {/* Guía */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        value={draft.trackingNumber}
                        onChange={(e) => setDraft({ ...draft, trackingNumber: e.target.value })}
                        placeholder="Guía (Opcional)"
                        className="w-full rounded-md border px-2 py-1 text-xs font-mono"
                      />
                    ) : (
                      <span className="font-mono text-xs">
                        {shipment.trackingNumber || <span className="text-muted-foreground italic">N/A</span>}
                      </span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        STATUS_META[shipment.status]?.className
                      )}
                    >
                      <StatusIcon status={shipment.status} />
                      {STATUS_META[shipment.status]?.label || shipment.status}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => updateShipment(shipment.id, draft)}
                            disabled={busyId === shipment.id}
                            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {busyId === shipment.id ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(shipment)}
                            title="Editar detalles"
                            className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {shipment.status === 'PENDING' && (
                            <button
                              onClick={() => updateShipment(shipment.id, { status: 'IN_TRANSIT' })}
                              disabled={busyId === shipment.id}
                              className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                              title="Despachar y notificar por WhatsApp"
                            >
                              {busyId === shipment.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-3 w-3" />
                                  Despachar
                                </>
                              )}
                            </button>
                          )}

                          {shipment.status === 'IN_TRANSIT' && (
                            <button
                              onClick={() => updateShipment(shipment.id, { status: 'DELIVERED' })}
                              disabled={busyId === shipment.id}
                              className="inline-flex items-center gap-1 rounded bg-green-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                              title="Marcar como entregado"
                            >
                              {busyId === shipment.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  Entregado
                                </>
                              )}
                            </button>
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
          <div className="py-12 text-center text-muted-foreground text-sm">
            No se encontraron envíos con los criterios seleccionados.
          </div>
        )}
      </div>

      {/* Modal / Vista de Impresión Masiva de Etiquetas */}
      {showBulkPrintView && (
        <div className="fixed inset-0 z-50 bg-white text-black p-8 overflow-y-auto">
          <div className="no-print flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="font-bold text-lg">Impresión Masiva ({selectedIds.length} Etiquetas)</h2>
            <button
              onClick={() => setShowBulkPrintView(false)}
              className="rounded bg-black px-4 py-2 text-xs font-bold text-white"
            >
              Cerrar Vista de Impresión
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {shipments
              .filter((s) => selectedIds.includes(s.id))
              .map((s) => (
                <div key={s.id} className="rounded-lg border-2 border-dashed border-black p-4 space-y-2.5 break-inside-avoid">
                  <div className="flex justify-between items-start border-b border-black pb-1.5">
                    <div>
                      <h3 className="font-black text-xs uppercase">📦 PAQUETE LIVE SHOPPING</h3>
                      <p className="text-[11px]">Cliente: <strong>{s.lead?.name || s.lead?.phone}</strong></p>
                      <p className="text-[11px]">Tel: <strong>{s.lead?.phone}</strong></p>
                    </div>
                    <span className="font-mono text-xs font-bold border border-black px-1.5 py-0.5 rounded">
                      {s.paymentOrder?.id?.slice(0, 8)?.toUpperCase() || 'REF-LIVE'}
                    </span>
                  </div>

                  <div className="text-xs">
                    <p className="font-bold">
                      {s.lead?.addressStreet} {s.lead?.addressNumber}
                    </p>
                    <p>
                      {s.lead?.addressColonia ? `Col. ${s.lead.addressColonia}, ` : ''}
                      {s.lead?.addressCity} {s.lead?.addressState}
                    </p>
                    <p className="font-mono font-bold">CP: {s.lead?.addressZipCode || 'N/A'}</p>
                    {s.lead?.addressNotes && <p className="italic text-[10px] bg-gray-100 p-1 rounded mt-1">Ref: {s.lead.addressNotes}</p>}
                  </div>

                  <div className="border-t border-black pt-1.5 text-[11px] flex justify-between">
                    <span>Prendas: <strong>{s.paymentOrder?.concept}</strong></span>
                    <span>Envío: <strong>{s.carrier || 'Local'}</strong></span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}