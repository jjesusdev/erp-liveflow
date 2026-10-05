'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate } from '@/lib/date-utils';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Pencil,
  Download,
  Users,
  MapPin,
  FileText,
  CreditCard,
  ChevronRight,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, TierBadge } from '@/components/liveflow/primitives';
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
  SENT: 'Por pagar',
  PENDING: 'Pendiente',
  EXPIRED: 'Vencido',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const TIER_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'VIP', label: 'VIP' },
  { id: 'FREQUENT', label: 'Recurrentes' },
  { id: 'NEW', label: 'Nuevas' },
  { id: 'GHOST', label: 'Sin pago' },
];

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', source: '', internalNotes: '' });
  const [saving, setSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const url = search ? `/api/leads?search=${encodeURIComponent(search)}` : '/api/leads';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar');
      const data: Lead[] = await res.json();
      setLeads(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch {
      toast.error('No se pudieron cargar las clientas');
    } finally {
      setLoading(false);
    }
  }, [search, selectedId]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 180);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedId) || leads[0] || null;
  }, [leads, selectedId]);

  const openCreate = () => {
    setEditingLead(null);
    setForm({ phone: '', name: '', source: 'whatsapp', internalNotes: '' });
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

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (tierFilter === 'all') return true;
      return l.tier === tierFilter;
    });
  }, [leads, tierFilter]);

  const stats = useMemo(() => {
    const totalRevenue = leads.reduce((sum, l) => sum + (l.totalSpent || 0), 0);
    const totalOrders = leads.reduce((sum, l) => sum + (l.totalPaidCount || 0), 0);
    const vipCount = leads.filter((l) => l.tier === 'VIP').length;
    return {
      totalRevenue,
      totalOrders,
      vipCount,
      count: leads.length,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [leads]);

  const exportCsv = () => {
    if (filteredLeads.length === 0) return;
    const header = 'Nombre,Telefono,Nivel,Compras,Total_Gastado,Origen,Direccion,Notas';
    const body = filteredLeads
      .map((l) => [
        l.name || 'Sin nombre',
        l.phone,
        l.tier || 'NEW',
        l.totalPaidCount || 0,
        (l.totalSpent || 0).toFixed(2),
        l.source || 'WhatsApp',
        `${l.addressStreet || ''} ${l.addressNumber || ''} ${l.addressColonia || ''} ${l.addressCity || ''}`.trim(),
        l.internalNotes || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientas-${tierFilter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Directorio exportado', { description: `${filteredLeads.length} clientas descargadas.` });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              DIRECTORIO · {stats.count} CLIENTAS REGISTRADAS
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Directorio de clientas
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 text-xs">
              <Download className="size-3.5" aria-hidden />
              Exportar CSV
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5 text-xs font-semibold">
              <Plus className="size-3.5" aria-hidden />
              Nueva clienta
            </Button>
          </div>
        </header>

        {/* Resumen Métricas */}
        <section aria-label="Resumen de clientas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valor de cartera</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-success">{money(stats.totalRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.totalOrders} compras pagadas</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Clientas VIP</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stats.vipCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Más de 3 compras en Lives</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ticket promedio</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{money(stats.avgTicket)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Por cada compra cerrada</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total registradas</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stats.count}</p>
            <p className="mt-1 text-xs text-muted-foreground">Base activa de WhatsApp</p>
          </div>
        </section>

        {/* Barra de Filtro y Búsqueda */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div role="tablist" aria-label="Filtrar por categoría" className="flex gap-1 rounded-md bg-muted p-0.5">
            {TIER_FILTERS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tierFilter === t.id}
                onClick={() => setTierFilter(t.id)}
                className={cn(
                  'h-6 rounded px-2.5 text-xs font-medium transition-colors',
                  tierFilter === t.id
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="relative">
            <span className="sr-only">Buscar por nombre o teléfono</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre o teléfono…"
              className="h-7 w-60 rounded-md border border-input bg-background pr-2 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </label>
        </div>

        {/* Grid de 2 Columnas de Trabajo */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] items-start">
          {/* Tabla de Clientas */}
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">Clienta</th>
                    <th scope="col" className="px-3 py-2.5">Nivel</th>
                    <th scope="col" className="px-3 py-2.5">Origen</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Pedidos</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Total</th>
                    <th scope="col" className="w-8 px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    const tier = lead.tier === 'VIP' ? 'vip' : lead.tier === 'FREQUENT' ? 'recurrente' : 'nueva';

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedId(lead.id)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected ? 'bg-muted/60 font-medium' : 'hover:bg-muted/30'
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-foreground">{lead.name || 'Sin nombre'}</p>
                          <p className="text-[11px] text-muted-foreground">{lead.phone}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <TierBadge tier={tier} />
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground capitalize text-[11px]">
                          {lead.source?.replace('_', ' ') || 'WhatsApp'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">
                          {lead.totalPaidCount || 0}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-foreground">
                          {money(lead.totalSpent || 0)}
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">
                          <ChevronRight className={cn('size-3.5 transition-opacity', isSelected ? 'opacity-100 text-foreground' : 'opacity-30')} />
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                        No hay clientas en este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ficha Lateral de Detalle 360° */}
          <aside aria-label="Ficha de la clienta" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs">
            {selectedLead ? (
              <>
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold tracking-tight text-foreground">
                        {selectedLead.name || 'Clienta'}
                      </h2>
                      <TierBadge tier={selectedLead.tier === 'VIP' ? 'vip' : selectedLead.tier === 'FREQUENT' ? 'recurrente' : 'nueva'} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedLead.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(selectedLead)} className="h-7 px-2 text-xs">
                    <Pencil className="size-3" aria-hidden />
                    Editar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-border bg-background p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total gastado</p>
                    <p className="mt-0.5 text-sm font-bold text-success">{money(selectedLead.totalSpent || 0)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pedidos pagados</p>
                    <p className="mt-0.5 text-sm font-bold">{selectedLead.totalPaidCount || 0}</p>
                  </div>
                </div>

                {/* Dirección de entrega */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dirección de entrega</p>
                  <div className="rounded-md border border-border bg-background p-3">
                    {selectedLead.addressStreet ? (
                      <>
                        <p className="font-medium text-foreground">
                          {selectedLead.addressStreet} {selectedLead.addressNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedLead.addressColonia ? `Col. ${selectedLead.addressColonia}, ` : ''}
                          {selectedLead.addressCity} {selectedLead.addressState} · CP {selectedLead.addressZipCode}
                        </p>
                        {selectedLead.addressNotes && (
                          <p className="mt-1.5 border-t border-border pt-1 text-[11px] text-muted-foreground italic">
                            Ref: {selectedLead.addressNotes}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Sin dirección capturada aún.</p>
                    )}
                  </div>
                </div>

                {/* Notas privadas */}
                {selectedLead.internalNotes && (
                  <div className="flex flex-col gap-1.5 text-xs">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-pending">Notas privadas del equipo</p>
                    <div className="rounded-md border border-pending/20 bg-pending/5 p-2.5 text-xs text-foreground leading-relaxed">
                      {selectedLead.internalNotes}
                    </div>
                  </div>
                )}

                {/* Historial de pedidos */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Últimos cobros</p>
                  <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background">
                    {(selectedLead.paymentOrders || []).map((po) => (
                      <li key={po.id} className="flex items-center justify-between p-2.5">
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium text-foreground">{po.concept}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(po.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-semibold text-foreground">{money(Number(po.amount))}</span>
                          <div className="mt-0.5">
                            <Badge tone={PAYMENT_TONE[po.status]}>
                              {PAYMENT_LABEL[po.status] || po.status}
                            </Badge>
                          </div>
                        </div>
                      </li>
                    ))}
                    {(selectedLead.paymentOrders || []).length === 0 && (
                      <li className="p-4 text-center text-xs text-muted-foreground">Sin compras registradas.</li>
                    )}
                  </ul>
                </div>
              </>
            ) : (
              <p className="p-8 text-center text-xs text-muted-foreground">Selecciona una clienta para ver su ficha.</p>
            )}
          </aside>
        </div>
      </div>

      {/* Modal Crear / Editar Clienta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl space-y-4">
            <h2 className="text-sm font-semibold tracking-tight">{editingLead ? 'Editar perfil de clienta' : 'Nueva clienta'}</h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Teléfono WhatsApp</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+52 1 55 1234 5678"
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Nombre completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Sofia Martínez"
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Notas internas</label>
                <textarea
                  rows={2}
                  value={form.internalNotes}
                  onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                  placeholder="Solo visible para el equipo…"
                  className="resize-none rounded-md border border-input bg-background p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="flex-1 font-semibold">
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}