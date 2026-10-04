'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { Radio, Users, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { LiveSession } from '@/types';

export function LiveStatusBar({
  activeSession,
  onEndLive,
  onStartLive,
}: {
  activeSession?: LiveSession | null;
  onEndLive?: () => void;
  onStartLive?: () => void;
}) {
  const [totalSales, setTotalSales] = useState(activeSession?.totalSales || 0);
  const [tickets, setTickets] = useState(activeSession?.ordersCount || 0);

  useEffect(() => {
    if (activeSession) {
      setTotalSales(activeSession.totalSales || 0);
      setTickets(activeSession.ordersCount || 0);
    }
  }, [activeSession]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {activeSession ? (
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-red-500">EN VIVO</span>
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                {activeSession.title}
              </span>
              <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-red-400">
                {activeSession.platform}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-full bg-zinc-600" />
            <span className="text-xs font-medium">Modo Preparación • Sin transmisión activa</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {activeSession ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs">
              <DollarSign className="size-3.5 text-emerald-500" />
              <span className="font-mono font-bold text-foreground">{formatCurrency(totalSales)}</span>
              <span className="text-[10px] text-muted-foreground">({tickets} ventas)</span>
            </div>
            {onEndLive && (
              <button
                onClick={onEndLive}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Finalizar Live
              </button>
            )}
          </div>
        ) : (
          onStartLive && (
            <button
              onClick={onStartLive}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 shadow-sm transition-all"
            >
              <Radio className="size-3.5" /> Iniciar Sesión Live
            </button>
          )
        )}
      </div>
    </header>
  );
}