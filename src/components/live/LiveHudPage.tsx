'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Radio,
  Flame,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  ShoppingBag,
  Users,
} from 'lucide-react';
import type { LiveSession, PaymentOrder } from '@/types';

export function LiveHudPage() {
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchLiveState = useCallback(async () => {
    try {
      const res = await fetch('/api/live-sessions?active=true');
      if (res.ok) {
        const sessions = await res.json();
        if (Array.isArray(sessions) && sessions.length > 0) {
          setActiveSession(sessions[0]);
        } else {
          setActiveSession(null);
        }
      }

      // Traer últimos cobros pagados del live
      const paymentsRes = await fetch('/api/caja?status=PAID&range=today');
      if (paymentsRes.ok) {
        const p = await paymentsRes.json();
        if (Array.isArray(p)) setRecentPayments(p.slice(0, 10));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveState();
  }, [fetchLiveState]);

  useEffect(() => {
    if (!socket) return;

    const onPaymentConfirmed = (order: PaymentOrder) => {
      fetchLiveState();
    };

    const onLiveStarted = (session: LiveSession) => {
      setActiveSession(session);
    };

    const onLiveUpdated = (session: LiveSession) => {
      if (session.status === 'ENDED') {
        setActiveSession(null);
      } else {
        setActiveSession(session);
      }
    };

    socket.on('payment:confirmed', onPaymentConfirmed);
    socket.on('payment:updated', onPaymentConfirmed);
    socket.on('live:session:started', onLiveStarted);
    socket.on('live:session:updated', onLiveUpdated);

    return () => {
      socket.off('payment:confirmed', onPaymentConfirmed);
      socket.off('payment:updated', onPaymentConfirmed);
      socket.off('live:session:started', onLiveStarted);
      socket.off('live:session:updated', onLiveUpdated);
    };
  }, [socket, fetchLiveState]);

  const totalSales = activeSession?.totalSales || recentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalTickets = activeSession?.ordersCount || recentPayments.length;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white p-6 sm:p-8 font-sans select-none overflow-y-auto">
      {/* Header del Live HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600"></span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-red-500 flex items-center gap-2">
              <Radio className="h-6 w-6" /> MONITOR EN VIVO
            </h1>
            <p className="text-xs text-slate-400">
              {activeSession?.title || 'Transmisión de Live Shopping (Modo Conductor)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-xs font-mono text-slate-300">
            {activeSession?.platform || 'TIKTOK LIVE'}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {new Date().toLocaleTimeString('es-MX')}
          </span>
        </div>
      </div>

      {/* Marcador Gigante de Ventas */}
      <div className="my-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recaudación Total */}
        <div className="lg:col-span-2 rounded-2xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Flame className="h-48 w-48 text-emerald-400" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" /> Recaudación Total en Vivo
          </span>
          <p className="mt-4 text-5xl sm:text-7xl font-black tracking-tight text-emerald-400 font-mono">
            {formatCurrency(totalSales)}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-400">
            <span className="bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-md text-emerald-300">
              {totalTickets} Ventas Confirmadas
            </span>
            <span>Ticket promedio: {formatCurrency(totalTickets > 0 ? totalSales / totalTickets : 0)}</span>
          </div>
        </div>

        {/* Resumen Rápido */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ritmo de Ventas
          </span>

          <div className="my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm text-slate-400">Tickets emitidos</span>
              <span className="text-2xl font-bold font-mono text-white">{totalTickets}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm text-slate-400">Estado del Live</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> Activo
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Sincronizado en tiempo real con las vendedoras en WhatsApp.
          </p>
        </div>
      </div>

      {/* Feed en Vivo de Pagos Entrando */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 flex-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Últimos Pagos Confirmados en Tiempo Real
        </h3>

        <div className="space-y-2.5">
          {recentPayments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 hover:border-emerald-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {p.concept}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.lead?.name || p.lead?.phone || 'Clienta'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-black text-emerald-400 font-mono">
                  +${Number(p.amount).toFixed(2)}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {p.paidAt ? new Date(p.paidAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Recién'}
                </span>
              </div>
            </div>
          ))}

          {recentPayments.length === 0 && (
            <p className="text-sm text-slate-500 py-12 text-center">
              Esperando los primeros pagos del Live... ¡Las ventas aparecerán aquí en vivo!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}