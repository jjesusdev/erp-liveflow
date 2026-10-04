'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  CreditCard,
  Clock,
  CheckCircle,
  Copy,
  Check,
  Ban,
  Truck,
  Building2,
  Download,
  Search,
  Calendar,
  Wallet,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { PaymentOrder } from '@/types';

const STATUS_FILTERS = [
  { id: 'all', label: 'Todos los estados' },
  { id: 'PAID', label: 'Pagados' },
  { id: 'SENT', label: 'Por pagar / Enviados' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'CANCELLED', label: 'Cancelados' },
];

const PROVIDER_FILTERS = [
  { id: 'all', label: 'Todos los métodos' },
  { id: 'TRANSFER', label: 'Transferencia Directa' },
  { id: 'MERCADOPAGO', label: 'MercadoPago' },
  { id: 'CASH', label: 'Efectivo' },
];

const DATE_RANGES = [
  { id: 'today', label: 'Hoy (Live actual)' },
  { id: 'week', label: 'Últimos 7 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'all', label: 'Histórico completo' },
];

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  EXPIRED: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  REFUNDED: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
};

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Pagado',
  SENT: 'Por pagar',
  PENDING: 'Pendiente',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export function CajaPage() {
  const [payments, setPayments] = useState<PaymentOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const socket = useSocket();

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (providerFilter !== 'all') params.set('provider', providerFilter);
      if (dateRange !== 'all') params.set('range', dateRange);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/caja?${params.toString()}`);
      if (!res.ok) throw new Error('No se pudieron cargar los cobros');
      setPayments(await res.json());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los cobros');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter, dateRange, search]);

  useEffect(() => {
    setLoading(true);
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (!socket) return;

    const refresh = () => fetchPayments();

    socket.on('payment:confirmed', refresh);
    socket.on('payment:updated', refresh);

    return () => {
      socket.off('payment:confirmed', refresh);
      socket.off('payment:updated', refresh);
    };
  }, [socket, fetchPayments]);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError(null);

    try {
      const res = await fetch(`/api/payment-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el cobro');

      if (status === 'PAID') {
        setSuccessToast('🎉 ¡Cobro aprobado y paquete creado en Envíos!');
        setTimeout(() => setSuccessToast(null), 4000);
      }

      fetchPayments();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el cobro');
    } finally {
      setBusyId(null);
    }
  };

  const copyRef = async (order: PaymentOrder) => {
    const text = order.id.slice(0, 8).toUpperCase();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('No se pudo copiar el folio');
    }
  };

  const [runningSweep, setRunningSweep] = useState(false);
  const [showSweepModal, setShowSweepModal] = useState(false);
  const [sweepDiscount, setSweepDiscount] = useState('0');

  const executeSweepRecovery = async () => {
    setRunningSweep(true);
    setError(null);
    try {
      const res = await fetch('/api/caja/sweep-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPercent: parseInt(sweepDiscount, 10) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo ejecutar el barrido');

      setSuccessToast(`📢 Barrido completado: Se enviaron ${data.recoveredCount} recordatorios a clientas pendientes.`);
      setShowSweepModal(false);
      setTimeout(() => setSuccessToast(null), 5000);
      fetchPayments();
    } catch (err: any) {
      setError(err?.message || 'Error en el barrido');
    } finally {
      setRunningSweep(false);
    }
  };
  const exportCSV = () => {
    if (payments.length === 0) return;

    const headers = ['Folio', 'Cliente', 'Telefono', 'Concepto', 'Monto', 'Moneda', 'Metodo', 'Estado', 'Fecha Creacion', 'Fecha Pago'];
    const rows = payments.map((p) => [
      p.id.slice(0, 8).toUpperCase(),
      `"${p.lead?.name || 'Cliente'}"`,
      `"${p.lead?.phone || ''}"`,
      `"${p.concept.replace(/"/g, '""')}"`,
      Number(p.amount).toFixed(2),
      p.currency || 'MXN',
      p.provider || 'TRANSFER',
      p.status,
      p.createdAt,
      p.paidAt || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cuadre_caja_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cálculos y métricas financieras de Cuadre
  const paidOrders = payments.filter((p) => p.status === 'PAID');
  const pendingOrders = payments.filter((p) => p.status === 'PENDING' || p.status === 'SENT');

  const totalPaid = paidOrders.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = pendingOrders.reduce((sum, p) => sum + Number(p.amount), 0);
  
  const totalTransferPaid = paidOrders
    .filter((p) => p.provider === 'TRANSFER' || !p.provider)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalCardsPaid = paidOrders
    .filter((p) => p.provider === 'MERCADOPAGO' || p.provider === 'STRIPE')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cuadre de Caja & Ventas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitorea los ingresos verificados por transferencias y ventas en vivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSweepModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Barrido de Carritos Abandonados
          </button>
          <button
            onClick={exportCSV}
            disabled={payments.length === 0}
            className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar Excel/CSV
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Cuadre */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Cobrado */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Cobrado</span>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-green-600">
            {formatCurrency(totalPaid)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {paidOrders.length} pedidos confirmados
          </p>
        </div>

        {/* Transferencias Bancarias */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">En Transferencias</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">
            {formatCurrency(totalTransferPaid)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Sin comisiones de pasarelas
          </p>
        </div>

        {/* Por Cobrar / Pendiente */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Por Cobrar</span>
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-orange-600">
            {formatCurrency(totalPending)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pendingOrders.length} pedidos esperando transferencia
          </p>
        </div>

        {/* Total de Órdenes */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Órdenes</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">
            {payments.length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tickets emitidos en el periodo
          </p>
        </div>
      </div>

      {/* Alertas */}
      {successToast && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-sm font-medium text-green-900 border border-green-300">
          {successToast}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Búsqueda */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cliente, prenda o folio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Rango de Fecha */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium"
          >
            {DATE_RANGES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Método */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium"
          >
            {PROVIDER_FILTERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Cobros */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[950px]">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left">Folio / Ref</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Concepto / Pedido</th>
              <th className="px-4 py-3 text-left">Monto</th>
              <th className="px-4 py-3 text-left">Método</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {payments.map((payment) => {
              const folio = payment.id.slice(0, 8).toUpperCase();
              const isTransfer = payment.provider === 'TRANSFER' || !payment.provider;

              return (
                <tr key={payment.id} className="hover:bg-muted/30">
                  {/* Folio */}
                  <td className="px-4 py-3 font-mono text-xs">
                    <button
                      onClick={() => copyRef(payment)}
                      className="inline-flex items-center gap-1 font-bold text-foreground hover:text-primary"
                      title="Copiar folio"
                    >
                      {folio}
                      {copiedId === payment.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground opacity-60" />
                      )}
                    </button>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3 font-medium">
                    <p className="truncate">{payment.lead?.name || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">{payment.lead?.phone}</p>
                  </td>

                  {/* Concepto */}
                  <td className="px-4 py-3 text-foreground font-medium">
                    {payment.concept}
                  </td>

                  {/* Monto */}
                  <td className="px-4 py-3 font-bold text-foreground">
                    {formatCurrency(Number(payment.amount), payment.currency)}
                  </td>

                  {/* Método */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                      {isTransfer ? (
                        <>
                          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                          Transferencia
                        </>
                      ) : payment.provider === 'MERCADOPAGO' ? (
                        <>
                          <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          MercadoPago
                        </>
                      ) : (
                        payment.provider
                      )}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        STATUS_STYLES[payment.status] || 'bg-muted text-muted-foreground'
                      )}
                    >
                      {STATUS_LABELS[payment.status] || payment.status}
                    </span>
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(payment.createdAt)}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      {payment.status !== 'PAID' && (
                        <button
                          onClick={() => updateStatus(payment.id, 'PAID')}
                          disabled={busyId === payment.id}
                          className="inline-flex items-center gap-1 rounded bg-green-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                          title="Aprobar pago de transferencia"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar
                        </button>
                      )}

                      {payment.status === 'PAID' && payment.shipment && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          <Truck className="h-3 w-3" />
                          Envíos OK
                        </span>
                      )}

                      {payment.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus(payment.id, 'CANCELLED')}
                          disabled={busyId === payment.id}
                          title="Cancelar cobro"
                          className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && payments.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No se encontraron cobros con los filtros seleccionados.
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-muted-foreground">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      {/* Modal de Barrido de Carritos Abandonados */}
      {showSweepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-bold">Barrido de Carritos Post-Live</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Envía un recordatorio masivo por WhatsApp a todas las clientas con apartados pendientes o vencidos para cerrar ventas antes de regresar el inventario al stock general.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Ofrecer Descuento Especial de Cierre (Opcional)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={sweepDiscount}
                    onChange={(e) => setSweepDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border py-1.5 pl-3 pr-8 text-xs font-mono bg-background"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {parseInt(sweepDiscount, 10) > 0
                    ? `Se aplicará un ${sweepDiscount}% de descuento en el mensaje para incentivar el pago inmediato.`
                    : 'Se enviará un recordatorio estándar de confirmación de pedido.'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSweepModal(false)}
                  className="flex-1 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeSweepRecovery}
                  disabled={runningSweep}
                  className="flex-1 rounded-md bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {runningSweep ? 'Enviando...' : 'Lanzar Barrido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}