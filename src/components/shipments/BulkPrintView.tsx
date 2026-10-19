"use client";

import { Button } from "@/components/ui/button";
import type { Shipment } from "@/types";

interface BulkPrintViewProps {
  shipments: Shipment[];
  selectedIds: string[];
  onClose: () => void;
}

export function BulkPrintView({ shipments, selectedIds, onClose }: BulkPrintViewProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-8 text-black">
      <div className="no-print mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-bold">Impresion Masiva ({selectedIds.length} Etiquetas)</h2>
        <Button variant="default" size="sm" onClick={onClose}>
          Cerrar Vista de Impresion
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {shipments
          .filter((s) => selectedIds.includes(s.id))
          .map((s) => (
            <div
              key={s.id}
              className="space-y-2.5 break-inside-avoid rounded-xl border-2 border-dashed border-black p-4"
            >
              <div className="flex items-start justify-between border-b border-black pb-1.5">
                <div>
                  <h3 className="text-xs font-black uppercase">LIVEFLOW BOUTIQUE</h3>
                  <p className="text-[11px]">
                    Destino: <strong>{s.lead?.name || s.lead?.phone}</strong>
                  </p>
                  <p className="text-[11px]">
                    Tel: <strong>{s.lead?.phone}</strong>
                  </p>
                </div>
                <span className="rounded border border-black px-1.5 py-0.5 text-xs font-bold">
                  {s.paymentOrder?.id?.slice(0, 8)?.toUpperCase() || "REF-LIVE"}
                </span>
              </div>

              <div className="space-y-0.5 text-xs">
                <p className="font-bold">
                  {s.lead?.addressStreet} {s.lead?.addressNumber}
                </p>
                <p>
                  {s.lead?.addressColonia ? `Comuna ${s.lead.addressColonia}, ` : ""}
                  {s.lead?.addressCity} {s.lead?.addressState}
                </p>
                <p className="font-bold">CP: {s.lead?.addressZipCode || "N/A"}</p>
                {s.lead?.addressNotes && (
                  <p className="mt-1 rounded bg-gray-100 p-1 text-[10px] italic">
                    Ref: {s.lead.addressNotes}
                  </p>
                )}
              </div>

              <div className="flex justify-between border-t border-black pt-1.5 text-[11px]">
                <span>
                  Prendas: <strong>{s.paymentOrder?.concept}</strong>
                </span>
                <span>
                  Metodo: <strong>{s.carrier || s.carrierRef?.name || "Retiro en tienda"}</strong>
                </span>
              </div>

              {s.trackingNumber && (
                <p className="text-[10px] tracking-widest">GUÍA: {s.trackingNumber}</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
