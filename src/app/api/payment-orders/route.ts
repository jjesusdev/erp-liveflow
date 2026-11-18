import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { paymentOrderCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";
import { createPaymentPreference } from "@/lib/payments/mercadopago";
import { getIO } from "@/lib/realtime/events";

function normalizeProvider(
  raw?: string | null
): "TRANSFER" | "MERCADOPAGO" | "CASH" | "STRIPE" | "PAYPAL" {
  if (!raw) return "TRANSFER";
  const upper = String(raw).toUpperCase().trim();
  if (upper === "TRANSFERENCIA" || upper === "TRANSFER") return "TRANSFER";
  if (upper === "MERCADOPAGO" || upper === "MERCADO_PAGO" || upper === "MP") return "MERCADOPAGO";
  if (upper === "CASH" || upper === "EFECTIVO") return "CASH";
  if (upper === "STRIPE") return "STRIPE";
  if (upper === "PAYPAL") return "PAYPAL";
  return "TRANSFER";
}

function buildTransferMessage({
  leadName,
  concept,
  amount,
  currency,
  orderId,
  config,
}: {
  leadName?: string | null;
  concept: string;
  amount: number;
  currency: string;
  orderId: string;
  config: any;
}) {
  const greeting = leadName ? `¡Hola ${leadName}!` : "¡Hola!";
  const formattedAmount = `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const refCode = orderId.slice(0, 8).toUpperCase();

  const lines = [
    `${greeting} Aquí tienes los datos para realizar tu pago por transferencia:`,
    "",
    `📌 *Concepto / Pedido:* ${concept}`,
    `💰 *Monto a pagar:* ${formattedAmount}`,
    `🔖 *Referencia / Folio:* ${refCode}`,
    "",
    "🏦 *DATOS BANCARIOS:*",
  ];

  if (config.bankName) lines.push(`• *Banco:* ${config.bankName}`);
  if (config.bankBeneficiary) lines.push(`• *Titular:* ${config.bankBeneficiary}`);
  if (config.bankClabe) lines.push(`• *CLABE interbancaria:* ${config.bankClabe}`);
  if (config.bankAccountNumber) lines.push(`• *Número de cuenta:* ${config.bankAccountNumber}`);
  if (config.bankNotes) lines.push(`• *Notas:* ${config.bankNotes}`);

  lines.push("");
  lines.push(
    "📸 *Por favor envía tu comprobante de pago por este mismo chat para procesar tu pedido.*"
  );

  return lines.join("\n");
}

export const POST = apiHandler({
  body: paymentOrderCreateSchema,
  handler: async (_req, body) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { operatorId, orgId } = ctx;

    const { conversationId, concept, provider: rawProvider } = body;
    const numericAmount = body.amount;

    const conversation = await prisma.conversation.findUnique({
      where: { ...whereOrg(orgId), id: conversationId },
      include: { lead: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
    }

    const resolvedProvider = normalizeProvider(rawProvider);

    // Si hay una sesión de Live activa en este momento, vinculamos la orden automáticamente
    const activeLive = await prisma.liveSession.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });

    // Si es transferencia bancaria, leemos la configuracion del negocio desde Organization.settings
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const businessConfig = (org?.settings as any) ?? {};

    // Apartado exprés en Live Shopping: expira en 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        conversationId,
        leadId: conversation.leadId,
        liveSessionId: activeLive?.id || null,
        amount: numericAmount,
        currency: businessConfig?.currency || "MXN",
        concept,
        createdById: operatorId,
        orgId,
        provider: resolvedProvider,
        status: "PENDING",
        expiresAt,
      },
    });

    let whatsappSent = false;
    let transferDetails: any = null;
    let link: { id: string; url: string } | null = null;

    if (resolvedProvider === "TRANSFER") {
      transferDetails = {
        bankName: businessConfig?.bankName || null,
        bankBeneficiary: businessConfig?.bankBeneficiary || null,
        bankClabe: businessConfig?.bankClabe || null,
        bankAccountNumber: businessConfig?.bankAccountNumber || null,
        bankNotes: businessConfig?.bankNotes || null,
        reference: paymentOrder.id.slice(0, 8).toUpperCase(),
        amount: numericAmount,
        currency: paymentOrder.currency,
        concept,
      };

      const transferMessage = buildTransferMessage({
        leadName: conversation.lead?.name,
        concept,
        amount: numericAmount,
        currency: paymentOrder.currency,
        orderId: paymentOrder.id,
        config: businessConfig || {},
      });

      const client = (global as any).whatsappClient;
      if (client && conversation.lead?.phone) {
        try {
          const jid = `${conversation.lead.phone.replace(/\D/g, "")}@s.whatsapp.net`;
          await client.sendMessage(jid, { text: transferMessage });
          whatsappSent = true;

          // Registrar el mensaje saliente en la conversación
          const outboundMsg = await prisma.message.create({
            data: {
              conversationId,
              direction: "OUTBOUND",
              type: "TEXT",
              content: transferMessage,
              sentAt: new Date(),
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              status: "AWAITING_PAYMENT",
              lastMessageAt: outboundMsg.sentAt,
            },
          });

          getIO()?.emit("message:new", outboundMsg);
        } catch (error) {
          console.error("Error enviando datos de transferencia por WhatsApp:", error);
        }
      } else {
        // Si no se pudo enviar por WhatsApp directo, actualizamos estado de conversación a AWAITING_PAYMENT
        await prisma.conversation
          .update({
            where: { id: conversationId },
            data: { status: "AWAITING_PAYMENT" },
          })
          .catch(() => undefined);
      }

      const updatedStatus = whatsappSent ? "SENT" : "PENDING";
      const updated = await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: updatedStatus,
          sentAt: whatsappSent ? new Date() : null,
        },
        include: { lead: true },
      });

      getIO()?.emit("payment:updated", {
        ...updated,
        amount: Number(updated.amount),
      });

      return NextResponse.json({
        ...updated,
        amount: Number(updated.amount),
        whatsappSent,
        transferDetails,
      });
    }

    if (resolvedProvider === "MERCADOPAGO") {
      const preference = await createPaymentPreference({
        amount: numericAmount,
        concept,
        orderId: paymentOrder.id,
        currency: paymentOrder.currency,
      });
      link = preference ? { id: preference.id, url: preference.url } : null;

      if (link?.url) {
        const client = (global as any).whatsappClient;
        if (client && conversation.lead?.phone) {
          try {
            const jid = `${conversation.lead.phone.replace(/\D/g, "")}@s.whatsapp.net`;
            await client.sendMessage(jid, {
              text: `¡Hola ${conversation.lead.name || ""}! Tu pedido "${concept}" por $${numericAmount} MXN. Paga aquí: ${link.url}`,
            });
            whatsappSent = true;
          } catch (error) {
            console.error("Error enviando link por WhatsApp:", error);
          }
        }

        const updated = await prisma.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            providerLinkId: link.id,
            providerLinkUrl: link.url,
            status: "SENT",
            sentAt: new Date(),
          },
          include: { lead: true },
        });

        await prisma.conversation
          .update({
            where: { id: conversationId },
            data: { status: "AWAITING_PAYMENT" },
          })
          .catch(() => undefined);

        getIO()?.emit("payment:updated", {
          ...updated,
          amount: Number(updated.amount),
        });

        return NextResponse.json({
          ...updated,
          amount: Number(updated.amount),
          whatsappSent,
          linkGenerated: true,
        });
      }
    }

    return NextResponse.json({
      ...paymentOrder,
      amount: Number(paymentOrder.amount),
      whatsappSent: false,
      linkGenerated: Boolean(link?.url),
    });
  },
});
