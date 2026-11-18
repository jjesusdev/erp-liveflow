import { money, type CurrencyCode } from "@/lib/format";

export type ChargeMode = "simple" | "bolsa";
export type ChargeMethod = "transferencia" | "mercadopago";
export type PaymentProvider = "TRANSFER" | "MERCADOPAGO" | "CASH";

export interface ChargeItem {
  name: string;
  price: number;
}

export interface BankDetails {
  bankName?: string | null;
  bankBeneficiary?: string | null;
  bankClabe?: string | null;
  bankAccountNumber?: string | null;
  bankNotes?: string | null;
}

export interface ChargeInput {
  mode: ChargeMode;
  concept: string;
  amount: number;
  shipping: number;
  items: ChargeItem[];
}

export interface ChargePreviewInput extends ChargeInput {
  method: ChargeMethod;
  firstName: string;
  reference: string;
  currency: CurrencyCode;
  bank?: BankDetails | null;
}

const METHOD_TO_PROVIDER: Record<ChargeMethod, PaymentProvider> = {
  transferencia: "TRANSFER",
  mercadopago: "MERCADOPAGO",
};

export function providerForMethod(method: ChargeMethod): PaymentProvider {
  return METHOD_TO_PROVIDER[method];
}

/** Totales puros del cobro: evita que cada modal implemente la suma. */
export function calculateChargeTotals(
  input: Pick<ChargeInput, "mode" | "amount" | "shipping" | "items">
) {
  const subtotal =
    input.mode === "simple"
      ? Math.max(0, input.amount) || 0
      : input.items.reduce((sum, item) => sum + item.price, 0);
  const shipping = input.mode === "bolsa" ? Math.max(0, input.shipping) || 0 : 0;
  return { subtotal, shipping, total: subtotal + shipping };
}

/** Concepto canónico enviado a la API y usado en el mensaje de WhatsApp. */
export function buildChargeConcept(input: ChargeInput): string {
  if (input.mode === "simple") return input.concept.trim();
  const names = input.items.map((item) => item.name).join(" + ");
  return input.shipping > 0 ? `${names} (+ Envío $${input.shipping})` : names;
}

/**
 * Vista previa del mensaje de WhatsApp. Los datos bancarios vienen de BusinessConfig,
 * nunca de literales en el componente (antes BBVA/CLABE hardcodeados).
 */
export function buildChargePreview(input: ChargePreviewInput): string {
  const { total } = calculateChargeTotals(input);
  const amountLabel = money(total, input.currency);
  const header = `¡Hola ${input.firstName}! Tu total es ${amountLabel} ${input.currency}.`;

  if (input.method === "mercadopago") {
    return `${header}\n\nPaga con tarjeta aquí:\nmpago.la/lf-${input.reference.toLowerCase()}\n\nReferencia: ${input.reference}`;
  }

  const bank = input.bank ?? {};
  const lines = [header, ""];
  if (bank.bankName)
    lines.push(`${bank.bankName}${bank.bankClabe ? ` · CLABE ${bank.bankClabe}` : ""}`);
  if (bank.bankBeneficiary) lines.push(`A nombre de: ${bank.bankBeneficiary}`);
  if (bank.bankAccountNumber && !bank.bankClabe) lines.push(`Cuenta: ${bank.bankAccountNumber}`);
  lines.push(`Referencia: ${input.reference}`);
  if (bank.bankNotes) lines.push(bank.bankNotes);
  lines.push("", "Envíame tu comprobante aquí y tu pedido queda confirmado 💛");
  return lines.join("\n");
}
