"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Lead } from "@/types";

export interface LeadFormState {
  phone: string;
  name: string;
  source: string;
  internalNotes: string;
  addressStreet: string;
  addressNumber: string;
  addressColonia: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  addressNotes: string;
}

export type LeadSortKey = "name" | "tier" | "city" | "orders" | "ticket" | "total" | "recent";
export type SortDir = "asc" | "desc";

export interface LeadFacets {
  all: number;
  VIP: number;
  FREQUENT: number;
  NEW: number;
  GHOST: number;
}

export interface LeadTotals {
  count: number;
  revenue: number;
  orders: number;
  active30: number;
}

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export const EMPTY_LEAD_FORM: LeadFormState = {
  phone: "",
  name: "",
  source: "whatsapp",
  internalNotes: "",
  addressStreet: "",
  addressNumber: "",
  addressColonia: "",
  addressCity: "",
  addressState: "",
  addressZipCode: "",
  addressNotes: "",
};

const EMPTY_FACETS: LeadFacets = { all: 0, VIP: 0, FREQUENT: 0, NEW: 0, GHOST: 0 };
const EMPTY_TOTALS: LeadTotals = { count: 0, revenue: 0, orders: 0, active30: 0 };

export function useLeads() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<LeadFacets>(EMPTY_FACETS);
  const [totals, setTotals] = useState<LeadTotals>(EMPTY_TOTALS);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortKey, setSortKey] = useState<LeadSortKey>("recent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(EMPTY_LEAD_FORM);
  const [saving, setSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [chargeTarget, setChargeTarget] = useState<{ lead: Lead; conversationId: string } | null>(
    null
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort: sortKey,
        dir: sortDir,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (query.trim()) params.set("search", query.trim());
      if (tierFilter !== "all") params.set("tier", tierFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar");
      const data = await res.json();
      const items: Lead[] = data.items || [];
      setLeads(items);
      setTotal(data.total || 0);
      setFacets({ ...EMPTY_FACETS, ...(data.facets || {}) });
      setTotals({ ...EMPTY_TOTALS, ...(data.totals || {}) });
      setSelectedId((current) =>
        current && items.some((l) => l.id === current) ? current : (items[0]?.id ?? null)
      );
    } catch {
      toast.error("No se pudieron cargar las clientas");
    } finally {
      setLoading(false);
    }
  }, [query, tierFilter, sortKey, sortDir, page, pageSize]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/leads/${selectedId}`);
        if (!res.ok) return;
        const data = (await res.json()) as Lead;
        if (!cancelled) setDetail(data);
      } catch {
        // El listado ya trae lo esencial; el detalle se reintenta al re-seleccionar.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedLead = useMemo<Lead | null>(() => {
    const base = leads.find((l) => l.id === selectedId) || null;
    if (detail && detail.id === selectedId) {
      return { ...(base || {}), ...detail } as Lead;
    }
    return base || leads[0] || null;
  }, [leads, selectedId, detail]);

  const changeTier = useCallback((value: string) => {
    setTierFilter(value);
    setPage(1);
  }, []);

  const changePageSize = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (key: LeadSortKey) => {
      setPage(1);
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(key === "name" || key === "city" ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  const openCreate = () => {
    setEditingLead(null);
    setForm(EMPTY_LEAD_FORM);
    setShowModal(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      phone: lead.phone || "",
      name: lead.name || "",
      source: lead.source || "",
      internalNotes: lead.internalNotes || "",
      addressStreet: lead.addressStreet || "",
      addressNumber: lead.addressNumber || "",
      addressColonia: lead.addressColonia || "",
      addressCity: lead.addressCity || "",
      addressState: lead.addressState || "",
      addressZipCode: lead.addressZipCode || "",
      addressNotes: lead.addressNotes || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingLead ? `/api/leads/${editingLead.id}` : "/api/leads";
      const method = editingLead ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al guardar");
      }
      toast.success(editingLead ? "Clienta actualizada" : "Clienta creada");
      setShowModal(false);
      fetchLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la clienta");
    } finally {
      setSaving(false);
    }
  };

  const ensureConversation = useCallback(async (lead: Lead): Promise<string> => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id }),
    });
    if (!res.ok) throw new Error("No se pudo abrir la conversacion");
    const conversation = await res.json();
    return conversation.id as string;
  }, []);

  const openChat = useCallback(
    async (lead: Lead) => {
      setActionBusyId(lead.id);
      try {
        const conversationId = await ensureConversation(lead);
        router.push(`/?conversation=${conversationId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo abrir el chat");
      } finally {
        setActionBusyId(null);
      }
    },
    [ensureConversation, router]
  );

  const openCharge = useCallback(
    async (lead: Lead) => {
      setActionBusyId(lead.id);
      try {
        const conversationId = await ensureConversation(lead);
        setChargeTarget({ lead, conversationId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo iniciar el cobro");
      } finally {
        setActionBusyId(null);
      }
    },
    [ensureConversation]
  );

  const segments = useMemo(
    () => [
      { id: "all", label: "Todas", count: facets.all },
      { id: "VIP", label: "VIP", count: facets.VIP },
      { id: "FREQUENT", label: "Recurrentes", count: facets.FREQUENT },
      { id: "NEW", label: "Nuevas", count: facets.NEW },
      { id: "GHOST", label: "Sin pago", count: facets.GHOST },
    ],
    [facets]
  );

  const exportCsv = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort: sortKey, dir: sortDir, export: "1" });
      if (query.trim()) params.set("search", query.trim());
      if (tierFilter !== "all") params.set("tier", tierFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows: Lead[] = data.items || [];
      if (rows.length === 0) {
        toast.error("No hay clientas para exportar");
        return;
      }

      const header = "Nombre,Telefono,Nivel,Compras,Total_Gastado,Origen,Ciudad,Direccion,Notas";
      const body = rows
        .map((l) =>
          [
            l.name || "Sin nombre",
            l.phone,
            l.tier || "NEW",
            l.totalPaidCount || 0,
            (l.totalSpent || 0).toFixed(2),
            l.source || "WhatsApp",
            l.addressCity || "",
            `${l.addressStreet || ""} ${l.addressNumber || ""} ${l.addressColonia || ""} ${l.addressCity || ""}`.trim(),
            l.internalNotes || "",
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

      const url = URL.createObjectURL(
        new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientas-${tierFilter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Directorio exportado", {
        description: `${rows.length} clientas descargadas.`,
      });
    } catch {
      toast.error("No se pudo exportar el directorio");
    }
  }, [query, sortKey, sortDir, tierFilter]);

  return {
    leads,
    total,
    facets,
    totals,
    search,
    setSearch,
    tierFilter,
    changeTier,
    selectedId,
    setSelectedId,
    selectedLead,
    loading,
    page,
    setPage,
    pageSize,
    changePageSize,
    sortKey,
    sortDir,
    toggleSort,
    showModal,
    setShowModal,
    editingLead,
    form,
    setForm,
    saving,
    openCreate,
    openEdit,
    handleSave,
    segments,
    exportCsv,
    fetchLeads,
    openChat,
    openCharge,
    actionBusyId,
    chargeTarget,
    setChargeTarget,
  };
}
