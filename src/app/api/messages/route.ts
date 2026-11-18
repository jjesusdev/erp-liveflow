import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { messageCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";
import { getIO } from "@/lib/realtime/events";
import { toWhatsAppJid } from "@/lib/format";

export const GET = apiHandler({
  handler: async (req) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { ...whereOrg(orgId), id: conversationId },
      select: { status: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { ...whereOrg(orgId), conversationId },
      orderBy: { sentAt: "asc" },
    });

    // Enriquecemos los mensajes con bandera si son imágenes y hay órdenes pendientes
    const pendingPayment = await prisma.paymentOrder.findFirst({
      where: {
        ...whereOrg(orgId),
        conversationId,
        status: { in: ["PENDING", "SENT"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const isAwaiting = conversation.status === "AWAITING_PAYMENT" || Boolean(pendingPayment);

    const enriched = messages.map((m) => ({
      ...m,
      isPossibleReceipt: m.type === "IMAGE" && m.direction === "INBOUND" && isAwaiting,
      pendingPaymentOrderId: pendingPayment?.id || null,
    }));

    return NextResponse.json(enriched);
  },
});

export const POST = apiHandler({
  body: messageCreateSchema,
  handler: async (_req, body) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const { conversationId, content, mediaUrl, type = "TEXT" } = body;
    const mediaType = body.mediaType !== undefined ? body.mediaType : "image/jpeg";

    if (!conversationId || (!content?.trim() && !mediaUrl)) {
      return NextResponse.json({ error: "Faltan datos del mensaje" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { ...whereOrg(orgId), id: conversationId },
      include: { lead: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversacion no encontrada" }, { status: 404 });
    }

    const client = (global as any).whatsappClient;
    let whatsappMsgId: string | null = null;
    let delivered = false;

    if (client) {
      try {
        const jid = toWhatsAppJid(conversation.lead.phone);
        if (type === "IMAGE" && mediaUrl) {
          // Envío de imagen por Baileys (URL o Base64 Data URL)
          const isBase64 = mediaUrl.startsWith("data:image");
          const buffer = isBase64
            ? Buffer.from(mediaUrl.split(",")[1], "base64")
            : { url: mediaUrl };

          const sent = await client.sendMessage(jid, {
            image: buffer,
            caption: content || undefined,
          });
          whatsappMsgId = sent?.key?.id ?? null;
          delivered = true;
        } else {
          const sent = await client.sendMessage(jid, { text: content });
          whatsappMsgId = sent?.key?.id ?? null;
          delivered = true;
        }
      } catch (error) {
        console.error("Error enviando mensaje por WhatsApp:", error);
      }
    }

    const message = await prisma.message.create({
      data: {
        orgId,
        conversationId,
        direction: "OUTBOUND",
        type: type === "IMAGE" ? "IMAGE" : "TEXT",
        content: content || null,
        mediaUrl: mediaUrl || null,
        mediaType: type === "IMAGE" ? mediaType : null,
        whatsappMsgId,
        sentAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { ...whereOrg(orgId), id: conversationId },
      data: {
        lastMessageAt: message.sentAt,
        status: conversation.status === "NEW" ? "ATTENTION" : conversation.status,
      },
    });

    getIO()?.emit("message:new", message);
    getIO()?.emit("conversation:updated", {
      id: conversationId,
      lastMessageAt: message.sentAt,
    });

    return NextResponse.json({ ...message, delivered });
  },
});
