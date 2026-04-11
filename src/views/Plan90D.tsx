"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  useListPlanReels,
  useUpsertPlanReel,
  useListPlanObjectives,
  useUpsertPlanObjective,
  useGetLatestSnapshot,
  useListReels,
  getListPlanReelsQueryKey,
  getListPlanObjectivesQueryKey
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccaiStream } from "@/lib/useAccaiStream";
import { Film, Calendar, CheckCircle2, Copy, Play, Volume2, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const OBJECTIVE_KEYS = [
  { key: "followersGoal", label: "META SEGUIDORES", color: "#0C2DF5", unit: "seg" },
  { key: "viewsGoal", label: "META VIEWS PROM", color: "#00CC66", unit: "views" },
  { key: "reelsPerWeekGoal", label: "REELS/SEMANA", color: "#CC8800", unit: "reels" },
  { key: "savesPer1kGoal", label: "SAVES/1K META", color: "#FF2D20", unit: "s/1k" },
];

interface Brief {
  day: number;
  angulo: string;
  voiceover: string;
  visualDirection: string;
  subtitleCues: string;
  hook: string;
  cta: string;
  rawContent: string;
}

export function Plan90D() {
  const queryClient = useQueryClient();
  const { data: planReels = [], isLoading: isLoadingPlan } = useListPlanReels();
  const { data: objectives = [] } = useListPlanObjectives();
  const { data: latestSnapshot } = useGetLatestSnapshot();
  const { data: reels = [] } = useListReels();

  const upsertPlanReel = useUpsertPlanReel();
  const upsertObjective = useUpsertPlanObjective();

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [editingReel, setEditingReel] = useState<{semana: number; dia: string} | null>(null);
  const [reelForm, setReelForm] = useState({ tema: "", angulo: "", hora: "", notas: "" });
  const [savingReel, setSavingReel] = useState(false);

  const [objForms, setObjForms] = useState<Record<string, string>>({});
  const [savingObj, setSavingObj] = useState(false);

  const planStream = useAccaiStream();
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);
  const [generatedBriefs, setGeneratedBriefs] = useState<Brief[]>([]);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const [audioLinks, setAudioLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (objectives.length > 0) {
      const forms: Record<string, string> = {};
      for (const obj of objectives) {
        for (const k of OBJECTIVE_KEYS) {
          const val = (obj as any)[k.key];
          if (val !== null && val !== undefined) forms[k.key] = String(val);
        }
      }
      setObjForms(forms);
    }
  }, [objectives]);

  const weekReels = planReels.filter(r => r.semana === selectedWeek);

  const handleSaveReel = async () => {
    if (!editingReel) return;
    setSavingReel(true);
    await (upsertPlanReel as any).mutateAsync({
      data: {
        semana: editingReel.semana,
        dia: editingReel.dia,
        tema: reelForm.tema || null,
        angulo: reelForm.angulo || null,
        hora: reelForm.hora || null,
        notas: reelForm.notas || null
      }
    });
    queryClient.invalidateQueries({ queryKey: getListPlanReelsQueryKey() });
    setEditingReel(null);
    setSavingReel(false);
  };

  const handleSaveObjectives = async () => {
    setSavingObj(true);
    const data: Record<string, number | null> = {};
    for (const k of OBJECTIVE_KEYS) {
      data[k.key] = objForms[k.key] ? Number(objForms[k.key]) : null;
    }
    await upsertObjective.mutateAsync({ data: data as any });
    queryClient.invalidateQueries({ queryKey: getListPlanObjectivesQueryKey() });
    setSavingObj(false);
  };

  const handleGenerateWeekBatch = async () => {
    setIsGeneratingWeek(true);
    setGeneratedBriefs([]);
    try {
      const res = await fetch("/api/accai/batch-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_number: selectedWeek })
      });
      const data = await res.json();
      
      if (data.briefs) {
        setGeneratedBriefs(data.briefs);
        // Optional: Auto-update planReels table in DB
        for (const brief of data.briefs) {
          const dia = DIAS[brief.day - 1];
          await (upsertPlanReel as any).mutateAsync({
            data: {
              semana: selectedWeek,
              dia: dia,
              tema: brief.hook.slice(0, 60),
              angulo: brief.angulo,
              notas: brief.voiceover
            }
          });
        }
        queryClient.invalidateQueries({ queryKey: getListPlanReelsQueryKey() });
      }
    } catch (error) {
      console.error("Batch error:", error);
    } finally {
      setIsGeneratingWeek(false);
    }
  };

  const generateAudio = async (brief: Brief) => {
    const id = `${brief.day}-${brief.angulo}`;
    setGeneratingAudioId(id);
    // Placeholder for ElevenLabs API
    await new Promise(r => setTimeout(r, 2000));
    setAudioLinks(prev => ({ ...prev, [id]: "#" }));
    setGeneratingAudioId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const avgViews = reels.length > 0 ? reels.reduce((s, r) => s + r.views, 0) / reels.length : 0;
  const avgSavesPer1k = reels.length > 0 ? reels.reduce((s, r) => s + r.savesPer1k, 0) / reels.length : 0;

  const getMetricStatus = (current: number, goal: number) => {
    if (goal === 0) return "neutral";
    const pct = (current / goal) * 100;
    if (pct >= 90) return "green";
    if (pct >= 60) return "yellow";
    return "red";
  };

  const metricColors: Record<string, string> = { green: "#00CC66", yellow: "#CC8800", red: "#FF2D20", neutral: "#666666" };

  return (
    <div className="space-y-12">
      {/* OBJECTIVES */}
      <section>
        <div className="vc-section-title">// OBJETIVOS ESTRATÉGICOS</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OBJECTIVE_KEYS.map(k => {
            const goalVal = Number(objForms[k.key] || 0);
            let currentVal = 0;
            if (k.key === "viewsGoal") currentVal = avgViews;
            if (k.key === "savesPer1kGoal") currentVal = avgSavesPer1k;
            if (k.key === "followersGoal" && latestSnapshot) currentVal = latestSnapshot.followersGained;
            if (k.key === "reelsPerWeekGoal") currentVal = reels.length > 0 ? reels.length / 13 : 0;

            const status = goalVal > 0 ? getMetricStatus(currentVal, goalVal) : "neutral";
            const color = metricColors[status];
            const pct = goalVal > 0 ? Math.min((currentVal / goalVal) * 100, 100) : 0;

            return (
              <div key={k.key} className="vc-card group">
                <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase mb-4">{k.label}</div>
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] font-mono text-white/30 uppercase mb-1">Target</div>
                    <Input
                      type="number"
                      value={objForms[k.key] || ""}
                      onChange={e => setObjForms(prev => ({ ...prev, [k.key]: e.target.value }))}
                      className="vc-input h-8 text-xs bg-white/[0.02]"
                    />
                  </div>
                  {goalVal > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[18px] font-mono font-bold text-white">
                          {Math.round(currentVal).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-700" 
                          style={{ width: `${pct}%`, backgroundColor: color }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveObjectives} disabled={savingObj} className="vc-btn-primary h-10 px-8">
            {savingObj ? "SYNCING..." : "ACTUALIZAR OBJETIVOS"}
          </Button>
        </div>
      </section>

      {/* CALENDAR */}
      <section>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="vc-section-title" style={{ marginBottom: 0 }}>// CALENDARIO OPERACIONAL</div>
          <div className="flex items-center gap-3">
            <Select value={String(selectedWeek)} onValueChange={v => setSelectedWeek(Number(v))}>
              <SelectTrigger className="vc-input h-10 w-32 border-glass-border bg-glass-surface">
                <SelectValue placeholder="Semana" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c0e14] border-glass-border">
                {WEEKS.map(w => <SelectItem key={w} value={String(w)}>W{String(w).padStart(2, '0')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleGenerateWeekBatch} 
              disabled={isGeneratingWeek} 
              className="vc-btn-primary h-10 px-6"
            >
              {isGeneratingWeek ? <Loader2 className="animate-spin mr-2" size={16} /> : <Zap className="mr-2" size={16} />}
              GENERAR SEMANA
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {DIAS.map(dia => {
            const dayReel = weekReels.find(r => r.dia === dia);
            const isEditing = editingReel?.semana === selectedWeek && editingReel?.dia === dia;

            return (
              <div key={dia} className={cn(
                "vc-card p-0 flex flex-col min-h-[140px] transition-all duration-300",
                dayReel?.tema ? "border-[#0C2DF5]/30 bg-[#0C2DF5]/5" : "border-glass-border bg-glass-surface"
              )}>
                <div className="px-3 py-2 border-b border-white/5 bg-white/5 font-mono text-[10px] text-white/40 tracking-widest uppercase">
                  {dia}
                </div>
                <div className="flex-1 p-4 flex flex-col">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={reelForm.tema}
                        onChange={e => setReelForm({...reelForm, tema: e.target.value})}
                        placeholder="Tema..."
                        className="vc-input h-8 text-[11px] bg-black/40"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveReel} disabled={savingReel} className="vc-btn-primary flex-1 h-7 text-[10px]">OK</Button>
                        <Button onClick={() => setEditingReel(null)} variant="outline" className="flex-1 h-7 text-[10px] border-white/10 text-white/40 capitalize">✕</Button>
                      </div>
                    </div>
                  ) : dayReel?.tema ? (
                    <button
                      onClick={() => { setEditingReel({ semana: selectedWeek, dia }); setReelForm({ tema: dayReel.tema || "", angulo: dayReel.angulo || "", hora: dayReel.hora || "", notas: dayReel.notas || "" }); }}
                      className="text-left group/cal"
                    >
                      <div className="text-[12px] font-mono text-white group-hover/cal:text-[var(--accent)] transition-colors line-clamp-3 leading-relaxed">
                        {dayReel.tema}
                      </div>
                      <div className="mt-2 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                        {dayReel.angulo || "CONCEPT"}
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEditingReel({ semana: selectedWeek, dia }); setReelForm({ tema: "", angulo: "", hora: "", notas: "" }); }}
                      className="flex-1 flex items-center justify-center text-white/5 hover:text-white/20 transition-all"
                    >
                      <Plus size={24} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* GENERATED BRIEFS (LIQUID GLASS CARDS) */}
      {generatedBriefs.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="vc-section-title">// PRODUCTION BRIEFS — W{selectedWeek}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {generatedBriefs.map((brief) => {
              const audioId = `${brief.day}-${brief.angulo}`;
              const hasAudio = !!audioLinks[audioId];
              const isGeneratingAudio = generatingAudioId === audioId;

              return (
                <div key={audioId} className="vc-card p-6 space-y-6 flex flex-col">
                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[var(--accent)] tracking-[0.2em] uppercase">
                        DÍA {brief.day} // {brief.angulo}
                      </div>
                      <h3 className="text-lg font-mono text-white font-bold leading-tight">
                        {brief.hook.length > 80 ? brief.hook.slice(0, 80) + "..." : brief.hook}
                      </h3>
                    </div>
                    <Button 
                      onClick={() => generateAudio(brief)}
                      disabled={isGeneratingAudio || hasAudio}
                      className={cn(
                        "h-10 px-6 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-all",
                        hasAudio ? "bg-[#00CC66]/20 text-[#00CC66] border border-[#00CC66]/30" : "vc-btn-primary"
                      )}
                    >
                      {isGeneratingAudio ? (
                        <Loader2 className="animate-spin mr-2" size={14} />
                      ) : hasAudio ? (
                        <CheckCircle2 className="mr-2" size={14} />
                      ) : (
                        <Volume2 className="mr-2" size={14} />
                      )}
                      {isGeneratingAudio ? "GENERANDO..." : hasAudio ? "AUDIO READY" : "GENERAR AUDIO"}
                    </Button>
                  </div>

                  {/* Operational Sections */}
                  <div className="grid grid-cols-1 gap-4 flex-1">
                    <div className="space-y-2 p-4 bg-white/[0.03] border border-white/5 rounded-xl group/vo">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.15em]">VOICEOVER (ElevenLabs)</span>
                        <button 
                          onClick={() => copyToClipboard(brief.voiceover)}
                          className="opacity-0 group-hover/vo:opacity-100 transition-opacity text-[10px] font-mono text-[var(--accent)] flex items-center gap-1"
                        >
                          <Copy size={10} /> COPIAR
                        </button>
                      </div>
                      <p className="text-[13px] text-white/80 leading-relaxed font-body italic">
                        "{brief.voiceover}"
                      </p>
                    </div>

                    <div className="space-y-2 p-4 bg-white/[0.03] border border-white/5 rounded-xl">
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.15em]">VISUAL DIRECTION</span>
                      <p className="text-[12px] text-white/60 leading-relaxed">
                        {brief.visualDirection}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 p-4 bg-[#0C2DF5]/5 border border-[#0C2DF5]/10 rounded-xl">
                        <span className="text-[9px] font-mono text-[var(--accent)] uppercase tracking-[0.15em]">SUBTITLE CUES</span>
                        <p className="text-[11px] text-white/90 font-mono">
                          {brief.subtitleCues}
                        </p>
                      </div>
                      <div className="space-y-2 p-4 bg-[#CC8800]/5 border border-[#CC8800]/10 rounded-xl">
                        <span className="text-[9px] font-mono text-[#CC8800] uppercase tracking-[0.15em]">HOOK TEST (THREADS)</span>
                        <p className="text-[11px] text-white/90 font-mono">
                          {brief.hook}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-4 border-t border-white/5 flex gap-3">
                    {hasAudio && (
                      <a 
                        href="#" 
                        className="flex-1 h-10 flex items-center justify-center bg-white/10 hover:bg-white/15 text-white font-mono text-[10px] tracking-widest uppercase rounded-lg border border-white/10 transition-all"
                      >
                        <Download className="mr-2" size={14} /> DOWNLOAD VO
                      </a>
                    )}
                    <Button 
                      variant="outline"
                      onClick={() => copyToClipboard(brief.rawContent)}
                      className="flex-1 h-10 border-white/10 text-white/60 hover:text-white font-mono text-[10px] tracking-widest uppercase"
                    >
                      COPIAR BRIEF COMPLETO
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Plus({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
