'use client';

import { Sparkles } from 'lucide-react';

interface SweepModalProps {
  discount: string;
  onDiscountChange: (v: string) => void;
  running: boolean;
  onExecute: () => void;
  onClose: () => void;
}

export function SweepModal({ discount, onDiscountChange, running, onExecute, onClose }: SweepModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <h3 className="text-base font-bold">Barrido de Carritos Post-Live</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Envia un recordatorio masivo por WhatsApp a todas las clientas con apartados pendientes
          o vencidos para cerrar ventas antes de regresar el inventario al stock general.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold">Ofrecer Descuento Especial de Cierre (Opcional)</label>
            <div className="relative mt-1">
              <input
                type="number"
                min="0"
                max="50"
                value={discount}
                onChange={(e) => onDiscountChange(e.target.value)}
                placeholder="0"
                className="w-full rounded-md border py-1.5 pl-3 pr-8 text-xs bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {parseInt(discount, 10) > 0
                ? `Se aplicara un ${discount}% de descuento en el mensaje para incentivar el pago inmediato.`
                : 'Se enviara un recordatorio estandar de confirmacion de pedido.'}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onExecute}
              disabled={running}
              className="flex-1 rounded-md bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {running ? 'Enviando...' : 'Lanzar Barrido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
