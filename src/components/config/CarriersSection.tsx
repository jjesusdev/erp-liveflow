"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, PlugZap, Truck, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, SectionLabel } from "@/components/liveflow/primitives";
import { toast } from "sonner";

interface ProviderMeta {
  code: string;
  name: string;
  label: string;
  supportedModes: string[];
  requiresConfig: boolean;
  requiredConfig: string[];
  canTrack: boolean;
  canPrintLabel: boolean;
}

interface Carrier {
  id: string;
  code: string;
  name: string;
  mode: string;
  apiProvider: string;
  active: boolean;
  config: Record<string, unknown> | null;
}

interface CarrierForm {
  name: string;
  code: string;
  mode: string;
  apiProvider: string;
  active: boolean;
  config: Record<string, string>;
}

const EMPTY_FORM: CarrierForm = {
  name: "",
  code: "",
  mode: "COURIER",
  apiProvider: "MANUAL",
  active: true,
  config: {},
};

const MODE_LABELS: Record<string, string> = {
  COURIER: "Courier",
  EXTERNAL_OWN_FLEET: "Flota propia externa",
  STORE_PICKUP: "Retiro en tienda",
};

const inputClass =
  "mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

function isSecretField(key: string) {
  return /secret|key|token|password/i.test(key);
}

export function CarriersSection() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CarrierForm>(EMPTY_FORM);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.code === form.apiProvider),
    [providers, form.apiProvider]
  );

  const fetchData = useCallback(async () => {
    try {
      const [carriersRes, providersRes] = await Promise.all([
        fetch("/api/carriers?all=1"),
        fetch("/api/carriers/providers"),
      ]);

      if (carriersRes.ok) {
        const data = await carriersRes.json();
        setCarriers(data.items ?? []);
      }
      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviders(data.items ?? []);
      }
    } catch {
      toast.error("No se pudieron cargar los carriers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (carrier: Carrier) => {
    setEditingId(carrier.id);
    setForm({
      name: carrier.name,
      code: carrier.code,
      mode: carrier.mode,
      apiProvider: carrier.apiProvider,
      active: carrier.active,
      config: Object.fromEntries(
        Object.entries(carrier.config ?? {}).map(([key, value]) => [key, String(value ?? "")])
      ),
    });
  };

  const updateForm = <K extends keyof CarrierForm>(key: K, value: CarrierForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateConfig = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    mode: form.mode,
    apiProvider: form.apiProvider,
    active: form.active,
    config: form.config,
  });

  const handleSave = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(editingId ? `/api/carriers/${editingId}` : "/api/carriers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(data.details) ? `: ${data.details.join(", ")}` : "";
        throw new Error(`${data.error || "No se pudo guardar"}${detail}`);
      }

      toast.success(editingId ? "Carrier actualizado" : "Carrier creado");
      setEditingId(data.id ?? editingId);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el carrier");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!editingId) {
      toast.error("Guarda el carrier antes de probar la conexión");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`/api/carriers/${editingId}/test`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success("Configuración válida", {
          description: "Los providers aún son simulados: no se abre una conexión real.",
        });
      } else {
        toast.error("Configuración incompleta", {
          description: (data.errors ?? [data.error]).filter(Boolean).join(", "),
        });
      }
    } catch {
      toast.error("No se pudo validar la configuración");
    } finally {
      setTesting(false);
    }
  };

  const toggleActive = async (carrier: Carrier) => {
    try {
      const res = await fetch(`/api/carriers/${carrier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !carrier.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(carrier.active ? "Carrier desactivado" : "Carrier activado");
      await fetchData();
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  };

  const removeCarrier = async (carrier: Carrier) => {
    if (!confirm(`Eliminar el carrier "${carrier.name}"?`)) return;
    try {
      const res = await fetch(`/api/carriers/${carrier.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      toast.success(data.deactivated ? "Carrier desactivado (tiene envíos)" : "Carrier eliminado");
      if (editingId === carrier.id) startCreate();
      await fetchData();
    } catch {
      toast.error("No se pudo eliminar el carrier");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Carriers configurados</SectionLabel>
          <Button variant="outline" size="sm" onClick={startCreate} className="h-7 gap-1 text-xs">
            <Plus className="size-3.5" />
            Nuevo carrier
          </Button>
        </div>

        {carriers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <Truck className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">
              No hay carriers. Crea el primero para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {carriers.map((carrier) => (
              <div
                key={carrier.id}
                className={`rounded-xl border bg-card p-3.5 shadow-xs transition-colors ${
                  editingId === carrier.id ? "border-primary/50" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(carrier)}
                    className="min-w-0 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{carrier.name}</span>
                      <Badge tone={carrier.active ? "success" : "neutral"}>
                        {carrier.active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge tone="transit">{carrier.apiProvider}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {carrier.code} · {MODE_LABELS[carrier.mode] ?? carrier.mode}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title={carrier.active ? "Desactivar" : "Activar"}
                      onClick={() => toggleActive(carrier)}
                    >
                      <Power className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Eliminar"
                      onClick={() => removeCarrier(carrier)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="lg:col-span-5">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Editar carrier" : "Nuevo carrier"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              La configuración se valida con el proveedor seleccionado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass} htmlFor="carrier-name">
                Nombre
              </label>
              <input
                id="carrier-name"
                className={inputClass}
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Ej: Shipit Chile"
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="carrier-code">
                Código
              </label>
              <input
                id="carrier-code"
                className={inputClass}
                value={form.code}
                onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                placeholder="Ej: SHIPIT-CL"
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="carrier-provider">
                Proveedor
              </label>
              <select
                id="carrier-provider"
                className={`${inputClass} px-2.5`}
                value={form.apiProvider}
                onChange={(event) => updateForm("apiProvider", event.target.value)}
              >
                {providers.map((provider) => (
                  <option key={provider.code} value={provider.code}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="carrier-mode">
                Modo
              </label>
              <select
                id="carrier-mode"
                className={`${inputClass} px-2.5`}
                value={form.mode}
                onChange={(event) => updateForm("mode", event.target.value)}
              >
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProvider && selectedProvider.requiredConfig.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-background p-3">
              <SectionLabel>Credenciales de {selectedProvider.label}</SectionLabel>
              {selectedProvider.requiredConfig.map((key) => (
                <div key={key}>
                  <label className={labelClass} htmlFor={`carrier-config-${key}`}>
                    {key}
                  </label>
                  <input
                    id={`carrier-config-${key}`}
                    className={inputClass}
                    type={isSecretField(key) ? "password" : "text"}
                    value={form.config[key] ?? ""}
                    onChange={(event) => updateConfig(key, event.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateForm("active", event.target.checked)}
              className="size-3.5 accent-primary"
            />
            Carrier activo
          </label>

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button type="submit" size="sm" disabled={saving} className="h-8 gap-1.5 text-xs">
              <Save className="size-3.5" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testing || !editingId}
              onClick={handleTest}
              className="h-8 gap-1.5 text-xs"
            >
              <PlugZap className="size-3.5" />
              {testing ? "Validando..." : "Probar conexión"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startCreate}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
