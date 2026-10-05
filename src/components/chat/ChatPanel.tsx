'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSocket } from '@/lib/socket';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { formatTime, formatCurrency } from '@/lib/date-utils';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  X,
  Send,
  CreditCard,
  CheckCircle2,
  ZoomIn,
  Sparkles,
  ShoppingBag,
  Zap,
  MapPin,
  Printer,
  Clock,
  Save,
  User,
  History,
  FileText,
} from 'lucide-react';
import { TextBubble, ImageBubble, VoiceBubble, ReceiptBubble } from '@/components/liveflow/workspace/message-bubbles';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/liveflow/primitives';
import type { Conversation, Message, MessageTemplate, Product, Lead } from '@/types';

interface ChatPanelProps {
  conversationId: string;
  onClose: () => void;
}

export function ChatPanel({ conversationId, onClose }: ChatPanelProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProductForPayment, setSelectedProductForPayment] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Pestañas / Paneles auxiliares
  const [activeTab, setActiveTab] = useState<'chat' | 'profile' | 'address' | 'packing'>('chat');
  const [addressForm, setAddressForm] = useState({
    name: '',
    addressStreet: '',
    addressNumber: '',
    addressColonia: '',
    addressCity: '',
    addressState: '',
    addressZipCode: '',
    addressNotes: '',
    internalNotes: '',
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Snippets / Plantillas y Catálogo en vivo
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
  const [showFlashCatalog, setShowFlashCatalog] = useState(false);
  const [snippetFilter, setSnippetFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error('No se pudo cargar la conversación');
      const data: Conversation = await res.json();
      setConversation(data);

      if (data.lead) {
        setAddressForm({
          name: data.lead.name || '',
          addressStreet: data.lead.addressStreet || '',
          addressNumber: data.lead.addressNumber || '',
          addressColonia: data.lead.addressColonia || '',
          addressCity: data.lead.addressCity || '',
          addressState: data.lead.addressState || '',
          addressZipCode: data.lead.addressZipCode || '',
          addressNotes: data.lead.addressNotes || '',
          internalNotes: data.lead.internalNotes || '',
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar la conversación');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (!res.ok) throw new Error('No se pudieron cargar los mensajes');
      const data = await res.json();
      setMessages(data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los mensajes');
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchConversation();
    fetchMessages();

    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => undefined);

    fetch('/api/products?available=true')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => undefined);

    if (socket && conversationId) {
      socket.emit('chat:lock', { conversationId, operatorName: 'Mariana' });
    }

    return () => {
      if (socket && conversationId) {
        socket.emit('chat:unlock', { conversationId });
      }
    };
  }, [fetchConversation, fetchMessages, socket, conversationId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!socket) return;

    const onMessageNew = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message]
        );
      }
    };

    const onPaymentUpdated = () => {
      fetchConversation();
    };

    const onConversationUpdated = (updated: Conversation) => {
      if (updated.id === conversationId) {
        setConversation(updated);
      }
    };

    socket.on('message:new', onMessageNew);
    socket.on('payment:updated', onPaymentUpdated);
    socket.on('payment:confirmed', onPaymentUpdated);
    socket.on('conversation:updated', onConversationUpdated);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('payment:updated', onPaymentUpdated);
      socket.off('payment:confirmed', onPaymentUpdated);
      socket.off('conversation:updated', onConversationUpdated);
    };
  }, [socket, conversationId, fetchConversation]);

  const pendingPayment = conversation?.paymentOrders?.find(
    (p) => p.status === 'PENDING' || p.status === 'SENT'
  );

  const approvePaymentOrder = async (orderId: string) => {
    setApproving(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/payment-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.error || 'No se pudo aprobar el pago');
      }

      setSuccessToast('🎉 ¡Pago aprobado con éxito y paquete listo en Envíos!');
      setTimeout(() => setSuccessToast(null), 4000);
      fetchConversation();
    } catch (err: any) {
      setError(err?.message || 'Error al aprobar el cobro');
    } finally {
      setApproving(null);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation?.leadId) return;
    setSavingAddress(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${conversation.leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });
      if (!res.ok) throw new Error('No se pudo guardar la información');
      setSuccessToast('📍 ¡Datos de clienta y dirección guardados!');
      setTimeout(() => setSuccessToast(null), 3000);
      fetchConversation();
    } catch (err: any) {
      setError(err?.message || 'Error guardando datos');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value.startsWith('/')) {
      setShowSnippetsMenu(true);
      setSnippetFilter(value.slice(1).toLowerCase());
    } else {
      setShowSnippetsMenu(false);
    }
  };

  const [pastingImage, setPastingImage] = useState<string | null>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setPastingImage(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const sendPastedImage = async () => {
    if (!pastingImage || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          type: 'IMAGE',
          mediaUrl: pastingImage,
          content: newMessage.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.error || 'No se pudo enviar la imagen');
      }

      setPastingImage(null);
      setNewMessage('');
      fetchMessages();
    } catch (err: any) {
      setError(err?.message || 'Error al enviar imagen');
    } finally {
      setSending(false);
    }
  };

  const insertSnippet = (template: MessageTemplate) => {
    let content = template.content;
    const clientName = conversation?.lead?.name || 'Amiga';
    content = content.replace(/\{\{nombre\}\}/gi, clientName);
    content = content.replace(/\{\{name\}\}/gi, clientName);
    setNewMessage(content);
    setShowSnippetsMenu(false);
    inputRef.current?.focus();
  };

  const startPaymentForProduct = (product: Product) => {
    setSelectedProductForPayment(product);
    setShowFlashCatalog(false);
    setShowPaymentModal(true);
  };

  const sendMessage = async (overrideContent?: string) => {
    const content = (overrideContent || newMessage).trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo enviar el mensaje');
      }

      setNewMessage('');
      setShowSnippetsMenu(false);

      if (!data.delivered) {
        setError('WhatsApp desconectado: el mensaje se guardó en el CRM pero no llegó al cliente.');
      }

      fetchMessages();
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const printPackingSlip = () => {
    window.print();
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(snippetFilter) ||
      (t.shortcut && t.shortcut.toLowerCase().includes(snippetFilter)) ||
      t.content.toLowerCase().includes(snippetFilter)
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background relative">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 bg-card/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
            {conversation?.lead?.name?.slice(0, 2).toUpperCase() || 'CL'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-xs font-bold text-foreground">
                {conversation?.lead?.name || conversation?.lead?.phone || 'Clienta'}
              </h2>
              <TierBadge tier={conversation?.lead?.tier === 'VIP' ? 'vip' : conversation?.lead?.tier === 'FREQUENT' ? 'recurrente' : 'nueva'} />
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {conversation?.lead?.phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFlashCatalog(!showFlashCatalog)}
            className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary transition-all"
          >
            <ShoppingBag className="size-3.5 text-primary" />
            Catálogo
          </button>

          <Button
            variant="success"
            size="sm"
            onClick={() => {
              setSelectedProductForPayment(null);
              setShowPaymentModal(true);
            }}
            className="h-8 gap-1 font-bold text-xs"
          >
            <CreditCard className="size-3.5" />
            Cobro
          </Button>

          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* Tabs bar */}
      <div className="flex border-b border-border bg-muted/30 px-3 pt-1 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'border-b-2 px-3 py-1.5 transition-all shrink-0 text-xs',
            activeTab === 'chat'
              ? 'border-primary text-primary font-bold bg-background rounded-t-md'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          💬 Chat en Vivo
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            'flex items-center gap-1 border-b-2 px-3 py-1.5 transition-all shrink-0 text-xs',
            activeTab === 'profile'
              ? 'border-primary text-primary font-bold bg-background rounded-t-md'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="size-3" />
          Ficha 360°
        </button>
        <button
          onClick={() => setActiveTab('address')}
          className={cn(
            'flex items-center gap-1 border-b-2 px-3 py-1.5 transition-all shrink-0 text-xs',
            activeTab === 'address'
              ? 'border-primary text-primary font-bold bg-background rounded-t-md'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <MapPin className="size-3" />
          Dirección
        </button>
        <button
          onClick={() => setActiveTab('packing')}
          className={cn(
            'flex items-center gap-1 border-b-2 px-3 py-1.5 transition-all shrink-0 text-xs',
            activeTab === 'packing'
              ? 'border-primary text-primary font-bold bg-background rounded-t-md'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Printer className="size-3" />
          Etiqueta
        </button>
      </div>

      {/* Banner de Apartado Activo */}
      {pendingPayment && (
        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-500 truncate">
              ⏳ Apartado: <strong>{money(Number(pendingPayment.amount))} MXN</strong> ({pendingPayment.concept})
            </p>
            <p className="text-[10px] text-amber-500/80 font-mono mt-0.5">
              Ref: {pendingPayment.id.slice(0, 8).toUpperCase()} • Vence en ~25 min
            </p>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={() => approvePaymentOrder(pendingPayment.id)}
            disabled={approving === pendingPayment.id}
            className="h-7 text-xs font-bold shrink-0"
          >
            <CheckCircle2 className="size-3.5" />
            {approving === pendingPayment.id ? 'Aprobando...' : 'Aprobar Pago'}
          </Button>
        </div>
      )}

      {/* Popover Catálogo Relámpago */}
      {showFlashCatalog && (
        <div className="border-b border-border bg-card p-3 shadow-lg max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <Zap className="size-3.5 text-amber-500" /> Catálogo en Vivo (Clic para agregar a la orden):
            </span>
            <button
              onClick={() => setShowFlashCatalog(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => startPaymentForProduct(p)}
                className="flex items-center justify-between rounded-lg border border-border p-2 text-left text-xs hover:bg-accent transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                      Stock: {p.stock ?? 10}
                    </span>
                  </div>
                  {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="font-bold text-emerald-500 font-mono">
                    {money(Number(p.price))}
                  </span>
                  <span className="block text-[10px] text-primary font-medium">Cobrar ➔</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 1: CHAT */}
      {activeTab === 'chat' && (
        <>
          <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
            {messages.map((message) => {
              const isOutbound = message.direction === 'OUTBOUND';
              const from = isOutbound ? ('out' as const) : ('in' as const);
              const time = formatTime(message.sentAt);

              if (message.type === 'IMAGE' && message.mediaUrl) {
                if (!isOutbound && message.isPossibleReceipt && pendingPayment) {
                  return (
                    <ReceiptBubble
                      key={message.id}
                      message={{
                        id: message.id,
                        kind: 'receipt',
                        from: 'in',
                        src: message.mediaUrl,
                        amount: Number(pendingPayment.amount),
                        time,
                        approved: pendingPayment.status === 'PAID',
                      }}
                      onApprove={() => approvePaymentOrder(pendingPayment.id)}
                    />
                  );
                }
                return (
                  <ImageBubble
                    key={message.id}
                    message={{
                      id: message.id,
                      kind: 'image',
                      from,
                      src: message.mediaUrl,
                      caption: message.content || undefined,
                      time,
                    }}
                  />
                );
              }

              if (message.type === 'AUDIO' && message.mediaUrl) {
                return (
                  <VoiceBubble
                    key={message.id}
                    message={{
                      id: message.id,
                      kind: 'voice',
                      from,
                      durationSec: 15,
                      time,
                    }}
                  />
                );
              }

              return (
                <TextBubble
                  key={message.id}
                  message={{
                    id: message.id,
                    kind: 'text',
                    from,
                    text: message.content || '',
                    time,
                  }}
                />
              );
            })}

            {messages.length === 0 && (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Sin mensajes en esta conversación
              </p>
            )}
          </div>

          {/* Snippets / Autocompletado */}
          {showSnippetsMenu && filteredTemplates.length > 0 && (
            <div className="absolute bottom-16 left-3 right-3 rounded-xl border border-border bg-card p-2 shadow-2xl z-30 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3.5 text-primary" /> Respuestas Rápidas (Atajos &apos;/&apos;)
                </span>
                <span className="text-[10px] lowercase font-normal">Clic para insertar</span>
              </div>
              <div className="mt-1 space-y-1">
                {filteredTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => insertSnippet(t)}
                    className="w-full text-left rounded-lg p-2 text-xs hover:bg-accent flex items-start justify-between gap-2 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{t.name}</span>
                        {t.shortcut && (
                          <code className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-primary">
                            /{t.shortcut}
                          </code>
                        )}
                      </div>
                      <p className="truncate text-muted-foreground text-[11px] mt-0.5">{t.content}</p>
                    </div>
                    <span className="text-[10px] text-primary font-medium shrink-0 pt-0.5">Insertar ↵</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview Imagen Pegada */}
          {pastingImage && (
            <div className="border-t border-border bg-muted/40 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img src={pastingImage} alt="Pegada" className="size-14 rounded-lg object-cover border" />
                <div>
                  <p className="text-xs font-bold text-foreground">Imagen lista para enviar</p>
                  <p className="text-[11px] text-muted-foreground">Presiona Enviar para mandar a WhatsApp</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setPastingImage(null)}>
                  Cancelar
                </Button>
                <Button variant="default" size="sm" onClick={sendPastedImage} disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar Imagen'}
                </Button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="border-t border-border p-3 bg-card">
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">Atajos:</span>
              {templates.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => insertSnippet(t)}
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium hover:bg-accent text-foreground shrink-0 shadow-xs"
                >
                  /{t.shortcut || t.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (pastingImage) {
                      sendPastedImage();
                    } else {
                      sendMessage();
                    }
                  }
                }}
                placeholder="Escribe un mensaje, '/' para atajos o pega captura..."
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="default"
                size="sm"
                onClick={() => (pastingImage ? sendPastedImage() : sendMessage())}
                disabled={sending || (!newMessage.trim() && !pastingImage)}
                className="h-8 gap-1 font-bold"
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* PESTAÑA 2: FICHA 360 */}
      {activeTab === 'profile' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {conversation?.lead?.name || 'Clienta'}
                </h4>
                <p className="text-xs text-muted-foreground font-mono">{conversation?.lead?.phone}</p>
              </div>
              <TierBadge tier={conversation?.lead?.tier === 'VIP' ? 'vip' : conversation?.lead?.tier === 'FREQUENT' ? 'recurrente' : 'nueva'} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-2.5">
                <span className="text-muted-foreground text-[11px] block">Compras Concretadas</span>
                <span className="font-black text-base text-foreground font-mono">
                  {conversation?.lead?.totalPaidCount || 0}
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <span className="text-muted-foreground text-[11px] block">Total Gastado</span>
                <span className="font-black text-base text-emerald-500 font-mono">
                  {money(conversation?.lead?.totalSpent || 0)}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveAddress} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5" /> Notas Privadas entre Vendedoras
              </label>
              <Button type="submit" variant="default" size="sm" disabled={savingAddress} className="h-6 text-[11px]">
                <Save className="size-3" /> Guardar
              </Button>
            </div>
            <textarea
              rows={3}
              value={addressForm.internalNotes}
              onChange={(e) => setAddressForm({ ...addressForm, internalNotes: e.target.value })}
              placeholder="Ej: Siempre pide talla M, prefiere envío por moto local, transfiere al instante por Banorte..."
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="size-3.5" /> Historial de Cobros
            </h5>
            <div className="space-y-1.5">
              {conversation?.paymentOrders?.map((po) => (
                <div key={po.id} className="flex items-center justify-between border-b border-border pb-1.5 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{po.concept}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(po.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono">{money(Number(po.amount))}</span>
                    <span className="block text-[10px] uppercase font-bold text-emerald-500">{po.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: DIRECCIÓN */}
      {activeTab === 'address' && (
        <form onSubmit={handleSaveAddress} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Datos de Envío de la Clienta
            </h4>
            <Button type="submit" variant="default" size="sm" disabled={savingAddress} className="h-7 text-xs">
              <Save className="size-3" /> Guardar
            </Button>
          </div>

          <div>
            <label className="text-xs font-medium">Nombre Completo del Receptor</label>
            <input
              type="text"
              value={addressForm.name}
              onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
              placeholder="Ej: María González"
              className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-medium">Calle / Avenida</label>
              <input
                type="text"
                value={addressForm.addressStreet}
                onChange={(e) => setAddressForm({ ...addressForm, addressStreet: e.target.value })}
                placeholder="Ej: Av. Hidalgo"
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Número (Ext/Int)</label>
              <input
                type="text"
                value={addressForm.addressNumber}
                onChange={(e) => setAddressForm({ ...addressForm, addressNumber: e.target.value })}
                placeholder="Ej: #123 Int 4"
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Colonia / Barrio</label>
              <input
                type="text"
                value={addressForm.addressColonia}
                onChange={(e) => setAddressForm({ ...addressForm, addressColonia: e.target.value })}
                placeholder="Ej: Centro"
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Código Postal</label>
              <input
                type="text"
                value={addressForm.addressZipCode}
                onChange={(e) => setAddressForm({ ...addressForm, addressZipCode: e.target.value })}
                placeholder="Ej: 06000"
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs font-mono bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Ciudad / Municipio</label>
              <input
                type="text"
                value={addressForm.addressCity}
                onChange={(e) => setAddressForm({ ...addressForm, addressCity: e.target.value })}
                placeholder="Ej: Guadalajara"
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Estado</label>
              <input
                type="text"
                value={addressForm.addressState}
                onChange={(e) => setAddressForm({ ...addressForm, addressState: e.target.value })}
                placeholder="Ej: Jalisco"
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Referencias de Entrega</label>
            <textarea
              rows={2}
              value={addressForm.addressNotes}
              onChange={(e) => setAddressForm({ ...addressForm, addressNotes: e.target.value })}
              placeholder="Ej: Portón café, entre Juárez y Morelos."
              className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs bg-background"
            />
          </div>
        </form>
      )}

      {/* PESTAÑA 4: ETIQUETA */}
      {activeTab === 'packing' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Ficha de Empaque para Paquete
            </span>
            <Button variant="default" size="sm" onClick={printPackingSlip} className="h-7 text-xs">
              <Printer className="size-3.5" /> Imprimir Etiqueta
            </Button>
          </div>

          <div className="rounded-xl border-2 border-dashed border-zinc-700 p-4 bg-zinc-950 text-zinc-100 font-sans space-y-3 shadow-md">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
              <div>
                <h2 className="font-black text-xs uppercase tracking-wide text-emerald-400">📦 PAQUETE LIVE SHOPPING</h2>
                <p className="text-[11px] text-zinc-300">Cliente: <strong>{addressForm.name || conversation?.lead?.phone}</strong></p>
                <p className="text-[11px] text-zinc-400 font-mono">Tel: <strong>{conversation?.lead?.phone}</strong></p>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="font-bold border border-zinc-700 bg-zinc-900 px-2 py-0.5 rounded text-emerald-400">
                  {conversation?.paymentOrders?.[0]?.id?.slice(0, 8)?.toUpperCase() || 'REF-LIVE'}
                </span>
              </div>
            </div>

            <div className="text-xs space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Dirección de Envío:</p>
              <p className="font-bold text-zinc-100">
                {addressForm.addressStreet} {addressForm.addressNumber}
              </p>
              <p className="text-zinc-300">
                {addressForm.addressColonia ? `Col. ${addressForm.addressColonia}, ` : ''}
                {addressForm.addressCity} {addressForm.addressState}
              </p>
              <p className="font-mono font-bold text-zinc-400">CP: {addressForm.addressZipCode || 'N/A'}</p>
              {addressForm.addressNotes && (
                <p className="text-[11px] text-zinc-400 italic mt-1 bg-zinc-900 p-1.5 rounded border border-zinc-800">
                  Ref: {addressForm.addressNotes}
                </p>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-2 text-[11px]">
              <p className="font-bold text-zinc-400">Prendas:</p>
              <p className="font-semibold text-emerald-300">{conversation?.paymentOrders?.[0]?.concept || 'Prendas del Live'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cobro */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        conversationId={conversationId}
        leadName={conversation?.lead?.name || conversation?.lead?.phone}
        initialProduct={selectedProductForPayment}
      />

      {/* Modal de Zoom de Imagen */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-background p-2 border border-border shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/90"
            >
              <X className="size-4" />
            </button>
            <img
              src={previewImage}
              alt="Comprobante en grande"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}