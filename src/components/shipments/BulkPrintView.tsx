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
    <div className="fixed inset-0 z-50 bg-white text-black p-8 overflow-y-auto">
      <div className="no-print flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="font-bold text-lg">Impresion Masiva ({selectedIds.length} Etiquetas)</h2>
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
              className="rounded-xl border-2 border-dashed border-black p-4 space-y-2.5 break-inside-avoid"
            >
              <div className="flex justify-between items-start border-b border-black pb-1.5">
                <div>
                  <h3 className="font-black text-xs uppercase">LIVEFLOW BOUTIQUE</h3>
                  <p className="text-[11px]">
                    Destino: <strong>{s.lead?.name || s.lead?.phone}</strong>
                  </p>
                  <p className="text-[11px]">
                    Tel: <strong>{s.lead?.phone}</strong>
                  </p>
                </div>
                <span className="text-xs font-bold border border-black px-1.5 py-0.5 rounded">
                  {s.paymentOrder?.id?.slice(0, 8)?.toUpperCase() || "REF-LIVE"}
                </span>
              </div>

              <div className="text-xs space-y-0.5">
                <p className="font-bold">
                  {s.lead?.addressStreet} {s.lead?.addressNumber}
                </p>
                <p>
                  {s.lead?.addressColonia ? `Col. ${s.lead.addressColonia}, ` : ""}
                  {s.lead?.addressCity} {s.lead?.addressState}
                </p>
                <p className="font-bold">CP: {s.lead?.addressZipCode || "N/A"}</p>
                {s.lead?.addressNotes && (
                  <p className="italic text-[10px] bg-gray-100 p-1 rounded mt-1">
                    Ref: {s.lead.addressNotes}
                  </p>
                )}
              </div>

              <div className="border-t border-black pt-1.5 text-[11px] flex justify-between">
                <span>
                  Prendas: <strong>{s.paymentOrder?.concept}</strong>
                </span>
                <span>
                  Metodo: <strong>{s.carrier || "Estafeta"}</strong>
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
