"use client";

import { Button } from "@/components/ui/button";
import type { Lead } from "@/types";

interface LeadFormModalProps {
  editingLead: Lead | null;
  form: { phone: string; name: string; source: string; internalNotes: string };
  onFormChange: (form: {
    phone: string;
    name: string;
    source: string;
    internalNotes: string;
  }) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function LeadFormModal({
  editingLead,
  form,
  onFormChange,
  saving,
  onSave,
  onClose,
}: LeadFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl space-y-4">
        <h2 className="text-sm font-semibold tracking-tight">
          {editingLead ? "Editar perfil de clienta" : "Nueva clienta"}
        </h2>
        <form onSubmit={onSave} className="space-y-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Telefono WhatsApp
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
              placeholder="+52 1 55 1234 5678"
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Nombre completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              placeholder="Ej: Sofia Martinez"
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Notas internas</label>
            <textarea
              rows={2}
              value={form.internalNotes}
              onChange={(e) => onFormChange({ ...form, internalNotes: e.target.value })}
              placeholder="Solo visible para el equipo..."
              className="resize-none rounded-md border border-input bg-background p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="flex-1 font-semibold">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
