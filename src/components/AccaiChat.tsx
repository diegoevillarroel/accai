"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, X, ArrowUp } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AccaiChatProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

function formatCost(input: number, output: number): string {
  const cost = input * 0.000003 + output * 0.000015;
  return `$${cost.toFixed(4)}`;
}

export function AccaiChat({ open, onClose, onOpen }: AccaiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);
  const [totalInput, setTotalInput] = useState(0);
  const [totalOutput, setTotalOutput] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const newUserMsg: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setInput("");
    setStreaming(true);

    let assistantContent = "";
    const assistantIdx = newHistory.length;
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const body = JSON.stringify({
      mode: "CHAT",
      messages: newHistory,
    });

    const controller = new AbortController();
    abortRef.current = () => controller.abort();

    try {
      const res = await fetch("/api/accai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[assistantIdx] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
            if (parsed.tokensInput !== undefined) {
              const inp = parsed.tokensInput as number;
              const out = parsed.tokensOutput as number;
              const cost = inp * 0.000003 + out * 0.000015;
              setTotalInput(p => p + inp);
              setTotalOutput(p => p + out);
              setSessionCost(p => p + cost);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          updated[assistantIdx] = { role: "assistant", content: "// error al conectar con ACCAI" };
          return updated;
        });
      }
    }

    setStreaming(false);
    abortRef.current = null;
  }, [input, messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearConversation = useCallback(() => {
    setMessages([]);
    setSessionCost(0);
    setTotalInput(0);
    setTotalOutput(0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        onClose();
      }
      if (open && e.key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        clearConversation();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, clearConversation]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={onOpen}
        className="fixed bottom-7 right-7 z-50 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#4d6cff] to-[#2d4ae0] text-white shadow-[0_12px_40px_-8px_rgba(77,108,255,0.65)] transition hover:scale-105 hover:brightness-110 active:scale-[0.98]"
        style={{ display: open ? "none" : "flex" }}
        title="ACCAI Chat (Ctrl+Shift+K)"
      >
        <MessageSquare size={24} color="white" />
      </button>

      {/* Chat panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-[min(440px,100vw)] flex-col border-l border-white/10 bg-[#07080c]/95 shadow-[-24px_0_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-transform duration-200 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div style={{
          height: "56px",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "14px",
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.05em",
            }}>
              // ACCAI
            </div>
            <div style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.25)",
              marginTop: "1px",
              fontFamily: "Inter, sans-serif",
            }}>
              sonnet-4 · ${sessionCost.toFixed(4)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/5 hover:text-white"
            aria-label="Cerrar chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {messages.length === 0 && (
            <div style={{
              color: "rgba(255,255,255,0.15)",
              fontSize: "11px",
              fontFamily: "'Space Mono', monospace",
              textAlign: "center",
              marginTop: "40px",
              lineHeight: 1.8,
            }}>
              // ACCAI listo<br />
              // qué grabas hoy, Diego
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  background: msg.role === "user"
                    ? "rgba(12, 45, 245, 0.15)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${msg.role === "user" ? "rgba(12,45,245,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: msg.role === "user" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.85)",
                  fontSize: "13px",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content || (msg.role === "assistant" && streaming && i === messages.length - 1
                  ? <span style={{ color: "rgba(12,45,245,0.8)", animation: "pulse 1.5s ease-in-out infinite" }}>// analizando...</span>
                  : null
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "12px 16px 8px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta algo..."
              rows={1}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "10px 14px",
                color: "white",
                fontSize: "13px",
                fontFamily: "Inter, sans-serif",
                resize: "none",
                outline: "none",
                borderRadius: "6px",
                maxHeight: "120px",
                lineHeight: 1.5,
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "#0C2DF5";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(12,45,245,0.15)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
              disabled={streaming}
            />
            <button
              type="button"
              onClick={send}
              disabled={streaming || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d6cff] to-[#2d4ae0] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={18} color="white" />
            </button>
          </div>
          <div style={{
            fontSize: "9px",
            color: "rgba(255,255,255,0.15)",
            marginTop: "6px",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.04em",
          }}>
            ↵ enter · esc cerrar · ctrl+l limpiar
          </div>
        </div>
      </div>
    </>
  );
}
