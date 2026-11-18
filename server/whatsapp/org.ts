import { ensureDemoOrg } from "../../src/lib/demo/ensure-org";

let cachedOrgId: string | null = null;

/**
 * Organización dueña de la conexión WhatsApp. La instancia de Baileys es
 * single-tenant, así que todos los leads/conversaciones/mensajes entrantes
 * pertenecen a la misma org. Se memoíza para no hacer un upsert por mensaje.
 */
export async function getWhatsAppOrgId(): Promise<string> {
  if (!cachedOrgId) cachedOrgId = await ensureDemoOrg();
  return cachedOrgId;
}
