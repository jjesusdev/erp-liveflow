"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/lib/socket";
import type { Campaign } from "@/types";

interface CampaignFormState {
  name: string;
  message: string;
  scheduledAt: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message: unknown = error.message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

function getApiMessage(data: unknown, key: "error" | "warning"): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const payload = data as Record<string, unknown>;
  const value: unknown = payload[key];
  return typeof value === "string" && value ? value : undefined;
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CampaignFormState>({ name: "", message: "", scheduledAt: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("No se pudieron cargar las campanas");
      setCampaigns((await res.json()) as Campaign[]);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Error al cargar las campanas"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Progreso del envio en tiempo real.
  useEffect(() => {
    if (!socket) return;

    const onUpdated = (campaign: Campaign) => {
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, ...campaign } : c)));
    };

    socket.on("campaign:updated", onUpdated);
    return () => {
      socket.off("campaign:updated", onUpdated);
    };
  }, [socket]);

  const handleCreate = async (e: React.FormEvent, sendNow: boolean) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        message: form.message,
      };
      if (sendNow) {
        payload.sendNow = true;
      } else if (form.scheduledAt) {
        payload.scheduledAt = new Date(form.scheduledAt).toISOString();
      }

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json();
      if (!res.ok) throw new Error(getApiMessage(data, "error") || "No se pudo crear la campana");
      const warning = getApiMessage(data, "warning");
      if (warning) setError(warning);

      setShowModal(false);
      setForm({ name: "", message: "", scheduledAt: "" });
      fetchCampaigns();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo crear la campana"));
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(getApiMessage(data, "error") || "No se pudo iniciar el envio");
      fetchCampaigns();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo iniciar el envio"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("¿Cancelar esta campana?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/cancel`, { method: "POST" });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(getApiMessage(data, "error") || "No se pudo cancelar");
      fetchCampaigns();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cancelar"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta campana?")) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(getApiMessage(data, "error") || "No se pudo eliminar");
      fetchCampaigns();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar la campana"));
    }
  };

  return {
    campaigns,
    showModal,
    setShowModal,
    form,
    setForm,
    loading,
    saving,
    busyId,
    error,
    setError,
    fetchCampaigns,
    handleCreate,
    handleSend,
    handleCancel,
    handleDelete,
  };
}
