'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, ChevronDown, Clock, ImagePlus, Lock, Phone, Plus, SendHorizontal, Shirt, Wallet, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clock, money } from '@/lib/format'
import { CATALOG, SHORTCUTS, type Conversation, type Message, type Product } from '@/lib/liveflow-data'
import { Button } from '@/components/ui/button'
import { Kbd, TierBadge } from '@/components/liveflow/primitives'
import { ImageBubble, ReceiptBubble, TextBubble, VoiceBubble } from './message-bubbles'

export function ChatColumn({
  conversation,
  messages,
  deadline,
  onApprove,
  onOpenCharge,
  onSend,
  onAddProduct,
}: {
  conversation: Conversation
  messages: Message[]
  deadline: number | null
  onApprove: () => void
  onOpenCharge: () => void
  onSend: (text: string, image?: string) => void
  onAddProduct: (p: Product) => void
}) {
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, conversation.id])

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
            if (m.kind === 'text') return <TextBubble key={m.id} message={m} />
            if (m.kind === 'voice') return <VoiceBubble key={m.id} message={m} />
            if (m.kind === 'image') return <ImageBubble key={m.id} message={m} />
            return <ReceiptBubble key={m.id} message={m} onApprove={onApprove} />
          })}
        </div>
      </div>
      <Composer onSend={onSend} />
    </section>
  )
}

function ChatHeader({
  conversation: c,
  onOpenCharge,
  onAddProduct,
}: {
  conversation: Conversation
  onOpenCharge: () => void
  onAddProduct: (p: Product) => void
}) {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const initials = c.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h2 className="truncate text-sm font-semibold tracking-tight">{c.name}</h2>
          <TierBadge tier={c.tier} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-mono">
            <Phone className="size-3" aria-hidden />
            {c.phone}
          </span>
          {c.lockedBy && (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" aria-hidden />
              Atendiendo: {c.lockedBy}
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={catalogOpen}
          aria-haspopup="menu"
          onClick={() => setCatalogOpen((o) => !o)}
        >
          <Shirt aria-hidden />
          Prendas
          <ChevronDown className="opacity-60" aria-hidden />
        </Button>
        {catalogOpen && (
          <>
            <button type="button" aria-label="Cerrar catálogo" className="fixed inset-0 z-30 cursor-default" onClick={() => setCatalogOpen(false)} />
            <div role="menu" className="absolute top-9 right-0 z-40 w-72 rounded-lg border border-border bg-popover p-1 shadow-xl animate-in fade-in-0 zoom-in-95">
              <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Catálogo rápido</p>
              {CATALOG.map((p) => (
                <button
                  key={p.sku}
                  role="menuitem"
                  type="button"
                  disabled={p.stock === 0}
                  onClick={() => {
                    onAddProduct(p)
                    setCatalogOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <Image src={p.img} alt="" width={36} height={36} className="size-9 rounded-md border border-border object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{p.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {p.sku} · T.{p.size} · {p.stock} disp.
                    </span>
                  </span>
                  <span className="font-mono text-xs font-bold">{money(p.price)}</span>
                  <Plus className="size-3.5 text-muted-foreground" aria-hidden />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <Button variant="success" size="sm" onClick={onOpenCharge} className="font-semibold">
        <Wallet aria-hidden />
        Cobro
        <Kbd className="ml-0.5 border-success-foreground/20 bg-success-foreground/10 text-success-foreground">C</Kbd>
      </Button>
    </header>
  )
}

function ApartadoBanner({ amount, deadline, onApprove }: { amount: number; deadline: number; onApprove: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const remaining = Math.max(0, Math.round((deadline - now) / 1000))
  const pct = Math.min(100, (remaining / (30 * 60)) * 100)
  const urgent = remaining < 5 * 60

  return (
    <div
      role="status"
      className={cn(
        'relative flex shrink-0 items-center gap-3 overflow-hidden border-b px-4 py-2',
        urgent ? 'border-live/30 bg-live/10' : 'border-pending/30 bg-pending/10',
      )}
    >
      <Clock className={cn('size-4 shrink-0', urgent ? 'text-live' : 'text-pending')} aria-hidden />
      <p className="min-w-0 flex-1 text-xs">
        <span className="font-semibold">Apartado </span>
        <span className="font-mono font-bold">{money(amount)} MXN</span>
        <span className="text-muted-foreground"> · Vence en </span>
        <span className={cn('font-mono font-bold', urgent ? 'text-live' : 'text-pending')}>{clock(remaining)}</span>
      </p>
      <Button variant="success" size="xs" onClick={onApprove} className="h-7 px-2.5 font-semibold">
        <Check aria-hidden />
        Aprobar Pago
      </Button>
      <span
        aria-hidden
        className={cn('absolute bottom-0 left-0 h-0.5 transition-[width] duration-1000 ease-linear', urgent ? 'bg-live' : 'bg-pending')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function Composer({ onSend }: { onSend: (text: string, image?: string) => void }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    if (!text.trim() && !image) return
    onSend(text.trim(), image ?? undefined)
    setText('')
    setImage(null)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(e.clipboardData.items)
      .find((i) => i.type.startsWith('image/'))
      ?.getAsFile()
    if (!file) return
    e.preventDefault()
    setImage(URL.createObjectURL(file))
  }

  return (
    <div className="shrink-0 border-t border-border bg-card/40 px-4 pt-2.5 pb-3">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Atajos de respuesta">
          {SHORTCUTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setText(s.text)
                textareaRef.current?.focus()
              }}
              className="h-6 rounded-md border border-border bg-background px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground active:scale-[0.98]"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
          {image && (
            <div className="flex items-center gap-2 border-b border-border p-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URL preview from clipboard */}
                <img src={image} alt="Imagen pegada lista para enviar" className="size-14 rounded-md border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  aria-label="Quitar imagen"
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <X className="size-3" />
                </button>
              </div>
              <span className="text-[11px] text-muted-foreground">Imagen pegada desde portapapeles</span>
            </div>
          )}
          <div className="flex items-end gap-2 p-1.5">
            <label className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ImagePlus className="size-4" aria-hidden />
              <span className="sr-only">Adjuntar imagen</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setImage(URL.createObjectURL(f))
                }}
              />
            </label>
            <label className="sr-only" htmlFor="composer">
              Mensaje
            </label>
            <textarea
              id="composer"
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Escribe un mensaje… pega imágenes con Ctrl+V"
              className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[13px] outline-none placeholder:text-muted-foreground field-sizing-content"
            />
            <Button size="icon" onClick={submit} disabled={!text.trim() && !image} aria-label="Enviar mensaje">
              <SendHorizontal aria-hidden />
            </Button>
          </div>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Kbd>Enter</Kbd> enviar <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> salto de línea <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd> pegar imagen
        </p>
      </div>
    </div>
  )
}
