'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '@/lib/socket';
import { Loader2, Power, RefreshCw, Smartphone, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, LiveDot } from '@/components/liveflow/primitives';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WhatsAppState {
  connected: boolean;
  connecting: boolean;
  qr: string | null;
}

export function WhatsAppSection() {
  const socket = useSocket();
  const [state, setState] = useState<WhatsAppState>({
    connected: false,
    connecting: false,
    qr: null,
  });

  useEffect(() => {
    if (!socket) return;

    const onStatus = (status: { connected: boolean; connecting?: boolean }) => {
      setState((prev) => ({
        ...prev,
        connected: Boolean(status?.connected),
        connecting: Boolean(status?.connecting),
        qr: status?.connected ? null : prev.qr,
      }));
    };

    const onQr = (payload: { qr: string | null }) => {
      setState((prev) => ({
        ...prev,
        qr: payload?.qr ?? null,
        connecting: payload?.qr ? false : prev.connecting,
      }));
    };

    socket.on('whatsapp:status', onStatus);
    socket.on('whatsapp:qr', onQr);
    socket.emit('whatsapp:status:request');

    return () => {
      socket.off('whatsapp:status', onStatus);
      socket.off('whatsapp:qr', onQr);
    };
  }, [socket]);

  const connect = () => {
    if (!socket) return;
    setState((prev) => ({ ...prev, connecting: true, qr: null }));
    socket.emit('whatsapp:connect');
    toast.info('Solicitando código QR de WhatsApp...');
  };

  const disconnect = () => {
    if (!socket) return;
    socket.emit('whatsapp:disconnect');
    setState({ connected: false, connecting: false, qr: null });
    toast.success('Sesión de WhatsApp desconectada');
  };

  return (
    <div className="space-y-4">
      {/* Tarjeta de Estado de Conexión */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
              state.connected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                : 'border-border bg-muted text-muted-foreground'
            )}
          >
            <Smartphone className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Línea de WhatsApp Oficial
              </h3>
              {state.connected ? (
                <Badge tone="success">
                  <CheckCircle2 className="size-2.5" /> Conectado
                </Badge>
              ) : state.connecting ? (
                <Badge tone="pending">Conectando...</Badge>
              ) : (
                <Badge tone="live">Desconectado</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {state.connected
                ? 'Los mensajes, cobros de Live y comprobantes se sincronizan en tiempo real.'
                : 'Escanea el código QR desde la app de WhatsApp para vincular el CRM.'}
            </p>
          </div>
        </div>

        <div>
          {state.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              disabled={!socket}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30 text-xs"
            >
              <Power className="size-3.5" /> Desconectar
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={connect}
              disabled={!socket || state.connecting}
              className="text-xs font-semibold"
            >
              {state.connecting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Conectando...
                </>
              ) : (
                <>
                  <RefreshCw className="size-3.5" /> {state.qr ? 'Regenerar QR' : 'Conectar WhatsApp'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tarjeta de Código QR */}
      {!state.connected && state.qr && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Vincular Dispositivo WhatsApp</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm">
            Abre WhatsApp en tu teléfono &gt; <strong>Dispositivos vinculados</strong> &gt; <strong>Vincular un dispositivo</strong>.
          </p>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <QRCodeSVG value={state.qr} size={180} />
          </div>

          <p className="text-[11px] font-mono text-muted-foreground">
            El código se actualiza automáticamente cada 20 segundos.
          </p>
        </div>
      )}

      {/* Guía si está desconectado sin QR */}
      {!state.connected && !state.qr && !state.connecting && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center space-y-1.5">
          <AlertCircle className="size-5 text-muted-foreground mx-auto" />
          <p className="text-xs font-semibold text-foreground">WhatsApp no está vinculado</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Haz clic en &quot;Conectar WhatsApp&quot; arriba para generar el código QR y empezar a atender chats del Live.
          </p>
        </div>
      )}
    </div>
  );
}