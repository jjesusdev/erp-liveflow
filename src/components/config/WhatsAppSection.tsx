'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '@/lib/socket';
import { Loader2, Power, RefreshCw, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        // Si se conecto, el QR dejo de ser valido.
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
  };

  const disconnect = () => {
    if (!socket) return;
    socket.emit('whatsapp:disconnect');
    setState({ connected: false, connecting: false, qr: null });
  };

  const statusLabel = state.connected
    ? 'Conectado'
    : state.qr
    ? 'Escanea el QR'
    : state.connecting
    ? 'Conectando...'
    : 'Desconectado';

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">WhatsApp</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  state.connected
                    ? 'bg-green-500'
                    : state.connecting
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
              />
              {statusLabel}
            </p>
          </div>
        </div>

        {state.connected ? (
          <button
            onClick={disconnect}
            disabled={!socket}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Power className="h-4 w-4" />
            Desconectar
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={!socket || state.connecting}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {state.connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {state.qr ? 'Regenerar QR' : 'Conectar'}
          </button>
        )}
      </div>

      {state.connected && (
        <p className="mt-3 text-sm text-muted-foreground">
          Los mensajes del chat, los links de pago y las campanas se envian por
          WhatsApp automaticamente.
        </p>
      )}

      {!state.connected && state.qr && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-md border bg-muted/30 p-4">
          <p className="text-sm font-medium">
            Abre WhatsApp &gt; Dispositivos vinculados &gt Vincular dispositivo
          </p>
          <div className="rounded-lg bg-white p-3">
            <QRCodeSVG value={state.qr} size={200} />
          </div>
          <p className="text-xs text-muted-foreground">
            El QR caduca en ~20 segundos. Si expira, pide uno nuevo.
          </p>
        </div>
      )}

      {!state.connected && !state.qr && !state.connecting && (
        <p className="mt-3 text-sm text-muted-foreground">
          Conecta tu numero para enviar y recibir mensajes en tiempo real.
        </p>
      )}
    </section>
  );
}
