/** Ventana de páginas compartida por las tablas paginadas. */
export function pageWindow(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const out: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) out.push("gap");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < totalPages - 1) out.push("gap");
  out.push(totalPages);
  return out;
}
