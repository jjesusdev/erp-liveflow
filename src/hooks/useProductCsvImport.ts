"use client";

import { useCallback, useState } from "react";

export interface ParsedProductCsvRow {
  name: string;
  price: number;
  category: string;
  stock: number;
  description: string;
}

export interface UseProductCsvImportOptions {
  onError: (message: string | null) => void;
  onImported: () => void;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

/** Parsea el CSV pegado en el modal: Nombre, Precio, Categoría, Stock y Descripción. */
export function parseProductCsv(csv: string): ParsedProductCsvRow[] {
  const lines = csv.trim().split("\n");
  const parsedProducts: ParsedProductCsvRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || (i === 0 && line.toLowerCase().includes("nombre"))) continue; // Saltar cabecera

    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length >= 2) {
      parsedProducts.push({
        name: cols[0],
        price: parseFloat(cols[1]),
        category: cols[2] || "Prendas",
        stock: parseInt(cols[3], 10) || 10,
        description: cols[4] || "",
      });
    }
  }

  return parsedProducts;
}

export function useProductCsvImport({ onError, onImported }: UseProductCsvImportOptions) {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleImportCsv = useCallback(async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    onError(null);

    try {
      const parsedProducts = parseProductCsv(csvText);

      if (parsedProducts.length === 0) {
        throw new Error(
          "No se detectaron filas válidas en el formato Nombre, Precio, Categoría, Stock"
        );
      }

      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: parsedProducts }),
      });

      const data = (await res.json()) as { error?: string; importedCount?: number };
      if (!res.ok) throw new Error(data?.error || "Error importando catálogo");

      setSuccessToast(`🎉 ¡${data.importedCount} productos importados correctamente!`);
      setShowImportModal(false);
      setCsvText("");
      setTimeout(() => setSuccessToast(null), 4000);
      onImported();
    } catch (err) {
      onError(getErrorMessage(err, "Error en la importación masiva"));
    } finally {
      setImporting(false);
    }
  }, [csvText, onError, onImported]);

  return {
    csvText,
    setCsvText,
    importing,
    successToast,
    showImportModal,
    setShowImportModal,
    handleImportCsv,
  };
}
