'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  Users,
  MessageSquare,
  CreditCard,
  Package,
  Clock,
} from 'lucide-react';

interface Stats {
  totalRevenue: number;
  transferRevenue: number;
  cardRevenue: number;
  averageTicket: number;
  paidOrders: number;
  pendingOrders: number;
  totalConversations: number;
  allTimeConversations: number;
  activeConversations: number;
  totalLeads: number;
  newLeads: number;
  periodLeads: number;
  products: number;
  conversionRate: string;
  shipments: Record<string, number>;
  recentPaidOrders?: Array<{
    paidAt: string;
    amount: number;
    concept: string;
  }>;
}

const PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: '7 dias' },
  { id: 'month', label: 'Este mes' },
  { id: 'all', label: 'Todo' },
];

const SHIPMENT_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_TRANSIT: 'En transito',
  DELIVERED: 'Entregado',
  RETURNED: 'Devuelto',
  LOST: 'Perdido',
};

export function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let url = '/api/reports';

      if (period !== 'all') {
        let startDate: Date;
        if (period === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === 'week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        url = `/api/reports?startDate=${encodeURIComponent(
          startDate.toISOString()
        )}&endDate=${encodeURIComponent(now.toISOString())}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los reportes');
      setStats(await res.json());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const rate = Math.min(Number(stats.conversionRate), 100);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                period === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ingresos Netos</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-green-600">
            {formatCurrency(Number(stats.totalRevenue))}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{stats.paidOrders} pedidos</span>
            <span className="font-semibold text-emerald-600">
              {formatCurrency(stats.transferRevenue || 0)} transf.
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ticket Promedio</span>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">
            {formatCurrency(stats.averageTicket || 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Por cada venta concretada
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversión en Vivo</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-600">
            {stats.conversionRate}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats.paidOrders} de {stats.totalConversations} chats
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Clientas Captadas</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">
            {stats.totalLeads}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            +{stats.newLeads} nuevas en el periodo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold">Tasa de conversion</h3>
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeWidth="10"
                  strokeDasharray={`${rate * 2.51} 251`}
                  strokeLinecap="round"
                  className="stroke-green-600"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{stats.conversionRate}%</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{stats.paidOrders}</span> cobros pagados
              </p>
              <p>
                <span className="font-medium">{stats.totalConversations}</span>{' '}
                conversaciones del periodo
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold">Envios por estado</h3>
          <div className="space-y-2">
            {Object.keys(stats.shipments || {}).length > 0 ? (
              Object.entries(stats.shipments).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{SHIPMENT_LABELS[status] || status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin envios</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold">Resumen</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Conversaciones activas
              </span>
              <span className="font-medium">{stats.activeConversations}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Cobros por cobrar
              </span>
              <span className="font-medium">{stats.pendingOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Clientes nuevos del periodo
              </span>
              <span className="font-medium">{stats.newLeads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Conversaciones historicas
              </span>
              <span className="font-medium">{stats.allTimeConversations}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold">Catalogo</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Productos activos
            </span>
            <span className="font-medium">{stats.products}</span>
          </div>
        </div>
      </div>
    </div>
  );
}