'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, CheckCheck, Pause, Play, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clock, money } from '@/lib/format'
import type { Message } from '@/lib/liveflow-data'
import { Button } from '@/components/ui/button'

const WAVE = [4, 9, 14, 7, 18, 12, 6, 15, 20, 10, 5, 13, 17, 8, 11, 19, 6, 14, 9, 16, 7, 12, 4, 10, 15, 8, 5, 11]

function BubbleShell({ from, time, children, className }: { from: 'in' | 'out'; time: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex w-full', from === 'out' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-xl border px-3 py-2 text-[13px] leading-relaxed shadow-xs',
          from === 'out'
            ? 'rounded-br-sm border-foreground/10 bg-foreground text-background'
            : 'rounded-bl-sm border-border bg-card text-card-foreground',
          className,
        )}
      >
        {children}
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 font-mono text-[10px]',
            from === 'out' ? 'text-background/60' : 'text-muted-foreground',
          )}
        >
          {time}
          {from === 'out' && <CheckCheck className="size-3" aria-label="Leído" />}
        </div>
      </div>
    </div>
  )
}

export function TextBubble({ message }: { message: Extract<Message, { kind: 'text' }> }) {
  return (
    <BubbleShell from={message.from} time={message.time}>
      <p className="text-pretty">{message.text}</p>
    </BubbleShell>
  )
}

export function ImageBubble({ message }: { message: Extract<Message, { kind: 'image' }> }) {
  return (
    <BubbleShell from={message.from} time={message.time} className="p-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob previews */}
      <img src={message.src} alt={message.caption || 'Imagen enviada'} className="max-h-56 w-52 rounded-lg object-cover" />
      {message.caption && <p className="px-1.5 pt-1.5 text-pretty">{message.caption}</p>}
    </BubbleShell>
  )
}

export function VoiceBubble({ message }: { message: Extract<Message, { kind: 'voice' }> }) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const total = message.durationSec * 10

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= total) {
          setPlaying(false)
          return 0
        }
        return e + 1
      })
    }, 100)
    return () => clearInterval(id)
  }, [playing, total])

  const progress = elapsed / total
  const out = message.from === 'out'

  return (
    <BubbleShell from={message.from} time={message.time} className="w-64">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pausar nota de voz' : 'Reproducir nota de voz'}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
            out ? 'bg-background text-foreground' : 'bg-foreground text-background',
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
                  ? 'bg-success'
                  : out
                    ? 'bg-background/40'
                    : 'bg-muted-foreground/40',
              )}
            />
          ))}
        </div>
        <span className={cn('font-mono text-[11px]', out ? 'text-background/70' : 'text-muted-foreground')}>
          {clock(playing || elapsed ? Math.ceil((total - elapsed) / 10) : message.durationSec)}
        </span>
      </div>
    </BubbleShell>
  )
}

export function ReceiptBubble({
  message,
  onApprove,
}: {
  message: Extract<Message, { kind: 'receipt' }>
  onApprove: () => void
}) {
  return (
    <div className="flex w-full justify-start">
      <figure className="w-56 overflow-hidden rounded-xl rounded-bl-sm border border-border bg-card shadow-xs">
        <div className="relative aspect-[3/4] w-full bg-muted">
          <Image src={message.src} alt={`Comprobante de transferencia por ${money(message.amount)} MXN`} fill sizes="224px" className="object-cover" />
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[11px] font-medium backdrop-blur">
            <ReceiptText className="size-3 text-pending" aria-hidden />
            Comprobante / Foto
          </span>
          <div className="absolute inset-x-2 bottom-2">
            {message.approved ? (
              <div className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-success text-xs font-semibold text-success-foreground">
                <Check className="size-3.5" aria-hidden />
                Pago aprobado
              </div>
            ) : (
              <Button variant="success" size="sm" className="h-8 w-full text-xs font-semibold shadow-lg" onClick={onApprove}>
                <Check aria-hidden />
                Aprobar {money(message.amount)}
              </Button>
            )}
          </div>
        </div>
        <figcaption className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span>SPEI · {money(message.amount)}</span>
          <span>{message.time}</span>
        </figcaption>
      </figure>
    </div>
  )
}
