import React, { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";
import {
  useListReels,
  useGetReelsStats,
  useCreateReel,
  getListReelsQueryKey,
  getGetReelsStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ChevronDown, ChevronUp, Film } from "lucide-react";
import { useAccaiStream } from "@/lib/useAccaiStream";

const ANGULOS = ["Matemática innegable", "Proceso visible", "Contraste operador-amateur", "Asimetría de mercado"];
const FORMATOS = ["Cara a cámara", "Screenrecording", "Mixto"];

interface SyncResult { synced: number; new: number; updated: number; unclassified: number; rateLimitWarning: boolean; errors: string[]; }

export function Reels() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: reels = [], isLoading: isLoadingReels } = useListReels();
  const { data: stats, isLoading: isLoadingStats } = useGetReelsStats();
  const createReel = useCreateReel();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    url: "", fecha: "", tema: "", angulo: "", formato: "", followersAtPublish: "",
    views: "", likes: "", comments: "", saves: "", shares: "", alcance: "", transcripcion: "", notas: ""
  });

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const [classifying, setClassifying] = useState(false);
  const [classifiedCount, setClassifiedCount] = useState(0);

  const [transcribing, setTranscribing] = useState(false);
  const [transcribeMsg, setTranscribeMsg] = useState<string | null>(null);

  const [expandedReelId, setExpandedReelId] = useState<number | null>(null);
  const [quickForm, setQuickForm] = useState({ tema: "", angulo: "", formato: "" });
  const [savingQuick, setSavingQuick] = useState(false);

  const [timingHour, setTimingHour] = useState<number | null>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [igComments, setIgComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentAnalysis, setCommentAnalysis] = useState("");

  const autopsiaStream = useAccaiStream();
  const commentStream = useAccaiStream();

  useEffect(() => {
    fetch("/api/instagram/timing")
      .then(r => r.json())
      .then(d => {
        if (d.recommendedWindows?.[0]?.hour !== undefined) {
          setTimingHour(d.recommendedWindows[0].hour);
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    autopsiaStream.clear();
    try {
      const r = await fetch("/api/instagram/sync", { method: "POST" });
      const d: SyncResult = await r.json();
      setSyncResult(d);
      setLastSyncAt(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetReelsStatsQueryKey() });
    } catch {}
    setSyncing(false);
  };

  const handleTranscribeAll = async () => {
    setTranscribing(true);
    setTranscribeMsg("// iniciando transcripción...");
    try {
      const r = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true }),
      });
      const d = await r.json();
      if (d.error) {
        setTranscribeMsg(`// error: ${d.error}`);
      } else {
        setTranscribeMsg(`// ${d.transcribed} reels transcritos — ACCAI ahora tiene contexto completo`);
        queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
      }
    } catch (e: any) {
      setTranscribeMsg(`// error: ${e.message}`);
    }
    setTranscribing(false);
  };

  const handleTranscribeSingle = async (reelId: number) => {
    try {
      const r = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelId }),
      });
      const d = await r.json();
      if (d.success) {
        queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
      }
    } catch {}
  };

  const handleAutoClassify = async () => {
    const unclassified = reels.filter(r => !r.tema);
    if (unclassified.length === 0) return;
    setClassifying(true);
    setClassifiedCount(0);
    let count = 0;
    for (const reel of unclassified) {
      try {
        await fetch(`/api/reels/${reel.id}/classify`, { method: "POST" });
        count++;
        setClassifiedCount(count);
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
    setClassifying(false);
    setClassifiedCount(0);
  };

  const handleQuickSave = async (reelId: number) => {
    setSavingQuick(true);
    try {
      await fetch(`/api/reels/${reelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quickForm),
      });
      queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
      setExpandedReelId(null);
    } catch {}
    setSavingQuick(false);
  };

  const handleRunAutopsia = async () => {
    if (!reels.length) return;
    const newest = reels[0];
    await autopsiaStream.stream({ mode: "AUTOPSIA", reelId: newest.id });
  };

  const handleExtractComments = async () => {
    setCommentsLoading(true);
    setIgComments([]);
    try {
      const r = await fetch("/api/instagram/comments/mine?limit=20");
      const d = await r.json();
      setIgComments(d.data || d || []);
    } catch {}
    setCommentsLoading(false);
  };

  const handleAnalyzeComments = async () => {
    if (!igComments.length) return;
    const corpus = igComments.map((c: any) => `@${c.username}: ${c.text}`).join("\n");
    const prompt = `Analiza estos comentarios de Instagram de VILLACLUB. Agrupa por tema recurrente. Para cada grupo responde SOLO en JSON array: [{"keyword": string, "count": number, "tipo": "pregunta"|"objecion"|"interes"|"ruido", "accion": "descripción de reel sugerido"}]\n\n${corpus}`;
    const result = await commentStream.stream({ mode: "BRIEF", userInput: prompt });
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) setCommentAnalysis(jsonMatch[0]);
      else setCommentAnalysis(result);
    } catch {
      setCommentAnalysis(result);
    }
  };

  const handleSaveReel = (e: React.FormEvent) => {
    e.preventDefault();
    createReel.mutate({
      data: {
        url: formData.url || null, fecha: new Date(formData.fecha).toISOString(),
        tema: formData.tema, angulo: formData.angulo, formato: formData.formato,
        followersAtPublish: Number(formData.followersAtPublish),
        views: Number(formData.views), likes: Number(formData.likes),
        comments: Number(formData.comments), saves: Number(formData.saves),
        shares: Number(formData.shares), alcance: formData.alcance ? Number(formData.alcance) : null,
        transcripcion: formData.transcripcion || null, notas: formData.notas || null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReelsStatsQueryKey() });
        setIsDrawerOpen(false);
        setFormData({ url: "", fecha: "", tema: "", angulo: "", formato: "", followersAtPublish: "", views: "", likes: "", comments: "", saves: "", shares: "", alcance: "", transcripcion: "", notas: "" });
      }
    });
  };

  const renderVsPromedio = (views: number) => {
    if (!stats || stats.avgViews === 0) return "-";
    const vs = ((views - stats.avgViews) / stats.avgViews) * 100;
    const sign = vs >= 0 ? "+" : "";
    return <span className={vs >= 0 ? "text-[#00CC66]" : "text-[#FF2D20]"}>{sign}{vs.toFixed(0)}%</span>;
  };

  const getFirmaBadgeStyle = (firma: string) => {
    switch (firma) {
      case "CONVERTIDOR": return "bg-[#0C2DF5] text-white";
      case "VIRAL": return "bg-[#CC8800] text-white";
      case "EDUCATIVO": return "bg-[#00CC66] text-white";
      case "MUERTO": return "bg-[#333333] text-[#666666]";
      default: return "bg-[#333333] text-[#666666]";
    }
  };

  const unclassifiedCount = reels.filter(r => !r.tema).length;

  // Intelligence card computations
  const classifiedReels = reels.filter(r => r.angulo);
  const anguloGroups: Record<string, number[]> = {};
  for (const r of classifiedReels) {
    const a = r.angulo!;
    if (!anguloGroups[a]) anguloGroups[a] = [];
    anguloGroups[a].push(r.savesPct);
  }
  const bestAngulo = Object.entries(anguloGroups).reduce<{label: string; avg: number; count: number} | null>((best, [label, vals]) => {
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (!best || avg > best.avg) return { label, avg, count: vals.length };
    return best;
  }, null);

  const reelsWithWatch = reels.filter(r => r.watchTimeAvg && r.watchTimeAvg > 0);
  const rangeGroups: Record<string, number[]> = { "0-15s": [], "15-30s": [], "30-45s": [], "45-60s": [] };
  for (const r of reelsWithWatch) {
    const w = r.watchTimeAvg!;
    if (w <= 15) rangeGroups["0-15s"].push(w);
    else if (w <= 30) rangeGroups["15-30s"].push(w);
    else if (w <= 45) rangeGroups["30-45s"].push(w);
    else rangeGroups["45-60s"].push(w);
  }
  const bestRange = Object.entries(rangeGroups).reduce<{label: string; avg: number} | null>((best, [label, vals]) => {
    if (vals.length === 0) return best;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (!best || avg > best.avg) return { label, avg };
    return best;
  }, null);

  const sorted = [...reels].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const last10 = sorted.slice(0, 10);
  const prev10 = sorted.slice(10, 20);
  const avgLast10 = last10.length > 0 ? last10.reduce((s, r) => s + r.views, 0) / last10.length : 0;
  const avgPrev10 = prev10.length > 0 ? prev10.reduce((s, r) => s + r.views, 0) / prev10.length : 0;
  const tendencia = avgPrev10 > 0 ? ((avgLast10 - avgPrev10) / avgPrev10) * 100 : 0;

  const hasEnoughData = reels.length >= 5;

  let commentAnalysisParsed: any[] = [];
  try { commentAnalysisParsed = JSON.parse(commentAnalysis); } catch {}

  const tipoBadge = (tipo: string) => {
    switch (tipo) {
      case "pregunta": return "bg-[#0C2DF5]/20 text-[#0C2DF5]";
      case "objecion": return "bg-[#FF2D20]/20 text-[#FF2D20]";
      case "interes": return "bg-[#00CC66]/20 text-[#00CC66]";
      case "ruido": return "bg-[#333333] text-[#666666]";
      default: return "bg-[#333333] text-[#666666]";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest" data-testid="title-reels">// RENDIMIENTO DE CONTENIDO</h2>
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono" data-testid="button-add-reel">
              AGREGAR REEL
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[500px] sm:max-w-none bg-[#080808] border-l border-[#1A1A1A] p-0 overflow-y-auto">
            <SheetHeader className="p-6 border-b border-[#1A1A1A] text-left">
              <SheetTitle className="text-white font-mono uppercase tracking-widest text-sm">// NUEVO REEL</SheetTitle>
              <SheetDescription className="hidden">Añadir un nuevo reel al sistema</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSaveReel} className="p-6 space-y-4">
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">URL (Opcional)</label>
                <Input value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">FECHA *</label>
                <Input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">TEMA *</label>
                <Input required value={formData.tema} onChange={e => setFormData({...formData, tema: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">ÁNGULO *</label>
                <Select required value={formData.angulo} onValueChange={v => setFormData({...formData, angulo: v})}>
                  <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                    {ANGULOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">FORMATO *</label>
                <Select required value={formData.formato} onValueChange={v => setFormData({...formData, formato: v})}>
                  <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                    {FORMATOS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="grid grid-cols-2 gap-3">
                {[["SEGUIDORES BASE *", "followersAtPublish"], ["VIEWS *", "views"], ["LIKES *", "likes"], ["COMMENTS *", "comments"], ["SAVES *", "saves"], ["SHARES *", "shares"]].map(([label, field]) => (
                  <div key={field}><label className="text-[#666666] text-xs mb-2 block font-mono">{label}</label>
                    <Input type="number" min="0" required value={(formData as any)[field]} onChange={e => setFormData({...formData, [field]: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" /></div>
                ))}
              </div>
              <div><label className="text-[#666666] text-xs mb-2 block font-mono">TRANSCRIPCION</label>
                <Textarea value={formData.transcripcion} onChange={e => setFormData({...formData, transcripcion: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] min-h-[80px]" /></div>
              <Button type="submit" disabled={createReel.isPending} className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono py-6">
                {createReel.isPending ? "GUARDANDO..." : "GUARDAR REEL"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* SYNC BAR */}
      <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <div className="flex items-center gap-4">
          <span className="text-[#666666] font-mono text-xs">// INSTAGRAM SYNC</span>
          <Button onClick={handleSync} disabled={syncing} className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6">
            {syncing ? "// sincronizando..." : "SINCRONIZAR"}
          </Button>
          {lastSyncAt && (
            <span className="text-[#666666] font-mono text-xs">
              último sync: {formatDistanceToNow(new Date(lastSyncAt), { locale: es })} | {reels.length} reels
              {unclassifiedCount > 0 && <span className="text-[#CC8800] ml-2">{unclassifiedCount} sin clasificar</span>}
            </span>
          )}
          {unclassifiedCount > 0 && (
            <Button
              onClick={handleAutoClassify}
              disabled={classifying}
              className="bg-transparent border border-[#0C2DF5] text-[#0C2DF5] hover:bg-[#0C2DF5] hover:text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-4"
            >
              {classifying ? `// clasificando ${classifiedCount}/${unclassifiedCount}...` : "ACCAI CLASIFICAR"}
            </Button>
          )}
          <Button
            onClick={handleTranscribeAll}
            disabled={transcribing}
            className="ml-auto bg-transparent border border-[#666666] text-[#666666] hover:border-[#0C2DF5] hover:text-[#0C2DF5] rounded-none uppercase tracking-widest font-mono text-xs h-9 px-4"
            title="Transcribe todos los reels vía Apify (requiere APIFY_API_TOKEN)"
          >
            {transcribing ? "// transcribiendo..." : "TRANSCRIBIR TODO"}
          </Button>
        </div>
        {transcribeMsg && (
          <div className={`mt-2 font-mono text-xs ${transcribeMsg.includes("error") ? "text-[#FF2D20]" : "text-[#00CC66]"}`}>
            {transcribeMsg}
          </div>
        )}

        {/* Rate limit banner */}
        {syncResult?.rateLimitWarning && (
          <div className="mt-3 bg-[#CC8800] text-white font-mono text-xs p-3 uppercase tracking-widest">
            // ⚠️ API RATE LIMIT CERCANO — sincronización pausada
          </div>
        )}

        {/* New reels detected notification */}
        {syncResult && syncResult.new > 0 && !autopsiaStream.isStreaming && !autopsiaStream.response && (
          <div className="mt-3 flex items-center gap-4 border-t border-[#1A1A1A] pt-3">
            <span className="text-[#0C2DF5] font-mono text-xs">
              // {syncResult.new} reels nuevos detectados
            </span>
            <button
              onClick={handleRunAutopsia}
              className="text-[#0C2DF5] hover:text-white border border-[#0C2DF5] px-3 py-1 font-mono text-xs uppercase tracking-widest transition-colors"
            >
              EJECUTAR AUTOPSIA DEL ÚLTIMO
            </button>
          </div>
        )}

        {/* Inline autopsia stream */}
        {(autopsiaStream.isStreaming || autopsiaStream.response) && (
          <div className="mt-3 border-t border-[#1A1A1A] pt-3">
            <div className="text-[#666666] font-mono text-xs mb-2">// AUTOPSIA EN PROGRESO</div>
            <div className="font-mono text-sm whitespace-pre-wrap text-[#F0F0F0] max-h-48 overflow-y-auto">
              {autopsiaStream.response}
              {autopsiaStream.isStreaming && <span className="text-[#0C2DF5] animate-pulse ml-1">_</span>}
            </div>
          </div>
        )}
      </div>

      {/* INTELLIGENCE CARDS */}
      <div className="grid grid-cols-4 gap-4">
        {/* MEJOR ANGULO */}
        <div className="border border-[#1A1A1A] p-4">
          <div className="text-[#666666] font-mono text-[10px] uppercase tracking-widest mb-3">// MEJOR ÁNGULO</div>
          {!hasEnoughData ? (
            <div className="text-[#666666] font-mono text-xs">// datos insuficientes</div>
          ) : bestAngulo ? (
            <>
              <div className="text-[#0C2DF5] font-mono text-sm font-bold leading-tight">{bestAngulo.label}</div>
              <div className="text-white font-mono text-xl mt-1">{bestAngulo.avg.toFixed(1)}%<span className="text-[#666666] text-xs ml-1">saves</span></div>
              <div className="text-[#666666] font-mono text-[10px] mt-1">basado en {bestAngulo.count} reels</div>
            </>
          ) : (
            <div className="text-[#666666] font-mono text-xs">// sin clasificar</div>
          )}
        </div>

        {/* DURACION OPTIMA */}
        <div className="border border-[#1A1A1A] p-4">
          <div className="text-[#666666] font-mono text-[10px] uppercase tracking-widest mb-3">// DURACIÓN ÓPTIMA</div>
          {!hasEnoughData ? (
            <div className="text-[#666666] font-mono text-xs">// datos insuficientes</div>
          ) : bestRange ? (
            <>
              <div className="text-[#0C2DF5] font-mono text-xl font-bold">{bestRange.label}</div>
              <div className="text-[#666666] font-mono text-[10px] mt-1">watch time promedio más alto</div>
            </>
          ) : (
            <div className="text-[#666666] font-mono text-xs">// sin datos de watch time</div>
          )}
        </div>

        {/* HORA PICO */}
        <div className="border border-[#1A1A1A] p-4">
          <div className="text-[#666666] font-mono text-[10px] uppercase tracking-widest mb-3">// HORA PICO</div>
          {!hasEnoughData ? (
            <div className="text-[#666666] font-mono text-xs">// datos insuficientes</div>
          ) : timingHour !== null ? (
            <>
              <div className="text-white font-mono text-xl font-bold">{timingHour}:00</div>
              <div className="text-[#666666] font-mono text-[10px] mt-1">basado en tus seguidores</div>
            </>
          ) : (
            <div className="text-[#666666] font-mono text-xs">// cargando...</div>
          )}
        </div>

        {/* TENDENCIA */}
        <div className="border border-[#1A1A1A] p-4">
          <div className="text-[#666666] font-mono text-[10px] uppercase tracking-widest mb-3">// TENDENCIA</div>
          {!hasEnoughData ? (
            <div className="text-[#666666] font-mono text-xs">// datos insuficientes</div>
          ) : (
            <>
              <div className={`font-mono text-xl font-bold ${tendencia >= 0 ? "text-[#00CC66]" : "text-[#FF2D20]"}`}>
                {tendencia >= 0 ? "↑" : "↓"} {Math.abs(tendencia).toFixed(0)}%
              </div>
              <div className="text-[#666666] font-mono text-[10px] mt-1">últ. 10 vs ant. 10 reels</div>
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-[#1A1A1A]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-xs uppercase tracking-wider">
              <th className="py-4 px-3 font-normal w-[56px]"></th>
              <th className="py-4 px-4 font-normal">Fecha</th>
              <th className="py-4 px-4 font-normal">Tema</th>
              <th className="py-4 px-4 font-normal">Angulo</th>
              <th className="py-4 px-4 font-normal">Views</th>
              <th className="py-4 px-4 font-normal">Saves%</th>
              <th className="py-4 px-4 font-normal">S/1K</th>
              <th className="py-4 px-4 font-normal">Watch</th>
              <th className="py-4 px-4 font-normal">Replays</th>
              <th className="py-4 px-4 font-normal">vs_prom</th>
              <th className="py-4 px-4 font-normal">Firma</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {isLoadingReels || isLoadingStats ? (
              <tr><td colSpan={11} className="py-8 text-center loading-pulse">// cargando...</td></tr>
            ) : reels.length === 0 ? (
              <tr><td colSpan={11} className="py-8 text-center text-[#666666]">// Sin datos registrados</td></tr>
            ) : (
              reels.map((reel, idx) => {
                const isUnclassified = !reel.tema;
                const isExpanded = expandedReelId === reel.id;
                return (
                  <React.Fragment key={reel.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${idx % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"} ${isUnclassified ? "border-l-2 border-l-[#CC8800]" : ""} hover:bg-[#0C2DF5]/5`}
                      onClick={() => !isUnclassified && setLocation(`/reels/${reel.id}`)}
                      data-testid={`row-reel-${reel.id}`}
                    >
                      <td className="py-2 px-3 border-b border-[#1A1A1A]">
                        {(reel as any).thumbnailUrl ? (
                          <img
                            src={(reel as any).thumbnailUrl}
                            alt=""
                            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}>
                            <Film size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] whitespace-nowrap text-xs">{format(new Date(reel.fecha), "dd/MM/yyyy")}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] max-w-[180px]">
                        {isUnclassified ? (
                          <span className="text-[#CC8800] text-xs">// sin clasificar</span>
                        ) : (
                          <span className="truncate block text-xs" title={reel.tema || ""}>{reel.tema}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-[#666666] text-xs truncate max-w-[120px]">{reel.angulo || "-"}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">{reel.views.toLocaleString()}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">{reel.savesPct.toFixed(1)}%</td>
                      <td className={`py-3 px-4 border-b border-[#1A1A1A] text-xs font-bold ${reel.savesPer1k > 5 ? "text-[#0C2DF5]" : reel.savesPer1k < 1 ? "text-[#FF2D20]" : ""}`}>{reel.savesPer1k.toFixed(2)}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs text-[#666666]">
                        {reel.watchTimeAvg ? `${reel.watchTimeAvg.toFixed(0)}s` : "—"}
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs text-[#666666]">
                        {reel.replays ?? "—"}
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">{renderVsPromedio(reel.views)}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A]">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${getFirmaBadgeStyle(reel.firma)}`}>
                            {reel.firma}
                          </span>
                          {isUnclassified && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isExpanded) { setExpandedReelId(null); return; }
                                setExpandedReelId(reel.id);
                                setQuickForm({ tema: "", angulo: "", formato: "" });
                              }}
                              className="text-[#CC8800] border border-[#CC8800] px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider hover:bg-[#CC8800] hover:text-black transition-colors"
                            >
                              CLASIFICAR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Quick-classify inline form */}
                    {isExpanded && (
                      <tr key={`classify-${reel.id}`} className="bg-[#080808]">
                        <td colSpan={11} className="px-4 py-4 border-b border-[#CC8800]/30">
                          <div className="flex items-end gap-3">
                            <div>
                              <label className="text-[#666666] text-[10px] mb-1 block font-mono uppercase">Tema</label>
                              <Input
                                value={quickForm.tema}
                                onChange={e => setQuickForm({...quickForm, tema: e.target.value})}
                                placeholder="Tema del reel"
                                onClick={e => e.stopPropagation()}
                                className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] h-8 text-xs w-48"
                              />
                            </div>
                            <div>
                              <label className="text-[#666666] text-[10px] mb-1 block font-mono uppercase">Ángulo</label>
                              <Select value={quickForm.angulo} onValueChange={v => setQuickForm({...quickForm, angulo: v})}>
                                <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0 h-8 text-xs w-48">
                                  <SelectValue placeholder="Selecciona" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                                  {ANGULOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[#666666] text-[10px] mb-1 block font-mono uppercase">Formato</label>
                              <Select value={quickForm.formato} onValueChange={v => setQuickForm({...quickForm, formato: v})}>
                                <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0 h-8 text-xs w-36">
                                  <SelectValue placeholder="Selecciona" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                                  {FORMATOS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={e => { e.stopPropagation(); handleQuickSave(reel.id); }}
                              disabled={savingQuick || !quickForm.tema || !quickForm.angulo}
                              className="bg-[#CC8800] hover:bg-[#CC8800]/80 text-black rounded-none uppercase tracking-widest font-mono text-xs h-8 px-4"
                            >
                              {savingQuick ? "..." : "GUARDAR"}
                            </Button>
                            <button
                              onClick={e => { e.stopPropagation(); setExpandedReelId(null); }}
                              className="text-[#666666] hover:text-white font-mono text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MINA DE COMENTARIOS */}
      <section className="border border-[#1A1A1A]">
        <button
          onClick={() => setCommentsOpen(!commentsOpen)}
          className="w-full flex items-center justify-between p-4 bg-[#0D0D0D] hover:bg-[#111111] transition-colors text-left"
        >
          <span className="text-[#666666] font-mono text-xs uppercase tracking-widest">// MINA DE COMENTARIOS</span>
          {commentsOpen ? <ChevronUp size={16} className="text-[#666666]" /> : <ChevronDown size={16} className="text-[#666666]" />}
        </button>

        {commentsOpen && (
          <div className="border-t border-[#1A1A1A] p-4 space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleExtractComments}
                disabled={commentsLoading}
                className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
              >
                {commentsLoading ? "// extrayendo..." : "EXTRAER COMENTARIOS"}
              </Button>
              {igComments.length > 0 && (
                <Button
                  onClick={handleAnalyzeComments}
                  disabled={commentStream.isStreaming}
                  className="bg-transparent border border-[#0C2DF5] text-[#0C2DF5] hover:bg-[#0C2DF5] hover:text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
                >
                  {commentStream.isStreaming ? "// analizando..." : `ANALIZAR CON ACCAI (${igComments.length})`}
                </Button>
              )}
            </div>

            {igComments.length > 0 && commentAnalysisParsed.length === 0 && !commentStream.isStreaming && (
              <div className="text-[#666666] font-mono text-xs">
                // {igComments.length} comentarios extraídos. Haz clic en "ANALIZAR CON ACCAI" para procesar.
              </div>
            )}

            {commentStream.isStreaming && (
              <div className="font-mono text-xs text-[#666666]">
                // analizando...{" "}
                <span className="text-[#0C2DF5] animate-pulse">_</span>
              </div>
            )}

            {commentAnalysisParsed.length > 0 && (
              <div className="border border-[#1A1A1A]">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-normal">Tema</th>
                      <th className="py-3 px-4 font-normal">Frecuencia</th>
                      <th className="py-3 px-4 font-normal">Tipo</th>
                      <th className="py-3 px-4 font-normal">Acción sugerida</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {commentAnalysisParsed.map((item: any, i: number) => (
                      <tr key={i} className={`${i % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"} ${item.tipo === "ruido" ? "opacity-40" : ""}`}>
                        <td className="py-3 px-4 border-b border-[#1A1A1A] font-bold">{item.keyword}</td>
                        <td className="py-3 px-4 border-b border-[#1A1A1A]">{item.count}</td>
                        <td className="py-3 px-4 border-b border-[#1A1A1A]">
                          <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${tipoBadge(item.tipo)}`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 border-b border-[#1A1A1A] text-[#666666] max-w-[300px]">{item.accion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
