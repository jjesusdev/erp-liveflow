'use client';

import { useMemo, useState } from 'react';
import { Lock, Search, Sparkles, MessageSquareDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUSES, type Conversation, type ConversationStatus } from '@/lib/liveflow-data';
import { Kbd, TierBadge } from '@/components/liveflow/primitives';

export const statusDot: Record<ConversationStatus, string> = {
  nuevos: 'bg-live',
  atencion: 'bg-foreground',
  esperando: 'bg-pending',
  pagados: 'bg-success',
  despachados: 'bg-transit',
};

export function InboxColumn({
  conversations,
  selectedId,
  onSelect,
  onSeedDemo,
}: {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onSeedDemo?: () => void;
}) {
  const [filter, setFilter] = useState<ConversationStatus | 'todos'>('todos');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        (filter === 'todos' || c.status === filter) &&
        (!q || c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))
    );
  }, [conversations, filter, query]);

  const counts = useMemo(() => {
    const acc = {} as Record<ConversationStatus, number>;
    for (const s of STATUSES) acc[s.id] = 0;
    for (const c of conversations) acc[c.status]++;
    return acc;
  }, [conversations]);

  return (
    <aside aria-label="Bandeja de conversaciones" className="flex min-h-0 w-[280px] shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Bandeja</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{conversations.length} chats</span>
        </div>
        <label className="relative block">
          <span className="sr-only">Buscar conversación</span>
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o teléfono"
            className="h-7 w-full rounded-md border border-input bg-background pr-8 pl-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Kbd className="absolute top-1/2 right-1.5 -translate-y-1/2">/</Kbd>
        </label>
        <div role="tablist" aria-label="Filtrar por estado" className="-mx-1 flex gap-1 overflow-x-auto px-1 scrollbar-thin">
          <FilterChip active={filter === 'todos'} onClick={() => setFilter('todos')} label="Todos" count={conversations.length} />
          {STATUSES.map((s) => (
            <FilterChip
              key={s.id}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
              label={s.short}
              count={counts[s.id]}
              dot={statusDot[s.id]}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {STATUSES.map((s) => {
          const group = filtered.filter((c) => c.status === s.id);
          if (!group.length) return null;
          return (
            <section key={s.id} aria-labelledby={`grp-${s.id}`}>
              <h3
                id={`grp-${s.id}`}
                className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur"
              >
                <span className={cn('size-1.5 rounded-full', statusDot[s.id])} aria-hidden />
                {s.label}
                <span className="ml-auto font-mono">{group.length}</span>
              </h3>
              <ul className="flex flex-col gap-1 p-1.5">
                {group.map((c) => (
                  <li key={c.id}>
                    <ConversationCard conversation={c} selected={c.id === selectedId} onSelect={() => onSelect(c.id)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <MessageSquareDashed className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">Esperando clientas</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Los mensajes del Live aparecerán aquí automáticamente en tiempo real.
            </p>
            {onSeedDemo && (
              <button
                type="button"
                onClick={onSeedDemo}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-all shadow-xs"
              >
                <Sparkles className="size-3.5 text-amber-500" />
                Cargar 5 chats de prueba
              </button>
            )}
          </div>
        )}

        {conversations.length > 0 && !filtered.length && (
          <p className="p-6 text-center text-xs text-muted-foreground">Sin conversaciones en este filtro.</p>
        )}
      </div>
    </aside>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors',
        active
          ? 'border-foreground/20 bg-foreground text-background font-semibold'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />}
      {label}
      <span className={cn('font-mono', active ? 'text-background/70' : 'text-muted-foreground/70')}>{count}</span>
    </button>
  );
}

function ConversationCard({
  conversation: c,
  selected,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const lockedByOther = c.lockedBy && c.lockedBy !== 'Mariana';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group flex w-full flex-col gap-1.5 rounded-md border p-2.5 text-left transition-colors',
        selected
          ? 'border-foreground/20 bg-card shadow-sm ring-1 ring-foreground/10'
          : 'border-transparent hover:border-border hover:bg-card'
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="truncate text-[13px] font-semibold tracking-tight">{c.name}</span>
        <TierBadge tier={c.tier} />
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {c.minutesAgo === 0 ? 'ahora' : `${c.minutesAgo}m`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{c.preview}</p>
        {c.unread > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-1 font-mono text-[10px] font-bold text-live-foreground">
            {c.unread}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{c.phone}</span>
        {c.lockedBy && (
          <span
            className={cn(
              'ml-auto inline-flex items-center gap-1 text-[10px] font-medium',
              lockedByOther ? 'text-pending font-bold' : 'text-muted-foreground'
            )}
          >
            <Lock className="size-2.5" aria-hidden />
            Atendiendo: {c.lockedBy}
          </span>
        )}
      </div>
    </button>
  );
}