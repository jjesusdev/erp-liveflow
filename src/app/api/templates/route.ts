import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { templateCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler({
  handler: async (req: NextRequest) => {
    const templates = await prisma.messageTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Si aún no hay plantillas creadas en la base de datos, inicializamos las esenciales de Live Shopping
    if (templates.length === 0) {
      const defaults = [
        {
          name: "Datos Bancarios Transferencia",
          shortcut: "datos",
          category: "PAGOS",
          content:
            "Aquí tienes los datos para tu transferencia. Por favor mándanos foto del comprobante para apartar tu prenda.",
          variables: [],
          isActive: true,
        },
        {
          name: "Información de Envíos y Tiempos",
          shortcut: "envios",
          category: "ENVIOS",
          content:
            "Hacemos envíos locales el mismo día y nacionales por paquetería express (1 a 3 días hábiles).",
          variables: [],
          isActive: true,
        },
        {
          name: "Guía de Tallas y Medidas",
          shortcut: "tallas",
          category: "PRODUCTOS",
          content:
            "Nuestras prendas son unitalla / stretch y abarcan desde talla CH hasta G. ¿Qué prenda te gustaría medir?",
          variables: [],
          isActive: true,
        },
        {
          name: "Apartado por 20 Minutos",
          shortcut: "apartar",
          category: "VENTAS",
          content:
            "¡Prenda apartada a tu nombre! Tienes 20 minutos para enviar tu comprobante antes de liberarla en el Live. ✨",
          variables: [],
          isActive: true,
        },
      ];

      await prisma.messageTemplate.createMany({ data: defaults });
      const freshTemplates = await prisma.messageTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(freshTemplates);
    }

    return NextResponse.json(templates);
  },
});

export const POST = apiHandler({
  body: templateCreateSchema,
  handler: async (req: NextRequest, body) => {
    const { name, content, category = "GENERAL", shortcut, variables = [] } = body;

    const template = await prisma.messageTemplate.create({
      data: {
        name,
        content,
        category,
        shortcut: shortcut ? shortcut.toLowerCase().replace("/", "") : null,
        variables,
        isActive: true,
      },
    });

    return NextResponse.json(template);
  },
});
