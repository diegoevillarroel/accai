"use client";
// @ts-nocheck
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccaiStream } from "@/lib/useAccaiStream";

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const OBJECTIVE_KEYS = [
  { key: "followersGoal", label: "META SEGUIDORES", color: "#0C2DF5", unit: "seg" },
  { key: "viewsGoal", label: "META VIEWS PROM", color: "#00CC66", unit: "views" },
  { key: "reelsPerWeekGoal", label: "REELS/SEMANA", color: "#CC8800", unit: "reels" },
  { key: "savesPer1kGoal", label: "SAVES/1K META", color: "#FF2D20", unit: "s/1k" },
];

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

  // Init objective forms from fetched data
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

  const handleGeneratePlan = async () => {
    const objText = OBJECTIVE_KEYS.map(k => `${k.label}: ${objForms[k.key] || "no definido"}`).join("\n");
    const reelsText = reels.slice(0, 15).map(r =>
      `- ${format(new Date(r.fecha), "dd/MM")} | ${r.tema || "sin tema"} | ${r.firma} | ${r.views.toLocaleString()} views`
    ).join("\n");
    const prompt = `Genera un plan de contenido de 90 días (13 semanas) para VILLACLUB basado en:\n\nOBJETIVOS:\n${objText}\n\nHISTORIAL RECIENTE:\n${reelsText}`;
    await planStream.stream({ mode: "ESTRATEGIA", userInput: prompt });
  };

  // Compute live metrics vs objectives
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
      {/* LIVE OBJECTIVES */}
      <section>
        <div className="vc-section-title">// OBJETIVOS 90 DÍAS</div>
        <div className="grid grid-cols-4 gap-4">
          {OBJECTIVE_KEYS.map(k => {
            const goalVal = Number(objForms[k.key] || 0);
            let currentVal = 0;
            if (k.key === "viewsGoal") currentVal = avgViews;
            if (k.key === "savesPer1kGoal") currentVal = avgSavesPer1k;
            if (k.key === "followersGoal" && latestSnapshot && latestSnapshot.id > 0) currentVal = latestSnapshot.followersGained;
            if (k.key === "reelsPerWeekGoal") currentVal = reels.length > 0 ? reels.length / 13 : 0;

            const status = goalVal > 0 ? getMetricStatus(currentVal, goalVal) : "neutral";
            const color = metricColors[status];
            const pct = goalVal > 0 ? Math.min((currentVal / goalVal) * 100, 100) : 0;

            return (
              <div key={k.key} className="vc-card" style={{ padding: "20px" }}>
                <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "var(--font-body)", marginBottom: "12px" }}>{k.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.08em" }}>META</label>
                    <Input
                      type="number"
                      value={objForms[k.key] || ""}
                      onChange={e => setObjForms(prev => ({ ...prev, [k.key]: e.target.value }))}
                      className="bg-transparent border-[rgba(255,255,255,0.1)] focus-visible:ring-0 focus-visible:border-[#0C2DF5] h-8 text-sm mt-1"
                      style={{ borderRadius: "4px" }}
                    />
                  </div>
                  {goalVal > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: "11px" }}>
                        <span style={{ color: "var(--text-muted)" }}>actual</span>
                        <span style={{ color }}>{k.key === "reelsPerWeekGoal" ? currentVal.toFixed(1) : Math.round(currentVal).toLocaleString()} {k.unit}</span>
                      </div>
                      <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", height: "2px", borderRadius: "1px" }}>
                        <div style={{ height: "2px", borderRadius: "1px", transition: "width 300ms ease", width: `${pct}%`, background: color }} />
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", color }}>{pct.toFixed(0)}%</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveObjectives} disabled={savingObj} className="vc-btn-primary h-9 px-6">
            {savingObj ? "GUARDANDO..." : "GUARDAR OBJETIVOS"}
          </Button>
        </div>
      </section>

      {/* WEEK SELECTOR + CALENDAR */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="vc-section-title" style={{ marginBottom: 0 }}>// CALENDARIO DE CONTENIDO</div>
          <div className="flex items-center gap-2">
            <span className="text-[#666666] font-mono text-xs">SEMANA</span>
            <Select value={String(selectedWeek)} onValueChange={v => setSelectedWeek(Number(v))}>
              <SelectTrigger className="vc-field h-8 w-24 text-sm focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-white/10 bg-[#0c0e14] text-white shadow-xl">
                {WEEKS.map(w => <SelectItem key={w} value={String(w)}>W{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {DIAS.map(dia => {
            const dayReel = weekReels.find(r => r.dia === dia);
            const isEditing = editingReel?.semana === selectedWeek && editingReel?.dia === dia;

            return (
              <div key={dia} className={`border min-h-[120px] flex flex-col ${dayReel?.tema ? "border-[#0C2DF5]/50" : "border-[#1A1A1A]"}`}>
                <div className="px-2 py-1.5 border-b border-[#1A1A1A] bg-[#0D0D0D] font-mono text-[10px] text-[#666666] uppercase tracking-wider">{dia.substring(0, 3)}</div>
                <div className="flex-1 p-2">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Input
                        value={reelForm.tema}
                        onChange={e => setReelForm({...reelForm, tema: e.target.value})}
                        placeholder="Tema..."
                        className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] h-6 text-[10px] font-mono px-1"
                        autoFocus
                      />
                      <Input
                        value={reelForm.hora}
                        onChange={e => setReelForm({...reelForm, hora: e.target.value})}
                        placeholder="Hora (ej: 18:00)"
                        className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] h-6 text-[10px] font-mono px-1"
                      />
                      <div className="flex gap-1">
                        <button type="button" onClick={handleSaveReel} disabled={savingReel} className="vc-btn-primary flex-1 py-2 text-[10px]">OK</button>
                        <button onClick={() => setEditingReel(null)} className="flex-1 border border-[#333333] text-[#666666] font-mono text-[10px] py-1 uppercase hover:text-white">✕</button>
                      </div>
                    </div>
                  ) : dayReel?.tema ? (
                    <button
                      onClick={() => { setEditingReel({ semana: selectedWeek, dia }); setReelForm({ tema: dayReel.tema || "", angulo: dayReel.angulo || "", hora: dayReel.hora || "", notas: dayReel.notas || "" }); }}
                      className="w-full h-full text-left space-y-1"
                    >
                      <div className="font-mono text-[10px] text-[#0C2DF5] leading-tight">{dayReel.tema}</div>
                      {dayReel.hora && <div className="font-mono text-[9px] text-[#666666]">{dayReel.hora}</div>}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEditingReel({ semana: selectedWeek, dia }); setReelForm({ tema: "", angulo: "", hora: "", notas: "" }); }}
                      className="w-full h-full flex items-center justify-center text-[#1A1A1A] hover:text-[#333333] font-mono text-lg transition-colors"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ALL WEEKS OVERVIEW */}
      <section>
        <div className="vc-section-title">// VISTA 90D</div>
        <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="vc-table" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th>Semana</th>
                <th>Lun</th>
                <th>Mar</th>
                <th>Mie</th>
                <th>Jue</th>
                <th>Vie</th>
                <th>Sab</th>
                <th>Dom</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: "var(--font-body)" }}>
              {isLoadingPlan ? (
                <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center" }} className="loading-pulse">// cargando...</td></tr>
              ) : (
                WEEKS.map(week => {
                  const wr = planReels.filter(r => r.semana === week);
                  const isSelected = week === selectedWeek;
                  return (
                    <tr key={week} style={{ cursor: "pointer", borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent", background: isSelected ? "rgba(12,45,245,0.04)" : undefined }} onClick={() => setSelectedWeek(week)}>
                      <td style={{ color: "var(--text-muted)", fontSize: "11px" }}>S{week}</td>
                      {DIAS.map(dia => {
                        const dr = wr.find(r => r.dia === dia);
                        return (
                          <td key={dia} style={{ maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dr?.tema || ""}>
                            {dr?.tema ? <span style={{ color: "var(--accent)", fontSize: "11px" }}>{dr.tema.substring(0, 12)}{dr.tema.length > 12 ? "…" : ""}</span> : <span style={{ color: "rgba(255,255,255,0.06)" }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* GENERATE PLAN */}
      <section className="space-y-4">
        <Button type="button" onClick={handleGeneratePlan} disabled={planStream.isStreaming} className="vc-btn-primary h-10 px-8">
          {planStream.isStreaming ? "// generando..." : "GENERAR PLAN DE CONTENIDO CON ACCAI"}
        </Button>

        {(planStream.isStreaming || planStream.response) && (
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 font-mono text-sm whitespace-pre-wrap leading-relaxed text-[#F0F0F0] max-h-[500px] overflow-y-auto">
            {planStream.response}
            {planStream.isStreaming && <span className="text-[#0C2DF5] animate-pulse ml-1">_</span>}
          </div>
        )}
      </section>
    </div>
  );
}
