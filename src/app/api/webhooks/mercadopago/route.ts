import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayment, verifyWebhookSignature } from "@/lib/payments/mercadopago";
import { markPaymentAsPaid } from "@/services/PaymentService";
import { getIO } from "@/lib/realtime/events";

const webhookSchema = z.object({
  type: z.string(),
  action: z.string(),
  data: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
});

/** Webhook de MercadoPago: valida firma, verifica el pago y lo concilia de forma idempotente. */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const body = parsed.data;

  if (body.type !== "payment" || body.action !== "payment.created" || !body.data?.id) {
    return NextResponse.json({ received: true });
  }

  const paymentId = String(body.data.id);
  const signatureHeader = req.headers.get("x-signature");
  const ts = signatureHeader?.match(/\bts:(\d+)\b/)?.[1] ?? null;
  if (
    !verifyWebhookSignature({
      signature: signatureHeader,
      requestId: req.headers.get("x-request-id"),
      paymentId,
      ts,
    })
  ) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    const mpPayment = await getPayment(paymentId);
    if (mpPayment.status !== "approved" || !mpPayment.external_reference) {
      return NextResponse.json({ received: true });
    }

    const result = await markPaymentAsPaid(mpPayment.external_reference, {
      mpPaymentId: paymentId,
    });

    if (result.status === "not_found") {
      return NextResponse.json({ error: "Payment order not found" }, { status: 404 });
    }
    if (result.status === "already_paid") {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    const { order, conversation, shipment } = result;
    const io = getIO();
    if (io) {
      io.emit("payment:confirmed", { id: order.id, status: order.status });
      io.emit("payment:updated", { ...order, amount: Number(order.amount) });
      io.emit("conversation:updated", conversation);
      io.emit("shipment:created", shipment);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Error processing webhook" }, { status: 500 });
  }
}
