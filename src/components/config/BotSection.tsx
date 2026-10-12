"use client";

import { ToggleSwitch } from "./ToggleSwitch";
import type { BusinessConfig } from "@/types";

interface BotSectionProps {
  config: BusinessConfig;
  onChange: (config: BusinessConfig) => void;
}

export function BotSection({ config, onChange }: BotSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs max-w-2xl">
      <div className="border-b border-border pb-3">
        <h3 className="text-sm font-semibold text-foreground">Respuestas Automaticas & Horarios</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Mensajes de bienvenida y atencion cuando las vendedoras no estan conectadas.
        </p>
      </div>

      <ToggleSwitch
        checked={Boolean(config.autoReplyEnabled)}
        onToggle={() => onChange({ ...config, autoReplyEnabled: !config.autoReplyEnabled })}
        label="Respuesta automatica de bienvenida"
        description="Contesta al instante cuando una clienta escribe por primera vez."
      />

      <div className="space-y-3 pt-2">
        <div>
          <label
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            htmlFor="cfg-welcome"
          >
            Mensaje de Bienvenida
          </label>
          <textarea
            id="cfg-welcome"
            rows={2}
            value={config.welcomeMessage}
            onChange={(e) => onChange({ ...config, welcomeMessage: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
          />
        </div>

        <div>
          <label
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            htmlFor="cfg-away"
          >
            Mensaje Fuera de Horario
          </label>
          <textarea
            id="cfg-away"
            rows={2}
            value={config.awayMessage || ""}
            onChange={(e) => onChange({ ...config, awayMessage: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
