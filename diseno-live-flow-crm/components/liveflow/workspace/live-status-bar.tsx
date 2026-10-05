'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MonitorPlay, Users } from 'lucide-react'
import { clock, money } from '@/lib/format'
import { Badge, LiveDot } from '@/components/liveflow/primitives'

export function LiveStatusBar() {
  const [elapsed, setElapsed] = useState(42 * 60 + 18)
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(elapsed / 3600)

  return (
    <header className="flex h-10 shrink-0 items-center gap-4 border-b border-border bg-card/60 px-4 text-xs">
      <h1 className="text-sm font-semibold tracking-tight">LiveFlow</h1>
      <Badge tone="live" className="font-semibold">
        <LiveDot className="size-1.5" />
        EN VIVO
      </Badge>
      <span className="text-muted-foreground">TikTok + Instagram · Live #48</span>
      <span className="font-mono text-muted-foreground">
        {String(h).padStart(2, '0')}:{clock(elapsed % 3600)}
      </span>
      <div className="ml-auto flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-muted-foreground md:inline-flex">
          <Users className="size-3.5" aria-hidden />
          <span className="font-mono text-foreground">2,814</span> espectadores
        </span>
        <span className="hidden text-muted-foreground lg:inline">
          Cobrado <span className="font-mono font-bold text-success">{money(18450)}</span>
        </span>
        <span className="hidden text-muted-foreground lg:inline">
          Por cobrar <span className="font-mono font-bold text-pending">{money(4320)}</span>
        </span>
        <Link
          href="/hud"
          className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border px-2 font-medium transition-colors hover:bg-muted"
        >
          <MonitorPlay className="size-3.5" aria-hidden />
          Abrir HUD
        </Link>
      </div>
    </header>
  )
}
