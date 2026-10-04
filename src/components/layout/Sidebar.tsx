'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/lib/socket';
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  BarChart3,
  Megaphone,
  Settings,
  CreditCard,
  Radio,
  BookOpen,
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard Live', href: '/', icon: LayoutDashboard },
  { name: 'Monitor Live HUD', href: '/live-hud', icon: Radio },
  { name: 'Caja & Cuadre', href: '/caja', icon: CreditCard },
  { name: 'Clientas', href: '/leads', icon: Users },
  { name: 'Prendas / Catálogo', href: '/products', icon: Package },
  { name: 'Envíos & Reparto', href: '/shipments', icon: Truck },
  { name: 'Difusiones WhatsApp', href: '/campaigns', icon: Megaphone },
  { name: 'Reportes & Métricas', href: '/reports', icon: BarChart3 },
  { name: 'Manual Vendedoras', href: '/manual', icon: BookOpen },
  { name: 'Configuración', href: '/config', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const socket = useSocket();
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onStatus = (status: { connected: boolean }) => {
      setWhatsappConnected(Boolean(status?.connected));
    };

    socket.on('whatsapp:status', onStatus);
    socket.emit('whatsapp:status:request');

    return () => {
      socket.off('whatsapp:status', onStatus);
    };
  }, [socket]);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-zinc-950/95 border-zinc-800/60 backdrop-blur-md">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-800/60 px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm shadow-emerald-900/50">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider uppercase text-white">LiveFlow</h1>
            <p className="text-[9px] font-mono text-zinc-400">EXPRESS CRM</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {navigation.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all group',
                isActive
                  ? 'bg-zinc-800/80 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive
                    ? 'text-emerald-400'
                    : 'text-zinc-400 group-hover:text-zinc-200'
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* WhatsApp Status Footer */}
      <div className="border-t border-zinc-800/60 p-2.5">
        <div className="flex items-center justify-between rounded-lg bg-zinc-900/90 border border-zinc-800/60 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                whatsappConnected
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                  : 'bg-red-500 shadow-xs shadow-red-500/50'
              )}
            />
            <span className="text-[11px] font-medium text-zinc-300">
              {whatsappConnected ? 'WA Conectado' : 'WA Desconectado'}
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold">
            Live
          </span>
        </div>
      </div>
    </aside>
  );
}