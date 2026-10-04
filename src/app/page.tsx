'use client';

import { useEffect, useState, useCallback } from 'react';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useSocket } from '@/lib/socket';
import { cn, formatCurrency } from '@/lib/utils';
import { Radio, Play, Square, Sparkles } from 'lucide-react';
import type { LiveSession } from '@/types';

export default function DashboardPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [livePlatform, setLivePlatform] = useState('TIKTOK');
  const [startingLive, setStartingLive] = useState(false);
  const socket = useSocket();

  const fetchActiveLive = useCallback(async () => {
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
    } catch {
      // Ignorar error de red silencioso
    }
  }, []);

  useEffect(() => {
    fetchActiveLive();
  }, [fetchActiveLive]);

  useEffect(() => {
    if (!socket) return;

    const onStatus = (status: { connected: boolean }) => {
      setWhatsappConnected(Boolean(status?.connected));
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

    const onPaymentConfirmed = () => {
      fetchActiveLive();
    };

    socket.on('whatsapp:status', onStatus);
    socket.on('live:session:started', onLiveStarted);
    socket.on('live:session:updated', onLiveUpdated);
    socket.on('payment:confirmed', onPaymentConfirmed);
    socket.emit('whatsapp:status:request');

    return () => {
      socket.off('whatsapp:status', onStatus);
      socket.off('live:session:started', onLiveStarted);
      socket.off('live:session:updated', onLiveUpdated);
      socket.off('payment:confirmed', onPaymentConfirmed);
    };
  }, [socket, fetchActiveLive]);

  const handleStartLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTitle.trim()) return;
    setStartingLive(true);
    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: liveTitle, platform: livePlatform }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setShowLiveModal(false);
        setLiveTitle('');
      }
    } finally {
      setStartingLive(false);
    }
  };

  const handleEndLive = async () => {
    if (!activeSession || !confirm('¿Finalizar la sesión de Live actual?')) return;
    try {
      await fetch(`/api/live-sessions/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      });
      setActiveSession(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedConversation(id);
    setShowPanel(true);
  };

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-2.5 bg-card">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-bold">Tablero de Ventas</h1>

            {/* Badge de WhatsApp */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                whatsappConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  whatsappConnected ? 'bg-green-600' : 'bg-red-600'
                )}
              />
              {whatsappConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
            </span>

            {/* Marcador del Live Activo */}
            {activeSession ? (
              <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50/80 px-3 py-1 text-xs text-red-900 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                </span>
                <span className="font-bold uppercase tracking-wider text-[11px]">EN VIVO:</span>
                <span className="font-semibold truncate max-w-[150px]">{activeSession.title}</span>
                <span className="rounded bg-red-200/80 px-1.5 py-0.2 text-[10px] font-mono font-bold dark:bg-red-900">
                  {formatCurrency(activeSession.totalSales || 0)}
                </span>
                <button
                  onClick={handleEndLive}
                  className="ml-1 text-[11px] font-bold text-red-700 hover:text-red-900 underline dark:text-red-300"
                  title="Cerrar sesión de Live"
                >
                  Finalizar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLiveModal(true)}
                className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Radio className="h-3.5 w-3.5" />
                Iniciar Sesión Live
              </button>
            )}
          </div>

          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </header>

        <div className="min-h-0 flex-1">
          <KanbanBoard onSelectConversation={handleSelect} />
        </div>
      </div>

      {showPanel && selectedConversation && (
        <aside className="flex w-full max-w-md shrink-0 flex-col border-l bg-card">
          <ChatPanel
            conversationId={selectedConversation}
            onClose={() => setShowPanel(false)}
          />
        </aside>
      )}

      {/* Modal para Iniciar Transmisión Live */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl border">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-5 w-5 text-red-600 animate-pulse" />
              <h2 className="text-base font-bold">Iniciar Sesión de Live</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Vincula todas las ventas generadas a este evento para medir la recaudación exacta de la transmisión.
            </p>

            <form onSubmit={handleStartLive} className="space-y-3">
              <div>
                <label className="text-xs font-semibold" htmlFor="live-title">
                  Nombre del Live / Evento
                </label>
                <input
                  id="live-title"
                  type="text"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  placeholder="Ej: Live Otoño - Remate de Vestidos"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold" htmlFor="live-platform">
                  Plataforma
                </label>
                <select
                  id="live-platform"
                  value={livePlatform}
                  onChange={(e) => setLivePlatform(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs"
                >
                  <option value="TIKTOK">TikTok Live</option>
                  <option value="INSTAGRAM">Instagram Live</option>
                  <option value="FACEBOOK">Facebook Live</option>
                  <option value="YOUTUBE">YouTube Live</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLiveModal(false)}
                  className="flex-1 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={startingLive || !liveTitle.trim()}
                  className="flex-1 rounded-md bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {startingLive ? 'Iniciando...' : 'Comenzar Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}