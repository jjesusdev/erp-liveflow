import { LoginForm } from "@/components/auth/LoginForm";
import { AlertTriangle } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <AlertTriangle className="size-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">LiveFlow CRM</h1>
          <p className="text-sm text-muted-foreground">
            Inicia sesión para operar tu Live Shopping
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
