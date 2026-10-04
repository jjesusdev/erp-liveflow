'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, CheckCheck, Pause, Play, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clock, money } from '@/lib/format';
import { Button } from '@/components/ui/button';

const WAVE = [4, 9, 14, 7, 18, 12, 6, 15, 20, 10, 5, 13, 17, 8, 11, 19, 6, 14, 9, 16, 7, 12, 4, 10, 15, 8, 5, 11];

function BubbleShell({
  from,
  time,
  children,
  className,
}: {
  from: 'in' | 'out';
  time: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex w-full', from === 'out' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-xl border px-3 py-2 text-[13px] leading-relaxed shadow-xs',
          from === 'out'
            ? 'rounded-br-sm border-primary/20 bg-primary text-primary-foreground'
            : 'rounded-bl-sm border-border bg-card text-card-foreground',
          className
        )}
      >
        {children}
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 font-mono text-[10px]',
            from === 'out' ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {time}
          {from === 'out' && <CheckCheck className="size-3" />}
        </div>
      </div>
    </div>
  );
}

export function TextBubble({
  text,
  from,
  time,
}: {
  text: string;
  from: 'in' | 'out';
  time: string;
}) {
  return (
    <BubbleShell from={from} time={time}>
      <p className="whitespace-pre-wrap break-words">{text}</p>
    </BubbleShell>
  );
}

export function ImageBubble({
  src,
  caption,
  from,
  time,
  onImageClick,
}: {
  src: string;
  caption?: string | null;
  from: 'in' | 'out';
  time: string;
  onImageClick?: () => void;
}) {
  return (
    <BubbleShell from={from} time={time} className="p-1.5">
      <img
        src={src}
        alt={caption || 'Imagen enviada'}
        onClick={onImageClick}
        className="max-h-60 w-auto rounded-lg object-contain cursor-pointer hover:opacity-95"
      />
      {caption && <p className="px-1.5 pt-1.5 whitespace-pre-wrap break-words text-xs">{caption}</p>}
    </BubbleShell>
  );
}

export function VoiceBubble({
  src,
  durationSec = 15,
  from,
  time,
}: {
  src?: string | null;
  durationSec?: number;
  from: 'in' | 'out';
  time: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const total = durationSec * 10;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= total) {
          setPlaying(false);
          return 0;
        }
        return e + 1;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, total]);

  const progress = elapsed / total;
  const out = from === 'out';

  return (
    <BubbleShell from={from} time={time} className="w-64">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
            out ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
          )}
        >
          {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
        </button>
        <div className="flex h-6 flex-1 items-center gap-[2px]" aria-hidden>
          {WAVE.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h + 2}px` }}
              className={cn(
                'w-[3px] rounded-full transition-colors',
                i / WAVE.length <= progress && (playing || elapsed > 0)
                  ? 'bg-emerald-500'
                  : out
                  ? 'bg-primary-foreground/40'
                  : 'bg-muted-foreground/40'
              )}
            />
          ))}
        </div>
        <span className={cn('font-mono text-[11px]', out ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
          {clock(playing || elapsed ? Math.ceil((total - elapsed) / 10) : durationSec)}
        </span>
      </div>
    </BubbleShell>
  );
}

export function ReceiptBubble({
  src,
  amount,
  time,
  approved,
  onApprove,
  onImageClick,
}: {
  src: string;
  amount: number;
  time: string;
  approved?: boolean;
  onApprove: () => void;
  onImageClick?: () => void;
}) {
  return (
    <div className="flex w-full justify-start">
      <figure className="w-56 overflow-hidden rounded-xl rounded-bl-sm border border-border bg-card shadow-xs">
        <div className="relative aspect-[3/4] w-full bg-muted">
          <img
            src={src}
            alt={`Comprobante por ${money(amount)} MXN`}
            onClick={onImageClick}
            className="h-full w-full object-cover cursor-pointer hover:opacity-95"
          />
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[11px] font-medium backdrop-blur">
            <ReceiptText className="size-3 text-amber-500" />
            Comprobante / Foto
          </span>
          <div className="absolute inset-x-2 bottom-2">
            {approved ? (
              <div className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-xs font-semibold text-white shadow-md">
                <Check className="size-3.5" />
                Pago aprobado
              </div>
            ) : (
              <Button
                variant="success"
                size="sm"
                className="h-8 w-full text-xs font-bold shadow-lg"
                onClick={onApprove}
              >
                <Check />
                Aprobar {money(amount)}
              </Button>
            )}
          </div>
        </div>
        <figcaption className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span>SPEI • {money(amount)}</span>
          <span>{time}</span>
        </figcaption>
      </figure>
    </div>
  );
}