'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MonitorPlay, Radio, Users } from 'lucide-react';
import { clock, money } from '@/lib/format';
import { Badge, LiveDot } from '@/components/liveflow/primitives';
import type { LiveSession } from '@/types';

export function LiveStatusBar({
  activeSession,
  onStartLive,
  onEndLive,
}: {
  activeSession?: LiveSession | null;
  onStartLive?: () => void;
  onEndLive?: () => void;
}) {
  const [elapsed, setElapsed] = useState(42 * 60 + 18);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(elapsed / 3600);

  return (
    <header className="flex h-10 shrink-0 items-center gap-4 border-b border-border bg-card/60 px-4 text-xs backdrop-blur-md">
      <h1 className="text-sm font-black tracking-wider uppercase text-foreground">LiveFlow</h1>
      {activeSession ? (
        <>
          <Badge tone="live" className="font-bold">
            <LiveDot className="size-1.5" />
            EN VIVO
          </Badge>
          <span className="text-muted-foreground truncate max-w-xs">{activeSession.platform} • {activeSession.title}</span>
          <span className="font-mono text-muted-foreground">
            {String(h).padStart(2, '0')}:{clock(elapsed % 3600)}
          </span>
          <div className="ml-auto flex items-center gap-4">
            <span className="font-mono font-bold text-emerald-500">
              {money(activeSession.totalSales || 0)}
            </span>
            <Link
              href="/live-hud"
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <MonitorPlay className="size-3.5" aria-hidden />
              Abrir HUD
            </Link>
            {onEndLive && (
              <button
                onClick={onEndLive}
                className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20"
              >
                Finalizar Live
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <span className="text-muted-foreground">Sin transmisión activa</span>
          <div className="ml-auto flex items-center gap-3">
            {onStartLive && (
              <button
                onClick={onStartLive}
                className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-red-700"
              >
                <Radio className="size-3" /> Iniciar Live
              </button>
            )}
            <Link
              href="/live-hud"
              className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground"
            >
              <MonitorPlay className="size-3.5" aria-hidden />
              HUD
            </Link>
          </div>
        </>
      )}
    </header>
  );
}