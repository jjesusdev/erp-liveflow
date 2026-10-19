"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Carrier, Shipment } from "@/types";

export interface ShipmentStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  issues: number;
  byStatus?: Record<string, number>;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export { PAGE_SIZE_OPTIONS };

const TO_DISPATCH = ["PENDING", "READY", "LABEL_PRINTED"];
const IN_TRANSIT = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
const ISSUES = ["FAILED", "RETURNED", "LOST", "CANCELLED"];

function filterToStatus(f: string): string | null {
  if (f === "all") return null;
  if (f === "TO_DISPATCH") return TO_DISPATCH.join(",");
  if (f === "IN_TRANSIT") return IN_TRANSIT.join(",");
  if (f === "ISSUES") return ISSUES.join(",");
  return f;
}

function sum(byStatus: Record<string, number> | undefined, keys: string[]): number {
  if (!byStatus) return 0;
  return keys.reduce((acc, k) => acc + (byStatus[k] || 0), 0);
}

export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<ShipmentStats>({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    issues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPrintView, setShowBulkPrintView] = useState(false);
  const [printTargets, setPrintTargets] = useState<Shipment[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Shipment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchShipments = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const status = filterToStatus(filter);
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/shipments?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudieron cargar los envios");
      const payload = await res.json();
      setShipments(payload.items ?? []);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.totalPages ?? 1);
      setStats(payload.stats ?? { total: 0, pending: 0, inTransit: 0, delivered: 0, issues: 0 });
    } catch {
      toast.error("Error al cargar los envios");
    } finally {
      setLoading(false);
    }
  }, [filter, query, page, pageSize]);

  const fetchCarriers = useCallback(async () => {
    try {
      const res = await fetch("/api/carriers?meta=1");
      if (!res.ok) return;
      const payload = await res.json();
      setCarriers(payload.items ?? []);
    } catch {
      // silencioso: se usa lista de respaldo
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/shipments/${id}`);
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setDetail(payload);
    } catch {
      toast.error("No se pudo abrir el envio");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  useEffect(() => {
    setLoading(true);
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    else setDetail(null);
  }, [selectedId, fetchDetail]);

  const updateShipment = async (id: string, data: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "No se pudo actualizar el envio");

      if (data.status === "IN_TRANSIT") {
        toast.success("Paquete despachado", {
          description: "Notificacion enviada a la clienta por WhatsApp.",
        });
      } else if (data.status === "DELIVERED") {
        toast.success("Paquete entregado");
      } else {
        toast.success("Envio actualizado");
      }

      await fetchShipments();
      if (selectedId === id) await fetchDetail(id);
    } catch {
      toast.error("No se pudo actualizar el envio");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length > 0 && prev.length === shipments.length ? [] : shipments.map((s) => s.id)
    );
  };

  const counts = useMemo(
    () => ({
      all: stats.byStatus ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0,
      TO_DISPATCH: sum(stats.byStatus, TO_DISPATCH),
      IN_TRANSIT: sum(stats.byStatus, IN_TRANSIT),
      DELIVERED: stats.byStatus?.DELIVERED || 0,
      ISSUES: sum(stats.byStatus, ISSUES),
    }),
    [stats.byStatus]
  );

  const exportManifestCSV = async () => {
    let list: Shipment[];
    if (selectedIds.length > 0) {
      list = shipments.filter((s) => selectedIds.includes(s.id));
    } else {
      try {
        const params = new URLSearchParams({ export: "1" });
        const status = filterToStatus(filter);
        if (status) params.set("status", status);
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/shipments?${params.toString()}`);
        const payload = await res.json();
        list = payload.items ?? [];
      } catch {
        list = shipments;
      }
    }

    if (!list || list.length === 0) return;

    const headers = [
      "ID Envio",
      "Cliente",
      "Telefono",
      "Calle",
      "Numero",
      "Comuna",
      "Ciudad",
      "Region",
      "Transporte",
      "Guia",
      "Costo CLP",
      "Notas",
      "Estado",
    ];
    const rows = list.map((s) => [
      s.id.slice(0, 8).toUpperCase(),
      `"${s.lead?.name || "Clienta"}"`,
      `"${s.lead?.phone || ""}"`,
      `"${s.lead?.addressStreet || ""}"`,
      `"${s.lead?.addressNumber || ""}"`,
      `"${s.lead?.addressColonia || ""}"`,
      `"${s.lead?.addressCity || ""}"`,
      `"${s.lead?.addressState || ""}"`,
      `"${s.carrier || s.carrierRef?.name || ""}"`,
      `"${s.trackingNumber || ""}"`,
      `"${s.costClp ?? ""}"`,
      `"${s.notes?.replace(/"/g, '""') || ""}"`,
      s.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `manifiesto_envios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Manifiesto exportado", { description: `${list.length} paquetes descargados.` });
  };

  const printBulkLabels = () => {
    const targets =
      selectedIds.length > 0 ? shipments.filter((s) => selectedIds.includes(s.id)) : shipments;
    setPrintTargets(targets);
    setShowBulkPrintView(true);
    setTimeout(() => window.print(), 300);
  };

  const printOne = (shipment: Shipment) => {
    setPrintTargets([shipment]);
    setShowBulkPrintView(true);
    setTimeout(() => window.print(), 300);
  };

  return {
    shipments,
    carriers,
    filter,
    setFilter: (f: string) => {
      setFilter(f);
      setPage(1);
      setSelectedIds([]);
    },
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setPage(1);
    },
    page,
    setPage,
    pageSize,
    setPageSize,
    changePageSize: (n: number) => {
      setPageSize(n);
      setPage(1);
    },
    total,
    totalPages,
    counts,
    loading,
    busyId,
    selectedIds,
    showBulkPrintView,
    setShowBulkPrintView,
    printTargets,
    updateShipment,
    toggleSelect,
    toggleSelectAll,
    selectedId,
    setSelectedId,
    detail,
    detailLoading,
    stats,
    exportManifestCSV,
    printBulkLabels,
    printOne,
    fetchShipments,
  };
}
