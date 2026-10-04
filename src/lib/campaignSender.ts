import { prisma } from './prisma';

const running = new Set<string>();

// Pausa dinámica con jitter para evitar detección de spam y bloqueos en envíos masivos de Live
function getRandomDelay(baseMs = 2500, jitterMs = 1500) {
  return baseMs + Math.floor(Math.random() * jitterMs);
}

function getIo() {
  return (globalThis as any).io;
}

function getWhatsapp() {
  return (globalThis as any).whatsappClient;
}

async function emitUpdate(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (campaign) getIo()?.emit('campaign:updated', campaign);
}

export function isSendingCampaign(campaignId: string) {
  return running.has(campaignId);
}

/**
 * Reemplaza variables en el mensaje de la campaña (ej: {{nombre}}, {{telefono}})
 */
function interpolateMessage(template: string, lead: { name?: string | null; phone: string }) {
  let result = template;
  const clientName = lead.name?.trim() || 'Amiga';
  result = result.replace(/\{\{nombre\}\}/gi, clientName);
  result = result.replace(/\{\{name\}\}/gi, clientName);
  result = result.replace(/\{\{telefono\}\}/gi, lead.phone);
  result = result.replace(/\{\{phone\}\}/gi, lead.phone);
  return result;
}

/**
 * Prepara y lanza el envio de una campana en background. Devuelve rapido con
 * { started: true } o un error si la campana no es enviable.
 */
export async function sendCampaign(
  campaignId: string
): Promise<{ started: boolean; error?: string }> {
  if (running.has(campaignId)) {
    return { started: false, error: 'La campana ya se esta enviando' };
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { started: false, error: 'Campana no encontrada' };

  if (!['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(campaign.status)) {
    return {
      started: false,
      error: `No se puede enviar una campana en estado ${campaign.status}`,
    };
  }

  if (!getWhatsapp()) {
    return { started: false, error: 'WhatsApp no esta conectado' };
  }

  // Destinatarios: los leads existentes que todavia no tengan registro.
  const leads = await prisma.lead.findMany({ select: { id: true, phone: true } });
  if (leads.length === 0) {
    return { started: false, error: 'No hay clientes para enviar' };
  }

  const existing = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { leadId: true },
  });
  const already = new Set(existing.map((r) => r.leadId));
  const missing = leads.filter((lead) => !already.has(lead.id));

  if (missing.length > 0) {
    await prisma.campaignRecipient.createMany({
      data: missing.map((lead) => ({ campaignId, leadId: lead.id, status: 'PENDING' })),
      skipDuplicates: true,
    });
  }

  const totalLeads = await prisma.campaignRecipient.count({ where: { campaignId } });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'SENDING', totalLeads, sentCount: 0, failedCount: 0 },
  });
  await prisma.campaignRecipient.updateMany({
    where: { campaignId, status: { in: ['SENT', 'DELIVERED', 'READ'] } },
    data: { status: 'PENDING', sentAt: null },
  });

  running.add(campaignId);
  void runSendLoop(campaignId);

  return { started: true };
}

export async function cancelCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: 'Campana no encontrada' };

  if (campaign.status === 'SENDING' || campaign.status === 'SCHEDULED') {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });
    await emitUpdate(campaignId);
    return { ok: true };
  }

  if (campaign.status === 'DRAFT') {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });
    await emitUpdate(campaignId);
    return { ok: true };
  }

  return { ok: false, error: 'Esta campana ya no se puede cancelar' };
}

async function runSendLoop(campaignId: string) {
  try {
    const client = getWhatsapp();
    if (!client) throw new Error('WhatsApp se desconecto antes de enviar');

    let finished = false;

    while (!finished) {
      // Relee el estado en cada pasada: asi la cancelacion corta el loop.
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign || campaign.status === 'CANCELLED') break;

      const pending = await prisma.campaignRecipient.findFirst({
        where: { campaignId, status: 'PENDING' },
        include: { lead: true },
      });

      if (!pending) {
        finished = true;
        break;
      }

      const phone = pending.lead?.phone?.replace(/\D/g, '');
      if (!phone) {
        await prisma.campaignRecipient.update({
          where: { id: pending.id },
          data: { status: 'FAILED', errorMessage: 'Telefono invalido' },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
        await emitUpdate(campaignId);
        continue;
      }

      try {
        const personalizedMessage = interpolateMessage(campaign.message, {
          name: pending.lead?.name,
          phone: pending.lead?.phone || phone,
        });

        await client.sendMessage(`${phone}@s.whatsapp.net`, {
          text: personalizedMessage,
        });

        await prisma.campaignRecipient.update({
          where: { id: pending.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });
      } catch (error: any) {
        console.error('[campaigns] fallo el envio a', phone, error?.message || error);
        await prisma.campaignRecipient.update({
          where: { id: pending.id },
          data: {
            status: 'FAILED',
            errorMessage: String(error?.message || 'Error desconocido').slice(0, 300),
          },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      await emitUpdate(campaignId);

      // Pausa aleatoria anti-bloqueo entre envíos para simular comportamiento humano
      const delay = getRandomDelay(2200, 1800);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const stillSending = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (stillSending?.status === 'SENDING') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }
    await emitUpdate(campaignId);
  } catch (error) {
    console.error('[campaigns] error en el loop de envio:', error);
    await prisma.campaign
      .update({
        where: { id: campaignId },
        data: { status: 'CANCELLED' },
      })
      .catch(() => undefined);
    await emitUpdate(campaignId);
  } finally {
    running.delete(campaignId);
  }
}

/**
 * Procesa campanas programadas cuya fecha ya paso. Se llama desde el scheduler
 * del server.
 */
export async function processScheduledCampaigns() {
  const due = await prisma.campaign.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    select: { id: true },
  });

  for (const { id } of due) {
    const result = await sendCampaign(id);
    if (!result.started) {
      console.warn(`[campaigns] no se pudo iniciar ${id}:`, result.error);
    }
  }

  return due.length;
}
