import { useState, useCallback } from "react";

export interface StreamState {
  response: string;
  isStreaming: boolean;
  error: boolean;
  tokensIn: number | null;
  tokensOut: number | null;
}

export function useAccaiStream() {
  const [state, setState] = useState<StreamState>({
    response: "",
    isStreaming: false,
    error: false,
    tokensIn: null,
    tokensOut: null,
  });

  const stream = useCallback(async (payload: {
    mode: string;
    userInput?: string;
    reelId?: number;
    competitorIds?: number[];
  }) => {
    setState({ response: "", isStreaming: true, error: false, tokensIn: null, tokensOut: null });
    let fullText = "";

    try {
      const resp = await fetch("/api/accai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        setState(s => ({ ...s, isStreaming: false, error: true }));
        return "";
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setState(s => ({ ...s, response: fullText }));
            }
            if (parsed.tokensInput) {
              setState(s => ({ ...s, tokensIn: parsed.tokensInput, tokensOut: parsed.tokensOutput || 0 }));
            }
          } catch {}
        }
      }
    } catch {
      setState(s => ({ ...s, error: true }));
    } finally {
      setState(s => ({ ...s, isStreaming: false }));
    }
    return fullText;
  }, []);

  const clear = useCallback(() => {
    setState({ response: "", isStreaming: false, error: false, tokensIn: null, tokensOut: null });
  }, []);

  return { ...state, stream, clear };
}
