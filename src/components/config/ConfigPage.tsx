'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Save,
  Building2,
  Smartphone,
  Clock,
  Bot,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { WhatsAppSection } from './WhatsAppSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge, SectionLabel } from '@/components/liveflow/primitives';
import { toast } from 'sonner';
import type { BusinessConfig } from '@/types';

const DEFAULT_CONFIG: BusinessConfig = {
  id: 'default',
  businessName: 'LiveFlow Boutique',
  currency: 'MXN',
  timezone: 'America/Mexico_City',
  bankName: 'BBVA',
  bankBeneficiary: 'LiveFlow Boutique S.A.',
  bankAccountNumber: '',
  bankClabe: '012 180 0152 3344 9910',
  bankNotes: 'Por favor envía captura clara del comprobante de transferencia para confirmar tu pedido.',
  soundAlertsEnabled: false,
  autoExpireOrders: true,
  orderExpirationMinutes: 30,
  autoReleaseStock: true,
  businessHoursStart: '09:00',
  businessHoursEnd: '22:00',
  autoReplyEnabled: true,
  autoReplyDelayMs: 1200,
  welcomeMessage: '¡Hola! Bienvenida a LiveFlow. Envíanos captura de la prenda que te gustó en el Live y te ayudamos enseguida ✨',
  awayMessage: '¡Hola! En este momento estamos fuera de horario. Te responderemos temprano para atender tu pedido.',
  queueMessage: '¡Hola! Estamos en vivo recibiendo muchos mensajes. Tu turno está en cola y te atenderemos en unos minutos 💕',
};

export function ConfigPage() {
  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig({ ...DEFAULT_CONFIG, ...data });
      }
    } catch {
      toast.error('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Configuración guardada correctamente');
    } catch {
      toast.error('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const previewTransferMessage = `✨ *Datos para tu Pago / Transferencia* ✨
📦 *Pedido:* Vestido Satinado Esmeralda (T. M)
💵 *Monto:* $450.00 MXN
🔖 *Referencia / Concepto:* EXP-8941

🏦 *Banco:* ${config.bankName || 'BBVA'}
👤 *Titular:* ${config.bankBeneficiary || 'LiveFlow Boutique'}
${config.bankClabe ? `🔢 *CLABE:* ${config.bankClabe}` : ''}
${config.bankAccountNumber ? `💳 *Cuenta:* ${config.bankAccountNumber}` : ''}
${config.bankNotes ? `📝 *Nota:* ${config.bankNotes}` : ''}

📸 *Por favor envíanos la captura o foto de tu comprobante por aquí para confirmar tu pedido.*`;

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewTransferMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
      toast.success('Texto copiado al portapapeles');
    } catch {
      toast.error('Error al copiar');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Superior */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Configuración del Sistema
              </h1>
              <Badge tone="neutral">v1.2 Producción</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Administra tus cuentas bancarias, conexión de WhatsApp, reglas de apartados y mantenimiento.
            </p>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            className="h-8 gap-1.5 font-semibold text-xs"
          >
            <Save className="size-3.5" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>

        {/* Navegación por Tabs Estilizada */}
        <Tabs defaultValue="banco" className="space-y-4">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 gap-2 overflow-x-auto">
            <TabsTrigger value="banco" className="text-xs">
              <Building2 className="size-3.5" />
              Cuentas Bancarias
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs">
              <Smartphone className="size-3.5" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="live" className="text-xs">
              <Clock className="size-3.5" />
              Reglas de Live & Apartados
            </TabsTrigger>
            <TabsTrigger value="bot" className="text-xs">
              <Bot className="size-3.5" />
              Bot & Respuestas
            </TabsTrigger>
            <TabsTrigger value="mantenimiento" className="text-xs">
              <Trash2 className="size-3.5" />
              Mantenimiento
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CUENTAS BANCARIAS */}
          <TabsContent value="banco" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulario */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                  <div className="border-b border-border pb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Datos de Transferencia Bancaria
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estos datos se insertan automáticamente al generar un cobro express en el chat.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-bank-name">
                        Banco
                      </label>
                      <input
                        id="cfg-bank-name"
                        type="text"
                        value={config.bankName || ''}
                        onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                        placeholder="Ej: BBVA, Banorte, Nu, Santander"
                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-bank-beneficiary">
                        Titular / Beneficiario
                      </label>
                      <input
                        id="cfg-bank-beneficiary"
                        type="text"
                        value={config.bankBeneficiary || ''}
                        onChange={(e) => setConfig({ ...config, bankBeneficiary: e.target.value })}
                        placeholder="Ej: LiveFlow Boutique S.A."
                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-bank-clabe">
                        CLABE Interbancaria (18 dígitos)
                      </label>
                      <input
                        id="cfg-bank-clabe"
                        type="text"
                        value={config.bankClabe || ''}
                        onChange={(e) => setConfig({ ...config, bankClabe: e.target.value })}
                        placeholder="012 180 0152 3344 9910"
                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-bank-account">
                        Número de Cuenta (Opcional)
                      </label>
                      <input
                        id="cfg-bank-account"
                        type="text"
                        value={config.bankAccountNumber || ''}
                        onChange={(e) => setConfig({ ...config, bankAccountNumber: e.target.value })}
                        placeholder="1234567890"
                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-currency">
                        Moneda
                      </label>
                      <select
                        id="cfg-currency"
                        value={config.currency}
                        onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <option value="MXN">MXN - Peso Mexicano</option>
                        <option value="USD">USD - Dólar</option>
                        <option value="COP">COP - Peso Colombiano</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-bank-notes">
                        Instrucciones adicionales para la clienta
                      </label>
                      <textarea
                        id="cfg-bank-notes"
                        rows={2}
                        value={config.bankNotes || ''}
                        onChange={(e) => setConfig({ ...config, bankNotes: e.target.value })}
                        placeholder="Ej: Envía tu captura de pantalla en este chat para validar tu apartado."
                        className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vista Previa en Vivo del Mensaje */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel>Vista previa del mensaje de WhatsApp</SectionLabel>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPreview}
                    className="h-6 gap-1 text-[11px] text-muted-foreground"
                  >
                    {copiedMessage ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    {copiedMessage ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-xs relative">
                  <div className="rounded-lg bg-zinc-950 p-3.5 text-xs leading-relaxed text-zinc-100 whitespace-pre-wrap border border-zinc-800">
                    {previewTransferMessage}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Así es exactamente como tus clientas leerán los datos en su app de WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: WHATSAPP */}
          <TabsContent value="whatsapp" className="pt-2">
            <WhatsAppSection />
          </TabsContent>

          {/* TAB 3: REGLAS DEL LIVE & APARTADOS */}
          <TabsContent value="live" className="pt-2">
            <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-xs max-w-2xl">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Temporizador & Expiración de Apartados
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Evita retener inventario con clientas que no transfieren a tiempo durante las transmisiones.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Expiración automática de apartados
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    El sistema libera automáticamente la prenda si no se aprueba el pago dentro del tiempo límite.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(config.autoExpireOrders)}
                  onClick={() =>
                    setConfig({
                      ...config,
                      autoExpireOrders: !config.autoExpireOrders,
                    })
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    config.autoExpireOrders ? 'bg-emerald-600' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      config.autoExpireOrders ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {config.autoExpireOrders && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-exp-min">
                      Minutos de tolerancia para transferir
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        id="cfg-exp-min"
                        type="number"
                        min="5"
                        max="120"
                        value={config.orderExpirationMinutes || 30}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            orderExpirationMinutes: parseInt(e.target.value, 10) || 30,
                          })
                        }
                        className="h-8 w-24 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                      <span className="text-xs text-muted-foreground font-medium">minutos</span>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
                    Al cumplirse los {config.orderExpirationMinutes || 30} min, la prenda vuelve a estar disponible para la venta en el Live.
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Alertas sonoras de cobro en vivo
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Reproduce un aviso sonoro discreto al recibir un comprobante de pago.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(config.soundAlertsEnabled)}
                  onClick={() =>
                    setConfig({
                      ...config,
                      soundAlertsEnabled: !config.soundAlertsEnabled,
                    })
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    config.soundAlertsEnabled ? 'bg-emerald-600' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      config.soundAlertsEnabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: BOT & RESPUESTAS */}
          <TabsContent value="bot" className="pt-2">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs max-w-2xl">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Respuestas Automáticas & Horarios
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mensajes de bienvenida y atención cuando las vendedoras no están conectadas.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Respuesta automática de bienvenida
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Contesta al instante cuando una clienta escribe por primera vez.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(config.autoReplyEnabled)}
                  onClick={() =>
                    setConfig({
                      ...config,
                      autoReplyEnabled: !config.autoReplyEnabled,
                    })
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    config.autoReplyEnabled ? 'bg-emerald-600' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      config.autoReplyEnabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-welcome">
                    Mensaje de Bienvenida
                  </label>
                  <textarea
                    id="cfg-welcome"
                    rows={2}
                    value={config.welcomeMessage}
                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="cfg-away">
                    Mensaje Fuera de Horario
                  </label>
                  <textarea
                    id="cfg-away"
                    rows={2}
                    value={config.awayMessage || ''}
                    onChange={(e) => setConfig({ ...config, awayMessage: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: MANTENIMIENTO */}
          <TabsContent value="mantenimiento" className="pt-2">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs max-w-2xl">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Mantenimiento & Salud de Base de Datos
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Herramientas para depurar registros antiguos y mantener PostgreSQL rápido y liviano.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Limpieza de Auditoría Antigua</p>
                    <p className="text-[11px] text-muted-foreground">Elimina logs de actividad de más de 30 días.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('¿Deseas purgar logs de más de 30 días?')) return;
                      try {
                        const res = await fetch('/api/maintenance', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'PURGE_OLD_LOGS' }),
                        });
                        const data = await res.json();
                        toast.success(data.message || 'Mantenimiento completado');
                      } catch {
                        toast.error('Error ejecutando mantenimiento');
                      }
                    }}
                    className="h-7 text-xs"
                  >
                    🧹 Purgar Logs
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Depurar Órdenes Canceladas</p>
                    <p className="text-[11px] text-muted-foreground">Elimina carritos y apartados vencidos antiguos.</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('¿Deseas depurar apartados expirados y cancelados?')) return;
                      try {
                        const res = await fetch('/api/maintenance', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'RESET_TEST_DATA' }),
                        });
                        const data = await res.json();
                        toast.success(data.message || 'Depuración completada');
                      } catch {
                        toast.error('Error en la depuración');
                      }
                    }}
                    className="h-7 text-xs"
                  >
                    🗑️ Depurar Órdenes
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}