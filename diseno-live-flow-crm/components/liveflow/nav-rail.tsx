'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { LayoutGrid, MonitorPlay, Moon, Receipt, Sun, SwatchBook as Swatches, Zap } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Workspace de ventas', icon: LayoutGrid },
  { href: '/hud', label: 'Monitor Live HUD', icon: MonitorPlay },
  { href: '/cuadre', label: 'Cuadre de caja', icon: Receipt },
  { href: '/sistema', label: 'Sistema de diseño', icon: Swatches },
]

const subscribe = () => () => {}

export function NavRail() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const isDark = mounted ? resolvedTheme === 'dark' : true

  return (
    <nav
      aria-label="Principal"
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3"
    >
      <Link
        href="/"
        className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        aria-label="LiveFlow CRM inicio"
      >
        <Zap className="size-4 fill-current" aria-hidden />
      </Link>
      {NAV.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger
              render={
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
                    active && 'bg-sidebar-accent text-foreground ring-1 ring-border',
                  )}
                />
              }
            >
              <Icon className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        )
      })}
      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
        </button>
        <div
          className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold"
          aria-label="Operadora: Mariana"
          role="img"
        >
          MA
        </div>
      </div>
    </nav>
  )
}
