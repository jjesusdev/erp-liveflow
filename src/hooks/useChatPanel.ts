'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/lib/socket';
import type { Conversation, Message, MessageTemplate, Product } from '@/types';

export type ChatTab = 'chat' | 'profile' | 'address' | 'packing';

export interface AddressFormData {
  name: string;
  addressStreet: string;
  addressNumber: string;
  addressColonia: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  addressNotes: string;
  internalNotes: string;
}

const EMPTY_ADDRESS: AddressFormData = {
  name: '',
  addressStreet: '',
  addressNumber: '',
  addressColonia: '',
  addressCity: '',
  addressState: '',
  addressZipCode: '',
  addressNotes: '',
  internalNotes: '',
};

export function useChatPanel(conversationId: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
  const [addressForm, setAddressForm] = useState<AddressFormData>(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
  const [showFlashCatalog, setShowFlashCatalog] = useState(false);
  const [snippetFilter, setSnippetFilter] = useState('');
  const [pastingImage, setPastingImage] = useState<string | null>(null);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar la conversación');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los mensajes');
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
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
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

      setSuccessToast('Pago aprobado con exito y paquete listo en Envios!');
      setTimeout(() => setSuccessToast(null), 4000);
      fetchConversation();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aprobar el cobro');
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
      if (!res.ok) throw new Error('No se pudo guardar la informacion');
      setSuccessToast('Datos de clienta y direccion guardados!');
      setTimeout(() => setSuccessToast(null), 3000);
      fetchConversation();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error guardando datos');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar imagen');
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
        setError('WhatsApp desconectado: el mensaje se guardo en el CRM pero no llego al cliente.');
      }

      fetchMessages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(snippetFilter) ||
      (t.shortcut && t.shortcut.toLowerCase().includes(snippetFilter)) ||
      t.content.toLowerCase().includes(snippetFilter)
  );

  return {
    conversation,
    messages,
    newMessage,
    setNewMessage,
    loading,
    sending,
    approving,
    error,
    setError,
    successToast,
    setSuccessToast,
    activeTab,
    setActiveTab,
    addressForm,
    setAddressForm,
    savingAddress,
    templates,
    products,
    showSnippetsMenu,
    setShowSnippetsMenu,
    showFlashCatalog,
    setShowFlashCatalog,
    pastingImage,
    setPastingImage,
    inputRef,
    feedRef,
    pendingPayment,
    approvePaymentOrder,
    handleSaveAddress,
    handleInputChange,
    handlePaste,
    sendPastedImage,
    insertSnippet,
    sendMessage,
    filteredTemplates,
    fetchMessages,
    fetchConversation,
  };
}
