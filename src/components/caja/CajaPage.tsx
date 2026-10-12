'use client';

import { Download, Sparkles } from 'lucide-react';
import { useCaja } from '@/hooks/useCaja';
import { CajaMetrics } from './CajaMetrics';
import { CajaFilters } from './CajaFilters';
import { CajaTable } from './CajaTable';
import { SweepModal } from './SweepModal';

export function CajaPage() {
  const caja = useCaja();

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cuadre de Caja & Ventas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitorea los ingresos verificados por transferencias y ventas en vivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => caja.setShowSweepModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Barrido de Carritos Abandonados
          </button>
          <button
            onClick={caja.exportCSV}
            disabled={caja.payments.length === 0}
            className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar Excel/CSV
          </button>
        </div>
      </div>

      <CajaMetrics
        totalPaid={caja.totalPaid}
        totalTransferPaid={caja.totalTransferPaid}
        totalPending={caja.totalPending}
        totalOrders={caja.payments.length}
        paidCount={caja.paidOrders.length}
        pendingCount={caja.pendingOrders.length}
      />

      {caja.successToast && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-sm font-medium text-green-900 border border-green-300">
          {caja.successToast}
        </div>
      )}

      {caja.error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{caja.error}</div>
      )}

      <CajaFilters
        search={caja.search}
        onSearchChange={caja.setSearch}
        dateRange={caja.dateRange}
        onDateRangeChange={caja.setDateRange}
        statusFilter={caja.statusFilter}
        onStatusFilterChange={caja.setStatusFilter}
        providerFilter={caja.providerFilter}
        onProviderFilterChange={caja.setProviderFilter}
      />

      <CajaTable
        payments={caja.payments}
        loading={caja.loading}
        busyId={caja.busyId}
        copiedId={caja.copiedId}
        onCopyRef={caja.copyRef}
        onUpdateStatus={caja.updateStatus}
      />

      {caja.showSweepModal && (
        <SweepModal
          discount={caja.sweepDiscount}
          onDiscountChange={caja.setSweepDiscount}
          running={caja.runningSweep}
          onExecute={caja.executeSweepRecovery}
          onClose={() => caja.setShowSweepModal(false)}
        />
      )}
    </div>
  );
}
