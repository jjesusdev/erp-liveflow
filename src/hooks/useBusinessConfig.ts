"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import type { BusinessConfig } from "@/types";

export const DEFAULT_CONFIG: BusinessConfig = {
  id: "default",
  businessName: "Mi Boutique LiveFlow",
  currency: "CLP",
  timezone: "America/Santiago",
  bankName: "Banco de Chile",
  bankBeneficiary: "Mi Boutique SpA",
  bankAccountNumber: "",
  bankClabe: "",
  bankNotes:
    "Por favor envia captura clara del comprobante de transferencia para confirmar tu pedido.",
  soundAlertsEnabled: false,
  autoExpireOrders: true,
  orderExpirationMinutes: 30,
  autoReleaseStock: true,
  businessHoursStart: "09:00",
  businessHoursEnd: "22:00",
  autoReplyEnabled: true,
  autoReplyDelayMs: 1200,
  welcomeMessage:
    "Hola! Bienvenida a LiveFlow. Enviaos captura de la prenda que te gusto en el Live y te ayudamos enseguida",
  awayMessage:
    "Hola! En este momento estamos fuera de horario. Te responderemos temprano para atender tu pedido.",
  queueMessage:
    "Hola! Estamos en vivo recibiendo muchos mensajes. Tu turno esta en cola y te atenderemos unos minutos.",
  // Recordatorios automáticos
  reminderEnabled: false,
  reminderBeforeMinutes: 15,
  reminderDays: 7,
};

export function useBusinessConfig() {
  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "banco";
    }
    return "banco";
  });

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig({ ...DEFAULT_CONFIG, ...data });
      }
    } catch {
      toast.error("Error cargando configuracion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Configuracion guardada correctamente");
    } catch {
      toast.error("No se pudo guardar la configuracion");
    } finally {
      setSaving(false);
    }
  };

  return {
    config,
    setConfig,
    saving,
    loading,
    activeTab,
    fetchConfig,
    handleSave,
  };
}
