"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Credenciales inválidas");
      }

      toast.success(`Bienvenido, ${data.name}`);
      router.push("/config");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Correo electrónico
        </label>
        <Input
          type="email"
          name="email"
          placeholder="admin@erp.local"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-10"
          data-testid="login-email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contraseña
        </label>
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-10"
          data-testid="login-password"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full h-10" data-testid="login-submit">
        {loading ? (
          "Iniciando sesión..."
        ) : (
          <>
            <Lock className="mr-2 size-4" />
            Iniciar sesión
          </>
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        Credenciales de demo: <strong>admin@erp.local</strong> / <strong>admin123</strong>
      </p>
    </form>
  );
}
