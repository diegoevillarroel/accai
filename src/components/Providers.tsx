"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import { AccaiChat } from "@/components/AccaiChat";

function KeyboardShortcuts({ onToggleChat }: { onToggleChat: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.dispatchEvent(new CustomEvent("accai:escape"));
      }
      if (e.key === "k" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onToggleChat();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggleChat]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <KeyboardShortcuts onToggleChat={() => setChatOpen(o => !o)} />
        {children}
        <AccaiChat open={chatOpen} onClose={() => setChatOpen(false)} onOpen={() => setChatOpen(true)} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
