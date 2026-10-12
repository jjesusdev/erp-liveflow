"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Building2, Smartphone, Clock, Bot, Trash2 } from "lucide-react";
import { WhatsAppSection } from "./WhatsAppSection";
import { BankSection } from "./BankSection";
import { LiveRulesSection } from "./LiveRulesSection";
import { BotSection } from "./BotSection";
import { MaintenanceSection } from "./MaintenanceSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/liveflow/primitives";
import { toast } from "sonner";
import type { BusinessConfig } from "@/types";

const DEFAULT_CONFIG: BusinessConfig = {
  id: "default",
  businessName: "LiveFlow Boutique",
  currency: "MXN",
  timezone: "America/Mexico_City",
  bankName: "BBVA",
  bankBeneficiary: "LiveFlow Boutique S.A.",
  bankAccountNumber: "",
  bankClabe: "012 180 0152 3344 9910",
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
    "Hola! Estamos en vivo recibiendo muchos mensajes. Tu turno esta en cola y te atenderemos en unos minutos.",
};

export function ConfigPage() {
  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleSave = async (e?: React.FormEvent) => {
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Configuracion del Sistema
              </h1>
              <Badge tone="neutral">v1.2 Produccion</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Administra tus cuentas bancarias, conexion de WhatsApp, reglas de apartados y
              mantenimiento.
            </p>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            className="h-8 gap-1.5 font-semibold text-xs"
          >
            <Save className="size-3.5" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        <Tabs defaultValue="banco" className="space-y-4">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 gap-2 overflow-x-auto">
            <TabsTrigger value="banco" className="text-xs">
              <Building2 className="size-3.5" />
              Cuentas Bancarias
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs">
              <Smartphone className="size-3.5" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="live" className="text-xs">
              <Clock className="size-3.5" />
              Reglas de Live & Apartados
            </TabsTrigger>
            <TabsTrigger value="bot" className="text-xs">
              <Bot className="size-3.5" />
              Bot & Respuestas
            </TabsTrigger>
            <TabsTrigger value="mantenimiento" className="text-xs">
              <Trash2 className="size-3.5" />
              Mantenimiento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banco" className="space-y-4 pt-2">
            <BankSection config={config} onChange={setConfig} />
          </TabsContent>

          <TabsContent value="whatsapp" className="pt-2">
            <WhatsAppSection />
          </TabsContent>

          <TabsContent value="live" className="pt-2">
            <LiveRulesSection config={config} onChange={setConfig} />
          </TabsContent>

          <TabsContent value="bot" className="pt-2">
            <BotSection config={config} onChange={setConfig} />
          </TabsContent>

          <TabsContent value="mantenimiento" className="pt-2">
            <MaintenanceSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
