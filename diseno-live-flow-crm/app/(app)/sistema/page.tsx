import type { Metadata } from 'next'
import { Check, Send, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Kbd, LiveDot, SectionLabel, TierBadge } from '@/components/liveflow/primitives'

export const metadata: Metadata = { title: 'Sistema de diseño — LiveFlow CRM' }

const SWATCHES = [
  { name: 'Background', token: 'bg-background', border: true },
  { name: 'Card', token: 'bg-card', border: true },
  { name: 'Muted', token: 'bg-muted' },
  { name: 'Foreground', token: 'bg-foreground' },
  { name: 'Live · en vivo / urgente', token: 'bg-live' },
  { name: 'Success · pagado / cobrar', token: 'bg-success' },
  { name: 'Pending · apartado', token: 'bg-pending' },
  { name: 'Transit · envío', token: 'bg-transit' },
]

function Panel({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={`${theme} flex flex-col gap-6 rounded-xl border border-border bg-background p-6 text-foreground`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">{theme === 'light' ? 'Modo claro' : 'Modo oscuro'}</h2>
        <Badge tone="live">
          <LiveDot className="size-1.5" />
          EN VIVO
        </Badge>
      </div>

      <section className="flex flex-col gap-2">
        <SectionLabel>Color semántico</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {SWATCHES.map((s) => (
            <div key={s.token} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-md ${s.token} ${s.border ? 'border border-border' : ''}`} />
              <p className="text-[10px] leading-tight text-muted-foreground">{s.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Tipografía</SectionLabel>
        <p className="text-xl font-semibold tracking-tight">Geist Sans — interfaz</p>
        <p className="font-mono text-3xl font-bold tracking-tight text-success">$18,450.00</p>
        <p className="font-mono text-xs text-muted-foreground">Geist Mono — montos, folios, temporizadores · LF-8K2Q9XRA</p>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Acciones</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Button variant="success">
            <Wallet aria-hidden />
            Cobrar
          </Button>
          <Button variant="success">
            <Check aria-hidden />
            Aprobar pago
          </Button>
          <Button>
            <Send aria-hidden />
            Enviar
          </Button>
          <Button variant="outline">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Estados</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          <TierBadge tier="vip" />
          <TierBadge tier="recurrente" />
          <TierBadge tier="nueva" />
          <Badge tone="success">Pagado</Badge>
          <Badge tone="pending">Apartado 14:32</Badge>
          <Badge tone="transit">En tránsito</Badge>
          <Badge tone="live">Vencido</Badge>
          <Badge>Neutral</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Atajo global para cobrar: <Kbd>C</Kbd>
        </p>
      </section>
    </div>
  )
}

export default function SistemaPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header>
          <p className="font-mono text-[11px] text-muted-foreground">LIVEFLOW · TOKENS v1</p>
          <h1 className="text-xl font-semibold tracking-tight">Sistema de diseño</h1>
          <p className="mt-1 max-w-prose text-sm text-pretty text-muted-foreground">
            Base Zinc neutra con cuatro acentos semánticos. El verde solo aparece en acciones de dinero y pagos
            confirmados; el rojo/rosa, en urgencia y estado en vivo.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel theme="light" />
          <Panel theme="dark" />
        </div>
      </div>
    </div>
  )
}
