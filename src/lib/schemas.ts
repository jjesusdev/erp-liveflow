import { z } from "zod";

// ── Business Config ────────────────────────────────────────────────

export const businessConfigSchema = z.object({
  businessName: z.string().max(200).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
  bankName: z.string().max(100).nullable().optional(),
  bankBeneficiary: z.string().max(200).nullable().optional(),
  bankAccountNumber: z.string().max(50).nullable().optional(),
  bankClabe: z.string().length(18, "CLABE debe tener 18 digitos").nullable().optional(),
  bankNotes: z.string().max(500).nullable().optional(),
  soundAlertsEnabled: z.boolean().optional(),
  autoReplyEnabled: z.boolean().optional(),
  autoReplyDelayMs: z.number().int().min(0).max(30000).optional(),
  welcomeMessage: z.string().max(1000).nullable().optional(),
  awayMessage: z.string().max(1000).nullable().optional(),
  queueMessage: z.string().max(1000).nullable().optional(),
});

export type BusinessConfigInput = z.infer<typeof businessConfigSchema>;

// ── Leads ──────────────────────────────────────────────────────────

const leadProfileFields = {
  internalNotes: z.string().max(5000).nullable().optional(),
  addressStreet: z.string().max(200).nullable().optional(),
  addressNumber: z.string().max(50).nullable().optional(),
  addressColonia: z.string().max(200).nullable().optional(),
  addressCity: z.string().max(200).nullable().optional(),
  addressState: z.string().max(200).nullable().optional(),
  addressZipCode: z.string().max(10).nullable().optional(),
  addressNotes: z.string().max(1000).nullable().optional(),
} as const;

export const leadCreateSchema = z.object({
  phone: z.string().min(8, "Telefono invalido").max(20),
  name: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  ...leadProfileFields,
});

export const leadUpdateSchema = z.object({
  phone: z.string().min(8).max(20).optional(),
  name: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  ...leadProfileFields,
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

// ── Conversations ──────────────────────────────────────────────────

export const conversationCreateSchema = z.object({
  leadId: z.string().min(1, "Cliente requerido"),
});

export type ConversationCreateInput = z.infer<typeof conversationCreateSchema>;

// ── Products ───────────────────────────────────────────────────────

export const productCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().min(0, "Precio no puede ser negativo"),
  currency: z.string().length(3).optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  isAvailable: z.boolean().optional(),
  stock: z.number().int().min(0).nullable().optional(),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  stock: z.number().int().min(0).nullable().optional(),
});

export const productImportSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        price: z.number().min(0),
        description: z.string().max(2000).optional(),
        currency: z.string().length(3).optional(),
        category: z.string().max(100).optional(),
        stock: z.number().int().min(0).optional(),
        imageUrl: z.string().max(500).optional(),
      })
    )
    .min(1, "Envia al menos un producto")
    .max(500, "Maximo 500 productos por importacion"),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductImportInput = z.infer<typeof productImportSchema>;

// ── Shipments ──────────────────────────────────────────────────────

export const shipmentCreateSchema = z.object({
  paymentOrderId: z.string().min(1, "Orden requerida"),
  trackingNumber: z.string().max(100).nullable().optional(),
  carrier: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  carrierId: z.string().max(50).nullable().optional(),
  mode: z.enum(["COURIER", "OWN_FLEET", "PICKUP"]).nullable().optional(),
  service: z.string().max(120).nullable().optional(),
  weightGrams: z.number().int().min(0).max(200000).nullable().optional(),
});

export const shipmentUpdateSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "READY",
      "LABEL_PRINTED",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "FAILED",
      "RETURNED",
      "LOST",
      "CANCELLED",
    ])
    .optional(),
  trackingNumber: z.string().max(100).nullable().optional(),
  carrier: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  notifyCustomer: z.boolean().optional(),
  syncTracking: z.boolean().optional(),
  mode: z.enum(["COURIER", "OWN_FLEET", "PICKUP"]).nullable().optional(),
  carrierId: z.string().max(50).nullable().optional(),
  service: z.string().max(120).nullable().optional(),
  weightGrams: z.number().int().min(0).max(200000).nullable().optional(),
  costClp: z.number().int().min(0).nullable().optional(),
  labelUrl: z.string().max(500).nullable().optional(),
  trackingUrl: z.string().max(500).nullable().optional(),
  providerRef: z.string().max(200).nullable().optional(),
  driverId: z.string().max(120).nullable().optional(),
  deliveredTo: z.string().max(200).nullable().optional(),
  proofPhotoUrl: z.string().max(500).nullable().optional(),
  eventNote: z.string().max(500).optional(),
});

export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>;

const CARRIER_MODES = ["COURIER", "EXTERNAL_OWN_FLEET", "STORE_PICKUP"] as const;
const CARRIER_PROVIDERS = [
  "MANUAL",
  "CHILEXPRESS",
  "BLUE",
  "SHIPIT",
  "ENVIAME",
  "STARKEN",
  "CORREOS",
  "SIMPLIROUTE",
  "BEETRACK",
] as const;

export const carrierCreateSchema = z.object({
  code: z.string().min(1, "Codigo requerido").max(50),
  name: z.string().min(1, "Nombre requerido").max(120),
  mode: z.enum(CARRIER_MODES),
  apiProvider: z.enum(CARRIER_PROVIDERS).optional(),
  active: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

export const carrierUpdateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(120).optional(),
  mode: z.enum(CARRIER_MODES).optional(),
  apiProvider: z.enum(CARRIER_PROVIDERS).optional(),
  active: z.boolean().optional(),
  config: z.record(z.unknown()).nullable().optional(),
});

export type CarrierCreateInput = z.infer<typeof carrierCreateSchema>;
export type CarrierUpdateInput = z.infer<typeof carrierUpdateSchema>;

// ── Campaigns ──────────────────────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  message: z.string().min(1, "Mensaje requerido").max(2000),
  scheduledAt: z.string().datetime().nullable().optional(),
  sendNow: z.boolean().optional(),
  operatorId: z.string().nullable().optional(),
});

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;

// ── Conversations ──────────────────────────────────────────────────

export const conversationUpdateSchema = z.object({
  status: z.enum(["OPEN", "PENDING", "CLOSED", "PAID", "SHIPPED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  assignedToId: z.string().nullable().optional(),
});

export type ConversationUpdateInput = z.infer<typeof conversationUpdateSchema>;

// ── Live Sessions ──────────────────────────────────────────────────

export const liveSessionCreateSchema = z.object({
  title: z.string().min(1, "Titulo requerido").max(200),
  platform: z.string().max(50).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const liveSessionUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "ENDED", "PAUSED"]).optional(),
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type LiveSessionCreateInput = z.infer<typeof liveSessionCreateSchema>;
export type LiveSessionUpdateInput = z.infer<typeof liveSessionUpdateSchema>;

// ── Messages ───────────────────────────────────────────────────────

export const messageCreateSchema = z.object({
  conversationId: z.string().min(1, "Conversacion requerida"),
  content: z.string().max(4000).optional(),
  mediaUrl: z.string().max(1000).nullable().optional(),
  mediaType: z.enum(["IMAGE", "AUDIO", "VIDEO", "DOCUMENT"]).nullable().optional(),
  type: z.enum(["TEXT", "IMAGE", "AUDIO", "VIDEO", "DOCUMENT", "SYSTEM"]).optional(),
});

export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

// ── Payment Orders ─────────────────────────────────────────────────

export const paymentOrderCreateSchema = z.object({
  conversationId: z.string().min(1, "Conversacion requerida"),
  amount: z.number().positive("Monto debe ser positivo"),
  concept: z.string().min(1, "Concepto requerido").max(500),
  provider: z.enum(["TRANSFER", "MERCADOPAGO"]).optional(),
  operatorId: z.string().nullable().optional(),
});

export const paymentOrderUpdateSchema = z.object({
  status: z.enum(["PENDING", "SENT", "PAID", "EXPIRED", "CANCELLED"]).optional(),
  concept: z.string().min(1).max(500).optional(),
  amount: z.number().positive().optional(),
});

export type PaymentOrderCreateInput = z.infer<typeof paymentOrderCreateSchema>;
export type PaymentOrderUpdateInput = z.infer<typeof paymentOrderUpdateSchema>;

// ── Templates ──────────────────────────────────────────────────────

export const templateCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  content: z.string().min(1, "Contenido requerido").max(2000),
  category: z.string().max(100).optional(),
  shortcut: z.string().max(50).nullable().optional(),
  variables: z.array(z.string().max(50)).max(20).optional(),
});

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;

// ── Maintenance ────────────────────────────────────────────────────

export const maintenanceSchema = z.object({
  action: z.enum(["PURGE_OLD_LOGS", "RESET_TEST_DATA"], {
    errorMap: () => ({ message: "Accion invalida. Usa PURGE_OLD_LOGS o RESET_TEST_DATA" }),
  }),
});

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

// ── Caja Sweep ─────────────────────────────────────────────────────

export const sweepRecoverySchema = z.object({
  discountPercent: z.number().min(0).max(100).optional(),
  customMessage: z.string().max(2000).nullable().optional(),
});

export type SweepRecoveryInput = z.infer<typeof sweepRecoverySchema>;

// ── Carriers Config ─────────────────────────────────────────────────

export const carrierConfigSchemas = {
  MANUAL: z.object({}).optional(),
  SHIPIT: z
    .object({
      apiKey: z.string().min(1),
      apiSecret: z.string().min(1),
    })
    .optional(),
  ENVIAME: z
    .object({
      apiKey: z.string().min(1),
    })
    .optional(),
  CHILEXPRESS: z
    .object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      subdomain: z.string().min(1),
    })
    .optional(),
  BLUE: z
    .object({
      apiKey: z.string().min(1),
      apiSecret: z.string().min(1),
    })
    .optional(),
  STARKEN: z
    .object({
      apiKey: z.string().min(1),
    })
    .optional(),
  CORREOS: z
    .object({
      apiKey: z.string().min(1),
    })
    .optional(),
  SIMPLIROUTE: z
    .object({
      apiKey: z.string().min(1),
      accountId: z.string().min(1),
    })
    .optional(),
  BEETRACK: z
    .object({
      apiKey: z.string().min(1),
      organizationId: z.string().min(1),
    })
    .optional(),
} as const;

export type CarrierConfigSchema = typeof carrierConfigSchemas;
