import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

type ApiContext = { params: Promise<Record<string, string>> };

type ErrorBody = {
  error: string;
  details?: string[];
};

function jsonError(error: string, status: number, details?: string[]): NextResponse {
  const body: ErrorBody = { error };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Wraps an API route handler with:
 * - Consistent error handling (Zod validation, generic errors)
 * - Optional Zod schema validation for request body
 * - Consistent JSON responses
 */
export function apiHandler<TBody = unknown>({
  body: bodySchema,
  handler,
}: {
  body?: ZodSchema<TBody>;
  handler: (req: NextRequest, parsedBody: TBody, context: ApiContext) => Promise<NextResponse>;
}): (req: NextRequest, context: ApiContext) => Promise<NextResponse> {
  return async (req: NextRequest, context: ApiContext) => {
    try {
      let parsedBody: TBody = undefined as TBody;

      if (bodySchema && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
        const raw = await req.json();
        const result = bodySchema.safeParse(raw);
        if (!result.success) {
          const details = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
          return jsonError("Validacion fallida", 400, details);
        }
        parsedBody = result.data;
      }

      return await handler(req, parsedBody, context);
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
        return jsonError("Validacion fallida", 400, details);
      }

      console.error(`[API] ${req.method} ${req.nextUrl.pathname}:`, error);
      return jsonError("Error interno del servidor", 500);
    }
  };
}

/**
 * Returns a consistent 404 response for missing resources.
 */
export function notFound(resource: string = "Recurso"): NextResponse {
  return jsonError(`${resource} no encontrado`, 404);
}

/**
 * Returns a consistent 401/403 response.
 */
export function unauthorized(message: string = "No autorizado"): NextResponse {
  return jsonError(message, 401);
}

export function forbidden(message: string = "Prohibido"): NextResponse {
  return jsonError(message, 403);
}
