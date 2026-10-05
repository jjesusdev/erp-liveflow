'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Check,
  ChevronDown,
  Clock,
  ImagePlus,
  Lock,
  Phone,
  Plus,
  SendHorizontal,
  Shirt,
  Wallet,
  X,
  Radio,
  Zap,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clock, money } from '@/lib/format';
import { CATALOG, SHORTCUTS, type Conversation, type Message, type Product } from '@/lib/liveflow-data';
import { Button } from '@/components/ui/button';
import { Kbd, TierBadge } from '@/components/liveflow/primitives';
import { ImageBubble, ReceiptBubble, TextBubble, VoiceBubble } from './message-bubbles';

export function ChatColumn({
  conversation,
  messages,
  deadline,
  onApprove,
  onOpenCharge,
  onSend,
  onAddProduct,
}: {
  conversation?: Conversation | null;
  messages: Message[];
  deadline: number | null;
  onApprove: () => void;
  onOpenCharge: () => void;
  onSend: (text: string, image?: string) => void;
  onAddProduct: (p: Product) => void;
}) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <section aria-label="Centro de atención en espera" className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Centro de Atención Live
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">STANDBY</span>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4 border border-emerald-500/20">
            <Radio className="size-6 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-foreground">Listo para atender transmisiones en vivo</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Cuando las clientas escriban por WhatsApp solicitando prendas o enviando comprobantes de transferencia, la conversación aparecerá aquí para gestionarla al vuelo.
          </p>

          <div className="grid grid-cols-3 gap-2.5 w-full mt-6 text-left">
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] font-bold text-amber-500">1. APARTADOS</span>
              <p className="text-[11px] text-muted-foreground">Bloqueo de 30 min para transferir.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] font-bold text-emerald-500">2. COMPROBANTES</span>
              <p className="text-[11px] text-muted-foreground">Aprobación en 1 clic sobre la foto.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] font-bold text-blue-500">3. DESPACHOS</span>
              <p className="text-[11px] text-muted-foreground">Ficha y etiqueta de empaque lista.</p>
            </div>
          </div>
        </div>

        <Composer onSend={onSend} disabled={true} />
      </section>
    );
  }

  return (
    <section aria-label={`Chat con ${conversation.name}`} className="flex min-w-0 flex-1 flex-col bg-background">
      <ChatHeader conversation={conversation} onOpenCharge={onOpenCharge} onAddProduct={onAddProduct} />
      {deadline && conversation.apartado && (
        <ApartadoBanner amount={conversation.apartado.amount} deadline={deadline} onApprove={onApprove} />
      )}
      <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin" aria-live="polite">
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5 px-4 py-5">
          <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono">HOY · LIVE #48</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {messages.map((m) => {
            if (m.kind === 'text') return <TextBubble key={m.id} message={m} />;
            if (m.kind === 'voice') return <VoiceBubble key={m.id} message={m} />;
            if (m.kind === 'image') return <ImageBubble key={m.id} message={m} />;
            return <ReceiptBubble key={m.id} message={m} onApprove={onApprove} />;
          })}
        </div>
      </div>
      <Composer onSend={onSend} />
    </section>
  );
}

function ChatHeader({
  conversation: c,
  onOpenCharge,
  onAddProduct,
}: {
  conversation: Conversation;
  onOpenCharge: () => void;
  onAddProduct: (p: Product) => void;
}) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const initials = c.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-sm font-semibold tracking-tight">{c.name}</h2>
          <TierBadge tier={c.tier} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{c.phone}</span>
          <span>·</span>
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            En línea WhatsApp
          </span>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCatalogOpen((o) => !o)}
          aria-expanded={catalogOpen}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted active:scale-[0.98]"
        >
          <Shirt className="size-3.5" aria-hidden />
          <span>Prendas</span>
          <ChevronDown className={cn('size-3 transition-transform', catalogOpen && 'rotate-180')} aria-hidden />
        </button>

        {catalogOpen && (
          <div
            role="menu"
            className="absolute top-full right-0 z-30 mt-1.5 w-80 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Prendas activas en vivo
            </p>
            <div className="flex flex-col gap-1">
              {CATALOG.map((p) => (
                <button
                  key={p.sku}
                  type="button"
                  onClick={() => {
                    onAddProduct(p);
                    setCatalogOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-lg p-2 text-left text-xs transition-colors hover:bg-accent"
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image src={p.img} alt={p.name} fill sizes="40px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Talla {p.size} · {p.stock} disponibles
                    </p>
                  </div>
                  <span className="font-mono font-bold text-foreground">{money(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button variant="success" size="sm" onClick={onOpenCharge}>
          <Wallet aria-hidden />
          Cobrar
          <Kbd className="ml-1 bg-white/20 text-white border-white/30">C</Kbd>
        </Button>
      </div>
    </header>
  );
}

function ApartadoBanner({
  amount,
  deadline,
  onApprove,
}: {
  amount: number;
  deadline: number;
  onApprove: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((deadline - Date.now()) / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const urgent = remaining < 5 * 60;

  return (
    <aside
      aria-label="Estado de apartado"
      className={cn(
        'flex h-10 shrink-0 items-center justify-between border-b px-4 text-xs font-medium transition-colors',
        urgent ? 'border-live/30 bg-live/10 text-live' : 'border-pending/30 bg-pending/10 text-pending',
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="size-3.5" aria-hidden />
        <span>
          Apartado activo por <strong>{money(amount)} MXN</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          Vence en <strong className={cn('font-mono', urgent && 'animate-pulse')}>{clock(remaining)}</strong>
        </span>
      </div>
      <Button variant="success" size="sm" className="h-6 px-2 text-[11px] font-bold" onClick={onApprove}>
        <Check className="size-3" aria-hidden />
        Aprobar pago
      </Button>
    </aside>
  );
}

function Composer({
  onSend,
  disabled = false,
}: {
  onSend: (text: string, image?: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) setPastedImage(event.target.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const submit = () => {
    if ((!text.trim() && !pastedImage) || disabled) return;
    onSend(text.trim(), pastedImage || undefined);
    setText('');
    setPastedImage(null);
  };

  return (
    <footer className="flex flex-col border-t border-border bg-card p-3 gap-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">Atajos:</span>
        {SHORTCUTS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => setText(s.text)}
            className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            {s.label}
          </button>
        ))}
      </div>

      {pastedImage && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2">
          <div className="flex items-center gap-2">
            <img src={pastedImage} alt="Pegada" className="size-12 rounded object-cover border border-border" />
            <span className="text-xs font-semibold text-foreground">Imagen lista para enviar</span>
          </div>
          <button
            type="button"
            onClick={() => setPastedImage(null)}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            ✕ Quitar
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled}
          placeholder={disabled ? 'Selecciona una conversación para responder...' : "Escribe un mensaje o pega una captura con Ctrl+V..."}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        />
        <Button size="sm" onClick={submit} disabled={disabled || (!text.trim() && !pastedImage)}>
          <SendHorizontal className="size-3.5" />
          Enviar
        </Button>
      </div>
    </footer>
  );
}