import { useState, useEffect, useRef } from "react";
import {
  useListPlanReels,
  useUpsertPlanReel,
  useListPlanObjectives,
  useUpsertPlanObjective,
  useGetLatestSnapshot,
  useGetReelsStats,
  useListReels,
  getListPlanReelsQueryKey,
  getListPlanObjectivesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PlanReel, PlanObjective } from "@workspace/api-client-react/src/generated/api.schemas";

export function Plan90D() {
  const queryClient = useQueryClient();
  const { data: planReels = [], isLoading: isLoadingReels } = useListReels(); // For linking existing
  const { data: plannedReels = [], isLoading: isLoadingPlanReels } = useListPlanReels();
  const { data: objectives = [], isLoading: isLoadingObjs } = useListPlanObjectives();
  const { data: snapshot } = useGetLatestSnapshot();
  const { data: stats } = useGetReelsStats();

  const upsertPlanReel = useUpsertPlanReel();
  const upsertObjective = useUpsertPlanObjective();

  const [activeSlot, setActiveSlot] = useState<{mes: number, semana: number, slot: number} | null>(null);
  const [slotForm, setSlotForm] = useState({ reelId: "none", conceptoTema: "", conceptoAngulo: "", status: "PENDIENTE" });

  const getObjectiveText = (mes: number) => {
    const obj = objectives.find(o => o.mes === mes);
    return obj ? obj.objetivoText : "";
  };

  const handleObjectiveBlur = (mes: number, text: string) => {
    upsertObjective.mutate({
      data: { mes, objetivoText: text }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlanObjectivesQueryKey() });
      }
    });
  };

  const handleSlotClick = (mes: number, semana: number, slot: number) => {
    const existing = plannedReels.find(p => p.mes === mes && p.semana === semana && p.slot === slot);
    if (existing) {
      setSlotForm({
        reelId: existing.reelId?.toString() || "none",
        conceptoTema: existing.conceptoTema || "",
        conceptoAngulo: existing.conceptoAngulo || "",
        status: existing.status
      });
    } else {
      setSlotForm({ reelId: "none", conceptoTema: "", conceptoAngulo: "", status: "PENDIENTE" });
    }
    setActiveSlot({ mes, semana, slot });
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlot) return;

    upsertPlanReel.mutate({
      data: {
        mes: activeSlot.mes,
        semana: activeSlot.semana,
        slot: activeSlot.slot,
        reelId: slotForm.reelId !== "none" ? parseInt(slotForm.reelId, 10) : null,
        conceptoTema: slotForm.conceptoTema || null,
        conceptoAngulo: slotForm.conceptoAngulo || null,
        status: slotForm.status
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlanReelsQueryKey() });
        setActiveSlot(null);
      }
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "PUBLICADO": return "border-[#00CC66] text-[#00CC66]";
      case "GRABADO": return "border-[#CC8800] text-[#CC8800]";
      default: return "border-[#666666] text-[#666666]";
    }
  };

  const getAnguloColor = (angulo: string) => {
    if (angulo?.includes("Matematica")) return "#0C2DF5";
    if (angulo?.includes("Proceso")) return "#00CC66";
    if (angulo?.includes("Contraste")) return "#CC8800";
    if (angulo?.includes("Asimetria")) return "#9933FF";
    return "#333333";
  };

  const renderStackedBar = (mes: number) => {
    const monthReels = plannedReels.filter(p => p.mes === mes && (p.conceptoAngulo || p.reelId));
    if (monthReels.length === 0) return <div className="h-2 w-full bg-[#1A1A1A] mt-4 mb-8" />;
    
    // Attempt to extract angle
    const angles = monthReels.map(pr => {
      if (pr.conceptoAngulo) return pr.conceptoAngulo;
      if (pr.reelId) {
        const r = planReels.find(x => x.id === pr.reelId);
        return r?.angulo || "Unknown";
      }
      return "Unknown";
    });

    const total = angles.length;
    const counts = { M: 0, P: 0, C: 0, A: 0 };
    angles.forEach(a => {
      if (a.includes("Matematica")) counts.M++;
      else if (a.includes("Proceso")) counts.P++;
      else if (a.includes("Contraste")) counts.C++;
      else if (a.includes("Asimetria")) counts.A++;
    });

    return (
      <div className="mt-4 mb-8">
        <div className="flex h-2 w-full">
          {counts.M > 0 && <div style={{width: `${(counts.M/total)*100}%`, backgroundColor: '#0C2DF5'}} />}
          {counts.P > 0 && <div style={{width: `${(counts.P/total)*100}%`, backgroundColor: '#00CC66'}} />}
          {counts.C > 0 && <div style={{width: `${(counts.C/total)*100}%`, backgroundColor: '#CC8800'}} />}
          {counts.A > 0 && <div style={{width: `${(counts.A/total)*100}%`, backgroundColor: '#9933FF'}} />}
        </div>
        <div className="flex justify-between mt-1 text-[10px] font-mono text-[#666666]">
          <span>M: {((counts.M/total)*100).toFixed(0)}%</span>
          <span>P: {((counts.P/total)*100).toFixed(0)}%</span>
          <span>C: {((counts.C/total)*100).toFixed(0)}%</span>
          <span>A: {((counts.A/total)*100).toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  const renderSlot = (mes: number, semana: number, slot: number) => {
    const data = plannedReels.find(p => p.mes === mes && p.semana === semana && p.slot === slot);
    
    let displayTema = "// Vacio";
    let displayAngulo = "";
    let isLinked = false;

    if (data) {
      if (data.reelId) {
        const linkedReel = planReels.find(r => r.id === data.reelId);
        if (linkedReel) {
          displayTema = linkedReel.tema;
          displayAngulo = linkedReel.angulo;
          isLinked = true;
        }
      } else if (data.conceptoTema) {
        displayTema = data.conceptoTema;
        displayAngulo = data.conceptoAngulo || "";
      }
    }

    return (
      <div 
        onClick={() => handleSlotClick(mes, semana, slot)}
        className="border border-[#1A1A1A] bg-[#0D0D0D] p-3 cursor-pointer hover:border-[#0C2DF5] transition-colors h-[80px] flex flex-col justify-between"
      >
        <div className="text-xs font-mono text-white truncate" title={displayTema}>
          {displayTema}
        </div>
        <div className="flex justify-between items-end">
          {displayAngulo ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-none" style={{backgroundColor: getAnguloColor(displayAngulo)}} />
              <span className="text-[9px] font-mono text-[#666666] truncate max-w-[80px]">{displayAngulo}</span>
            </div>
          ) : <div/>}
          {data && (
            <span className={`text-[9px] uppercase font-mono tracking-widest px-1 py-0.5 border ${getStatusStyles(data.status)}`}>
              {data.status}
            </span>
          )}
        </div>
      </div>
    );
  };

  const MetricRow = ({ label, target, actual, targetVal }: {label: string, target: string, actual: string | number, targetVal: number}) => {
    const isNum = typeof actual === "number";
    const color = isNum ? (actual >= targetVal ? "text-[#00CC66]" : "text-[#FF2D20]") : "text-[#666666]";
    const displayActual = isNum ? actual.toString() : "-";
    
    return (
      <div className="flex justify-between items-center py-2 border-b border-[#1A1A1A] last:border-0">
        <span className="text-xs font-mono text-[#666666]">{label}</span>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-[#666666] uppercase">{target}</span>
          <span className={`text-sm font-mono ${color}`}>{displayActual}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-3 gap-8 h-full">
        {/* MES 1, 2, 3 */}
        {[1, 2, 3].map(mes => (
          <div key={mes} className="flex flex-col h-full">
            <h2 className="text-[#0C2DF5] font-mono text-xl uppercase tracking-widest mb-6">// MES {mes}</h2>
            
            <div className="mb-2">
              <label className="text-[#666666] text-xs mb-2 block font-mono">OBJETIVO PRINCIPAL</label>
              <ObjectiveInput mes={mes} initialValue={getObjectiveText(mes)} onBlur={(v) => handleObjectiveBlur(mes, v)} />
            </div>

            {renderStackedBar(mes)}

            <div className="space-y-6 flex-1">
              {[1, 2, 3, 4].map(semana => (
                <div key={semana} className="space-y-2">
                  <h3 className="text-[#666666] font-mono text-xs uppercase tracking-widest border-b border-[#1A1A1A] pb-1">// SEMANA {semana}</h3>
                  <div className="space-y-2">
                    {[1, 2, 3].map(slot => (
                      <div key={slot}>{renderSlot(mes, semana, slot)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-[#0D0D0D] border border-[#1A1A1A] p-4">
              <h4 className="text-[#0C2DF5] font-mono text-[10px] uppercase tracking-widest mb-3">// METRICAS OBJETIVO</h4>
              {mes === 1 && (
                <>
                  <MetricRow label="Conversion" target="> 15%" actual={snapshot?.conversionPct ?? "-"} targetVal={15} />
                  <MetricRow label="Save rate" target="> 3%" actual={stats?.avgSavesPct ?? "-"} targetVal={3} />
                </>
              )}
              {mes === 2 && (
                <>
                  <MetricRow label="Ventas" target="> 50/mes" actual="-" targetVal={50} />
                  <MetricRow label="DMs" target="> 100/mes" actual="-" targetVal={100} />
                </>
              )}
              {mes === 3 && (
                <>
                  <MetricRow label="LTV/1K" target="> 200" actual="-" targetVal={200} />
                  <MetricRow label="Upsell" target="> 10%" actual="-" targetVal={10} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!activeSlot} onOpenChange={(open) => !open && setActiveSlot(null)}>
        <DialogContent className="bg-[#080808] border border-[#1A1A1A] rounded-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white font-mono uppercase tracking-widest text-sm">
              // PLANIFICAR SLOT M{activeSlot?.mes} S{activeSlot?.semana}-{activeSlot?.slot}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSlot} className="space-y-6 pt-4">
            
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-4 space-y-4">
              <div className="text-[#0C2DF5] font-mono text-[10px] uppercase tracking-widest">// VINCULAR EXISTENTE</div>
              <Select value={slotForm.reelId} onValueChange={v => setSlotForm({...slotForm, reelId: v, conceptoTema: "", conceptoAngulo: ""})}>
                <SelectTrigger className="bg-[#080808] border-[#1A1A1A] rounded-none focus:ring-0 focus:border-[#0C2DF5] text-white">
                  <SelectValue placeholder="Seleccionar Reel publicado" />
                </SelectTrigger>
                <SelectContent className="bg-[#080808] border-[#1A1A1A] rounded-none text-white">
                  <SelectItem value="none">-- No vincular --</SelectItem>
                  {planReels.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.tema}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {slotForm.reelId === "none" && (
              <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-4 space-y-4">
                <div className="text-[#0C2DF5] font-mono text-[10px] uppercase tracking-widest">// IDEA CONCEPTUAL</div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">TEMA</label>
                  <Input value={slotForm.conceptoTema} onChange={e => setSlotForm({...slotForm, conceptoTema: e.target.value})} className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white" />
                </div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">ANGULO</label>
                  <Select value={slotForm.conceptoAngulo} onValueChange={v => setSlotForm({...slotForm, conceptoAngulo: v})}>
                    <SelectTrigger className="bg-[#080808] border-[#1A1A1A] rounded-none focus:ring-0 focus:border-[#0C2DF5] text-white">
                      <SelectValue placeholder="Selecciona angulo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#080808] border-[#1A1A1A] rounded-none text-white">
                      <SelectItem value="Matematica innegable">Matematica innegable</SelectItem>
                      <SelectItem value="Proceso visible">Proceso visible</SelectItem>
                      <SelectItem value="Contraste operador-amateur">Contraste operador-amateur</SelectItem>
                      <SelectItem value="Asimetria de mercado">Asimetria de mercado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <label className="text-[#666666] text-xs mb-2 block font-mono">ESTADO DEL CONTENIDO</label>
              <Select value={slotForm.status} onValueChange={v => setSlotForm({...slotForm, status: v})}>
                <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0 focus:border-[#0C2DF5] text-white font-mono uppercase text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                  <SelectItem value="PENDIENTE" className="font-mono text-xs uppercase text-[#666666]">Pendiente</SelectItem>
                  <SelectItem value="GRABADO" className="font-mono text-xs uppercase text-[#CC8800]">Grabado</SelectItem>
                  <SelectItem value="PUBLICADO" className="font-mono text-xs uppercase text-[#00CC66]">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={upsertPlanReel.isPending} className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono">
              {upsertPlanReel.isPending ? "GUARDANDO..." : "GUARDAR PLAN"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ObjectiveInput({ mes, initialValue, onBlur }: { mes: number, initialValue: string, onBlur: (v: string) => void }) {
  const [val, setVal] = useState("");
  const isInit = useRef(false);

  useEffect(() => {
    if (!isInit.current || val === "") {
      setVal(initialValue);
      isInit.current = true;
    }
  }, [initialValue]);

  return (
    <textarea 
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => onBlur(val)}
      placeholder="Ej: Aumentar conversion al 15%"
      className="w-full bg-[#0D0D0D] border border-[#1A1A1A] text-white p-3 font-sans text-sm focus:outline-none focus:border-[#0C2DF5] transition-colors resize-none h-20"
    />
  );
}
