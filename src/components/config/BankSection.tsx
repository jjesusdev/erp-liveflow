"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/liveflow/primitives";
import { toast } from "sonner";
import type { BusinessConfig } from "@/types";

interface BankSectionProps {
  config: BusinessConfig;
  onChange: (config: BusinessConfig) => void;
}

export function BankSection({ config, onChange }: BankSectionProps) {
  const field = (key: keyof BusinessConfig) => ({
    value: String(config[key] || ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange({ ...config, [key]: e.target.value }),
  });

  const previewTransferMessage = `✨ *Datos para tu Pago / Transferencia* ✨
📦 *Pedido:* Vestido Esmeralda (T. M)
💵 *Monto:* $45.990 CLP
🔖 *Referencia / Concepto:* EXP-8941

🏦 *Banco:* ${config.bankName || "Banco de Chile"}
👤 *Titular:* ${config.bankBeneficiary || "Mi Boutique"}
${config.bankClabe ? `🔢 *RUT:* ${config.bankClabe}` : ""}
${config.bankAccountNumber ? `💳 *Cuenta:* ${config.bankAccountNumber}` : ""}
${config.bankNotes ? `📝 *Nota:* ${config.bankNotes}` : ""}

📸 *Por favor envíanos la captura o foto de tu comprobante por aquí para confirmar tu pedido.*`;

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewTransferMessage);
      toast.success("Texto copiado al portapapeles");
    } catch {
      toast.error("Error al copiar");
    }
  };

  const inputClass =
    "mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Datos de Transferencia Bancaria
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estos datos se insertan automaticamente al generar un cobro express en el chat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass} htmlFor="cfg-bank-name">
                Banco
              </label>
              <input
                id="cfg-bank-name"
                type="text"
                placeholder="Ej: BBVA, Banorte, Nu"
                className={inputClass}
                {...field("bankName")}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="cfg-bank-beneficiary">
                Titular / Beneficiario
              </label>
              <input
                id="cfg-bank-beneficiary"
                type="text"
                placeholder="Ej: LiveFlow Boutique S.A."
                className={inputClass}
                {...field("bankBeneficiary")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="cfg-bank-clabe">
                CLABE Interbancaria (18 digitos)
              </label>
              <input
                id="cfg-bank-clabe"
                type="text"
                placeholder="012 180 0152 3344 9910"
                className={inputClass}
                {...field("bankClabe")}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="cfg-bank-account">
                Numero de Cuenta (Opcional)
              </label>
              <input
                id="cfg-bank-account"
                type="text"
                placeholder="1234567890"
                className={inputClass}
                {...field("bankAccountNumber")}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="cfg-currency">
                Moneda
              </label>
              <select id="cfg-currency" className={`${inputClass} px-2.5`} {...field("currency")}>
                <option value="CLP">CLP - Peso Chileno</option>
                <option value="USD">USD - Dolar Americano</option>
                <option value="EUR">EUR - Euro</option>
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="MXN">MXN - Peso Mexicano</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="cfg-bank-notes">
                Instrucciones adicionales para la clienta
              </label>
              <textarea
                id="cfg-bank-notes"
                rows={2}
                placeholder="Ej: Envía tu captura de pantalla en este chat."
                className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                {...field("bankNotes")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Vista previa del mensaje de WhatsApp</SectionLabel>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyPreview}
            className="h-6 gap-1 text-[11px] text-muted-foreground"
          >
            <Copy className="size-3" /> Copiar
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs relative">
          <div className="rounded-lg bg-zinc-950 p-3.5 text-xs leading-relaxed text-zinc-100 whitespace-pre-wrap border border-zinc-800">
            {previewTransferMessage}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Asi es exactamente como tus clientas leeran los datos en su app de WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
