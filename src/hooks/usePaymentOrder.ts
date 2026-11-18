"use client";

import { useCallback, useState } from "react";
import type { PaymentProvider } from "@/lib/payments/charge";

export interface CreatedPayment {
  id: string;
  provider: string;
  providerLinkUrl?: string | null;
  status: string;
  whatsappSent: boolean;
  linkGenerated?: boolean;
  transferDetails?: {
    bankName?: string | null;
    bankBeneficiary?: string | null;
    bankClabe?: string | null;
    bankAccountNumber?: string | null;
    bankNotes?: string | null;
    reference: string;
    amount: number;
    currency: string;
    concept: string;
    message?: string;
  } | null;
}

export interface CreatePaymentInput {
  conversationId: string;
  amount: number;
  concept: string;
  provider: PaymentProvider;
}

/** Único punto de creación de órdenes de cobro, compartido por ambos modales. */
export function usePaymentOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CreatedPayment | null>(null);

  const createOrder = useCallback(
    async (input: CreatePaymentInput): Promise<CreatedPayment | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/payment-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se pudo generar el cobro");
        setOrder(data as CreatedPayment);
        return data as CreatedPayment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo generar el cobro";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setOrder(null);
    setError(null);
    setLoading(false);
  }, []);

  return { loading, error, order, createOrder, reset };
}
