'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSocket } from '@/lib/socket';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { formatTime, formatCurrency } from '@/lib/utils';
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
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
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

  // Reproductor de notas de voz de WhatsApp
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Snippets / Plantillas y Catálogo en vivo
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
  const [showFlashCatalog, setShowFlashCatalog] = useState(false);
  const [snippetFilter, setSnippetFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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

    // Cargar plantillas de respuestas rápidas y productos en vivo
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

    // Bloquear chat en tiempo real
    if (socket && conversationId) {
      socket.emit('chat:lock', { conversationId, operatorName: 'Vendedora' });
    }

    return () => {
      if (socket && conversationId) {
        socket.emit('chat:unlock', { conversationId });
      }
    };
  }, [fetchConversation, fetchMessages, socket, conversationId]);

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

    // Detectar atajo de barra diagonal '/' para abrir snippets
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

  const toggleAudio = (audioUrl: string, msgId: string) => {
    if (playingAudioId === msgId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setPlayingAudioId(msgId);
      audio.onended = () => setPlayingAudioId(null);
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b p-3 bg-card">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">
              {conversation?.lead?.name || conversation?.lead?.phone || 'Cliente'}
            </h3>
            {conversation?.lead?.tier === 'VIP' && (
              <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-black text-amber-600 dark:text-amber-400">
                ★ VIP
              </span>
            )}
            {conversation?.status && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  conversation.status === 'PAID'
                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : conversation.status === 'AWAITING_PAYMENT'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {conversation.status}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {conversation?.lead?.phone}
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          {/* Botón Catálogo Relámpago */}
          <button
            onClick={() => setShowFlashCatalog(!showFlashCatalog)}
            className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            title="Ver catálogo de prendas del Live"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            Prendas
          </button>

          {/* Botón Cobro Express */}
          <button
            onClick={() => {
              setSelectedProductForPayment(null);
              setShowPaymentModal(true);
            }}
            className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-700"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Cobro
          </button>

          {/* Cerrar */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md border p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selector de Pestañas: Chat / Ficha 360 / Dirección / Ficha de Empaque */}
      <div className="flex border-b bg-muted/40 px-3 pt-1 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'border-b-2 px-3 py-1.5 transition-all shrink-0',
            activeTab === 'chat'
              ? 'border-primary text-primary font-bold bg-background rounded-t'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          💬 Chat en Vivo
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            'flex items-center gap-1 border-b-2 px-3 py-1.5 transition-all shrink-0',
            activeTab === 'profile'
              ? 'border-primary text-primary font-bold bg-background rounded-t'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="h-3 w-3" />
          Ficha 360°
        </button>
        <button
          onClick={() => setActiveTab('address')}
          className={cn(
            'flex items-center gap-1 border-b-2 px-3 py-1.5 transition-all shrink-0',
            activeTab === 'address'
              ? 'border-primary text-primary font-bold bg-background rounded-t'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <MapPin className="h-3 w-3" />
          Dirección
        </button>
        <button
          onClick={() => setActiveTab('packing')}
          className={cn(
            'flex items-center gap-1 border-b-2 px-3 py-1.5 transition-all shrink-0',
            activeTab === 'packing'
              ? 'border-primary text-primary font-bold bg-background rounded-t'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Printer className="h-3 w-3" />
          Etiqueta
        </button>
      </div>

      {/* Banner de Cobro Pendiente con Alerta de Tiempo de Apartado */}
      {pendingPayment && (
        <div className="flex items-center justify-between border-b bg-amber-500/10 px-4 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-200 truncate">
              ⏳ Apartado: <strong>${Number(pendingPayment.amount).toFixed(2)} {pendingPayment.currency}</strong> ({pendingPayment.concept})
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" /> Vence en ~25 min
            </p>
          </div>
          <button
            onClick={() => approvePaymentOrder(pendingPayment.id)}
            disabled={approving === pendingPayment.id}
            className="ml-2 flex shrink-0 items-center gap-1 rounded bg-green-600 px-2.5 py-1 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {approving === pendingPayment.id ? 'Aprobando...' : 'Aprobar Pago'}
          </button>
        </div>
      )}

      {/* Popover de Catálogo Relámpago de Prendas con Control de Stock */}
      {showFlashCatalog && (
        <div className="border-b bg-card p-3 shadow-md max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Catálogo Relámpago (Haz clic para cobrar):
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
                className="flex items-center justify-between rounded border p-2 text-left text-xs hover:bg-accent hover:border-primary transition-all"
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
                  <span className="font-bold text-green-600 dark:text-green-400">
                    ${Number(p.price).toFixed(2)} {p.currency}
                  </span>
                  <span className="block text-[10px] text-primary font-medium">Cobrar ➔</span>
                </div>
              </button>
            ))}
            {products.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No hay productos disponibles. Agrégalos en la sección Productos.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Toasts / Errores */}
      {successToast && (
        <div className="mx-4 mt-3 rounded-md bg-green-100 p-2.5 text-xs font-medium text-green-900 border border-green-300">
          {successToast}
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 rounded-md bg-yellow-50 p-2.5 text-xs text-yellow-800 border border-yellow-200">
          {error}
        </div>
      )}

      {/* PESTAÑA 1: CHAT */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => {
              const isOutbound = message.direction === 'OUTBOUND';
              const isImage = message.type === 'IMAGE' && Boolean(message.mediaUrl);
              const isAudio = message.type === 'AUDIO' && Boolean(message.mediaUrl);

              return (
                <div
                  key={message.id}
                  className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm',
                      isOutbound
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/80 text-foreground border'
                    )}
                  >
                    {isImage ? (
                      <div className="space-y-1.5">
                        {!isOutbound && (
                          <div className="flex items-center justify-between gap-2 border-b pb-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              🧾 Comprobante / Foto
                            </span>
                            {pendingPayment && (
                              <button
                                onClick={() => approvePaymentOrder(pendingPayment.id)}
                                disabled={approving === pendingPayment.id}
                                className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Aprobar
                              </button>
                            )}
                          </div>
                        )}

                        <div className="relative group overflow-hidden rounded border bg-black/5">
                          <img
                            src={message.mediaUrl!}
                            alt="Comprobante o archivo"
                            className="max-h-60 w-auto rounded object-contain cursor-pointer hover:opacity-95"
                            onClick={() => setPreviewImage(message.mediaUrl!)}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImage(message.mediaUrl!)}
                            className="absolute bottom-2 right-2 rounded bg-black/60 p-1 text-white opacity-80 group-hover:opacity-100"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {message.content && (
                          <p className="whitespace-pre-wrap break-words text-xs">{message.content}</p>
                        )}
                      </div>
                    ) : isAudio ? (
                      <div className="flex items-center gap-3 p-1">
                        <button
                          type="button"
                          onClick={() => toggleAudio(message.mediaUrl!, message.id)}
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                            isOutbound ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                          )}
                        >
                          {playingAudioId === message.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4 ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <Volume2 className="h-3.5 w-3.5 opacity-70" />
                            <span className="text-xs font-semibold">Nota de Voz WhatsApp</span>
                          </div>
                          <div className="h-1.5 w-28 rounded-full bg-black/10 dark:bg-white/20 mt-1 overflow-hidden">
                            <div
                              className={cn(
                                'h-full bg-current transition-all',
                                playingAudioId === message.id ? 'w-full animate-pulse' : 'w-0'
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                    )}

                    <p
                      className={cn(
                        'mt-1 text-right text-[10px]',
                        isOutbound ? 'opacity-80' : 'text-muted-foreground'
                      )}
                    >
                      {formatTime(message.sentAt)}
                    </p>
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Sin mensajes en esta conversación
              </p>
            )}
          </div>

          {/* Menú Emergente de Snippets / Respuestas Rápidas */}
          {showSnippetsMenu && filteredTemplates.length > 0 && (
            <div className="absolute bottom-16 left-3 right-3 rounded-lg border bg-card p-2 shadow-2xl z-30 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Respuestas Rápidas (Atajos '/')
                </span>
                <span className="text-[10px] lowercase font-normal">Usa ↑ ↓ o clic para insertar</span>
              </div>
              <div className="mt-1 space-y-1">
                {filteredTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => insertSnippet(t)}
                    className="w-full text-left rounded p-2 text-xs hover:bg-accent flex items-start justify-between gap-2 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{t.name}</span>
                        {t.shortcut && (
                          <code className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-primary group-hover:bg-primary/20">
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

          {/* Previsualización de imagen pegada desde el portapapeles */}
          {pastingImage && (
            <div className="border-t bg-muted/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={pastingImage}
                  alt="Pegada"
                  className="h-14 w-14 rounded object-cover border"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">Imagen lista para enviar</p>
                  <p className="text-[11px] text-muted-foreground">Presiona Enviar para mandar a WhatsApp</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPastingImage(null)}
                  className="rounded border px-2.5 py-1 text-xs font-semibold hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={sendPastedImage}
                  disabled={sending}
                  className="rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  {sending ? 'Enviando...' : 'Enviar Imagen'}
                </button>
              </div>
            </div>
          )}

          {/* Input de Mensaje con Atajos y soporte para pegar imágenes */}
          <div className="border-t p-3 bg-card">
            {/* Chips de atajos sugeridos */}
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">Atajos:</span>
              {templates.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => insertSnippet(t)}
                  className="rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium hover:bg-accent text-foreground shrink-0 shadow-xs"
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
                placeholder="Escribe, '/' para atajos o pega captura con Ctrl+V..."
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => (pastingImage ? sendPastedImage() : sendMessage())}
                disabled={sending || (!newMessage.trim() && !pastingImage)}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* PESTAÑA 2: FICHA 360° DE LA CLIENTA (HISTORIAL & NOTAS PRIVADAS) */}
      {activeTab === 'profile' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {conversation?.lead?.name || 'Clienta'}
                </h4>
                <p className="text-xs text-muted-foreground">{conversation?.lead?.phone}</p>
              </div>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-bold">
                {conversation?.lead?.tier || 'NUEVA'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-2.5">
                <span className="text-muted-foreground text-[11px] block">Compras Concretadas</span>
                <span className="font-black text-base text-foreground">
                  {conversation?.lead?.totalPaidCount || 0}
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <span className="text-muted-foreground text-[11px] block">Total Gastado</span>
                <span className="font-black text-base text-emerald-600">
                  {formatCurrency(conversation?.lead?.totalSpent || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Notas Privadas entre Vendedoras */}
          <form onSubmit={handleSaveAddress} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Notas Privadas entre Vendedoras
              </label>
              <button
                type="submit"
                disabled={savingAddress}
                className="rounded bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
              >
                {savingAddress ? 'Guardando...' : 'Guardar Nota'}
              </button>
            </div>
            <textarea
              rows={3}
              value={addressForm.internalNotes}
              onChange={(e) => setAddressForm({ ...addressForm, internalNotes: e.target.value })}
              placeholder="Ej: Siempre pide talla M, prefiere envío por moto local, transfiere al instante por Banorte..."
              className="w-full rounded-md border bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>

          {/* Historial de Cobros de esta Conversación */}
          <div className="rounded-xl border bg-card p-4 space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Historial de Cobros
            </h5>
            <div className="space-y-1.5">
              {conversation?.paymentOrders?.map((po) => (
                <div key={po.id} className="flex items-center justify-between border-b pb-1.5 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{po.concept}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(po.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{formatCurrency(Number(po.amount))}</span>
                    <span className="block text-[10px] uppercase font-semibold text-emerald-600">{po.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CAPTURA RÁPIDA DE DIRECCIÓN */}
      {activeTab === 'address' && (
        <form onSubmit={handleSaveAddress} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Datos de Envío de la Clienta
            </h4>
            <button
              type="submit"
              disabled={savingAddress}
              className="flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              {savingAddress ? 'Guardando...' : 'Guardar Datos'}
            </button>
          </div>

          <div>
            <label className="text-xs font-medium">Nombre Completo del Receptor</label>
            <input
              type="text"
              value={addressForm.name}
              onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
              placeholder="Ej: María González"
              className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs bg-background"
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
                className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Número (Ext/Int)</label>
              <input
                type="text"
                value={addressForm.addressNumber}
                onChange={(e) => setAddressForm({ ...addressForm, addressNumber: e.target.value })}
                placeholder="Ej: #123 Int 4"
                className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs bg-background"
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
                className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Código Postal</label>
              <input
                type="text"
                value={addressForm.addressZipCode}
                onChange={(e) => setAddressForm({ ...addressForm, addressZipCode: e.target.value })}
                placeholder="Ej: 06000"
                className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs font-mono bg-background"
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
                className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Estado</label>
              <input
                type="text"
                value={addressForm.addressState}
                onChange={(e) => setAddressForm({ ...addressForm, addressState: e.target.value })}
                placeholder="Ej: Jalisco"
                className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Referencias de Entrega (Entre calles, color de fachada)</label>
            <textarea
              rows={2}
              value={addressForm.addressNotes}
              onChange={(e) => setAddressForm({ ...addressForm, addressNotes: e.target.value })}
              placeholder="Ej: Portón café, entre Juárez y Morelos. Dejar con vigilancia si no responden."
              className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs bg-background"
            />
          </div>
        </form>
      )}

      {/* PESTAÑA 4: ETIQUETA / PACKING SLIP PARA IMPRESIÓN */}
      {activeTab === 'packing' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Ficha de Empaque para Paquete
            </span>
            <button
              onClick={printPackingSlip}
              className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir Etiqueta
            </button>
          </div>

          {/* Ficha Visual Lista para Pegar en el Paquete */}
          <div className="rounded-lg border-2 border-dashed border-foreground/30 p-4 bg-white text-black font-sans space-y-3 shadow-sm">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <h2 className="font-black text-sm uppercase tracking-wide">📦 PAQUETE LIVE SHOPPING</h2>
                <p className="text-[11px] text-gray-600">Cliente: <strong>{addressForm.name || conversation?.lead?.phone}</strong></p>
                <p className="text-[11px] text-gray-600">Tel: <strong>{conversation?.lead?.phone}</strong></p>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="font-bold border border-black px-1.5 py-0.5 rounded">
                  {conversation?.paymentOrders?.[0]?.id?.slice(0, 8)?.toUpperCase() || 'REF-LIVE'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">Dirección de Envío:</p>
              <p className="font-bold text-xs mt-0.5">
                {addressForm.addressStreet} {addressForm.addressNumber}
              </p>
              <p className="text-xs">
                {addressForm.addressColonia ? `Col. ${addressForm.addressColonia}, ` : ''}
                {addressForm.addressCity} {addressForm.addressState}
              </p>
              <p className="text-xs font-mono font-bold">CP: {addressForm.addressZipCode || 'N/A'}</p>
              {addressForm.addressNotes && (
                <p className="text-[11px] text-gray-700 italic mt-1 bg-gray-100 p-1 rounded">
                  Ref: {addressForm.addressNotes}
                </p>
              )}
            </div>

            <div className="border-t pt-2 text-[11px]">
              <p className="font-bold text-gray-700">Contenido / Prendas:</p>
              <p className="font-semibold">{conversation?.paymentOrders?.[0]?.concept || 'Prendas del Live'}</p>
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

      {/* Modal de Vista Previa de Imagen */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-background p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/90"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="Comprobante en grande"
              className="max-h-[85vh] max-w-full rounded object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}