'use client';

import { NavRail } from '@/components/liveflow/nav-rail';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}