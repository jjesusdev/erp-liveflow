"use client";

import { MessageCircle, MapPin, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types";
import type { LeadFormState } from "@/hooks/useLeads";

interface LeadFormModalProps {
  editingLead: Lead | null;
  form: LeadFormState;
  onFormChange: (form: LeadFormState) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

const SOURCE_PRESETS = [
  "whatsapp",
  "tiktok",
  "instagram",
  "facebook",
  "live",
  "referida",
  "manual",
];

const inputClass =
  "h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className || ""}`}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border pb-1.5">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h3>
    </div>
  );
}

export function LeadFormModal({
  editingLead,
  form,
  onFormChange,
  saving,
  onSave,
  onClose,
}: LeadFormModalProps) {
  const set = <K extends keyof LeadFormState>(key: K, value: LeadFormState[K]) =>
    onFormChange({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {editingLead ? "Editar perfil de clienta" : "Nueva clienta"}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {editingLead
                ? "Actualiza los datos de contacto y entrega."
                : "Registra una clienta para su historial de compras."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground"
          >
            <X className="size-3.5" />
          </Button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs">
          <section className="space-y-3">
            <SectionTitle icon={MessageCircle}>Contacto</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefono WhatsApp" className="col-span-2 sm:col-span-1">
                <input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+52 1 55 1234 5678"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Nombre completo" className="col-span-2 sm:col-span-1">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ej: Sofia Martinez"
                  className={inputClass}
                />
              </Field>
              <Field label="Origen / canal" className="col-span-2">
                <input
                  type="text"
                  list="lead-source-presets"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                  placeholder="WhatsApp, TikTok, Instagram..."
                  className={inputClass}
                />
                <datalist id="lead-source-presets">
                  {SOURCE_PRESETS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={MapPin}>Direccion de entrega</SectionTitle>
            <div className="grid grid-cols-6 gap-3">
              <Field label="Calle" className="col-span-6 sm:col-span-4">
                <input
                  type="text"
                  value={form.addressStreet}
                  onChange={(e) => set("addressStreet", e.target.value)}
                  placeholder="Av. Reforma"
                  className={inputClass}
                />
              </Field>
              <Field label="No." className="col-span-3 sm:col-span-2">
                <input
                  type="text"
                  value={form.addressNumber}
                  onChange={(e) => set("addressNumber", e.target.value)}
                  placeholder="123"
                  className={inputClass}
                />
              </Field>
              <Field label="Colonia" className="col-span-6 sm:col-span-3">
                <input
                  type="text"
                  value={form.addressColonia}
                  onChange={(e) => set("addressColonia", e.target.value)}
                  placeholder="Centro"
                  className={inputClass}
                />
              </Field>
              <Field label="Ciudad" className="col-span-6 sm:col-span-3">
                <input
                  type="text"
                  value={form.addressCity}
                  onChange={(e) => set("addressCity", e.target.value)}
                  placeholder="Ciudad de Mexico"
                  className={inputClass}
                />
              </Field>
              <Field label="Estado" className="col-span-3">
                <input
                  type="text"
                  value={form.addressState}
                  onChange={(e) => set("addressState", e.target.value)}
                  placeholder="CDMX"
                  className={inputClass}
                />
              </Field>
              <Field label="Codigo postal" className="col-span-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.addressZipCode}
                  onChange={(e) => set("addressZipCode", e.target.value)}
                  placeholder="06000"
                  className={inputClass}
                />
              </Field>
              <Field label="Referencias" className="col-span-6">
                <input
                  type="text"
                  value={form.addressNotes}
                  onChange={(e) => set("addressNotes", e.target.value)}
                  placeholder="Porton blanco, timbre 2..."
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={StickyNote}>Notas internas</SectionTitle>
            <textarea
              rows={2}
              value={form.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
              placeholder="Solo visible para el equipo..."
              className="resize-none rounded-md border border-input bg-background p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </section>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="flex-1 font-semibold">
              {saving ? "Guardando..." : editingLead ? "Guardar cambios" : "Crear clienta"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
