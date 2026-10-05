'use client'

import { useState } from 'react'
import { Loader2, MapPin, PackageCheck, Printer, Save, StickyNote, Truck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { money } from '@/lib/format'
import type { Conversation, Product } from '@/lib/liveflow-data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge, SectionLabel, TierBadge } from '@/components/liveflow/primitives'

type Note = { id: string; author: string; text: string; time: string }

export function CustomerPanel({ conversation, bag, folio }: { conversation: Conversation; bag: Product[]; folio: string }) {
  return (
    <aside aria-label="Perfil del cliente" className="flex min-h-0 w-[320px] shrink-0 flex-col border-l border-border bg-card/40">
      <Tabs defaultValue="ficha" className="min-h-0 flex-1 gap-0">
        <div className="border-b border-border p-3">
          <TabsList className="w-full">
            <TabsTrigger value="ficha" className="text-xs">
              <UserRound aria-hidden />
              Ficha 360
            </TabsTrigger>
            <TabsTrigger value="direccion" className="text-xs">
              <MapPin aria-hidden />
              Dirección
            </TabsTrigger>
            <TabsTrigger value="etiqueta" className="text-xs">
              <Printer aria-hidden />
              Etiqueta
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="ficha" className="min-h-0 overflow-y-auto scrollbar-thin">
          <ProfileTab key={conversation.id} conversation={conversation} />
        </TabsContent>
        <TabsContent value="direccion" className="min-h-0 overflow-y-auto scrollbar-thin">
          <AddressTab key={conversation.id} conversation={conversation} />
        </TabsContent>
        <TabsContent value="etiqueta" className="min-h-0 overflow-y-auto scrollbar-thin">
          <LabelTab conversation={conversation} bag={bag} folio={folio} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

function Stat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={mono ? 'mt-0.5 font-mono text-sm font-bold' : 'mt-0.5 text-sm font-semibold'}>{value}</p>
    </div>
  )
}

function ProfileTab({ conversation: c }: { conversation: Conversation }) {
  const [notes, setNotes] = useState<Note[]>(
    c.tier === 'vip'
      ? [
          { id: 'n1', author: 'Lucía', text: 'Prefiere envío a oficina L–V. Siempre paga en < 10 min.', time: 'Live #46' },
          { id: 'n2', author: 'Mariana', text: 'Talla M en vestidos, CH en blusas.', time: 'Live #47' },
        ]
      : [],
  )
  const [draft, setDraft] = useState('')
  const avg = c.paidOrders ? c.totalSpent / c.paidOrders : 0

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold" aria-hidden>
          {c.name
            .split(' ')
            .slice(0, 2)
            .map((p) => p[0])
            .join('')}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">{c.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{c.phone}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <TierBadge tier={c.tier} />
            {c.paidOrders > 10 && <Badge tone="success">Paga rápido</Badge>}
            <Badge>CDMX</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total gastado" value={money(c.totalSpent)} />
        <Stat label="Pedidos pagados" value={String(c.paidOrders)} />
        <Stat label="Ticket promedio" value={money(avg)} />
        <Stat label="Cliente desde" value={c.paidOrders ? 'Mar 2025' : 'Hoy'} mono={false} />
      </div>

      <div>
        <SectionLabel className="mb-2">Últimas compras</SectionLabel>
        {c.paidOrders ? (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background text-xs">
            {[
              ['Live #47', 'Blusa lino crema', 330],
              ['Live #45', 'Bolsa Live (4 prendas)', 1420],
              ['Live #42', 'Jeans wide leg', 520],
            ].map(([live, item, amount]) => (
              <li key={live as string} className="flex items-center gap-2 px-2.5 py-2">
                <span className="font-mono text-[10px] text-muted-foreground">{live}</span>
                <span className="min-w-0 flex-1 truncate">{item}</span>
                <span className="font-mono font-semibold">{money(amount as number)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            Primera compra en este live.
          </p>
        )}
      </div>

      <div>
        <SectionLabel className="mb-2 flex items-center gap-1.5">
          <StickyNote className="size-3" aria-hidden />
          Notas privadas del equipo
        </SectionLabel>
        <ul className="mb-2 flex flex-col gap-1.5">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border border-pending/20 bg-pending/5 p-2 text-xs">
              <p className="text-pretty">{n.text}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {n.author} · {n.time}
              </p>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            setNotes((ns) => [...ns, { id: crypto.randomUUID(), author: 'Mariana', text: draft.trim(), time: 'Ahora' }])
            setDraft('')
          }}
          className="flex flex-col gap-1.5"
        >
          <label htmlFor="note" className="sr-only">
            Nueva nota privada
          </label>
          <textarea
            id="note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Solo visible para el equipo…"
            className="resize-none rounded-md border border-input bg-background p-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button type="submit" size="xs" variant="outline" className="self-end" disabled={!draft.trim()}>
            Guardar nota
          </Button>
        </form>
      </div>
    </div>
  )
}

const ADDRESS_FIELDS = [
  { id: 'nombre', label: 'Nombre completo', span: 2 },
  { id: 'calle', label: 'Calle y número', span: 2 },
  { id: 'colonia', label: 'Colonia', span: 1 },
  { id: 'cp', label: 'C.P.', span: 1, mono: true },
  { id: 'ciudad', label: 'Ciudad', span: 1 },
  { id: 'estado', label: 'Estado', span: 1 },
  { id: 'referencias', label: 'Referencias', span: 2 },
] as const

function AddressTab({ conversation: c }: { conversation: Conversation }) {
  const [saving, setSaving] = useState(false)
  const defaults: Record<string, string> = {
    nombre: c.name,
    calle: 'Av. Álvaro Obregón 182, Int. 4',
    colonia: 'Roma Norte',
    cp: '06700',
    ciudad: 'Cuauhtémoc',
    estado: 'CDMX',
    referencias: 'Portón negro, frente a cafetería',
  }

  return (
    <form
      className="flex flex-col gap-3 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        setSaving(true)
        setTimeout(() => {
          setSaving(false)
          toast.success('Dirección guardada', { description: `Envío de ${c.name} listo para guía.` })
        }, 700)
      }}
    >
      <div className="grid grid-cols-2 gap-2.5">
        {ADDRESS_FIELDS.map((f) => (
          <div key={f.id} className={f.span === 2 ? 'col-span-2 flex flex-col gap-1' : 'flex flex-col gap-1'}>
            <label htmlFor={`addr-${f.id}`} className="text-[11px] font-medium text-muted-foreground">
              {f.label}
            </label>
            <input
              id={`addr-${f.id}`}
              name={f.id}
              defaultValue={defaults[f.id]}
              className={`h-8 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${'mono' in f ? 'font-mono' : ''}`}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">Paquetería</span>
        <div className="grid grid-cols-2 gap-2">
          {['Estafeta', 'DHL Express'].map((carrier, i) => (
            <label
              key={carrier}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background p-2 text-xs has-checked:border-foreground/30 has-checked:ring-1 has-checked:ring-foreground/10"
            >
              <input type="radio" name="carrier" defaultChecked={i === 0} className="accent-foreground" />
              <Truck className="size-3.5 text-muted-foreground" aria-hidden />
              {carrier}
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={saving} className="mt-1">
        {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
        {saving ? 'Guardando…' : 'Guardar dirección'}
      </Button>
    </form>
  )
}

function LabelTab({ conversation: c, bag, folio }: { conversation: Conversation; bag: Product[]; folio: string }) {
  const items = bag.length ? bag : [{ sku: 'VST-014', name: 'Vestido satinado esmeralda', size: 'M', price: 450 } as Product]
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="rounded-lg border-2 border-dashed border-border bg-background p-3" id="shipping-label">
        <div className="flex items-center justify-between border-b border-dashed border-border pb-2">
          <span className="text-xs font-bold tracking-tight">LiveFlow Boutique</span>
          <Badge tone="transit">Estafeta · Día sig.</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 py-3 text-[11px]">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Remite</p>
            <p className="font-medium">LiveFlow Boutique</p>
            <p className="text-muted-foreground">Guadalajara, JAL</p>
          </div>
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Destino</p>
            <p className="font-semibold">{c.name}</p>
            <p className="text-muted-foreground">Roma Norte, CDMX</p>
            <p className="font-mono text-muted-foreground">CP 06700</p>
          </div>
        </div>
        <ul className="border-t border-dashed border-border pt-2 text-[11px]">
          {items.map((p, i) => (
            <li key={`${p.sku}-${i}`} className="flex justify-between gap-2 py-0.5">
              <span className="truncate">
                {p.name} <span className="text-muted-foreground">T.{p.size}</span>
              </span>
              <span className="font-mono text-muted-foreground">{p.sku}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col items-center gap-1 border-t border-dashed border-border pt-3">
          <div className="flex h-10 w-full items-stretch gap-[2px]" aria-hidden>
            {folio.split('').flatMap((ch, i) =>
              [1, 2, 3].map((k) => (
                <span
                  key={`${i}-${k}`}
                  className="bg-foreground"
                  style={{ flex: ((ch.charCodeAt(0) * k) % 3) + 1, opacity: (ch.charCodeAt(0) + k) % 4 === 0 ? 0 : 1 }}
                />
              )),
            )}
          </div>
          <p className="font-mono text-sm font-bold tracking-[0.2em]">{folio}</p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          toast('Enviando a impresora térmica…', { icon: <PackageCheck className="size-4" /> })
          window.print()
        }}
      >
        <Printer aria-hidden />
        Imprimir etiqueta
      </Button>
    </div>
  )
}
