/**
 * Utilidades HTTP para proveedores de carriers
 * Usa fetch nativo de Node 18+ sin dependencias externas
 */

type FetchOptions = RequestInit & {
  timeoutMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta fetch con reintentos exponenciales y timeout mediante AbortController
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retries = 3,
  backoffMs = 300
): Promise<Response> {
  const { timeoutMs = 30_000, signal: externalSignal, ...restOptions } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Permitir abort externo
    const abortHandler = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException("Aborted", "AbortError");
      }
      externalSignal.addEventListener("abort", abortHandler);
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", abortHandler);
      }

      // Reintentar en errores 5xx o 429
      if (
        !response.ok &&
        (response.status >= 500 || response.status === 429) &&
        attempt < retries
      ) {
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", abortHandler);
      }

      lastError = err;

      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const isNetwork = err instanceof TypeError;

      // No reintentar abort o si quedan intentos
      if ((isAbort || !isNetwork) && attempt >= retries) {
        break;
      }

      if (attempt < retries) {
        await sleep(backoffMs * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError;
}

/**
 * Normaliza errores de proveedores a un formato común
 */
export function parseProviderError(error: unknown): { message: string; statusCode?: number } {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { message: "Request timeout or aborted", statusCode: 408 };
  }

  if (error instanceof TypeError) {
    // Errores de red / fetch
    return { message: error.message || "Network error", statusCode: 0 };
  }

  if (error instanceof Error) {
    return { message: error.message, statusCode: (error as any).statusCode };
  }

  if (typeof error === "object" && error !== null) {
    const e = error as any;
    if (typeof e.message === "string") {
      return {
        message: e.message,
        statusCode:
          typeof e.status === "number"
            ? e.status
            : typeof e.statusCode === "number"
              ? e.statusCode
              : undefined,
      };
    }
  }

  return { message: String(error) };
}
