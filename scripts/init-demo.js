#!/usr/bin/env node

/**
 * Script de inicialización para crear usuarios demo
 * Ejecutar: node scripts/init-demo.js
 *
 * Este script crea:
 * - Organización "Demo LiveFlow" (si no existe)
 * - Usuario admin@erp.local / admin123 (si no existe)
 * - Usuario vendedora@erp.local / vendedora123 (si no existe)
 *
 * Si la tabla Organization no existe, primero crea las migraciones base.
 */

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

const SALT_BYTES = 16;
const KEY_BYTES = 32;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derivedKey = crypto.scryptSync(password, salt, KEY_BYTES);
  const combined = Buffer.concat([salt, derivedKey]);
  return combined.toString("base64");
}

async function main() {
  console.log("🔧 Inicializando datos demo...");

  try {
    // Paso 1: Crear organización
    let org = await prisma.organization.upsert({
      where: { slug: "demo" },
      update: {
        name: "Demo LiveFlow",
        isActive: true,
        settings: {},
      },
      create: {
        name: "Demo LiveFlow",
        slug: "demo",
        isActive: true,
        settings: {},
      },
    });
    console.log("✅ Organización 'Demo LiveFlow' lista");
  } catch (dbError) {
    // Si falla porque la tabla no existe, proporcionar instrucciones
    console.error("❌ Error al crear organización:", dbError.message);

    if (dbError.code === "P2021") {
      console.error("\n📌 La tabla Organization no existe.");
      console.error("\nPara resolver esto, necesitas ejecutar las migraciones:");
      console.error("  npx prisma migrate deploy");
      console.error("\nEn Render, agrega este comando a tus Post-deploy hooks:");
      console.error("  npx prisma migrate deploy && node scripts/init-demo.js");
      console.error("\nAlternativamente, puedes usar:");
      console.error("  npx prisma db push");
    }

    throw dbError;
  }

  // Paso 2: Crear usuarios demo
  const users = [
    {
      name: "Administrador",
      email: "admin@erp.local",
      role: "ADMIN",
      password: "admin123",
    },
    {
      name: "Vendedora Demo",
      email: "vendedora@erp.local",
      role: "AGENT",
      password: "vendedora123",
    },
  ];

  for (const user of users) {
    const existing = await prisma.operator.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      await prisma.operator.update({
        where: { email: user.email },
        data: {
          name: user.name,
          role: user.role,
          orgId: org.id,
          passwordHash: hashPassword(user.password),
          isOnline: true,
        },
      });
      console.log(`✅ Usuario '${user.email}' actualizado`);
    } else {
      await prisma.operator.create({
        data: {
          name: user.name,
          email: user.email,
          role: user.role,
          orgId: org.id,
          passwordHash: hashPassword(user.password),
          isOnline: true,
        },
      });
      console.log(`✅ Usuario '${user.email}' creado`);
    }
  }

  console.log("\n🎉 Datos demo inicializados correctamente!");
  console.log("\nCredenciales:");
  console.log("  admin@erp.local    / admin123    (ADMIN)");
  console.log("  vendedora@erp.local / vendedora123 (AGENT)");

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    if (error.code === "P2021") {
      console.error("\n💡 Solución: Ejecuta 'npx prisma migrate deploy' primero");
    }
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // ignore
    }
  });
