'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}