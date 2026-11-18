"use client";

import { useLiveWorkspace } from "@/hooks/useLiveWorkspace";
import { InboxColumn } from "./inbox-column";
import { ChatColumn } from "./chat-column";
import { ChargeModal } from "./charge-modal";
import { LiveStatusBar } from "./live-status-bar";

export function Workspace() {
  const {
    dbConversations,
    conversations,
    currentConv,
    messages,
    bag,
    setBags,
    reference,
    selectedId,
    setSelectedId,
    chargeOpen,
    setChargeOpen,
    activeSession,
    loading,
    fetchConversations,
    approve,
    addProduct,
    removeProduct,
    send,
    onChargeSent,
    startLive,
    endLive,
  } = useLiveWorkspace();

  if (loading && dbConversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <LiveStatusBar activeSession={activeSession} onStartLive={startLive} onEndLive={endLive} />
      <div className="flex min-h-0 flex-1">
        {conversations.length > 0 && currentConv ? (
          <>
            <InboxColumn
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDemoLoaded={fetchConversations}
            />
            <ChatColumn
              conversation={currentConv}
              messages={messages}
              deadline={currentConv.apartado ? Date.now() + 25 * 60 * 1000 : null}
              bag={bag}
              folio={`LF-${reference}`}
              onApprove={approve}
              onOpenCharge={() => setChargeOpen(true)}
              onSend={send}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
            />
          </>
        ) : (
          <>
            <InboxColumn
              conversations={[]}
              selectedId=""
              onSelect={setSelectedId}
              onDemoLoaded={fetchConversations}
            />
            <ChatColumn
              conversation={null}
              messages={[]}
              deadline={null}
              bag={[]}
              folio="LF—"
              onApprove={() => {}}
              onOpenCharge={() => {}}
              onSend={send}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
            />
          </>
        )}
      </div>

      {currentConv && (
        <ChargeModal
          key={`${selectedId}-${chargeOpen}`}
          open={chargeOpen}
          onOpenChange={setChargeOpen}
          conversation={currentConv}
          bag={bag}
          onRemoveFromBag={(i) =>
            setBags((b) => ({ ...b, [selectedId]: bag.filter((_, idx) => idx !== i) }))
          }
          reference={reference}
          onSent={onChargeSent}
        />
      )}
    </>
  );
}
