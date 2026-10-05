'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '@/lib/date-utils';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Search,
  CreditCard,
  Truck,
  Plus,
  Pencil,
  Download,
  Users,
  MapPin,
  Calendar,
  MessageSquare,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, TierBadge, SectionLabel } from '@/components/liveflow/primitives';
import { toast } from 'sonner';
import type { Lead, PaymentStatus } from '@/types';

const PAYMENT_TONE: Record<PaymentStatus, 'success' | 'transit' | 'pending' | 'live' | 'neutral'> = {
  PAID: 'success',
  SENT: 'transit',
  PENDING: 'pending',
  EXPIRED: 'neutral',
  CANCELLED: 'live',
  REFUNDED: 'pending',
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PAID: 'Pagado',
  SENT: 'Enviado',
  PENDING: 'Pendiente',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const TIER_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'VIP', label: '★ VIP (3+ Compras)' },
  { id: 'FREQUENT', label: 'Recurrentes' },
  { id: 'NEW', label: 'Nuevas' },
  { id: 'GHOST', label: 'Apartan sin pagar' },
];

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // Alta / edición de clientes
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', source: '', internalNotes: '' });
  const [saving, setSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const url = search
        ? `/api/leads?search=${encodeURIComponent(search)}`
        : '/api/leads';
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los clientes');
      const data: Lead[] = await res.json();
      setLeads(data);

      setSelectedLead((current) =>
        current ? data.find((l) => l.id === current.id) || null : null
      );
    } catch {
      toast.error('Error al cargar clientas');
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
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = editingLead ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Error al guardar');
      toast.success(editingLead ? 'Clienta actualizada' : 'Clienta creada');
      setShowModal(false);
      fetchLeads();
    } catch {
      toast.error('No se pudo guardar la clienta');
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
    toast.success('Clientas exportadas en CSV');
  };

  const totalSpent = (lead: Lead) =>
    (lead.paymentOrders || [])
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Columna Izquierda: Directorio */}
      <aside aria-label="Directorio de clientas" className="flex min-h-0 w-[320px] shrink-0 flex-col border-r border-border bg-card/40">
        <div className="flex flex-col gap-2.5 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Clientas & Scoring</h2>
            <div className="flex items-center gap-1.5">
              <Button variant="default" size="sm" onClick={openCreate} className="h-7 gap-1 px-2.5 text-xs">
                <Plus className="size-3" /> Nueva
              </Button>
              <Button variant="outline" size="sm" onClick={exportLeadsCSV} className="h-7 px-2 text-xs">
                <Download className="size-3" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          {/* Chips de Categorías */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
            {TIER_FILTERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierFilter(t.id)}
                className={cn(
                  'h-6 rounded-md border px-2 text-[11px] font-medium transition-colors whitespace-nowrap',
                  tierFilter === t.id
                    ? 'border-foreground/20 bg-foreground text-background font-semibold shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/60 scrollbar-thin">
          {filteredLeads.map((lead) => {
            const isSelected = selectedLead?.id === lead.id;
            const paidCount = (lead.paymentOrders || []).filter((p) => p.status === 'PAID').length;

            return (
              <button
                key={lead.id}
                type="button"
                onClick={() => setSelectedLead(lead)}
                className={cn(
                  'flex w-full flex-col gap-1.5 p-3 text-left transition-colors',
                  isSelected
                    ? 'bg-card shadow-xs ring-1 ring-foreground/10'
                    : 'hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-foreground tracking-tight">
                    {lead.name || lead.phone}
                  </span>
                  <TierBadge tier={lead.tier === 'VIP' ? 'vip' : lead.tier === 'FREQUENT' ? 'recurrente' : 'nueva'} />
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {lead.lastInteractionAt ? formatDate(lead.lastInteractionAt) : 'Nuevo'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono">{lead.phone}</span>
                  {paidCount > 0 ? (
                    <span className="font-bold text-emerald-500">
                      {paidCount} compra{paidCount > 1 ? 's' : ''} ({money(totalSpent(lead))})
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Sin compras</span>
                  )}
                </div>
              </button>
            );
          })}

          {!loading && filteredLeads.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {search ? 'Ninguna clienta coincide' : 'No hay clientas en este segmento.'}
            </div>
          )}
        </div>
      </aside>

      {/* Columna Derecha: Detalle Ficha 360° */}
      <main className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background">
        {selectedLead ? (
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Header Clienta */}
            <header className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-base font-bold text-foreground">
                  {selectedLead.name?.slice(0, 2).toUpperCase() || 'CL'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      {selectedLead.name || selectedLead.phone}
                    </h1>
                    <TierBadge tier={selectedLead.tier === 'VIP' ? 'vip' : selectedLead.tier === 'FREQUENT' ? 'recurrente' : 'nueva'} />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{selectedLead.phone}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => openEdit(selectedLead)} className="h-8 gap-1.5 text-xs font-semibold">
                <Pencil className="size-3.5" /> Editar Perfil
              </Button>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
                <SectionLabel>Total Comprado</SectionLabel>
                <p className="text-xl font-bold text-emerald-500 font-mono">
                  {money(totalSpent(selectedLead))}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
                <SectionLabel>Pedidos Pagados</SectionLabel>
                <p className="text-xl font-bold text-foreground font-mono">
                  {(selectedLead.paymentOrders || []).filter((p) => p.status === 'PAID').length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
                <SectionLabel>Conversaciones Live</SectionLabel>
                <p className="text-xl font-bold text-foreground font-mono">
                  {(selectedLead.conversations || []).length}
                </p>
              </div>
            </div>

            {/* Dirección de Entrega Registrada */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
              <SectionLabel className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> Dirección de Entrega
              </SectionLabel>
              {selectedLead.addressStreet ? (
                <div className="text-xs space-y-1">
                  <p className="font-bold text-foreground text-sm">
                    {selectedLead.addressStreet} {selectedLead.addressNumber}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedLead.addressColonia ? `Col. ${selectedLead.addressColonia}, ` : ''}
                    {selectedLead.addressCity} {selectedLead.addressState} (CP: {selectedLead.addressZipCode})
                  </p>
                  {selectedLead.addressNotes && (
                    <p className="italic text-muted-foreground bg-muted/40 p-2 rounded-md mt-2 border border-border">
                      Ref: {selectedLead.addressNotes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sin dirección capturada aún.</p>
              )}
            </div>

            {/* Notas Privadas del Equipo */}
            {selectedLead.internalNotes && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1.5 text-xs">
                <SectionLabel className="text-amber-500 flex items-center gap-1.5">
                  <StickyNote className="size-3.5" /> Notas Privadas entre Vendedoras
                </SectionLabel>
                <p className="text-foreground leading-relaxed">{selectedLead.internalNotes}</p>
              </div>
            )}

            {/* Historial de Cobros */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Historial de Cobros y Tickets
                </h3>
              </div>
              <div className="divide-y divide-border">
                {(selectedLead.paymentOrders || []).length > 0 ? (
                  (selectedLead.paymentOrders || []).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3.5 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{order.concept}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(order.createdAt)} · Ref: {order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">{money(Number(order.amount))}</span>
                        <div className="mt-0.5">
                          <Badge tone={PAYMENT_TONE[order.status]}>
                            {PAYMENT_LABEL[order.status] || order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-8 text-center text-xs text-muted-foreground">Sin cobros registrados.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Selecciona una clienta en la bandeja izquierda para ver su historial 360°.
          </div>
        )}
      </main>

      {/* Modal Crear / Editar Clienta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold">
              {editingLead ? 'Editar Clienta' : 'Nueva Clienta'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted-foreground">Teléfono de WhatsApp</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+52 1 55 1234 5678"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase text-muted-foreground">Nombre Completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Sofía Martínez"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase text-muted-foreground">Origen</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <option value="whatsapp">WhatsApp Directo</option>
                  <option value="tiktok_live">TikTok Live</option>
                  <option value="instagram_live">Instagram Live</option>
                  <option value="manual">Manual / Tienda</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase text-muted-foreground">Notas Internas</label>
                <textarea
                  rows={2}
                  value={form.internalNotes}
                  onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                  placeholder="Notas privadas para las vendedoras..."
                  className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" variant="default" size="sm" disabled={saving} className="flex-1">
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}