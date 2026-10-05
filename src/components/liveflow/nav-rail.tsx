'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSyncExternalStore, useEffect, useState } from 'react';
import { LayoutGrid, MonitorPlay, Moon, Receipt, Sun, Zap, Package, Truck, Users, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Workspace de ventas', icon: LayoutGrid },
  { href: '/live-hud', label: 'Monitor Live HUD', icon: MonitorPlay },
  { href: '/caja', label: 'Cuadre de caja', icon: Receipt },
  { href: '/leads', label: 'Clientas & Scoring', icon: Users },
  { href: '/products', label: 'Catálogo de prendas', icon: Package },
  { href: '/shipments', label: 'Envíos & Logística', icon: Truck },
  { href: '/config', label: 'Configuración & Bot', icon: Settings },
];

const subscribe = () => () => {};

export function NavRail() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const socket = useSocket();
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onStatus = (status: { connected: boolean }) => setWhatsappConnected(Boolean(status?.connected));
    socket.on('whatsapp:status', onStatus);
    socket.emit('whatsapp:status:request');
    return () => {
      socket.off('whatsapp:status', onStatus);
    };
  }, [socket]);

  return (
    <nav
      aria-label="Principal"
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card/60 py-3 backdrop-blur-md"
    >
      <Link
        href="/"
        className="mb-3 flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
        aria-label="LiveFlow CRM inicio"
      >
        <Zap className="size-4 fill-current" aria-hidden />
      </Link>
      {NAV.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger
              render={
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                    active && 'bg-accent text-foreground ring-1 ring-border font-bold'
                  )}
                />
              }
            >
              <Icon className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
        </button>
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-full text-[11px] font-bold border transition-colors',
            whatsappConnected
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-red-500/20 text-red-400 border-red-500/40'
          )}
          title={whatsappConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
        >
          WA
        </div>
      </div>
    </nav>
  );
}