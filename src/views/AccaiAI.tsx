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

type Mode = "WEEKLY_BRIEF" | "BRIEF" | "THREADS" | "AUTOPSIA" | "COMPETENCIA" | "CIERRE DM" | "PATRONES" | "RESPONDER";

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: "WEEKLY_BRIEF", label: "BRIEF SEMANAL", description: "Diagnóstico de los últimos 7 días y prioridad estratégica" },
  { id: "BRIEF", label: "GUION REEL", description: "Genera el próximo reel (HOOK -> RETENCIÓN -> CTA)" },
  { id: "THREADS", label: "THREADS", description: "Genera statements de operador para Threads" },
  { id: "AUTOPSIA", label: "AUTOPSIA DE REEL", description: "Disecciona el rendimiento de un reel específico" },
  { id: "COMPETENCIA", label: "ANÁLISIS DE COMPETENCIA", description: "Detecta brechas estratégicas" },
  { id: "CIERRE DM", label: "CIERRE DM", description: "Genera guion de cierre para conversaciones" },
  { id: "PATRONES", label: "PATRONES LINGÜÍSTICOS", description: "Reverse-engineering de hooks y vocabulario viral" },
  { id: "RESPONDER", label: "RESPONDER COMENTARIOS", description: "Redacta respuestas para comentarios sin responder" },
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

    if (selectedMode === "WEEKLY_BRIEF") {
      const recentReels = reels.slice(0, 10).map(r =>
        `- ${format(new Date(r.fecha), "dd/MM")} | ${r.tema || "sin tema"} | Views: ${r.views.toLocaleString()} | Saves: ${r.savesPct.toFixed(1)}% | Firma: ${r.firma}`
      ).join("\n");
      prompt = `DATOS ÚLTIMOS 7 DÍAS:\n${recentReels}\n\n${userInput ? `NOTAS ADICIONALES: ${userInput}` : ""}`;
    }

    if (selectedMode === "BRIEF") {
      const directiveText = directive?.content || "Sin directiva definida";
      const recentReels = reels.slice(0, 10).map(r =>
        `- ${format(new Date(r.fecha), "dd/MM")} | ${r.tema || "sin tema"} | ${r.firma} | ${r.views.toLocaleString()} views | saves: ${r.savesPct.toFixed(1)}%`
      ).join("\n");
      prompt = `DIRECTIVA ACTUAL: ${directiveText}\n\nÚLTIMOS REELS (DATOS DE RETENCIÓN):\n${recentReels}\n\n${userInput ? `INSTRUCCIONES: ${userInput}` : ""}`;
    }

    if (selectedMode === "THREADS") {
      prompt = userInput || "Generar statements de operador basados en la directiva actual.";
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
        <div className="vc-alert-premium flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs leading-relaxed text-[var(--vc-accent)]">{funnelAlert}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSelectedMode("CIERRE DM"); accaiStream.clear(); }}
              className="rounded-lg border border-[var(--vc-accent)]/50 bg-[var(--vc-accent)]/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-[var(--vc-accent)] transition hover:bg-[var(--vc-accent)] hover:text-white"
            >
              Ir a cierre DM
            </button>
            <button
              type="button"
              onClick={() => setFunnelAlert(null)}
              className="rounded-lg p-2 text-lg leading-none text-white/35 transition hover:bg-white/5 hover:text-white"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* MODE SELECTOR */}
      <div className="vc-mode-tabs">
        {MODES.map(mode => (
          <button
            type="button"
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
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-white/45">
              {currentMode?.description}
            </p>
          </div>

          {selectedMode === "AUTOPSIA" && (
            <div>
              <label className="mb-2 block font-mono text-xs text-white/40">Selecciona el reel</label>
              <Select value={selectedReelId?.toString() || ""} onValueChange={v => setSelectedReelId(Number(v))}>
                <SelectTrigger className="h-11 rounded-xl border border-white/10 bg-black/40 text-sm text-white focus:ring-2 focus:ring-[var(--accent-glow)]">
                  <SelectValue placeholder="Selecciona reel..." />
                </SelectTrigger>
                <SelectContent className="max-h-48 rounded-xl border border-white/10 bg-[#0c0e14] text-white shadow-2xl">
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
              <label className="mb-2 block font-mono text-xs text-white/40">Contexto de la conversación</label>
              <Textarea
                value={cierreContext}
                onChange={e => setCierreContext(e.target.value)}
                placeholder="Pega el historial de DM o describe el contexto del lead..."
                className="min-h-[100px] rounded-xl border border-white/10 bg-black/40 font-mono text-xs text-white placeholder:text-white/25 focus-visible:border-[var(--vc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)]"
              />
            </div>
          )}

          {selectedMode === "PATRONES" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--vc-accent)]/20 bg-[var(--vc-accent)]/5 p-4 font-mono text-xs leading-relaxed text-white/50">
                // Analizará transcripciones propias y de competidores contra métricas.<br />
                // Requiere transcripciones cargadas (usa TRANSCRIBIR TODO en REELS).<br />
                // Output: hooks virales, vocabulario de conversión, fórmula replicable.
              </div>
              <Button
                type="button"
                onClick={handleRun}
                disabled={accaiStream.isStreaming}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-[#4d6cff] to-[#3d5cff] font-mono text-xs uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 hover:brightness-110"
                data-testid="button-run-accai"
              >
                {accaiStream.isStreaming ? "// analizando patrones..." : "ANALIZAR PATRONES"}
              </Button>
            </div>
          ) : selectedMode === "RESPONDER" ? (
            <div className="space-y-3">
              {commentsLoading ? (
                <div className="font-mono text-xs text-[var(--vc-accent)]">Cargando comentarios…</div>
              ) : unrepliedComments.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-xs text-white/40">
                  Sin comentarios pendientes.
                </div>
              ) : (
                unrepliedComments.map(c => (
                  <div key={c.id} className={`space-y-2 rounded-xl border p-3 transition-colors ${selectedComment?.id === c.id ? "border-[var(--vc-accent)]/60 bg-[var(--vc-accent)]/5" : "border-white/10 bg-black/20"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-mono text-xs text-[var(--vc-accent)]">@{c.username} </span>
                        <span className="font-mono text-xs text-white/85">{c.text}</span>
                      </div>
                      {c.likeCount > 0 && <span className="font-mono text-[10px] text-white/35">{c.likeCount}♥</span>}
                    </div>
                    {draftedReplies[c.id] && (
                      <div className="rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-xs text-white/90">
                        {draftedReplies[c.id]}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleDraftReply(c)} disabled={replyStream.isStreaming} className="rounded-lg border border-[var(--vc-accent)] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--vc-accent)] transition hover:bg-[var(--vc-accent)] hover:text-white disabled:opacity-50">
                        {replyStream.isStreaming && selectedComment?.id === c.id ? "…" : "Redactar"}
                      </button>
                      {draftedReplies[c.id] && (
                        <button type="button" onClick={() => handleMarkReplied(c.id)} disabled={markingReplied === c.id} className="rounded-lg border border-emerald-500/50 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500 hover:text-black disabled:opacity-50">
                          {markingReplied === c.id ? "…" : "Marcar respondido"}
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
                className="min-h-[140px] w-full rounded-xl border border-white/10 bg-black/40 font-mono text-sm text-white placeholder:text-white/25 focus-visible:border-[var(--vc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)]"
              />
              <Button
                type="button"
                onClick={handleRun}
                disabled={accaiStream.isStreaming || (selectedMode === "AUTOPSIA" && !selectedReelId)}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-[#4d6cff] to-[#3d5cff] font-mono text-xs uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 disabled:opacity-50"
                data-testid="button-run-accai"
              >
                {accaiStream.isStreaming ? "// procesando..." : `EJECUTAR ${selectedMode}`}
              </Button>
            </div>
          )}

          {(accaiStream.tokensIn !== null || accaiStream.error) && (
            <div className="space-y-1 font-mono text-[10px] text-white/30">
              {accaiStream.tokensIn !== null && (
                <div>Tokens: {accaiStream.tokensIn?.toLocaleString()} in · {accaiStream.tokensOut?.toLocaleString()} out</div>
              )}
              {accaiStream.error && <div className="text-[var(--danger)]">Error en la generación</div>}
            </div>
          )}
        </div>

        {/* RIGHT: Response */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="vc-section-title">// RESPUESTA</div>
            {accaiStream.response && !accaiStream.isStreaming && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(accaiStream.response || "");
                  alert("Contenido copiado.");
                }}
                className="font-mono text-[10px] text-[var(--vc-accent)] hover:text-white transition-colors"
              >
                [ COPIAR CONTENIDO ]
              </button>
            )}
          </div>
          <div
            ref={responseRef}
            className="vc-preview-panel min-h-[400px] max-h-[min(600px,70vh)] overflow-y-auto p-6 font-mono text-[13px] leading-[1.85] text-white/90 [white-space:pre-wrap]"
            data-testid="div-accai-response"
          >
            {accaiStream.response ? (
              <>
                {accaiStream.response}
                {accaiStream.isStreaming && <span className="ml-1 animate-pulse text-[var(--vc-accent)]">▍</span>}
              </>
            ) : (
              <span className="text-white/20">
                {accaiStream.isStreaming ? <span className="animate-pulse text-[var(--vc-accent)]">Generando…</span> : "Selecciona un modo y pulsa ejecutar. La respuesta aparecerá aquí."}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SESSION HISTORY */}
      <section>
        <div className="vc-section-title" data-testid="title-sessions">// HISTORIAL DE SESIONES</div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 backdrop-blur-md">
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
