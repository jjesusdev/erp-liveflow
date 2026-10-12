'use client';

import { useState } from 'react';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { formatTime } from '@/lib/date-utils';
import { X } from 'lucide-react';
import {
  TextBubble,
  ImageBubble,
  VoiceBubble,
  ReceiptBubble,
} from '@/components/liveflow/workspace/message-bubbles';
import { Button } from '@/components/ui/button';
import { useChatPanel } from '@/hooks/useChatPanel';
import { ChatHeader } from './ChatHeader';
import { ChatTabs } from './ChatTabs';
import { ChatComposer } from './ChatComposer';
import { PendingPaymentBanner } from './PendingPaymentBanner';
import { FlashCatalog } from './FlashCatalog';
import { SnippetsMenu } from './SnippetsMenu';
import { ProfileTab } from './ProfileTab';
import { AddressTab } from './AddressTab';
import { PackingTab } from './PackingTab';
import type { PaymentOrder, Product } from '@/types';

interface ChatPanelProps {
  conversationId: string;
  onClose: () => void;
}

export function ChatPanel({ conversationId, onClose }: ChatPanelProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProductForPayment, setSelectedProductForPayment] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const chat = useChatPanel(conversationId);

  const startPaymentForProduct = (product: Product) => {
    setSelectedProductForPayment(product);
    chat.setShowFlashCatalog(false);
    setShowPaymentModal(true);
  };

  if (chat.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background relative">
      <ChatHeader
        conversation={chat.conversation}
        onToggleCatalog={() => chat.setShowFlashCatalog(!chat.showFlashCatalog)}
        onOpenPayment={() => {
          setSelectedProductForPayment(null);
          setShowPaymentModal(true);
        }}
        onClose={onClose}
      />

      <ChatTabs activeTab={chat.activeTab} onChange={chat.setActiveTab} />

      {chat.pendingPayment && (
        <PendingPaymentBanner
          payment={chat.pendingPayment as PaymentOrder}
          approving={chat.approving}
          onApprove={chat.approvePaymentOrder}
        />
      )}

      {chat.showFlashCatalog && (
        <FlashCatalog
          products={chat.products}
          onSelect={startPaymentForProduct}
          onClose={() => chat.setShowFlashCatalog(false)}
        />
      )}

      {/* PESTANA 1: CHAT */}
      {chat.activeTab === 'chat' && (
        <>
          <div ref={chat.feedRef} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
            {chat.messages.map((message) => {
              const isOutbound = message.direction === 'OUTBOUND';
              const from = isOutbound ? ('out' as const) : ('in' as const);
              const time = formatTime(message.sentAt);

              if (message.type === 'IMAGE' && message.mediaUrl) {
                if (!isOutbound && message.isPossibleReceipt && chat.pendingPayment) {
                  return (
                    <ReceiptBubble
                      key={message.id}
                      message={{
                        id: message.id,
                        kind: 'receipt',
                        from: 'in',
                        src: message.mediaUrl,
                        amount: Number(chat.pendingPayment.amount),
                        time,
                        approved: chat.pendingPayment.status === 'PAID',
                      }}
                      onApprove={() => chat.approvePaymentOrder(chat.pendingPayment!.id)}
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

            {chat.messages.length === 0 && (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Sin mensajes en esta conversacion
              </p>
            )}
          </div>

          {chat.showSnippetsMenu && (
            <SnippetsMenu templates={chat.filteredTemplates} onSelect={chat.insertSnippet} />
          )}

          {chat.pastingImage && (
            <div className="border-t border-border bg-muted/40 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={chat.pastingImage}
                  alt="Pegada"
                  className="size-14 rounded-lg object-cover border"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">Imagen lista para enviar</p>
                  <p className="text-[11px] text-muted-foreground">
                    Presiona Enviar para mandar a WhatsApp
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => chat.setPastingImage(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={chat.sendPastedImage}
                  disabled={chat.sending}
                >
                  {chat.sending ? 'Enviando...' : 'Enviar Imagen'}
                </Button>
              </div>
            </div>
          )}

          <ChatComposer
            newMessage={chat.newMessage}
            sending={chat.sending}
            pastingImage={chat.pastingImage}
            templates={chat.templates}
            onInputChange={chat.handleInputChange}
            onPaste={chat.handlePaste}
            onSend={() => chat.sendMessage()}
            onSendImage={chat.sendPastedImage}
            onInsertSnippet={chat.insertSnippet}
            inputRef={chat.inputRef}
          />
        </>
      )}

      {/* PESTANA 2: FICHA 360 */}
      {chat.activeTab === 'profile' && (
        <ProfileTab
          conversation={chat.conversation}
          addressForm={chat.addressForm}
          onAddressFormChange={chat.setAddressForm}
          onSave={chat.handleSaveAddress}
          saving={chat.savingAddress}
        />
      )}

      {/* PESTANA 3: DIRECCION */}
      {chat.activeTab === 'address' && (
        <AddressTab
          form={chat.addressForm}
          onChange={chat.setAddressForm}
          onSave={chat.handleSaveAddress}
          saving={chat.savingAddress}
        />
      )}

      {/* PESTANA 4: ETIQUETA */}
      {chat.activeTab === 'packing' && (
        <PackingTab conversation={chat.conversation} addressForm={chat.addressForm} />
      )}

      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        conversationId={conversationId}
        leadName={chat.conversation?.lead?.name || chat.conversation?.lead?.phone}
        initialProduct={selectedProductForPayment}
      />

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
