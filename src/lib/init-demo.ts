/**
 * Módulo de inicialización de demo
 * Se llama desde el login si es necesario
 * No requiere child_process ni dependencias externas
 */

import { prisma } from "./prisma";
import { hashPassword } from "./auth";

const DEMO_EMAIL = "admin@erp.local";
const DEMO_PASSWORD = "admin123";

/**
 * Crea la organización demo si no existe
 */
async function ensureDemoOrganization() {
  try {
    const org = await prisma.organization.findFirst({
      where: { slug: "demo" },
    });

    if (org) {
      return org.id;
    }

    // Crear organización demo
    const newOrg = await prisma.organization.create({
      data: {
        name: "Demo LiveFlow",
        slug: "demo",
        isActive: true,
        settings: {},
      },
    });

    return newOrg.id;
  } catch (error) {
    console.error("[init-demo] Error creando organización:", error);
    throw error;
  }
}

/**
 * Crea el usuario admin demo
 */
async function ensureDemoUser(orgId: string) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.operator.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "Administrador",
      role: "ADMIN",
      orgId,
      passwordHash,
      isOnline: true,
    },
    create: {
      name: "Administrador",
      email: DEMO_EMAIL,
      role: "ADMIN",
      orgId,
      passwordHash,
      isOnline: true,
    },
  });
}

/**
 * Inicializa el sistema demo
 * Llama a esta función si el login falla y el usuario usa credenciales demo
 */
export async function initDemoSystem(): Promise<boolean> {
  console.log("[init-demo] Inicializando sistema demo...");

  try {
    // Crear organización demo
    const orgId = await ensureDemoOrganization();
    console.log("[init-demo] Organización demo lista");

    // Crear usuario admin demo
    await ensureDemoUser(orgId);
    console.log("[init-demo] Usuario demo listo:", DEMO_EMAIL);

    return true;
  } catch (error) {
    console.error("[init-demo] Error inicializando sistema:", error);
    return false;
  }
}
