/**
 * Repara datos cargados antes del aislamiento multi-tenant: crea la
 * organización demo (si no existe) y asigna su orgId real a todo registro
 * huérfano. Idempotente: sólo actualiza filas con orgId NULL.
 *
 * Uso: npm run db:backfill-org
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo LiveFlow", slug: "demo", isActive: true, settings: {} },
  });

  const models = Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === "orgId" && !field.isRequired))
    .map((model) => model.name.charAt(0).toLowerCase() + model.name.slice(1));

  const actualizados = {};
  for (const model of models) {
    const result = await prisma[model].updateMany({
      where: { orgId: null },
      data: { orgId: org.id },
    });
    actualizados[model] = result.count;
  }

  console.log(JSON.stringify({ orgId: org.id, actualizados }, null, 2));
}

main()
  .catch((error) => {
    console.error("Error en backfill de orgId:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
