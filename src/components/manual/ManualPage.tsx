'use client';

import {
  BookOpen,
  Keyboard,
  CreditCard,
  Truck,
  MessageSquare,
  Clock,
  Sparkles,
  ShoppingBag,
  Zap,
  CheckCircle2,
  Copy,
  Printer,
  HelpCircle,
} from 'lucide-react';

export function ManualPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Encabezado */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-2xl font-black">Manual de Operación Rápida para Vendedoras</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Guía práctica para atención a clientas, cobros express y despacho de prendas durante y después de los Lives.
        </p>
      </div>

      {/* 1. Atajos de Teclado */}
      <section className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Keyboard className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">1. Atajos de Teclado Imprescindibles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between border">
            <div>
              <p className="font-bold text-foreground">Abrir Respuestas Rápidas</p>
              <p className="text-muted-foreground">Escribe en el chat para desplegar snippets</p>
            </div>
            <kbd className="rounded bg-background px-2 py-1 font-mono font-bold border shadow-xs text-primary">
              /
            </kbd>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between border">
            <div>
              <p className="font-bold text-foreground">Pegar Imagen / Captura</p>
              <p className="text-muted-foreground">Pega fotos del portapapeles sin descargar</p>
            </div>
            <kbd className="rounded bg-background px-2 py-1 font-mono font-bold border shadow-xs text-primary">
              Ctrl + V
            </kbd>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between border">
            <div>
              <p className="font-bold text-foreground">Buscador Global / Comandos</p>
              <p className="text-muted-foreground">Salta rápido a Caja, Envíos o Catálogo</p>
            </div>
            <kbd className="rounded bg-background px-2 py-1 font-mono font-bold border shadow-xs text-primary">
              Ctrl + K
            </kbd>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between border">
            <div>
              <p className="font-bold text-foreground">Enviar Mensaje</p>
              <p className="text-muted-foreground">Envía el texto o imagen a WhatsApp</p>
            </div>
            <kbd className="rounded bg-background px-2 py-1 font-mono font-bold border shadow-xs text-primary">
              Enter
            </kbd>
          </div>
        </div>
      </section>

      {/* 2. Ciclo de Venta en Vivo */}
      <section className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold">2. El Ciclo de Venta en 4 Pasos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Paso 1 */}
          <div className="rounded-lg border bg-background p-3.5 space-y-1.5">
            <span className="font-black text-amber-600 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full text-[10px]">
              PASO 1
            </span>
            <p className="font-bold text-foreground pt-1">Apartado en el Chat</p>
            <p className="text-muted-foreground leading-relaxed">
              La clienta escribe pidiendo una prenda. Al abrir el chat, se <strong>bloquea a tu nombre</strong> para que otra vendedora no se cruce.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="rounded-lg border bg-background p-3.5 space-y-1.5">
            <span className="font-black text-blue-600 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full text-[10px]">
              PASO 2
            </span>
            <p className="font-bold text-foreground pt-1">Generar Cobro Express</p>
            <p className="text-muted-foreground leading-relaxed">
              Presiona <strong>&quot;Cobro&quot;</strong> o selecciona del <strong>&quot;Catálogo&quot;</strong>. Si la clienta pide varias prendas, usa <strong>&quot;Bolsa / Cajita Live&quot;</strong> para consolidar.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="rounded-lg border bg-background p-3.5 space-y-1.5">
            <span className="font-black text-green-600 bg-green-100 dark:bg-green-950 px-2 py-0.5 rounded-full text-[10px]">
              PASO 3
            </span>
            <p className="font-bold text-foreground pt-1">Validación del Comprobante</p>
            <p className="text-muted-foreground leading-relaxed">
              La clienta manda su foto de transferencia. Haz clic en <strong>&quot;Aprobar Pago&quot;</strong> sobre la imagen. La orden pasa a Pagada automáticamente.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="rounded-lg border bg-background p-3.5 space-y-1.5">
            <span className="font-black text-purple-600 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-full text-[10px]">
              PASO 4
            </span>
            <p className="font-bold text-foreground pt-1">Dirección y Etiqueta</p>
            <p className="text-muted-foreground leading-relaxed">
              Entra a la pestaña <strong>&quot;Dirección&quot;</strong> para guardar los datos de entrega y luego a <strong>&quot;Etiqueta&quot;</strong> para imprimir el paquete listo.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Reglas de Apartados y Expiración */}
      <section className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-bold">3. Reglas de Apartados & Expiración de 30 Minutos</h2>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            • <strong>Tiempo de Tolerancia:</strong> Cada apartado tiene <strong>30 minutos</strong> para recibir el comprobante de transferencia bancaria.
          </p>
          <p>
            • <strong>Liberación Automática:</strong> Si pasan los 30 minutos sin pago, el sistema cancela el apartado, libera el stock para volver a ofrecer la prenda en el Live y avisa a la clienta por WhatsApp.
          </p>
          <p>
            • <strong>Barrido Post-Live:</strong> Al día siguiente, la administradora puede usar el botón <strong>&quot;Barrido de Carritos Abandonados&quot;</strong> en Caja para dar un último recordatorio con descuento a quienes no pagaron.
          </p>
        </div>
      </section>

      {/* 4. Snippets Frecuentes */}
      <section className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">4. Atajos / Snippets de Respuestas Rápidas</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <code className="text-primary font-mono bg-muted px-1.5 py-0.5 rounded">/datos</code>
              <span>Datos Bancarios</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Envía los datos de transferencia oficial y solicita la foto del comprobante.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <code className="text-primary font-mono bg-muted px-1.5 py-0.5 rounded">/apartar</code>
              <span>Aviso de Apartado</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Notifica a la clienta que su prenda está reservada temporalmente por 20-30 min.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <code className="text-primary font-mono bg-muted px-1.5 py-0.5 rounded">/envios</code>
              <span>Tiempos de Entrega</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Explica cómo funcionan los envíos locales y por paquetería express.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <code className="text-primary font-mono bg-muted px-1.5 py-0.5 rounded">/tallas</code>
              <span>Guía de Medidas</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Detalla qué tallas abarcan las prendas unitalla o con stretch.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}