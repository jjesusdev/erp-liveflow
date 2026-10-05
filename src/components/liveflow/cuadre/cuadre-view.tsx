'use client'

import { useMemo, useState } from 'react'
import { Building2, CreditCard, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { money } from '@/lib/format'
import { TRANSACTIONS, type Transaction } from '@/lib/liveflow-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/liveflow/primitives'

const STATUS_TONE = { pagado: 'success', apartado: 'pending', vencido: 'live' } as const
const STATUS_LABEL = { pagado: 'Pagado', apartado: 'Apartado', vencido: 'Vencido' } as const

export function CuadreView() {
  const [status, setStatus] = useState<Transaction['status'] | 'todos'>('todos')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TRANSACTIONS.filter(
      (t) =>
        (status === 'todos' || t.status === status) &&
        (!q || t.customer.toLowerCase().includes(q) || t.folio.toLowerCase().includes(q)),
    )
  }, [status, query])

  const sum = (f: (t: Transaction) => boolean) => TRANSACTIONS.filter(f).reduce((s, t) => s + t.amount, 0)
  const paid = sum((t) => t.status === 'pagado')
  const spei = sum((t) => t.status === 'pagado' && t.method === 'transferencia')
  const mp = sum((t) => t.status === 'pagado' && t.method === 'mercadopago')
  const pending = sum((t) => t.status === 'apartado')
  const expired = sum((t) => t.status === 'vencido')
  const rowsTotal = rows.filter((t) => t.status !== 'vencido').reduce((s, t) => s + t.amount, 0)

  const exportCsv = () => {
    const header = 'Folio,Hora,Cliente,Prendas,Método,Monto,Estado,Operadora'
    const body = rows
      .map((t) => [t.folio, t.time, t.customer, t.items, t.method, t.amount.toFixed(2), t.status, t.operator].map((v) => `"${v}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'cuadre-live-48.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Cuadre exportado', { description: `${rows.length} movimientos · ${money(rowsTotal)}` })
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-muted-foreground">LIVE #48 · 10 ABR 2026 · 20:25 – 21:08</p>
            <h1 className="text-xl font-semibold tracking-tight">Cuadre de caja</h1>
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download aria-hidden />
            Exportar CSV
          </Button>
        </header>

        <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Total cobrado" value={paid} tone="success" hint={`${TRANSACTIONS.filter((t) => t.status === 'pagado').length} pagos confirmados`} />
          <SummaryCard
            label="Transferencias SPEI"
            value={spei}
            icon={<Building2 className="size-3.5" aria-hidden />}
            hint={`${Math.round((spei / paid) * 100)}% del total`}
            bar={spei / paid}
          />
          <SummaryCard
            label="MercadoPago"
            value={mp}
            icon={<CreditCard className="size-3.5" aria-hidden />}
            hint={`Comisión est. ${money(mp * 0.0405)}`}
            bar={mp / paid}
          />
          <SummaryCard label="Por cobrar / vencido" value={pending} tone="pending" hint={`${money(expired)} vencido`} />
        </section>

        <section aria-label="Movimientos" className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div role="tablist" aria-label="Filtrar por estado" className="flex gap-1 rounded-md bg-muted p-0.5">
              {(['todos', 'pagado', 'apartado', 'vencido'] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  type="button"
                  aria-selected={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'h-6 rounded px-2.5 text-xs font-medium capitalize transition-colors',
                    status === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <label className="relative ml-auto">
              <span className="sr-only">Buscar por cliente o folio</span>
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cliente o folio"
                className="h-7 w-56 rounded-md border border-input bg-background pr-2 pl-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Folio</th>
                  <th scope="col" className="px-3 py-2 font-medium">Hora</th>
                  <th scope="col" className="px-3 py-2 font-medium">Cliente</th>
                  <th scope="col" className="px-3 py-2 font-medium">Prendas</th>
                  <th scope="col" className="px-3 py-2 font-medium">Método</th>
                  <th scope="col" className="px-3 py-2 font-medium">Operadora</th>
                  <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((t) => (
                  <tr key={t.folio} className="transition-colors hover:bg-muted/40">
                    <td className="px-3 py-2.5 font-mono font-semibold">{t.folio}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{t.time}</td>
                    <td className="px-3 py-2.5 font-medium">{t.customer}</td>
                    <td className="max-w-56 truncate px-3 py-2.5 text-muted-foreground">{t.items}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        {t.method === 'transferencia' ? <Building2 className="size-3.5" aria-hidden /> : <CreditCard className="size-3.5" aria-hidden />}
                        {t.method === 'transferencia' ? 'SPEI' : 'MercadoPago'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{t.operator}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 text-right font-mono font-bold',
                        t.status === 'vencido' && 'text-muted-foreground line-through',
                      )}
                    >
                      {money(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-muted/40">
                <tr>
                  <td colSpan={7} className="px-3 py-2.5 text-xs text-muted-foreground">
                    {rows.length} movimientos
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm font-bold">{money(rowsTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
  icon,
  bar,
}: {
  label: string
  value: number
  hint: string
  tone?: 'success' | 'pending'
  icon?: React.ReactNode
  bar?: number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          'font-mono text-2xl font-bold tracking-tight',
          tone === 'success' && 'text-success',
          tone === 'pending' && 'text-pending',
        )}
      >
        {money(value)}
      </p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      {bar !== undefined && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground/70" style={{ width: `${bar * 100}%` }} />
        </div>
      )}
    </div>
  )
}
