"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddressFormData } from "@/hooks/useChatPanel";

interface AddressTabProps {
  form: AddressFormData;
  onChange: (form: AddressFormData) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}

export function AddressTab({ form, onChange, onSave, saving }: AddressTabProps) {
  const field = (key: keyof AddressFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [key]: e.target.value }),
  });

  return (
    <form onSubmit={onSave} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
          Datos de Envio de la Clienta
        </h4>
        <Button type="submit" variant="default" size="sm" disabled={saving} className="h-7 text-xs">
          <Save className="size-3" /> Guardar
        </Button>
      </div>

      <div>
        <label className="text-xs font-medium">Nombre Completo del Receptor</label>
        <input
          type="text"
          {...field("name")}
          placeholder="Ej: Maria Gonzalez"
          className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-medium">Calle / Avenida</label>
          <input
            type="text"
            {...field("addressStreet")}
            placeholder="Ej: Av. Hidalgo"
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Numero (Ext/Int)</label>
          <input
            type="text"
            {...field("addressNumber")}
            placeholder="Ej: #123 Int 4"
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium">Colonia / Barrio</label>
          <input
            type="text"
            {...field("addressColonia")}
            placeholder="Ej: Centro"
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Codigo Postal</label>
          <input
            type="text"
            {...field("addressZipCode")}
            placeholder="Ej: 06000"
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium">Ciudad / Municipio</label>
          <input
            type="text"
            {...field("addressCity")}
            placeholder="Ej: Guadalajara"
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Estado</label>
          <input
            type="text"
            {...field("addressState")}
            placeholder="Ej: Jalisco"
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">Referencias de Entrega</label>
        <textarea
          rows={2}
          {...field("addressNotes")}
          placeholder="Ej: Porton cafe, entre Juarez y Morelos."
          className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
        />
      </div>
    </form>
  );
}
