'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { WhatsAppSection } from './WhatsAppSection';
import type { BusinessConfig } from '@/types';

const DEFAULT_CONFIG: BusinessConfig = {
  id: 'default',
  businessName: '',
  currency: 'MXN',
  timezone: 'America/Mexico_City',
  bankName: '',
  bankBeneficiary: '',
  bankAccountNumber: '',
  bankClabe: '',
  bankNotes: '',
  soundAlertsEnabled: false,
  autoExpireOrders: true,
  orderExpirationMinutes: 30,
  autoReleaseStock: true,
  businessHoursStart: '09:00',
  businessHoursEnd: '22:00',
  autoReplyEnabled: true,
  autoReplyDelayMs: 1200,
  welcomeMessage: '',
  awayMessage: '',
  queueMessage: '',
};

export function ConfigPage() {
  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('No se pudo cargar la configuracion');
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar la configuracion');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {saved && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-800">
          Configuracion guardada
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">Negocio</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="cfg-name">
                Nombre del negocio
              </label>
              <input
                id="cfg-name"
                type="text"
                value={config.businessName}
                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="cfg-currency">
                  Moneda
                </label>
                <select
                  id="cfg-currency"
                  value={config.currency}
                  onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="USD">USD - Dolar</option>
                  <option value="COP">COP - Peso Colombiano</option>
                  <option value="ARS">ARS - Peso Argentino</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="cfg-tz">
                  Zona horaria
                </label>
                <select
                  id="cfg-tz"
                  value={config.timezone}
                  onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="America/Mexico_City">Ciudad de Mexico</option>
                  <option value="America/Bogota">Bogota</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires</option>
                  <option value="America/Lima">Lima</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="cfg-start">
                  Horario de apertura
                </label>
                <input
                  id="cfg-start"
                  type="time"
                  value={config.businessHoursStart || ''}
                  onChange={(e) =>
                    setConfig({ ...config, businessHoursStart: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="cfg-end">
                  Horario de cierre
                </label>
                <input
                  id="cfg-end"
                  type="time"
                  value={config.businessHoursEnd || ''}
                  onChange={(e) =>
                    setConfig({ ...config, businessHoursEnd: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">Datos Bancarios para Transferencias</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Estos datos se enviarán automáticamente a las clientas por WhatsApp al generar un cobro express.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="cfg-bank-name">
                  Banco
                </label>
                <input
                  id="cfg-bank-name"
                  type="text"
                  placeholder="Ej: BBVA, Banorte, Nu"
                  value={config.bankName || ''}
                  onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="cfg-bank-beneficiary">
                  Nombre del Titular / Beneficiario
                </label>
                <input
                  id="cfg-bank-beneficiary"
                  type="text"
                  placeholder="Ej: Juan Pérez o Mi Empresa S.A."
                  value={config.bankBeneficiary || ''}
                  onChange={(e) => setConfig({ ...config, bankBeneficiary: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="cfg-bank-clabe">
                  CLABE Interbancaria (18 dígitos)
                </label>
                <input
                  id="cfg-bank-clabe"
                  type="text"
                  placeholder="Ej: 012180001234567890"
                  value={config.bankClabe || ''}
                  onChange={(e) => setConfig({ ...config, bankClabe: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="cfg-bank-account">
                  Número de Cuenta / Tarjeta (Opcional)
                </label>
                <input
                  id="cfg-bank-account"
                  type="text"
                  placeholder="Ej: 1234567890"
                  value={config.bankAccountNumber || ''}
                  onChange={(e) => setConfig({ ...config, bankAccountNumber: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="cfg-bank-notes">
                Instrucciones / Notas adicionales para la clienta
              </label>
              <textarea
                id="cfg-bank-notes"
                placeholder="Ej: Pon tu nombre o referencia en el concepto para validar tu transferencia más rápido."
                value={config.bankNotes || ''}
                onChange={(e) => setConfig({ ...config, bankNotes: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Configuración de Expiración Automática de Apartados */}
        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">Expiración de Apartados de Live Shopping</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Expiración automática de apartados sin pago</p>
                <p className="text-xs text-muted-foreground">
                  Libera automáticamente las prendas apartadas si la clienta no envía su comprobante a tiempo
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
                  config.autoExpireOrders ? 'bg-primary' : 'bg-muted'
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t">
                <div>
                  <label className="text-xs font-medium" htmlFor="cfg-expire-min">
                    Tiempo de tolerancia para transferir (Minutos)
                  </label>
                  <input
                    id="cfg-expire-min"
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
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <p className="text-xs text-muted-foreground">
                    Al cumplirse el tiempo, el bot envía un mensaje automático avisando a la clienta y el stock se libera.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sección de Mantenimiento y Purga de Datos */}
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Mantenimiento & Salud de la Base de Datos</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Herramientas para mantener liviana la base de datos eliminando registros obsoletos de auditoría o apartados cancelados antiguos.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Deseas purgar logs de auditoría de más de 30 días?')) return;
                try {
                  const res = await fetch('/api/maintenance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'PURGE_OLD_LOGS' }),
                  });
                  const data = await res.json();
                  alert(data.message || 'Mantenimiento ejecutado');
                } catch {
                  alert('Error al ejecutar mantenimiento');
                }
              }}
              className="rounded border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              🧹 Limpiar Auditoría Antigua (&gt;30 días)
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Deseas depurar órdenes expiradas y canceladas?')) return;
                try {
                  const res = await fetch('/api/maintenance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'RESET_TEST_DATA' }),
                  });
                  const data = await res.json();
                  alert(data.message || 'Mantenimiento ejecutado');
                } catch {
                  alert('Error al ejecutar mantenimiento');
                }
              }}
              className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300"
            >
              🗑️ Depurar Órdenes Expiradas
            </button>
          </div>
        </section>

        {/* Sección de Bitácora / Auditoría de Movimientos Diarios */}
        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Bitácora & Auditoría de Movimientos Diarios</h2>
              <p className="text-xs text-muted-foreground">
                Historial inmutable de cobros, cancelaciones, aprobaciones y despachos realizados por el equipo.
              </p>
            </div>
            <a
              href="/api/audit"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver API JSON ➔
            </a>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">Notificaciones y Alertas</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertas de sonido en vivo</p>
              <p className="text-xs text-muted-foreground">
                Reproducir un aviso sonoro al recibir un nuevo pago o comprobante (Desactivado por defecto)
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
                config.soundAlertsEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  config.soundAlertsEnabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">Respuestas automaticas</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Respuesta automatica</p>
              <p className="text-xs text-muted-foreground">
                Enviar bienvenida al recibir un mensaje nuevo
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.autoReplyEnabled}
              onClick={() =>
                setConfig({ ...config, autoReplyEnabled: !config.autoReplyEnabled })
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                config.autoReplyEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  config.autoReplyEnabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="cfg-welcome">
                Mensaje de bienvenida
              </label>
              <textarea
                id="cfg-welcome"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="cfg-away">
                Mensaje de ausencia
              </label>
              <textarea
                id="cfg-away"
                value={config.awayMessage || ''}
                onChange={(e) => setConfig({ ...config, awayMessage: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="cfg-queue">
                Mensaje de espera
              </label>
              <textarea
                id="cfg-queue"
                value={config.queueMessage || ''}
                onChange={(e) => setConfig({ ...config, queueMessage: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <WhatsAppSection />
      </div>
    </div>
  );
}