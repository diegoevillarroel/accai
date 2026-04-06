"use client";
import { useState } from "react";
import {
  useListCompetitors,
  useCreateCompetitor,
  useDeleteCompetitor,
  useListCompetitorReels,
  useCreateCompetitorReel,
  useDeleteCompetitorReel,
  getListCompetitorsQueryKey,
  getListCompetitorReelsQueryKey
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RefreshCw } from "lucide-react";
import { useAccaiStream } from "@/lib/useAccaiStream";

export function Competidores() {
  const queryClient = useQueryClient();
  const { data: competitors = [], isLoading: isLoadingCompetitors } = useListCompetitors();
  const { data: competitorReels = [], isLoading: isLoadingReels } = useListCompetitorReels();

  const createCompetitor = useCreateCompetitor();
  const deleteCompetitor = useDeleteCompetitor();
  const createReel = useCreateCompetitorReel();
  const deleteReel = useDeleteCompetitorReel();

  const [isCompOpen, setIsCompOpen] = useState(false);
  const [compForm, setCompForm] = useState({ handle: "", nicho: "", followersApprox: "", notas: "" });

  const [isReelOpen, setIsReelOpen] = useState(false);
  const [reelForm, setReelForm] = useState({
    competitorId: "", url: "", tema: "", hook: "", viewsApprox: "", engagementLevel: "", anguloDetectado: "", transcripcion: "", notas: ""
  });

  const [syncingHandle, setSyncingHandle] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<{handle: string; msg: string} | null>(null);
  const [transcribingId, setTranscribingId] = useState<number | null>(null);
  const [transcribeMsg, setTranscribeMsg] = useState<{id: number; msg: string} | null>(null);

  const brechasStream = useAccaiStream();

  const handleSaveCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    let handle = compForm.handle.trim();
    if (!handle.startsWith("@")) handle = "@" + handle;

    createCompetitor.mutate({
      data: {
        handle,
        nicho: compForm.nicho,
        followersApprox: compForm.followersApprox ? Number(compForm.followersApprox) : null,
        notas: compForm.notas || null
      }
    }, {
      onSuccess: async (data) => {
        queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey() });
        setIsCompOpen(false);
        setCompForm({ handle: "", nicho: "", followersApprox: "", notas: "" });
        // Auto-pull from IG after adding
        const rawHandle = handle.replace("@", "");
        try {
          const r = await fetch("/api/instagram/competitor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handle: rawHandle }),
          });
          const d = await r.json();
          if (d.followers) {
            queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey() });
          }
        } catch {}
      }
    });
  };

  const handleSyncCompetitor = async (handle: string) => {
    setSyncingHandle(handle);
    setSyncMsg(null);
    try {
      const rawHandle = handle.replace("@", "");
      const r = await fetch("/api/instagram/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: rawHandle }),
      });
      const d = await r.json();
      if (d.error) {
        setSyncMsg({ handle, msg: `// error: ${d.error}` });
      } else {
        setSyncMsg({ handle, msg: `// sync OK — ${d.postsImported || 0} posts` });
        queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey() });
      }
    } catch (e: any) {
      setSyncMsg({ handle, msg: `// error: ${e.message}` });
    }
    setSyncingHandle(null);
  };

  const handleTranscribeBatch = async (competitorId: number) => {
    setTranscribingId(competitorId);
    setTranscribeMsg(null);
    try {
      const r = await fetch("/api/transcribe/competitor-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      });
      const d = await r.json();
      if (d.error) {
        setTranscribeMsg({ id: competitorId, msg: `// error: ${d.error}` });
      } else {
        setTranscribeMsg({ id: competitorId, msg: `// ${d.transcribed} transcritos / ${d.failed} fallaron` });
        queryClient.invalidateQueries({ queryKey: getListCompetitorReelsQueryKey() });
      }
    } catch (e: any) {
      setTranscribeMsg({ id: competitorId, msg: `// error: ${e.message}` });
    }
    setTranscribingId(null);
  };

  const handleSaveReel = (e: React.FormEvent) => {
    e.preventDefault();
    createReel.mutate({
      data: {
        competitorId: Number(reelForm.competitorId),
        url: reelForm.url || null,
        tema: reelForm.tema,
        hook: reelForm.hook,
        viewsApprox: reelForm.viewsApprox ? Number(reelForm.viewsApprox) : null,
        engagementLevel: reelForm.engagementLevel,
        anguloDetectado: reelForm.anguloDetectado || null,
        transcripcion: reelForm.transcripcion || null,
        notas: reelForm.notas || null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCompetitorReelsQueryKey() });
        setIsReelOpen(false);
        setReelForm({ competitorId: "", url: "", tema: "", hook: "", viewsApprox: "", engagementLevel: "", anguloDetectado: "", transcripcion: "", notas: "" });
      }
    });
  };

  const handleDetectarBrechas = async () => {
    const compData = competitors.map(c => `Handle: ${c.handle}, Nicho: ${c.nicho}, Seguidores: ${c.followersApprox || "desconocido"}`).join("\n");
    const reelData = competitorReels.map(r => {
      const comp = competitors.find(c => c.id === r.competitorId);
      return `${comp?.handle}: ${r.tema} (${r.engagementLevel}) — ángulo: ${r.anguloDetectado || "sin clasificar"}`;
    }).join("\n");
    const prompt = `Analiza estos competidores y sus contenidos para detectar brechas estratégicas para VILLACLUB.\n\nCOMPETIDORES:\n${compData}\n\nCONTENIDOS DETECTADOS:\n${reelData}`;
    await brechasStream.stream({ mode: "COMPETENCIA", userInput: prompt });
  };

  const getEngagementBadge = (level: string) => {
    switch(level) {
      case "Viral": return "text-[#00CC66] border border-[#00CC66]";
      case "Alto": return "text-[#0C2DF5] border border-[#0C2DF5]";
      case "Medio": return "text-[#CC8800] border border-[#CC8800]";
      case "Bajo": return "text-[#FF2D20] border border-[#FF2D20]";
      default: return "text-[#666666] border border-[#1A1A1A]";
    }
  };

  const engagementWeights: Record<string, number> = { "Viral": 4, "Alto": 3, "Medio": 2, "Bajo": 1 };
  const sortedReels = [...competitorReels].sort((a, b) => (engagementWeights[b.engagementLevel] || 0) - (engagementWeights[a.engagementLevel] || 0));

  // Most active competitor by viral/alto engagement reels count
  const compEngagement: Record<number, number> = {};
  for (const r of competitorReels) {
    if (!compEngagement[r.competitorId]) compEngagement[r.competitorId] = 0;
    compEngagement[r.competitorId] += engagementWeights[r.engagementLevel] || 0;
  }
  const mostActiveId = Object.entries(compEngagement).reduce<number | null>((best, [id, score]) => {
    if (best === null || score > (compEngagement[best] || 0)) return parseInt(id);
    return best;
  }, null);
  const mostActive = mostActiveId ? competitors.find(c => c.id === mostActiveId) : null;

  return (
    <div className="space-y-12">
      {/* ENGAGEMENT RANKING HEADER */}
      {mostActive && (
        <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-4 font-mono text-xs">
          <span className="text-[#666666]">// COMPETIDOR MÁS ACTIVO: </span>
          <span className="text-[#FF2D20] font-bold">{mostActive.handle}</span>
          <span className="text-[#666666]"> — {compEngagement[mostActive.id] || 0} pts engagement acumulado</span>
        </div>
      )}

      {/* CUENTAS COMPETIDORAS */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest" data-testid="title-competitors">// CUENTAS COMPETIDORAS</h2>
          <div className="flex items-center gap-4">
            <span className="text-[#666666] font-mono text-sm">{competitors.length}/8</span>
            <Button
              onClick={() => setIsCompOpen(true)}
              disabled={competitors.length >= 8}
              className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono"
              data-testid="button-add-competitor"
            >
              AGREGAR COMPETIDOR
            </Button>
          </div>
        </div>

        <div className="border border-[#1A1A1A]">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-normal">Cuenta</th>
                <th className="py-4 px-6 font-normal">Nicho</th>
                <th className="py-4 px-6 font-normal">Seguidores</th>
                <th className="py-4 px-6 font-normal w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {isLoadingCompetitors ? (
                <tr><td colSpan={4} className="py-8 text-center text-[#0C2DF5]">// cargando...</td></tr>
              ) : competitors.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-[#666666]">// Sin datos registrados</td></tr>
              ) : (
                competitors.map((comp, idx) => (
                  <tr key={comp.id} className={idx % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"}>
                    <td className="py-4 px-6 border-b border-[#1A1A1A] text-white">{comp.handle}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">{comp.nicho}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">{comp.followersApprox?.toLocaleString() || "-"}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => handleSyncCompetitor(comp.handle)}
                          disabled={syncingHandle === comp.handle}
                          className="text-[#666666] hover:text-[#0C2DF5] transition-colors"
                          title={`Sync ${comp.handle}`}
                        >
                          <RefreshCw size={14} className={syncingHandle === comp.handle ? "animate-spin" : ""} />
                        </button>
                        {(() => {
                          const compReelsForComp = competitorReels.filter(r => r.competitorId === comp.id);
                          const untranscribed = compReelsForComp.filter(r => !r.transcripcion && r.url).length;
                          return untranscribed > 0 ? (
                            <button
                              onClick={() => handleTranscribeBatch(comp.id)}
                              disabled={transcribingId === comp.id}
                              className="text-[#666666] border border-[#444444] hover:border-[#0C2DF5] hover:text-[#0C2DF5] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors"
                              title={`${untranscribed} videos sin transcripción`}
                            >
                              {transcribingId === comp.id ? "// ..." : `TRANSCRIBIR (${untranscribed})`}
                            </button>
                          ) : null;
                        })()}
                        {transcribeMsg?.id === comp.id && (
                          <span className={`font-mono text-[9px] ${transcribeMsg.msg.includes("error") ? "text-[#FF2D20]" : "text-[#00CC66]"}`}>
                            {transcribeMsg.msg}
                          </span>
                        )}
                        <button
                          onClick={() => deleteCompetitor.mutate({ id: comp.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey() }) })}
                          className="text-[#666666] hover:text-[#FF2D20] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {syncMsg && (
          <div className="mt-2 font-mono text-xs text-[#666666] px-2">{syncMsg.handle}: {syncMsg.msg}</div>
        )}
      </section>

      {/* VIDEOS COMPETIDORES */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest" data-testid="title-competitor-reels">// VIDEOS COMPETIDORES</h2>
          <Button
            onClick={() => setIsReelOpen(true)}
            disabled={competitors.length === 0}
            className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono"
            data-testid="button-add-comp-reel"
          >
            AGREGAR VIDEO
          </Button>
        </div>

        <div className="border border-[#1A1A1A]">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-normal">Competidor</th>
                <th className="py-4 px-6 font-normal">Tema</th>
                <th className="py-4 px-6 font-normal">Hook</th>
                <th className="py-4 px-6 font-normal">Views</th>
                <th className="py-4 px-6 font-normal">Engagement</th>
                <th className="py-4 px-6 font-normal">Angulo</th>
                <th className="py-4 px-6 font-normal w-16">Del</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {isLoadingReels ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#0C2DF5]">// cargando...</td></tr>
              ) : sortedReels.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#666666]">// Sin datos registrados</td></tr>
              ) : (
                sortedReels.map((reel, idx) => {
                  const comp = competitors.find(c => c.id === reel.competitorId);
                  return (
                    <tr key={reel.id} className={idx % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"}>
                      <td className="py-4 px-6 border-b border-[#1A1A1A]">{comp?.handle || `ID: ${reel.competitorId}`}</td>
                      <td className="py-4 px-6 border-b border-[#1A1A1A] max-w-[150px] truncate" title={reel.tema}>{reel.tema}</td>
                      <td className="py-4 px-6 border-b border-[#1A1A1A] max-w-[200px] truncate text-[#666666]" title={reel.hook}>{reel.hook}</td>
                      <td className="py-4 px-6 border-b border-[#1A1A1A]">{reel.viewsApprox?.toLocaleString() || "-"}</td>
                      <td className="py-4 px-6 border-b border-[#1A1A1A]">
                        <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider ${getEngagementBadge(reel.engagementLevel)}`}>
                          {reel.engagementLevel}
                        </span>
                      </td>
                      <td className="py-4 px-6 border-b border-[#1A1A1A] text-[#666666]">{reel.anguloDetectado || "-"}</td>
                      <td className="py-4 px-6 border-b border-[#1A1A1A]">
                        <button onClick={() => deleteReel.mutate({ id: reel.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCompetitorReelsQueryKey() }) })} className="text-[#666666] hover:text-[#FF2D20] transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DETECTAR BRECHAS */}
      <section className="space-y-4">
        <Button
          onClick={handleDetectarBrechas}
          disabled={brechasStream.isStreaming || competitors.length === 0}
          className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono"
        >
          {brechasStream.isStreaming ? "// analizando..." : "DETECTAR BRECHAS CON ACCAI"}
        </Button>

        {(brechasStream.isStreaming || brechasStream.response) && (
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 font-mono text-sm whitespace-pre-wrap leading-relaxed text-[#F0F0F0]">
            {brechasStream.response}
            {brechasStream.isStreaming && <span className="text-[#0C2DF5] animate-pulse ml-1">_</span>}
          </div>
        )}
      </section>

      {/* DIALOGS */}
      <Dialog open={isCompOpen} onOpenChange={setIsCompOpen}>
        <DialogContent className="bg-[#080808] border border-[#1A1A1A] rounded-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white font-mono uppercase tracking-widest text-sm">// NUEVO COMPETIDOR</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCompetitor} className="space-y-4 pt-4">
            <div><label className="text-[#666666] text-xs mb-2 block font-mono">HANDLE *</label>
              <Input required value={compForm.handle} onChange={e => setCompForm({...compForm, handle: e.target.value})} placeholder="@cuenta" className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
            <div><label className="text-[#666666] text-xs mb-2 block font-mono">NICHO *</label>
              <Input required value={compForm.nicho} onChange={e => setCompForm({...compForm, nicho: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
            <div><label className="text-[#666666] text-xs mb-2 block font-mono">SEGUIDORES</label>
              <Input type="number" min="0" value={compForm.followersApprox} onChange={e => setCompForm({...compForm, followersApprox: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
            <div><label className="text-[#666666] text-xs mb-2 block font-mono">NOTAS</label>
              <Textarea value={compForm.notas} onChange={e => setCompForm({...compForm, notas: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
            <Button type="submit" disabled={createCompetitor.isPending} className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono">
              {createCompetitor.isPending ? "GUARDANDO..." : "GUARDAR"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isReelOpen} onOpenChange={setIsReelOpen}>
        <DialogContent className="bg-[#080808] border border-[#1A1A1A] rounded-none sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-white font-mono uppercase tracking-widest text-sm">// NUEVO VIDEO COMPETIDOR</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveReel} className="space-y-4 pt-4">
            <div><label className="text-[#666666] text-xs mb-2 block font-mono">COMPETIDOR *</label>
              <Select required value={reelForm.competitorId} onValueChange={v => setReelForm({...reelForm, competitorId: v})}>
                <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                  {competitors.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.handle}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><label className="text-[#666666] text-xs mb-2 block font-mono">TEMA *</label>
              <Input required value={reelForm.tema} onChange={e => setReelForm({...reelForm, tema: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
            <div><label className="text-[#666666] text-xs mb-2 block font-mono">HOOK *</label>
              <Textarea required value={reelForm.hook} onChange={e => setReelForm({...reelForm, hook: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] min-h-[60px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">VIEWS</label>
                <Input type="number" value={reelForm.viewsApprox} onChange={e => setReelForm({...reelForm, viewsApprox: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">ENGAGEMENT *</label>
                <Select required value={reelForm.engagementLevel} onValueChange={v => setReelForm({...reelForm, engagementLevel: v})}>
                  <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none"><SelectValue placeholder="Nivel" /></SelectTrigger>
                  <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                    {["Bajo","Medio","Alto","Viral"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <Button type="submit" disabled={createReel.isPending} className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono">
              {createReel.isPending ? "GUARDANDO..." : "GUARDAR VIDEO"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
