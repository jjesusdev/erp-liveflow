'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Building2, Check, Copy, CreditCard, Loader2, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { money } from '@/lib/format'
import type { Conversation, Product } from '@/lib/liveflow-data'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge, SectionLabel } from '@/components/liveflow/primitives'

type Mode = 'simple' | 'bolsa'
type Method = 'transferencia' | 'mercadopago'

export function ChargeModal({
  open,
  onOpenChange,
  conversation,
  bag,
  onRemoveFromBag,
  reference,
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: Conversation
  bag: Product[]
  onRemoveFromBag: (index: number) => void
  reference: string
  onSent: (amount: number, method: Method, text: string) => void
}) {
  const [mode, setMode] = useState<Mode>(bag.length > 1 ? 'bolsa' : 'simple')
  const [concept, setConcept] = useState('Vestido satinado esmeralda')
  const [amount, setAmount] = useState('450')
  const [shipping, setShipping] = useState('99')
  const [method, setMethod] = useState<Method>('transferencia')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const subtotal = mode === 'simple' ? Number(amount) || 0 : bag.reduce((s, p) => s + p.price, 0)
  const ship = mode === 'bolsa' ? Number(shipping) || 0 : 0
  const total = subtotal + ship
  const firstName = conversation.name.split(' ')[0]

  const message =
    method === 'transferencia'
      ? `¡Hola ${firstName}! Tu total es ${money(total)} MXN.\n\nBBVA · CLABE 012 180 0152 3344 9910\nA nombre de: LiveFlow Boutique\nReferencia: ${reference}\n\nEnvíame tu comprobante aquí y tu pedido queda confirmado 💛`
      : `¡Hola ${firstName}! Tu total es ${money(total)} MXN.\n\nPaga con tarjeta aquí:\nmpago.la/lf-${reference.toLowerCase()}\n\nReferencia: ${reference}`

  const send = async () => {
    if (total <= 0) return;
    setSending(true);

    try {
      const res = await fetch('/api/payment-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          amount: total,
          concept: mode === 'simple' ? concept : bag.map((p) => p.name).join(' + ') + (ship > 0 ? ` (+ Envío $${ship})` : ''),
          provider: method === 'transferencia' ? 'TRANSFER' : 'MERCADOPAGO',
        }),
      });

      if (!res.ok) throw new Error('Error generando cobro');

      onSent(total, method, message);
      onOpenChange(false);
      toast.success('Cobro enviado por WhatsApp', {
        description: `${money(total)} MXN · Ref. ${reference}`,
      });
    } catch {
      toast.error('No se pudo generar el cobro');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="text-base">Generar cobro · {conversation.name}</DialogTitle>
          <DialogDescription className="text-xs">
            El cliente recibirá los datos de pago con su referencia única en WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-4 p-4">
            <div role="radiogroup" aria-label="Tipo de cobro" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ['simple', 'Cobro simple'],
                  ['bolsa', `Bolsa Live (${bag.length})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={mode === id}
                  onClick={() => setMode(id)}
                  className={cn(
                    'h-7 rounded-md text-xs font-medium transition-all',
                    mode === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'simple' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="concept" className="text-[11px] font-medium text-muted-foreground">
                    Concepto
                  </label>
                  <input
                    id="concept"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="amount" className="text-[11px] font-medium text-muted-foreground">
                    Monto (MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-lg text-muted-foreground">$</span>
                    <input
                      id="amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                      className="h-12 w-full rounded-md border border-input bg-background pr-3 pl-7 font-mono text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {[250, 450, 650, 1200].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(String(v))}
                        className="h-6 rounded-md border border-border px-2 font-mono text-[11px] text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      >
                        {money(v).replace('.00', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {bag.length ? (
                  <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                    {bag.map((p, i) => (
                      <li key={`${p.sku}-${i}`} className="flex items-center gap-2.5 p-2">
                        <Image src={p.img} alt="" width={36} height={36} className="size-9 rounded-md border border-border object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{p.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {p.sku} · T.{p.size}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold">{money(p.price)}</span>
                        <Button variant="ghost" size="icon-xs" aria-label={`Quitar ${p.name}`} onClick={() => onRemoveFromBag(i)}>
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    La bolsa está vacía. Agrega prendas desde el botón «Prendas» del chat.
                  </p>
                )}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <label htmlFor="shipping" className="text-muted-foreground">
                    Envío
                  </label>
                  <input
                    id="shipping"
                    inputMode="decimal"
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value.replace(/[^\d.]/g, ''))}
                    className="h-7 w-24 rounded-md border border-input bg-background px-2 text-right font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{money(subtotal)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <SectionLabel>Método de pago</SectionLabel>
              <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-2 gap-2">
                <MethodCard
                  active={method === 'transferencia'}
                  onClick={() => setMethod('transferencia')}
                  icon={<Building2 className="size-4" aria-hidden />}
                  title="Transferencia"
                  subtitle="SPEI · sin comisión"
                  badge="Recomendado"
                />
                <MethodCard
                  active={method === 'mercadopago'}
                  onClick={() => setMethod('mercadopago')}
                  icon={<CreditCard className="size-4" aria-hidden />}
                  title="MercadoPago"
                  subtitle="Link · 3.49% + IVA"
                />
              </div>
            </div>

            <div className="flex items-end justify-between rounded-lg border border-border bg-muted/50 p-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total a cobrar</p>
                <p className="font-mono text-3xl font-bold tracking-tight">{money(total)}</p>
              </div>
              <span className="pb-1 text-xs text-muted-foreground">MXN</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border bg-muted/30 p-4 md:border-t-0 md:border-l">
            <div className="flex items-center justify-between">
              <SectionLabel>Vista previa WhatsApp</SectionLabel>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(reference)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wider hover:border-foreground/20"
                aria-label={`Copiar referencia ${reference}`}
              >
                {reference}
                {copied ? <Check className="size-3 text-success" aria-hidden /> : <Copy className="size-3 text-muted-foreground" aria-hidden />}
              </button>
            </div>
            <div className="flex-1 rounded-lg bg-background p-3">
              <div className="ml-auto max-w-[95%] rounded-xl rounded-br-sm bg-foreground px-3 py-2 text-[12px] leading-relaxed whitespace-pre-line text-background">
                {message}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Referencia única de 8 caracteres para conciliar el pago en el cuadre de caja.
            </p>
          </div>
        </div>

        <DialogFooter className="m-0 border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={send} disabled={sending || total <= 0} className="font-semibold">
            {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            {sending ? 'Enviando…' : `Enviar cobro ${money(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MethodCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all',
        active ? 'border-success/50 bg-success/5 ring-1 ring-success/30' : 'border-border hover:border-foreground/20',
      )}
    >
      <span className="flex w-full items-center gap-1.5">
        <span className={active ? 'text-success' : 'text-muted-foreground'}>{icon}</span>
        <span className="text-xs font-semibold">{title}</span>
        {badge && (
          <Badge tone="success" className="ml-auto h-4 px-1 text-[9px]">
            {badge}
          </Badge>
        )}
      </span>
      <span className="text-[10px] text-muted-foreground">{subtitle}</span>
    </button>
  )
}
