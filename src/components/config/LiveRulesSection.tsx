"use client";

import { ToggleSwitch } from "./ToggleSwitch";
import type { BusinessConfig } from "@/types";

interface LiveRulesSectionProps {
  config: BusinessConfig;
  onChange: (config: BusinessConfig) => void;
}

export function LiveRulesSection({ config, onChange }: LiveRulesSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-xs max-w-2xl">
      <div className="border-b border-border pb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Temporizador & Expiracion de Apartados
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Evita retener inventario con clientas que no transfieren a tiempo durante las
          transmisiones.
        </p>
      </div>

      <ToggleSwitch
        checked={Boolean(config.autoExpireOrders)}
        onToggle={() => onChange({ ...config, autoExpireOrders: !config.autoExpireOrders })}
        label="Expiracion automatica de apartados"
        description="El sistema libera automaticamente la prenda si no se aprueba el pago dentro del tiempo limite."
      />

      {config.autoExpireOrders && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              htmlFor="cfg-exp-min"
            >
              Minutos de tolerancia para transferir
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="cfg-exp-min"
                type="number"
                min="5"
                max="120"
                value={config.orderExpirationMinutes || 30}
                onChange={(e) =>
                  onChange({
                    ...config,
                    orderExpirationMinutes: parseInt(e.target.value, 10) || 30,
                  })
                }
                className="h-8 w-24 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <span className="text-xs text-muted-foreground font-medium">minutos</span>
            </div>
          </div>

          <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
            Al cumplirse los {config.orderExpirationMinutes || 30} min, la prenda vuelve a estar
            disponible para la venta en el Live.
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <ToggleSwitch
          checked={Boolean(config.soundAlertsEnabled)}
          onToggle={() => onChange({ ...config, soundAlertsEnabled: !config.soundAlertsEnabled })}
          label="Alertas sonoras de cobro en vivo"
          description="Reproduce un aviso sonoro discreto al recibir un comprobante de pago."
        />
      </div>
    </div>
  );
}
