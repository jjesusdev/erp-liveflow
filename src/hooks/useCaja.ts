"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/lib/socket";
import type { PaymentOrder } from "@/types";

export function useCaja() {
  const [payments, setPayments] = useState<PaymentOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [runningSweep, setRunningSweep] = useState(false);
  const [showSweepModal, setShowSweepModal] = useState(false);
  const [sweepDiscount, setSweepDiscount] = useState("0");
  const socket = useSocket();

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (providerFilter !== "all") params.set("provider", providerFilter);
      if (dateRange !== "all") params.set("range", dateRange);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/caja?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudieron cargar los cobros");
      setPayments(await res.json());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar los cobros");
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

    socket.on("payment:confirmed", refresh);
    socket.on("payment:updated", refresh);

    return () => {
      socket.off("payment:confirmed", refresh);
      socket.off("payment:updated", refresh);
    };
  }, [socket, fetchPayments]);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError(null);

    try {
      const res = await fetch(`/api/payment-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo actualizar el cobro");

      if (status === "PAID") {
        setSuccessToast("Cobro aprobado y paquete creado en Envios!");
        setTimeout(() => setSuccessToast(null), 4000);
      }

      fetchPayments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el cobro");
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
      setError("No se pudo copiar el folio");
    }
  };

  const executeSweepRecovery = async () => {
    setRunningSweep(true);
    setError(null);
    try {
      const res = await fetch("/api/caja/sweep-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountPercent: parseInt(sweepDiscount, 10) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo ejecutar el barrido");

      setSuccessToast(`Barrido completado: Se enviaron ${data.recoveredCount} recordatorios.`);
      setShowSweepModal(false);
      setTimeout(() => setSuccessToast(null), 5000);
      fetchPayments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error en el barrido");
    } finally {
      setRunningSweep(false);
    }
  };

  const exportCSV = () => {
    if (payments.length === 0) return;

    const headers = [
      "Folio",
      "Cliente",
      "Telefono",
      "Concepto",
      "Monto",
      "Moneda",
      "Metodo",
      "Estado",
      "Fecha Creacion",
      "Fecha Pago",
    ];
    const rows = payments.map((p) => [
      p.id.slice(0, 8).toUpperCase(),
      `"${p.lead?.name || "Cliente"}"`,
      `"${p.lead?.phone || ""}"`,
      `"${p.concept.replace(/"/g, '""')}"`,
      Number(p.amount).toFixed(2),
      p.currency || "MXN",
      p.provider || "TRANSFER",
      p.status,
      p.createdAt,
      p.paidAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `cuadre_caja_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paidOrders = payments.filter((p) => p.status === "PAID");
  const pendingOrders = payments.filter((p) => p.status === "PENDING" || p.status === "SENT");

  const totalPaid = paidOrders.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = pendingOrders.reduce((sum, p) => sum + Number(p.amount), 0);

  const totalTransferPaid = paidOrders
    .filter((p) => p.provider === "TRANSFER" || !p.provider)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    payments,
    statusFilter,
    setStatusFilter,
    providerFilter,
    setProviderFilter,
    dateRange,
    setDateRange,
    search,
    setSearch,
    loading,
    error,
    busyId,
    copiedId,
    successToast,
    setSuccessToast,
    runningSweep,
    showSweepModal,
    setShowSweepModal,
    sweepDiscount,
    setSweepDiscount,
    updateStatus,
    copyRef,
    executeSweepRecovery,
    exportCSV,
    paidOrders,
    pendingOrders,
    totalPaid,
    totalPending,
    totalTransferPaid,
    fetchPayments,
  };
}
