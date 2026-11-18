// Import relativo para que el helper funcione tanto en Next (alias @/) como en
// el custom server ejecutado con tsx (server/whatsapp/*).
import { prisma } from "../prisma";

const DEMO_ORG_SLUG = "demo";

/**
 * Obtiene (o crea) la organización demo y devuelve su ID real.
 * Punto único de verdad para no hardcodear ids como "demo-org" / "default-org".
 */
export async function ensureDemoOrg(): Promise<string> {
  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {},
    create: {
      name: "Demo LiveFlow",
      slug: DEMO_ORG_SLUG,
      isActive: true,
      settings: {},
    },
  });

  return org.id;
}
