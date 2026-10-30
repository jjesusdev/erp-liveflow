import { createHmac } from "crypto";

enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogContext {
  requestId?: string;
  operatorId?: string;
  [key: string]: unknown;
}

let requestIdCounter = 0;

/**
 * Genera un requestId único por request.
 */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${(++requestIdCounter).toString(36)}`;
}

/**
 * Logger estructurado para server y API.
 * Emite líneas JSON en consola con nivel, requestId, operatorId y contexto adicional.
 * En producción se puede redirigir a un servicio de logs.
 */
export function logger(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case LogLevel.ERROR:
      console.error(output);
      break;
    case LogLevel.WARN:
      console.warn(output);
      break;
    default:
      console.info(output);
  }
}

/**
 * Crea un logger con requestId y operatorId predefinidos para una request específica.
 */
export function createRequestLogger(context: LogContext) {
  return {
    info: (message: string, extra?: LogContext) =>
      logger(LogLevel.INFO, message, { ...context, ...extra }),
    warn: (message: string, extra?: LogContext) =>
      logger(LogLevel.WARN, message, { ...context, ...extra }),
    error: (message: string, extra?: LogContext) =>
      logger(LogLevel.ERROR, message, { ...context, ...extra }),
  };
}

export { LogLevel };
