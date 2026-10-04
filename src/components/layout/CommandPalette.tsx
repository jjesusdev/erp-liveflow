'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Truck,
  CreditCard,
  Radio,
  ShoppingBag,
  Users,
  Megaphone,
  Settings,
  BarChart2,
  BookOpen,
  X,
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        // Si el foco está en un input/textarea, ignoramos el '/'
        const target = e.target as HTMLElement;
        if (e.key === '/' && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
    setSearch('');
  };

  if (!open) return null;

  const actions = [
    { label: 'Tablero de Ventas (Kanban)', path: '/', icon: LayoutDashboard, shortcut: 'G + K' },
    { label: 'Caja & Cuadre Financiero', path: '/caja', icon: CreditCard, shortcut: 'G + C' },
    { label: 'Gestión de Envíos y Reparto', path: '/shipments', icon: Truck, shortcut: 'G + S' },
    { label: 'Monitor Live HUD (Pantalla Conductor)', path: '/live-hud', icon: Radio, shortcut: 'G + L' },
    { label: 'Prendas & Catálogo en Vivo', path: '/products', icon: ShoppingBag, shortcut: 'G + P' },
    { label: 'Clientas & Historial', path: '/leads', icon: Users, shortcut: 'G + U' },
    { label: 'Campañas de Difusión WhatsApp', path: '/campaigns', icon: Megaphone, shortcut: 'G + M' },
    { label: 'Reportes y Métricas', path: '/reports', icon: BarChart2, shortcut: 'G + R' },
    { label: 'Manual & Atajos de Vendedoras', path: '/manual', icon: BookOpen, shortcut: 'G + H' },
    { label: 'Configuración & Cuentas Bancarias', path: '/config', icon: Settings, shortcut: 'G + O' },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh] backdrop-blur-xs"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b px-3.5 py-3 bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Escribe un comando o busca una sección (ej. caja, envíos, live)..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs text-left font-medium hover:bg-primary hover:text-primary-foreground transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-primary group-hover:text-primary-foreground shrink-0" />
                  <span className="font-semibold">{action.label}</span>
                </div>
                <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100">
                  {action.shortcut}
                </span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No se encontraron comandos para &quot;{search}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}