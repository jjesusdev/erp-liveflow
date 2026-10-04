import * as React from 'react';
import { cn } from '@/lib/utils';

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-xs select-none',
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function TierBadge({ tier, className }: { tier?: 'VIP' | 'FREQUENT' | 'NEW' | 'GHOST' | string | null; className?: string }) {
  if (!tier || tier === 'NEW' || tier === 'nuevas') return null;

  if (tier === 'VIP' || tier === 'vip') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 dark:text-amber-400',
          className
        )}
      >
        ★ VIP
      </span>
    );
  }

  if (tier === 'FREQUENT' || tier === 'recurrentes') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500 dark:text-blue-400',
          className
        )}
      >
        RECURRENTE
      </span>
    );
  }

  return null;
}