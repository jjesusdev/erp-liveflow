"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LiveFlow] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">Algo salio mal</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrio un error inesperado. Puedes intentar de nuevo o recargar la pagina.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground/60">Ref: {error.digest}</p>}
      </div>
      <Button onClick={reset} variant="outline" size="sm" className="gap-1.5">
        <RefreshCw className="size-3.5" />
        Reintentar
      </Button>
    </div>
  );
}
