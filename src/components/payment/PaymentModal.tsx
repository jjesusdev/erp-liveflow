'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Building2, CreditCard, Send, ShoppingBag, Plus, Trash2, PackagePlus } from 'lucide-react';
import type { Product } from '@/types';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  leadName?: string;
  initialProduct?: Product | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
}

interface CreatedPayment {
  id: string;
  provider: string;
  providerLinkUrl?: string | null;
  status: string;
  whatsappSent: boolean;
  linkGenerated?: boolean;
  transferDetails?: {
    bankName?: string | null;
    bankBeneficiary?: string | null;
    bankClabe?: string | null;
    bankAccountNumber?: string | null;
    bankNotes?: string | null;
    reference: string;
    amount: number;
    currency: string;
    concept: string;
    message?: string;
  } | null;
}

export function PaymentModal({
  open,
  onOpenChange,
  conversationId,
  leadName,
  initialProduct,
}: PaymentModalProps) {
  // Modo Cajita / Bolsa Consolidada
  const [items, setItems] = useState<CartItem[]>([]);
  const [shippingFee, setShippingFee] = useState<string>('0');
  const [singleAmount, setSingleAmount] = useState('');
  const [singleConcept, setSingleConcept] = useState('');
  const [useCartMode, setUseCartMode] = useState(false);

  const [provider, setProvider] = useState<'TRANSFER' | 'MERCADOPAGO' | 'CASH'>('TRANSFER');
  const [products, setProducts] = useState<Product[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPayment | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialProduct) {
        setItems([{ id: initialProduct.id, name: initialProduct.name, price: Number(initialProduct.price) }]);
        setSingleConcept(initialProduct.name);
        setSingleAmount(String(initialProduct.price));
      }
      fetch('/api/products?available=true')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setProducts(data);
        })
        .catch(() => undefined);
    }
  }, [open, initialProduct]);

  const addProductToCart = (p: Product) => {
    setItems((prev) => [...prev, { id: p.id, name: p.name, price: Number(p.price) }]);
    setShowCatalog(false);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    if (useCartMode) {
      const subtotal = items.reduce((sum, item) => sum + item.price, 0);
      const fee = parseFloat(shippingFee) || 0;
      return subtotal + fee;
    }
    return parseFloat(singleAmount) || 0;
  };

  const getConsolidatedConcept = () => {
    if (useCartMode) {
      const names = items.map((i) => i.name).join(' + ');
      const fee = parseFloat(shippingFee) || 0;
      return fee > 0 ? `${names} (+ Envío $${fee})` : names;
    }
    return singleConcept;
  };

  const reset = () => {
    setItems([]);
    setShippingFee('0');
    setSingleAmount('');
    setSingleConcept('');
    setUseCartMode(false);
    setProvider('TRANSFER');
    setShowCatalog(false);
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = calculateTotal();
    const finalConcept = getConsolidatedConcept();

    if (!finalAmount || finalAmount <= 0) {
      setError('El monto total debe ser mayor a 0');
      return;
    }

    if (!finalConcept.trim()) {
      setError('Debes especificar al menos una prenda o concepto');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payment-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          amount: finalAmount,
          concept: finalConcept,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo generar el cobro');
      }

      setCreated(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudo generar el cobro');
    } finally {
      setLoading(false);
    }
  };

  const copyTransferText = async () => {
    const text = created?.transferDetails?.message || created?.providerLinkUrl;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar el texto');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Generar Cobro Express</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Clienta: <span className="font-semibold text-foreground">{leadName || 'Desconocido'}</span>
            </p>
          </div>
          {!created && (
            <button
              type="button"
              onClick={() => setUseCartMode(!useCartMode)}
              className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              <PackagePlus className="h-3.5 w-3.5 text-primary" />
              {useCartMode ? 'Cobro Simple' : 'Bolsa / Cajita Live'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {/* Desplegable de Catálogo */}
        {showCatalog && !created && (
          <div className="mt-3 max-h-44 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Seleccionar prenda del Live:
            </p>
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (useCartMode) {
                    addProductToCart(p);
                  } else {
                    setSingleConcept(p.name);
                    setSingleAmount(String(p.price));
                    setShowCatalog(false);
                  }
                }}
                className="w-full text-left rounded p-1.5 text-xs hover:bg-accent flex items-center justify-between transition-colors"
              >
                <span className="font-medium text-foreground truncate">{p.name}</span>
                <span className="font-bold text-primary shrink-0 ml-2">
                  ${Number(p.price).toFixed(2)} {p.currency || 'MXN'}
                </span>
              </button>
            ))}
          </div>
        )}

        {created ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 border border-green-200">
              <Check className="h-5 w-5 shrink-0 text-green-600" />
              <div className="text-xs">
                <p className="font-bold text-green-900">
                  Cobro registrado por ${calculateTotal().toFixed(2)} MXN
                </p>
                <p className="text-green-700 mt-0.5">
                  {created.whatsappSent
                    ? '✓ Datos bancarios enviados a la clienta por WhatsApp.'
                    : '⚠ WhatsApp desconectado: Envía los datos manualmente.'}
                </p>
              </div>
            </div>

            {created.transferDetails && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-foreground border-b pb-1">
                  <span>Referencia / Folio:</span>
                  <span className="font-mono text-primary">{created.transferDetails.reference}</span>
                </div>
                {created.transferDetails.bankName && (
                  <p><strong>Banco:</strong> {created.transferDetails.bankName}</p>
                )}
                {created.transferDetails.bankBeneficiary && (
                  <p><strong>Titular:</strong> {created.transferDetails.bankBeneficiary}</p>
                )}
                {created.transferDetails.bankClabe && (
                  <p className="font-mono"><strong>CLABE:</strong> {created.transferDetails.bankClabe}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyTransferText}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar Datos
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {/* Modo Cajita / Bolsa Consolidada */}
            {useCartMode ? (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    🛍️ Prendas en la Bolsa ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCatalog(!showCatalog)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Agregar del Catálogo
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-background p-1.5 rounded border">
                      <span className="truncate font-medium">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-bold font-mono">${item.price.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center italic">
                      Bolsa vacía. Agrega prendas usando el botón superior.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t text-xs">
                  <div>
                    <label className="font-semibold text-muted-foreground">Costo de Envío</label>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={shippingFee}
                        onChange={(e) => setShippingFee(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border py-1 pl-6 pr-2 font-mono text-xs bg-background"
                      />
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total a Cobrar</span>
                    <span className="text-base font-black text-foreground font-mono">
                      ${calculateTotal().toFixed(2)} MXN
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Modo Cobro Simple */
              <>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-foreground">Prenda / Concepto</label>
                  <button
                    type="button"
                    onClick={() => setShowCatalog(!showCatalog)}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Ver Catálogo
                  </button>
                </div>
                <input
                  type="text"
                  value={singleConcept}
                  onChange={(e) => setSingleConcept(e.target.value)}
                  placeholder="Ej: Vestido Negro Talla M"
                  className="w-full rounded-md border px-3 py-2 text-xs"
                  required={!useCartMode}
                />

                <div>
                  <label className="text-xs font-semibold text-foreground">Monto</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={singleAmount}
                      onChange={(e) => setSingleAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border py-2 pl-7 pr-3 text-sm font-bold text-foreground"
                      required={!useCartMode}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Método de Cobro
              </label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProvider('TRANSFER')}
                  className={`flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-semibold transition-all ${
                    provider === 'TRANSFER'
                      ? 'border-green-600 bg-green-50/70 text-green-900 ring-1 ring-green-600'
                      : 'hover:bg-accent'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-green-700" />
                  Transferencia
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('MERCADOPAGO')}
                  className={`flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-semibold transition-all ${
                    provider === 'MERCADOPAGO'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                      : 'hover:bg-accent'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 text-blue-700" />
                  MercadoPago
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? 'Enviando...' : `Cobrar $${calculateTotal().toFixed(2)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}