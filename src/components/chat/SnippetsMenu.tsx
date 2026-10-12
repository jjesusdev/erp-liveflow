'use client';

import { Sparkles } from 'lucide-react';
import type { MessageTemplate } from '@/types';

interface SnippetsMenuProps {
  templates: MessageTemplate[];
  onSelect: (template: MessageTemplate) => void;
}

export function SnippetsMenu({ templates, onSelect }: SnippetsMenuProps) {
  if (templates.length === 0) return null;

  return (
    <div className="absolute bottom-16 left-3 right-3 rounded-xl border border-border bg-card p-2 shadow-2xl z-30 max-h-56 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border pb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <Sparkles className="size-3.5 text-primary" /> Respuestas Rapidas (Atajos &apos;/&apos;)
        </span>
        <span className="text-[10px] lowercase font-normal">Clic para insertar</span>
      </div>
      <div className="mt-1 space-y-1">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className="w-full text-left rounded-lg p-2 text-xs hover:bg-accent flex items-start justify-between gap-2 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{t.name}</span>
                {t.shortcut && (
                  <code className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-primary">
                    /{t.shortcut}
                  </code>
                )}
              </div>
              <p className="truncate text-muted-foreground text-[11px] mt-0.5">{t.content}</p>
            </div>
            <span className="text-[10px] text-primary font-medium shrink-0 pt-0.5">
              Insertar ↵
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
