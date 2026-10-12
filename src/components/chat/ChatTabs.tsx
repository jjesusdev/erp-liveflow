"use client";

import { cn } from "@/lib/utils";
import { User, MapPin, Printer } from "lucide-react";
import type { ChatTab } from "@/hooks/useChatPanel";

const TABS: { id: ChatTab; label: string; icon?: React.ReactNode }[] = [
  { id: "chat", label: "Chat en Vivo" },
  { id: "profile", label: "Ficha 360°", icon: <User className="size-3" /> },
  { id: "address", label: "Direccion", icon: <MapPin className="size-3" /> },
  { id: "packing", label: "Etiqueta", icon: <Printer className="size-3" /> },
];

interface ChatTabsProps {
  activeTab: ChatTab;
  onChange: (tab: ChatTab) => void;
}

export function ChatTabs({ activeTab, onChange }: ChatTabsProps) {
  return (
    <div className="flex border-b border-border bg-muted/30 px-3 pt-1 text-xs font-semibold overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1 border-b-2 px-3 py-1.5 transition-all shrink-0 text-xs",
            activeTab === tab.id
              ? "border-primary text-primary font-bold bg-background rounded-t-md"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
