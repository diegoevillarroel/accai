"use client";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  useListAccaiSessions,
  useGetDirective,
  useListReels,
  useListCompetitors,
  getListAccaiSessionsQueryKey
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccaiStream } from "@/lib/useAccaiStream";

type Mode = "BRIEF" | "AUTOPSIA" | "ESTRATEGIA" | "COMPETENCIA" | "RESPONDER" | "CIERRE DM" | "PATRONES";

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: "BRIEF", label: "BRIEF DE CONTENIDO", description: "Genera el próximo reel basado en tu historial" },
  { id: "AUTOPSIA", label: "AUTOPSIA DE REEL", description: "Disecciona el rendimiento de un reel específico" },
  { id: "ESTRATEGIA", label: "ESTRATEGIA GENERAL", description: "Análisis estratégico completo" },
  { id: "COMPETENCIA", label: "ANÁLISIS DE COMPETENCIA", description: "Detecta brechas estratégicas" },
  { id: "RESPONDER", label: "RESPONDER COMENTARIOS", description: "Redacta respuestas para comentarios sin responder" },
  { id: "CIERRE DM", label: "CIERRE DM", description: "Genera guion de cierre para conversaciones" },
  { id: "PATRONES", label: "PATRONES LINGÜÍSTICOS", description: "Reverse-engineering de hooks y vocabulario viral desde transcripciones reales" },
];

interface Comment {
  id: number;
  mediaId: string;
  username?: string | null;
  text?: string | null;
  commentTimestamp?: string | null;
  likeCount: number;
  replied: boolean;
  replyText?: string | null;
}

export function AccaiAI() {
  const queryClient = useQueryClient();
  const { data: sessions = [] } = useListAccaiSessions();
  const { data: directive } = useGetDirective();
  const { data: reels = [] } = useListReels();
  const { data: competitors = [] } = useListCompetitors();

  const [selectedMode, setSelectedMode] = useState<Mode>("BRIEF");
  const [userInput, setUserInput] = useState("");
  const [selectedReelId, setSelectedReelId] = useState<number | null>(null);

  const [unrepliedComments, setUnrepliedComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [draftedReplies, setDraftedReplies] = useState<Record<number, string>>({});
  const [markingReplied, setMarkingReplied] = useState<number | null>(null);

  const [cierreContext, setCierreContext] = useState("");
  const [funnelAlert, setFunnelAlert] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const accaiStream = useAccaiStream();
  const replyStream = useAccaiStream();

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [accaiStream.response]);

  useEffect(() => {
    const recent = reels.find(r => {
      const hours = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
      return r.firma === "CONVERTIDOR" && hours < 48;
    });
    if (recent) {
      setFunnelAlert(`// REEL CONVERTIDOR reciente: "${recent.tema || recent.fecha}" — Activa tu CIERRE DM`);
    }
  }, [reels]);

  useEffect(() => {
    if (selectedMode === "RESPONDER") loadUnrepliedComments();
  }, [selectedMode]);

  const loadUnrepliedComments = async () => {
    setCommentsLoading(true);
    try {
      const r = await fetch("/api/instagram/comments/cache");
      const d = await r.json();
      setUnrepliedComments((d.data || []).filter((c: Comment) => !c.replied));
    } catch {}
    setCommentsLoading(false);
  };

  const handleDraftReply = async (comment: Comment) => {
    setSelectedComment(comment);
    const prompt = `Eres Diego Villarroel de VILLACLUB. Redacta una respuesta breve, directa y en español para este comentario de Instagram. Tono: autoridad sin arrogancia, claridad, energía. Sin emojis en exceso. Máximo 2 oraciones.\n\nComentario de @${comment.username}: "${comment.text}"`;
    const result = await replyStream.stream({ mode: "BRIEF", userInput: prompt });
    setDraftedReplies(prev => ({ ...prev, [comment.id]: result }));
  };

  const handleMarkReplied = async (commentId: number) => {
    setMarkingReplied(commentId);
    try {
      await fetch(`/api/instagram/comments/${commentId}/mark-replied`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: draftedReplies[commentId] || "" }),
      });
      setUnrepliedComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
    setMarkingReplied(null);
  };

  const handleRun = async () => {
    let prompt = userInput;

    if (selectedMode === "BRIEF") {
      const directiveText = directive?.content || "Sin directiva definida";
      const recentReels = reels.slice(0, 10).map(r =>
        `- ${format(new Date(r.fecha), "dd/MM")} | ${r.tema || "sin tema"} | ${r.firma} | ${r.views.toLocaleString()} views | saves: ${r.savesPct.toFixed(1)}%`
      ).join("\n");
      prompt = `DIRECTIVA ACTUAL: ${directiveText}\n\nÚLTIMOS REELS:\n${recentReels}\n\n${userInput ? `CONTEXTO ADICIONAL: ${userInput}` : ""}`;
    }

    if (selectedMode === "AUTOPSIA" && selectedReelId) {
      const reel = reels.find(r => r.id === selectedReelId);
      if (reel) {
        prompt = `Reel:\nTema: ${reel.tema || "sin clasificar"}\nÁngulo: ${reel.angulo || "-"}\nViews: ${reel.views.toLocaleString()}\nSaves: ${reel.saves} (${reel.savesPct.toFixed(1)}%)\nLikes: ${reel.likes} (${reel.likesPct.toFixed(1)}%)\nComments: ${reel.comments}\nFirma: ${reel.firma}\nTranscripción: ${reel.transcripcion || "Sin transcripción"}\nNotas: ${reel.notas || ""}\n\n${userInput}`;
      }
    }

    if (selectedMode === "CIERRE DM") {
      prompt = `Contexto de la conversación:\n${cierreContext || userInput}`;
    }

    if (selectedMode === "COMPETENCIA") {
      const compList = competitors.map(c => `${c.handle} — ${c.nicho}`).join("\n");
      prompt = `Competidores monitoreados:\n${compList}\n\n${userInput}`;
    }

    await accaiStream.stream({
      mode: selectedMode,
      userInput: prompt,
      reelId: selectedReelId || undefined,
      competitorIds: selectedMode === "COMPETENCIA" ? competitors.map(c => c.id) : undefined,
    });

    queryClient.invalidateQueries({ queryKey: getListAccaiSessionsQueryKey() });
  };

  const currentMode = MODES.find(m => m.id === selectedMode);

  return (
    <div className="space-y-8">
      {/* FUNNEL ALERT */}
      {funnelAlert && (
        <div style={{ background: "rgba(12,45,245,0.06)", border: "1px solid rgba(12,45,245,0.2)", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>{funnelAlert}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedMode("CIERRE DM"); accaiStream.clear(); }}
              style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "transparent", padding: "4px 12px", fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "background 150ms, color 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
            >
              IR A CIERRE DM
            </button>
            <button onClick={() => setFunnelAlert(null)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>✕</button>
          </div>
        </div>
      )}

      {/* MODE SELECTOR */}
      <div className="vc-mode-tabs">
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => { setSelectedMode(mode.id); accaiStream.clear(); }}
            className={`vc-mode-tab${selectedMode === mode.id ? " active" : ""}`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* LEFT: Input Panel */}
        <div className="col-span-1 space-y-4">
          <div>
            <div className="vc-section-title">// {currentMode?.label}</div>
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "12px", lineHeight: 1.6, marginTop: "4px" }}>
              {currentMode?.description}
            </div>
          </div>

          {selectedMode === "AUTOPSIA" && (
            <div>
              <label className="text-[#666666] text-xs mb-2 block font-mono">SELECCIONA EL REEL</label>
              <Select value={selectedReelId?.toString() || ""} onValueChange={v => setSelectedReelId(Number(v))}>
                <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0 text-sm">
                  <SelectValue placeholder="Selecciona reel..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white max-h-48">
                  {reels.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {format(new Date(r.fecha), "dd/MM/yy")} — {r.tema || "sin tema"} ({r.firma})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedMode === "CIERRE DM" && (
            <div>
              <label className="text-[#666666] text-xs mb-2 block font-mono">CONTEXTO DE LA CONVERSACION</label>
              <Textarea
                value={cierreContext}
                onChange={e => setCierreContext(e.target.value)}
                placeholder="Pega el historial de DM o describe el contexto del lead..."
                className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white font-mono min-h-[100px] text-xs"
              />
            </div>
          )}

          {selectedMode === "PATRONES" ? (
            <div className="space-y-4">
              <div className="border border-[#0C2DF5]/20 bg-[#0C2DF5]/5 p-4 font-mono text-xs text-[#666666] leading-relaxed">
                // Analizará transcripciones propias y de competidores contra métricas.<br />
                // Requiere transcripciones cargadas (usa TRANSCRIBIR TODO en REELS).<br />
                // Output: hooks virales, vocabulario de conversión, fórmula replicable.
              </div>
              <Button
                onClick={handleRun}
                disabled={accaiStream.isStreaming}
                className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono"
                data-testid="button-run-accai"
              >
                {accaiStream.isStreaming ? "// analizando patrones..." : "ANALIZAR PATRONES"}
              </Button>
            </div>
          ) : selectedMode === "RESPONDER" ? (
            <div className="space-y-3">
              {commentsLoading ? (
                <div className="text-[#0C2DF5] font-mono text-xs">// cargando comentarios...</div>
              ) : unrepliedComments.length === 0 ? (
                <div className="text-[#666666] font-mono text-xs border border-[#1A1A1A] p-4">
                  // Sin comentarios pendientes.
                </div>
              ) : (
                unrepliedComments.map(c => (
                  <div key={c.id} className={`border p-3 space-y-2 transition-colors ${selectedComment?.id === c.id ? "border-[#0C2DF5]" : "border-[#1A1A1A]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-[#0C2DF5] font-mono text-xs">@{c.username} </span>
                        <span className="text-[#F0F0F0] font-mono text-xs">{c.text}</span>
                      </div>
                      {c.likeCount > 0 && <span className="text-[#666666] font-mono text-[10px]">{c.likeCount}♥</span>}
                    </div>
                    {draftedReplies[c.id] && (
                      <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-2 font-mono text-xs text-[#F0F0F0]">
                        {draftedReplies[c.id]}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleDraftReply(c)} disabled={replyStream.isStreaming} className="text-[#0C2DF5] border border-[#0C2DF5] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider hover:bg-[#0C2DF5] hover:text-white transition-colors">
                        {replyStream.isStreaming && selectedComment?.id === c.id ? "..." : "REDACTAR"}
                      </button>
                      {draftedReplies[c.id] && (
                        <button onClick={() => handleMarkReplied(c.id)} disabled={markingReplied === c.id} className="text-[#00CC66] border border-[#00CC66] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider hover:bg-[#00CC66] hover:text-black transition-colors">
                          {markingReplied === c.id ? "..." : "✓ RESPONDIDO"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder={
                  selectedMode === "BRIEF" ? "Instrucciones adicionales (opcional)..." :
                  selectedMode === "AUTOPSIA" ? "¿Qué quieres entender de este reel?" :
                  "Escribe tu pregunta o contexto..."
                }
                className="w-full bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white font-mono min-h-[140px] text-sm"
              />
              <Button
                onClick={handleRun}
                disabled={accaiStream.isStreaming || (selectedMode === "AUTOPSIA" && !selectedReelId)}
                className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono"
                data-testid="button-run-accai"
              >
                {accaiStream.isStreaming ? "// procesando..." : `EJECUTAR ${selectedMode}`}
              </Button>
            </div>
          )}

          {(accaiStream.tokensIn !== null || accaiStream.error) && (
            <div className="font-mono text-[10px] text-[#444444] space-y-1">
              {accaiStream.tokensIn !== null && (
                <div>// tokens: {accaiStream.tokensIn?.toLocaleString()} in / {accaiStream.tokensOut?.toLocaleString()} out</div>
              )}
              {accaiStream.error && <div className="text-[#FF2D20]">// error en la generación</div>}
            </div>
          )}
        </div>

        {/* RIGHT: Response */}
        <div className="col-span-2 space-y-4">
          <div className="vc-section-title">// RESPUESTA</div>
          <div
            ref={responseRef}
            className="vc-card"
            style={{ minHeight: "400px", maxHeight: "600px", overflowY: "auto", fontFamily: "var(--font-display)", fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: 1.8, color: "var(--text-primary)", padding: "24px" }}
            data-testid="div-accai-response"
          >
            {accaiStream.response ? (
              <>
                {accaiStream.response}
                {accaiStream.isStreaming && <span className="text-[#0C2DF5] animate-pulse ml-1">_</span>}
              </>
            ) : (
              <span className="text-[#333333]">
                {accaiStream.isStreaming ? <span className="text-[#0C2DF5] animate-pulse">// generando...</span> : "// Selecciona un modo y ejecuta"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SESSION HISTORY */}
      <section>
        <div className="vc-section-title" data-testid="title-sessions">// HISTORIAL DE SESIONES</div>
        <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="vc-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Modo</th>
                <th>Respuesta</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: "var(--font-body)" }}>
              {sessions.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-display)", fontSize: "11px" }}>// Sin sesiones registradas</td></tr>
              ) : (
                sessions.slice(0, 20).map((session) => (
                  <tr key={session.id}>
                    <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "12px" }}>{format(new Date(session.createdAt), "dd/MM/yy HH:mm")}</td>
                    <td>
                      <span style={{ color: "var(--accent)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{session.mode}</span>
                    </td>
                    <td style={{ maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: "12px" }} title={session.response}>
                      {(session.response || "").substring(0, 120)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
