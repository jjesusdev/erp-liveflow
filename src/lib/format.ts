import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

/** Utilidad canónica de clases Tailwind (antes duplicada en lib/utils.ts y lib/date-utils.ts). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SUPPORTED_CURRENCIES = {
  CLP: { locale: "es-CL", symbol: "$", decimals: 0 },
  USD: { locale: "en-US", symbol: "US$", decimals: 2 },
  EUR: { locale: "de-DE", symbol: "€", decimals: 2 },
  ARS: { locale: "es-AR", symbol: "$", decimals: 2 },
  MXN: { locale: "es-MX", symbol: "$", decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = "CLP";

let currentCurrency: CurrencyCode = DEFAULT_CURRENCY;

export function setCurrency(code: string) {
  if (code in SUPPORTED_CURRENCIES) {
    currentCurrency = code as CurrencyCode;
  }
}

export function getCurrency(): CurrencyCode {
  return currentCurrency;
}

/** Formato monetario canónico. La moneda se resuelve desde la configuración de negocio. */
export function money(amount: number, currency?: CurrencyCode): string {
  const code = currency || currentCurrency;
  const cfg = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.CLP;
  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(amount);
  return `${cfg.symbol}${formatted}`;
}

/** Alias semántico usado por reportes/caja; mantiene un único motor de formato. */
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return money(amount, (currency in SUPPORTED_CURRENCIES ? currency : DEFAULT_CURRENCY) as CurrencyCode);
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

export function clock(totalSec: number) {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeReference(seed: number) {
  let x = Math.floor(seed) | 0;
  let out = "";
  for (let i = 0; i < 8; i++) {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), x | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out += ALPHABET[((t ^ (t >>> 14)) >>> 0) % ALPHABET.length];
  }
  return out;
}

/** Normaliza un teléfono preservando el '+' inicial (antes duplicado en 2 API routes). */
export function normalizePhone(raw: string): string | null {
  const plus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return (plus ? "+" : "") + digits;
}

/** JID de WhatsApp a partir de un teléfono (evita repetir el regex en ~17 handlers). */
export function toWhatsAppJid(phone: string): string {
  return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
}
