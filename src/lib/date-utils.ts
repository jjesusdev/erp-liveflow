import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALES: Record<string, string> = {
  CLP: "es-CL",
  USD: "en-US",
  EUR: "de-DE",
  ARS: "es-AR",
  MXN: "es-MX",
};

const CURRENCY_DECIMALS: Record<string, number> = {
  CLP: 0,
  USD: 2,
  EUR: 2,
  ARS: 2,
  MXN: 2,
};

export function formatCurrency(amount: number, currency: string = "CLP"): string {
  const locale = CURRENCY_LOCALES[currency] || "es-CL";
  const decimals = CURRENCY_DECIMALS[currency] ?? 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm", { locale: es });
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}
