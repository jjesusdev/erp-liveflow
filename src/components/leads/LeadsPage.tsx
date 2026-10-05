'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatDate, cn } from '@/lib/date-utils';
import {
  Search,
  CreditCard,
  MessageSquare,
  Truck,
  Instagram,
  Facebook,
  ShoppingBag,
  Plus,
  Pencil,
  Download,
  Star,
  Users,
} from 'lucide-react';
import type { Lead, PaymentStatus } from '@/types';

const PAYMENT_LABELS: Record<PaymentStatus, { label: string; className: string }> = {
  PAID: { label: 'Pagado', className: 'text-green-600' },
  SENT: { label: 'Enviado', className: 'text-blue-600' },
  PENDING: { label: 'Pendiente', className: 'text-orange-600' },
  EXPIRED: { label: 'Expirado', className: 'text-muted-foreground' },
  CANCELLED: { label: 'Cancelado', className: 'text-red-600' },
  REFUNDED: { label: 'Reembolsado', className: 'text-purple-600' },
};

const TIER_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'VIP', label: '★ VIP (3+ Compras)' },
  { id: 'FREQUENT', label: 'Recurrentes' },
  { id: 'NEW', label: 'Nuevas' },
  { id: 'GHOST', label: 'Apartan sin pagar' },
];

function SourceIcon({ source }: { source?: string | null }) {
  if (source?.includes('Instagram')) return <Instagram className="h-3 w-3" />;
  if (source?.includes('Facebook')) return <Facebook className="h-3 w-3" />;
  return <ShoppingBag className="h-3 w-3" />;
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alta / edición de clientes
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', source: '', internalNotes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const url = search
        ? `/api/leads?search=${encodeURIComponent(search)}`
        : '/api/leads';
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los clientes');
      const data: Lead[] = await res.json();
      setLeads(data);
      setError(null);

      setSelectedLead((current) =>
        current ? data.find((l) => l.id === current.id) || null : null
      );
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const openCreate = () => {
    setEditingLead(null);
    setForm({ phone: '', name: '', source: 'manual', internalNotes: '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      phone: lead.phone || '',
      name: lead.name || '',
      source: lead.source || '',
      internalNotes: lead.internalNotes || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = editingLead ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el cliente');

      setShowModal(false);
      fetchLeads();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (tierFilter === 'all') return true;
    return l.tier === tierFilter;
  });

  const exportLeadsCSV = () => {
    if (filteredLeads.length === 0) return;

    const headers = ['Nombre', 'Telefono', 'Clasificacion', 'Compras Concretadas', 'Total Gastado', 'Origen', 'Direccion', 'Notas'];
    const rows = filteredLeads.map((l) => [
      `"${l.name || 'Sin nombre'}"`,
      `"${l.phone}"`,
      l.tier || 'NEW',
      l.totalPaidCount || 0,
      (l.totalSpent || 0).toFixed(2),
      `"${l.source || 'WhatsApp'}"`,
      `"${l.addressStreet || ''} ${l.addressNumber || ''}, ${l.addressColonia || ''}, ${l.addressCity || ''}"`,
      `"${l.internalNotes?.replace(/"/g, '""') || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clientas_${tierFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSpent = (lead: Lead) =>
    (lead.paymentOrders || [])
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex h-full">
      {/* Lista Izquierda */}
      <div className="flex w-96 shrink-0 flex-col border-r bg-card">
        <div className="border-b p-3.5 space-y-2.5">
          <div className="flex gap-2">
            <button
              onClick={openCreate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Clienta
            </button>
            <button
              onClick={exportLeadsCSV}
              title="Exportar base de clientas a CSV"
              className="flex items-center gap-1 rounded-md border bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border py-1.5 pl-8 pr-3 text-xs bg-background"
            />
          </div>

          {/* Selector de Segmentos / Scoring */}
          <div className="flex flex-wrap gap-1">
            {TIER_FILTERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTierFilter(t.id)}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors',
                  tierFilter === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent text-muted-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="m-3 rounded-md bg-red-50 p-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y">
          {filteredLeads.map((lead) => {
            const paidCount = (lead.paymentOrders || []).filter(
              (p) => p.status === 'PAID'
            ).length;

            return (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={cn(
                  'w-full p-3 text-left transition-colors hover:bg-muted/50 block',
                  selectedLead?.id === lead.id && 'bg-accent'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold text-xs text-foreground">
                        {lead.name || lead.phone}
                      </p>
                      {lead.tier === 'VIP' && (
                        <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-black text-amber-600 dark:text-amber-400">
                          ★ VIP
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground font-mono">
                      {lead.phone}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {lead.lastInteractionAt && formatDate(lead.lastInteractionAt)}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <SourceIcon source={lead.source} />
                    {lead.source || 'WhatsApp'}
                  </span>
                  {paidCount > 0 && (
                    <span className="font-bold text-green-600 dark:text-green-400 font-mono">
                      {paidCount} compra{paidCount > 1 ? 's' : ''} ({formatCurrency(totalSpent(lead))})
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {!loading && filteredLeads.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {search ? 'Ninguna clienta coincide' : 'No hay clientas en este segmento'}
            </div>
          )}
        </div>
      </div>

      {/* Detalle Derecho */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        {selectedLead ? (
          <div className="space-y-6 max-w-3xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {selectedLead.name || selectedLead.phone}
                  </h2>
                  <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-bold">
                    {selectedLead.tier || 'NUEVA'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {selectedLead.phone}
                </p>
              </div>
              <button
                onClick={() => openEdit(selectedLead)}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar Perfil
              </button>
            </div>

            {/* Métricas de la clienta */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Comprado</p>
                <p className="text-xl font-black text-green-600 mt-1 font-mono">
                  {formatCurrency(totalSpent(selectedLead))}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Pedidos Pagados</p>
                <p className="text-xl font-black text-foreground mt-1">
                  {(selectedLead.paymentOrders || []).filter((p) => p.status === 'PAID').length}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Conversaciones</p>
                <p className="text-xl font-black text-foreground mt-1">
                  {(selectedLead.conversations || []).length}
                </p>
              </div>
            </div>

            {/* Dirección de Envío */}
            <div className="rounded-lg border bg-card p-4 space-y-1 text-xs">
              <p className="font-bold text-muted-foreground uppercase text-[10px]">Dirección Registrada:</p>
              {selectedLead.addressStreet ? (
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {selectedLead.addressStreet} {selectedLead.addressNumber}
                  </p>
                  <p className="text-muted-foreground">
                    Col. {selectedLead.addressColonia || 'N/A'}, {selectedLead.addressCity} {selectedLead.addressState} (CP: {selectedLead.addressZipCode})
                  </p>
                  {selectedLead.addressNotes && (
                    <p className="italic text-gray-600 dark:text-gray-400 mt-1 bg-muted/50 p-1.5 rounded">
                      Ref: {selectedLead.addressNotes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Sin dirección de entrega capturada aún.</p>
              )}
            </div>

            {/* Historial de Compras */}
            <section className="space-y-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Historial de Cobros</h3>
              <div className="rounded-lg border bg-card divide-y">
                {(selectedLead.paymentOrders || []).length > 0 ? (
                  (selectedLead.paymentOrders || []).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{order.concept}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(order.createdAt)} • Ref: {order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono">
                          {formatCurrency(Number(order.amount), order.currency)}
                        </p>
                        <p className={cn('text-[10px] font-bold uppercase', PAYMENT_LABELS[order.status]?.className)}>
                          {PAYMENT_LABELS[order.status]?.label || order.status}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Sin cobros registrados
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Selecciona una clienta de la lista para ver su perfil completo.
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Clienta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl">
            <h2 className="text-base font-bold mb-3">
              {editingLead ? 'Editar Clienta' : 'Nueva Clienta'}
            </h2>
            {formError && (
              <div className="mb-3 rounded-md bg-red-50 p-2.5 text-xs text-red-800">
                {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Teléfono de WhatsApp</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+52 1 55 1234 5678"
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Nombre Completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Sofia Martínez"
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Origen</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background"
                >
                  <option value="whatsapp">WhatsApp Directo</option>
                  <option value="tiktok_live">TikTok Live</option>
                  <option value="instagram_live">Instagram Live</option>
                  <option value="facebook_live">Facebook Live</option>
                  <option value="manual">Manual / Tienda</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}