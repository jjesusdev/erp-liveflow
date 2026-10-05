import { cn } from '@/lib/utils'
import type { CustomerTier } from '@/lib/liveflow-data'
import { Star } from 'lucide-react'

type Tone = 'neutral' | 'live' | 'success' | 'pending' | 'transit' | 'vip'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  live: 'bg-live/10 text-live border-live/25',
  success: 'bg-success/10 text-success border-success/25',
  pending: 'bg-pending/10 text-pending border-pending/25',
  transit: 'bg-transit/10 text-transit border-transit/25',
  vip: 'bg-vip/10 text-vip border-vip/30',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-[5px] border px-1.5 text-[11px] font-medium leading-none tracking-tight whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function TierBadge({ tier }: { tier: CustomerTier }) {
  if (tier === 'vip')
    return (
      <Badge tone="vip">
        <Star className="size-2.5 fill-current" aria-hidden />
        VIP
      </Badge>
    )
  if (tier === 'recurrente') return <Badge tone="transit">Recurrente</Badge>
  return <Badge>Nueva</Badge>
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2', className)} aria-hidden>
      <span className="absolute inset-0 animate-live-ping rounded-full bg-live" />
      <span className="relative inline-flex size-2 rounded-full bg-live" />
    </span>
  )
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-medium uppercase tracking-wider text-muted-foreground', className)}>
      {children}
    </p>
  )
}
