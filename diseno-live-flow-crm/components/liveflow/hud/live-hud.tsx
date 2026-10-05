'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Maximize2, Pause, Play, TrendingUp, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { money } from '@/lib/format'
import { HUD_ITEMS, HUD_NAMES } from '@/lib/liveflow-data'
import { Badge, LiveDot } from '@/components/liveflow/primitives'

type Sale = { id: number; name: string; item: string; amount: number; time: string }

const SEED: Sale[] = [
  { id: 5, name: 'Daniela R.', item: 'Vestido satinado esmeralda', amount: 450, time: '21:07:12' },
  { id: 4, name: 'Karla M.', item: 'Blusa lino crema ×2', amount: 660, time: '21:05:40' },
  { id: 3, name: 'Mónica S.', item: 'Top tejido arena', amount: 620, time: '21:01:03' },
  { id: 2, name: 'Paola G.', item: 'Bolsa Live (5 prendas)', amount: 2150, time: '20:58:27' },
  { id: 1, name: 'Itzel N.', item: 'Vestido midi floral', amount: 580, time: '20:44:51' },
]

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 700)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}

export function LiveHud() {
  const [sales, setSales] = useState<Sale[]>(SEED)
  const [total, setTotal] = useState(18450)
  const [running, setRunning] = useState(true)
  const counter = useRef(SEED.length)
  const shown = useAnimatedNumber(total)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      counter.current += 1
      const n = counter.current
      const item = HUD_ITEMS[(n * 7) % HUD_ITEMS.length]
      const sale: Sale = {
        id: n,
        name: HUD_NAMES[(n * 3) % HUD_NAMES.length],
        item: item.name,
        amount: item.price,
        time: new Date().toLocaleTimeString('es-MX', { hour12: false }),
      }
      setSales((s) => [sale, ...s].slice(0, 7))
      setTotal((t) => t + item.price)
    }, 3800)
    return () => clearInterval(id)
  }, [running])

  const latest = sales[0]
  const orders = 41 + counter.current - SEED.length
  const goal = 30000
  const pct = Math.min(100, (total / goal) * 100)

  return (
    <div className="dark flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Link
          href="/"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Volver al workspace"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Badge tone="live" className="h-6 px-2 text-xs font-bold">
          <LiveDot />
          EN VIVO
        </Badge>
        <h1 className="text-sm font-semibold tracking-tight">Monitor Live HUD · Live #48</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted"
          >
            {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {running ? 'Pausar simulación' : 'Reanudar'}
          </button>
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label="Pantalla completa"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </header>

      <main className="grid flex-1 gap-6 p-6 lg:grid-cols-[1fr_420px]">
        <section aria-label="Total cobrado" className="flex flex-col justify-between gap-8 rounded-2xl border border-border bg-card p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Total cobrado en vivo</p>
            <p
              className="mt-4 font-mono text-7xl font-bold tracking-tighter text-success tabular-nums md:text-8xl xl:text-[9rem] xl:leading-none"
              aria-live="polite"
            >
              {money(Math.round(shown))}
            </p>
            <p className="mt-2 font-mono text-lg text-muted-foreground">MXN</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Meta del live</span>
              <span className="font-mono">
                <span className="font-bold">{pct.toFixed(0)}%</span>
                <span className="text-muted-foreground"> de {money(goal)}</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <HudStat label="Pedidos" value={String(orders)} />
            <HudStat label="Ticket prom." value={money(Math.round(total / orders))} />
            <HudStat label="Por minuto" value={(orders / 44).toFixed(1)} accent />
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section aria-label="Última venta" className="rounded-2xl border border-success/30 bg-success/5 p-6">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-success">
              <TrendingUp className="size-4" aria-hidden />
              Última venta
            </p>
            <div key={latest.id} className="mt-4 animate-in fade-in-0 slide-in-from-top-2 duration-500">
              <p className="text-4xl font-bold tracking-tight text-balance">{latest.name}</p>
              <p className="mt-1 text-muted-foreground">{latest.item}</p>
              <p className="mt-3 font-mono text-5xl font-bold text-success">+{money(latest.amount)}</p>
            </div>
          </section>

          <section aria-label="Ventas recientes" className="flex-1 overflow-hidden rounded-2xl border border-border bg-card">
            <h2 className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Trophy className="size-3.5" aria-hidden />
              Feed de ventas
            </h2>
            <ul>
              {sales.slice(1).map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    'flex items-center gap-3 border-b border-border px-5 py-3 last:border-0',
                    i === 0 && 'animate-flash-in',
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground">{s.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.item}</span>
                  </span>
                  <span className="font-mono text-lg font-bold">{money(s.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

function HudStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-3xl font-bold tracking-tight', accent && 'text-pending')}>{value}</p>
    </div>
  )
}
