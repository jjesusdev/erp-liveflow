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

export function money(amount: number, currency?: CurrencyCode): string {
  const code = currency || currentCurrency;
  const cfg = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.CLP;
  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(amount);
  return `${cfg.symbol}${formatted}`;
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
