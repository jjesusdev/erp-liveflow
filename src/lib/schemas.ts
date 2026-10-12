import { z } from "zod";

export const bankConfigSchema = z.object({
  bankName: z.string().max(100).nullable().optional(),
  bankBeneficiary: z.string().max(200).nullable().optional(),
  bankAccountNumber: z.string().max(50).nullable().optional(),
  bankClabe: z.string().length(18, "CLABE debe tener 18 digitos").nullable().optional(),
  bankNotes: z.string().max(500).nullable().optional(),
});

export const botConfigSchema = z.object({
  soundAlertsEnabled: z.boolean().optional(),
  autoReplyEnabled: z.boolean().optional(),
  autoReplyDelayMs: z.number().int().min(0).max(30000).optional(),
  welcomeMessage: z.string().max(1000).nullable().optional(),
  awayMessage: z.string().max(1000).nullable().optional(),
  queueMessage: z.string().max(1000).nullable().optional(),
});

export const businessConfigSchema = z.object({
  businessName: z.string().max(200).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
  ...bankConfigSchema.shape,
  ...botConfigSchema.shape,
});

export type BusinessConfigInput = z.infer<typeof businessConfigSchema>;

// ── Leads ──────────────────────────────────────────────────────────

export const leadCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  phone: z.string().min(8, "Telefono invalido").max(20),
  notes: z.string().max(2000).nullable().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

// ── Products ───────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  price: z.number().min(0, "Precio no puede ser negativo"),
  image: z.string().max(500).nullable().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

// ── Shipments ──────────────────────────────────────────────────────

export const shipmentCreateSchema = z.object({
  orderIds: z.array(z.string()).min(1, "Selecciona al menos una orden"),
  carrier: z.string().min(1, "Paqueteria requerida").max(100),
  trackingNumber: z.string().max(100).nullable().optional(),
  dispatchType: z.enum(["CARRIER", "LOCAL", "PERSONAL"]),
  notes: z.string().max(1000).nullable().optional(),
});

export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;

// ── Campaigns ──────────────────────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  message: z.string().min(1, "Mensaje requerido").max(2000),
  leadIds: z.array(z.string()).min(1, "Selecciona al menos una clienta"),
  delayMs: z.number().int().min(500).max(60000).optional(),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
