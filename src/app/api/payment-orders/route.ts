import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { resolveOperatorId } from '@/lib/operator';

async function createMercadoPagoPreference({
  amount,
  concept,
  paymentOrderId,
  leadPhone,
}: {
  amount: number;
  concept: string;
  paymentOrderId: string;
  leadPhone?: string | null;
}) {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken || accessToken.includes('xxx')) {
    return null;
  }

  try {
    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: [
          {
            title: concept,
            quantity: 1,
            currency_id: 'MXN',
            unit_price: amount,
          },
        ],
        external_reference: paymentOrderId,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/caja?paid=${paymentOrderId}`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/caja?pending=${paymentOrderId}`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/caja?failure=${paymentOrderId}`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/webhooks/mercadopago`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id as string,
      url:
        (response.data.sandbox_init_point as string) ||
        (response.data.init_point as string),
    };
  } catch (error: any) {
    console.error('Error creando preferencia de MercadoPago:', error?.response?.data || error);
    return null;
  }
}

function normalizeProvider(raw?: string | null): 'TRANSFER' | 'MERCADOPAGO' | 'CASH' | 'STRIPE' | 'PAYPAL' {
  if (!raw) return 'TRANSFER';
  const upper = String(raw).toUpperCase().trim();
  if (upper === 'TRANSFERENCIA' || upper === 'TRANSFER') return 'TRANSFER';
  if (upper === 'MERCADOPAGO' || upper === 'MERCADO_PAGO' || upper === 'MP') return 'MERCADOPAGO';
  if (upper === 'CASH' || upper === 'EFECTIVO') return 'CASH';
  if (upper === 'STRIPE') return 'STRIPE';
  if (upper === 'PAYPAL') return 'PAYPAL';
  return 'TRANSFER';
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
  const greeting = leadName ? `¡Hola ${leadName}!` : '¡Hola!';
  const formattedAmount = `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const refCode = orderId.slice(0, 8).toUpperCase();

  const lines = [
    `${greeting} Aquí tienes los datos para realizar tu pago por transferencia:`,
    '',
    `📌 *Concepto / Pedido:* ${concept}`,
    `💰 *Monto a pagar:* ${formattedAmount}`,
    `🔖 *Referencia / Folio:* ${refCode}`,
    '',
    '🏦 *DATOS BANCARIOS:*',
  ];

  if (config.bankName) lines.push(`• *Banco:* ${config.bankName}`);
  if (config.bankBeneficiary) lines.push(`• *Titular:* ${config.bankBeneficiary}`);
  if (config.bankClabe) lines.push(`• *CLABE interbancaria:* ${config.bankClabe}`);
  if (config.bankAccountNumber) lines.push(`• *Número de cuenta:* ${config.bankAccountNumber}`);
  if (config.bankNotes) lines.push(`• *Notas:* ${config.bankNotes}`);

  lines.push('');
  lines.push('📸 *Por favor envía tu comprobante de pago por este mismo chat para procesar tu pedido.*');

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, amount, concept, provider: rawProvider } = body;

    if (!conversationId || !amount || !concept) {
      return NextResponse.json(
        { error: 'Faltan datos del cobro' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Monto invalido' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { lead: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversacion no encontrada' },
        { status: 404 }
      );
    }

    const resolvedProvider = normalizeProvider(rawProvider);
    const createdById = await resolveOperatorId(body.operatorId);

    // Si hay una sesión de Live activa en este momento, vinculamos la orden automáticamente
    const activeLive = await prisma.liveSession.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    });

    // Si es transferencia bancaria, leemos la configuracion del negocio
    const businessConfig = await prisma.businessConfig.findFirst();

    // Apartado exprés en Live Shopping: expira en 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        conversationId,
        leadId: conversation.leadId,
        liveSessionId: activeLive?.id || null,
        amount: numericAmount,
        currency: businessConfig?.currency || 'MXN',
        concept,
        createdById,
        provider: resolvedProvider,
        status: 'PENDING',
        expiresAt,
      },
    });

    let whatsappSent = false;
    let transferDetails: any = null;
    let link: { id: string; url: string } | null = null;

    if (resolvedProvider === 'TRANSFER') {
      const hasBankData = Boolean(
        businessConfig &&
          (businessConfig.bankName ||
            businessConfig.bankBeneficiary ||
            businessConfig.bankClabe ||
            businessConfig.bankAccountNumber)
      );

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
          const jid = `${conversation.lead.phone.replace(/\D/g, '')}@s.whatsapp.net`;
          await client.sendMessage(jid, { text: transferMessage });
          whatsappSent = true;

          // Registrar el mensaje saliente en la conversación
          const outboundMsg = await prisma.message.create({
            data: {
              conversationId,
              direction: 'OUTBOUND',
              type: 'TEXT',
              content: transferMessage,
              sentAt: new Date(),
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              status: 'AWAITING_PAYMENT',
              lastMessageAt: outboundMsg.sentAt,
            },
          });

          const io = (global as any).io;
          if (io) {
            io.emit('message:new', outboundMsg);
          }
        } catch (error) {
          console.error('Error enviando datos de transferencia por WhatsApp:', error);
        }
      } else {
        // Si no se pudo enviar por WhatsApp directo, actualizamos estado de conversación a AWAITING_PAYMENT
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'AWAITING_PAYMENT' },
        }).catch(() => undefined);
      }

      const updatedStatus = whatsappSent ? 'SENT' : 'PENDING';
      const updated = await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: updatedStatus,
          sentAt: whatsappSent ? new Date() : null,
        },
        include: { lead: true },
      });

      const io = (global as any).io;
      if (io) {
        io.emit('payment:updated', {
          ...updated,
          amount: Number(updated.amount),
        });
      }

      return NextResponse.json({
        ...updated,
        amount: Number(updated.amount),
        whatsappSent,
        transferDetails,
      });
    }

    if (resolvedProvider === 'MERCADOPAGO') {
      link = await createMercadoPagoPreference({
        amount: numericAmount,
        concept,
        paymentOrderId: paymentOrder.id,
        leadPhone: conversation.lead?.phone,
      });

      if (link?.url) {
        const client = (global as any).whatsappClient;
        if (client && conversation.lead?.phone) {
          try {
            const jid = `${conversation.lead.phone.replace(/\D/g, '')}@s.whatsapp.net`;
            await client.sendMessage(
              jid,
              {
                text: `¡Hola ${conversation.lead.name || ''}! Tu pedido "${concept}" por $${numericAmount} MXN. Paga aquí: ${link.url}`,
              }
            );
            whatsappSent = true;
          } catch (error) {
            console.error('Error enviando link por WhatsApp:', error);
          }
        }

        const updated = await prisma.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            providerLinkId: link.id,
            providerLinkUrl: link.url,
            status: 'SENT',
            sentAt: new Date(),
          },
          include: { lead: true },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'AWAITING_PAYMENT' },
        }).catch(() => undefined);

        const io = (global as any).io;
        if (io) {
          io.emit('payment:updated', {
            ...updated,
            amount: Number(updated.amount),
          });
        }

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
  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json({ error: 'Error creating payment order' }, { status: 500 });
  }
}
