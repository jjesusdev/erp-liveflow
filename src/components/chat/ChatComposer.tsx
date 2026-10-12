'use client';

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MessageTemplate } from '@/types';

interface ChatComposerProps {
  newMessage: string;
  sending: boolean;
  pastingImage: string | null;
  templates: MessageTemplate[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSend: () => void;
  onSendImage: () => void;
  onInsertSnippet: (template: MessageTemplate) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatComposer({
  newMessage,
  sending,
  pastingImage,
  templates,
  onInputChange,
  onPaste,
  onSend,
  onSendImage,
  onInsertSnippet,
  inputRef,
}: ChatComposerProps) {
  return (
    <div className="border-t border-border p-3 bg-card">
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-muted-foreground font-medium shrink-0">Atajos:</span>
        {templates.slice(0, 4).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onInsertSnippet(t)}
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
          onChange={onInputChange}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (pastingImage) {
                onSendImage();
              } else {
                onSend();
              }
            }
          }}
          placeholder="Escribe un mensaje, '/' para atajos o pega captura..."
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          variant="default"
          size="sm"
          onClick={() => (pastingImage ? onSendImage() : onSend())}
          disabled={sending || (!newMessage.trim() && !pastingImage)}
          className="h-8 gap-1 font-bold"
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
