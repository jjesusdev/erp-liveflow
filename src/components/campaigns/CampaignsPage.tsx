'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDate, formatTime, cn } from '@/lib/date-utils';
import { useSocket } from '@/lib/socket';
import {
  Megaphone,
  Plus,
  Trash2,
  Send,
  Users,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { Campaign, CampaignStatus } from '@/types';

const STATUS_META: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  SCHEDULED: { label: 'Programada', className: 'bg-blue-100 text-blue-800' },
  SENDING: { label: 'Enviando', className: 'bg-yellow-100 text-yellow-800' },
  SENT: { label: 'Enviada', className: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
};

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', message: '', scheduledAt: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (!res.ok) throw new Error('No se pudieron cargar las campanas');
      setCampaigns(await res.json());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las campanas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Progreso del envio en tiempo real.
  useEffect(() => {
    if (!socket) return;

    const onUpdated = (campaign: Campaign) => {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, ...campaign } : c))
      );
    };

    socket.on('campaign:updated', onUpdated);
    return () => {
      socket.off('campaign:updated', onUpdated);
    };
  }, [socket]);

  const handleCreate = async (e: React.FormEvent, sendNow: boolean) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        message: form.message,
      };
      if (sendNow) {
        payload.sendNow = true;
      } else if (form.scheduledAt) {
        payload.scheduledAt = new Date(form.scheduledAt).toISOString();
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear la campana');
      if (data?.warning) setError(data.warning);

      setShowModal(false);
      setForm({ name: '', message: '', scheduledAt: '' });
      fetchCampaigns();
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear la campana');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo iniciar el envio');
      fetchCampaigns();
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar el envio');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta campana?')) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cancelar');
      fetchCampaigns();
    } catch (err: any) {
      setError(err?.message || 'No se pudo cancelar');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta campana?')) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar');
      fetchCampaigns();
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar la campana');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Campanas</h1>
          <p className="text-sm text-muted-foreground">
            Mensajes masivos a tus clientes
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva campana
        </button>
      </div>

      {error && !showModal && (
        <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {campaigns.map((campaign) => {
          const isSending = campaign.status === 'SENDING';
          const canSend = ['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(campaign.status);
          const canCancel = ['DRAFT', 'SCHEDULED', 'SENDING'].includes(campaign.status);
          const progress =
            campaign.totalLeads > 0
              ? Math.round(
                  ((campaign.sentCount + campaign.failedCount) / campaign.totalLeads) * 100
                )
              : 0;

          return (
            <div key={campaign.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <h3 className="truncate font-semibold">{campaign.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{campaign.message}</p>
                </div>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  disabled={isSending}
                  title="Eliminar"
                  className="shrink-0 rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_META[campaign.status]?.className
                  )}
                >
                  {STATUS_META[campaign.status]?.label || campaign.status}
                </span>

                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {campaign.totalLeads} destinatarios
                </span>

                {campaign.scheduledAt && campaign.status === 'SCHEDULED' && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(campaign.scheduledAt)} {formatTime(campaign.scheduledAt)}
                  </span>
                )}

                {campaign.sentAt && campaign.status === 'SENT' && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(campaign.sentAt)}
                  </span>
                )}

                {campaign.sentCount > 0 && (
                  <span className="text-green-600">{campaign.sentCount} enviados</span>
                )}
                {campaign.failedCount > 0 && (
                  <span className="text-red-600">{campaign.failedCount} fallidos</span>
                )}
              </div>

              {isSending && (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enviando... {campaign.sentCount + campaign.failedCount}/
                    {campaign.totalLeads}
                  </p>
                </div>
              )}

              {(canSend || canCancel) && (
                <div className="mt-3 flex gap-2">
                  {canSend && (
                    <button
                      onClick={() => handleSend(campaign.id)}
                      disabled={busyId === campaign.id}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busyId === campaign.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {campaign.status === 'CANCELLED' ? 'Reenviar' : 'Enviar ahora'}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => handleCancel(campaign.id)}
                      disabled={busyId === campaign.id}
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  )}
                </div>
              )}

              {(campaign.recipients?.length || 0) > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Ver destinatarios ({campaign.recipients?.length})
                  </summary>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {campaign.recipients?.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                      >
                        <span>
                          {recipient.lead?.name || recipient.lead?.phone}
                        </span>
                        <span
                          className={cn(
                            recipient.status === 'SENT' && 'text-green-600',
                            recipient.status === 'FAILED' && 'text-red-600'
                          )}
                        >
                          {recipient.status === 'FAILED' && recipient.errorMessage
                            ? `Fallo: ${recipient.errorMessage}`
                            : recipient.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {!loading && campaigns.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          Todavia no hay campanas
        </div>
      )}

      {loading && (
        <div className="py-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Nueva campana</h2>

            {error && (
              <div className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-800">
                {error}
              </div>
            )}

            <form className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="c-name">
                  Nombre
                </label>
                <input
                  id="c-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Promo del fin de semana"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  required
                />
              </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="campaign-msg">
                  Mensaje
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Variables: <code className="bg-muted px-1 rounded">{'{{nombre}}'}</code> <code className="bg-muted px-1 rounded">{'{{telefono}}'}</code>
                </span>
              </div>
              <textarea
                id="campaign-msg"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="¡Hola {{nombre}}! Ya estamos EN VIVO con ofertas relámpago y combos exclusivos. ¡Entra aquí: https://tiktok.com/@mitienda/live !"
                required
              />
            </div>

              <div>
                <label className="text-sm font-medium" htmlFor="c-date">
                  Programar (opcional)
                </label>
                <input
                  id="c-date"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Si lo dejas vacio se guarda como borrador para enviar despues.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreate(e, false)}
                  disabled={saving}
                  className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreate(e, true)}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Enviar ya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
