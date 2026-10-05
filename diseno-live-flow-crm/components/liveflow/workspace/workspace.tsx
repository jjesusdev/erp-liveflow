'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CONVERSATIONS, THREAD, type Conversation, type Message, type Product } from '@/lib/liveflow-data'
import { makeReference, money } from '@/lib/format'
import { InboxColumn } from './inbox-column'
import { ChatColumn } from './chat-column'
import { CustomerPanel } from './customer-panel'
import { ChargeModal } from './charge-modal'
import { LiveStatusBar } from './live-status-bar'

function nowTime() {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function Workspace() {
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS)
  const [selectedId, setSelectedId] = useState('c1')
  const [threads, setThreads] = useState<Record<string, Message[]>>({ c1: THREAD })
  const [bags, setBags] = useState<Record<string, Product[]>>({})
  const [chargeOpen, setChargeOpen] = useState(false)
  const [deadlines, setDeadlines] = useState<Record<string, number>>(() => {
    const start = Date.now()
    return Object.fromEntries(
      CONVERSATIONS.filter((c) => c.apartado).map((c) => [c.id, start + c.apartado!.expiresInSec * 1000]),
    )
  })

  const conversation = conversations.find((c) => c.id === selectedId)!
  const messages = useMemo(
    () =>
      threads[selectedId] ?? [
        { id: `${selectedId}-0`, kind: 'text' as const, from: 'in' as const, text: conversation.preview, time: nowTime() },
      ],
    [threads, selectedId, conversation.preview],
  )
  const bag = bags[selectedId] ?? []
  const reference = makeReference(selectedId.charCodeAt(1) * 7919 + bag.length)

  const pushMessage = (m: Message) => setThreads((t) => ({ ...t, [selectedId]: [...messages, m] }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setChargeOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const approve = () => {
    const amount = conversation.apartado?.amount ?? 450
    setThreads((t) => ({
      ...t,
      [selectedId]: [
        ...messages.map((m) => (m.kind === 'receipt' ? { ...m, approved: true } : m)),
        {
          id: crypto.randomUUID(),
          kind: 'text',
          from: 'out',
          text: `Pago confirmado ✅ ${money(amount)} MXN. Folio LF-${reference}. ¡Tu pedido sale mañana!`,
          time: nowTime(),
        },
      ],
    }))
    setConversations((cs) =>
      cs.map((c) =>
        c.id === selectedId
          ? { ...c, status: 'pagados', apartado: undefined, unread: 0, totalSpent: c.totalSpent + amount, paidOrders: c.paidOrders + 1 }
          : c,
      ),
    )
    setDeadlines((d) => {
      const { [selectedId]: _, ...rest } = d
      return rest
    })
    toast.success('Pago aprobado', { description: `${conversation.name} · ${money(amount)} MXN · movido a Pagados` })
  }

  const addProduct = (p: Product) => {
    setBags((b) => ({ ...b, [selectedId]: [...(b[selectedId] ?? []), p] }))
    pushMessage({
      id: crypto.randomUUID(),
      kind: 'text',
      from: 'out',
      text: `Agregado a tu Bolsa Live: ${p.name} (T.${p.size}) · ${money(p.price)}`,
      time: nowTime(),
    })
    toast(`${p.name} agregado a la bolsa`, { description: `${bag.length + 1} prenda(s) en la Bolsa Live` })
  }

  const send = (text: string, image?: string) => {
    pushMessage(
      image
        ? { id: crypto.randomUUID(), kind: 'image', from: 'out', src: image, caption: text || undefined, time: nowTime() }
        : { id: crypto.randomUUID(), kind: 'text', from: 'out', text, time: nowTime() },
    )
  }

  const onChargeSent = (amount: number, _method: string, text: string) => {
    pushMessage({ id: crypto.randomUUID(), kind: 'text', from: 'out', text, time: nowTime() })
    setConversations((cs) =>
      cs.map((c) =>
        c.id === selectedId ? { ...c, status: 'esperando', apartado: { amount, expiresInSec: 30 * 60 } } : c,
      ),
    )
    setDeadlines((d) => ({ ...d, [selectedId]: Date.now() + 30 * 60 * 1000 }))
  }

  return (
    <>
      <LiveStatusBar />
      <div className="flex min-h-0 flex-1">
        <InboxColumn conversations={conversations} selectedId={selectedId} onSelect={setSelectedId} />
        <ChatColumn
          conversation={conversation}
          messages={messages}
          deadline={deadlines[selectedId] ?? null}
          onApprove={approve}
          onOpenCharge={() => setChargeOpen(true)}
          onSend={send}
          onAddProduct={addProduct}
        />
        <CustomerPanel conversation={conversation} bag={bag} folio={`LF-${reference}`} />
      </div>
      <ChargeModal
        key={`${selectedId}-${chargeOpen}`}
        open={chargeOpen}
        onOpenChange={setChargeOpen}
        conversation={conversation}
        bag={bag}
        onRemoveFromBag={(i) => setBags((b) => ({ ...b, [selectedId]: bag.filter((_, idx) => idx !== i) }))}
        reference={reference}
        onSent={onChargeSent}
      />
    </>
  )
}
