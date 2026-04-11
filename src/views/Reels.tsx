"use client";
import React, { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  useListReels,
  useGetReelsStats,
  useCreateReel,
  getListReelsQueryKey,
  getGetReelsStatsQueryKey
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Film, Copy, TrendingUp, ChevronRight } from "lucide-react";
import { useAccaiStream } from "@/lib/useAccaiStream";

const ANGULOS = ["Matemática innegable", "Proceso visible", "Contraste operador-amateur", "Asimetría de mercado"];
const FORMATOS = ["Cara a cámara", "Screenrecording", "Mixto"];

export function Reels() {
  const queryClient = useQueryClient();
  const { data: reels = [] } = useListReels();
  const { data: stats } = useGetReelsStats();
  const createReel = useCreateReel();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    url: "", fecha: "", tema: "", angulo: "", formato: "", followersAtPublish: "",
    views: "", likes: "", comments: "", saves: "", shares: "", alcance: "", transcripcion: "", notas: ""
  });

  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const [searchParams] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams());
  const hookFromQuery = searchParams.get("hook");

  const briefStream = useAccaiStream();
  const autopsiaStream = useAccaiStream();

  useEffect(() => {
    if (hookFromQuery && !briefStream.response && !briefStream.isStreaming) {
      briefStream.stream({ mode: "BRIEF", userInput: hookFromQuery });
    }
  }, [hookFromQuery]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/instagram/sync", { method: "POST" });
      setLastSyncAt(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetReelsStatsQueryKey() });
    } catch {}
    setSyncing(false);
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

  const parseTags = (text: string) => {
    const sections: Record<string, string> = {};
    const tags = ["VOICEOVER", "VISUAL_DIRECTION", "SUBTITLE_CUES", "HOOK", "CTA"];
    tags.forEach(tag => {
      const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i");
      const match = text.match(regex);
      if (match) sections[tag] = match[1].trim();
    });
    return sections;
  };

  const briefData = parseTags(briefStream.response);

  const getFirmaBadgeStyle = (firma: string) => {
    switch (firma) {
      case "CONVERTIDOR": return "vc-badge-convertidor";
      case "VIRAL": return "vc-badge-viral";
      case "EDUCATIVO": return "vc-badge-educativo";
      default: return "vc-badge-muerto";
    }
  };

  return (
    <div className="space-y-10 relative z-10">
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-2">// REELS COMMAND</h1>
          <p className="text-text-secondary text-sm font-body">Infraestructura de análisis y arbitraje de contenido.</p>
        </div>
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button className="vc-btn-primary h-11 px-8">
              AGREGAR REEL MANUAL
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[500px] sm:max-w-none bg-[#080808] border-l border-[#1A1A1A] p-0 overflow-y-auto">
            <SheetHeader className="p-6 border-b border-[#1A1A1A] text-left">
              <SheetTitle className="text-white font-mono uppercase tracking-widest text-sm">// NUEVO REEL</SheetTitle>
              <SheetDescription className="hidden">Añadir un nuevo reel al sistema</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSaveReel} className="p-6 space-y-4">
               <div><label className="text-[#666666] text-xs mb-2 block font-mono">TEMA *</label>
                <Input required value={formData.tema} onChange={e => setFormData({...formData, tema: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A]" /></div>
               <Button type="submit" disabled={createReel.isPending} className="w-full bg-[#0C2DF5] text-white py-6 uppercase font-mono">
                {createReel.isPending ? "GUARDANDO..." : "GUARDAR REEL"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* AI INTELLIGENCE OVERLAY */}
      {(briefStream.isStreaming || Object.keys(briefData).length > 0) && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="vc-section-title">// BRIEF DE PRODUCCIÓN — VALIDATED HOOK</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 vc-card p-8 border-[var(--accent)]/20 bg-[var(--accent)]/[0.02]">
              <div className="flex justify-between items-start mb-6">
                 <div>
                  <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">SCRIPT VOICEOVER (ELEVENLABS)</div>
                  <h3 className="text-xl font-mono text-white">Audio Directivo v1</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(briefData.VOICEOVER || "")} className="text-white/30 hover:text-white">
                  <Copy size={14} />
                </Button>
              </div>
              <p className="text-lg font-mono text-white/90 leading-relaxed italic mb-8">
                {briefData.VOICEOVER || (briefStream.isStreaming ? "// TRANSMITIENDO SCRIPT..." : "Sin datos")}
              </p>
              <Button className="vc-btn-primary w-full h-12">GENERAR AUDIO AI</Button>
            </div>
            <div className="space-y-6">
               <div className="vc-card p-6 border-[#00CC66]/20 bg-[#00CC66]/[0.02]">
                <div className="text-[10px] font-mono text-[#00CC66]/50 uppercase tracking-widest mb-3">EL GANCHO (0-3S)</div>
                <p className="font-mono text-white text-sm font-bold">{briefData.HOOK || "// ANALIZANDO..."}</p>
               </div>
               <div className="vc-card p-6 border-[var(--accent)]/20">
                <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">CTA ESTRATÉGICO</div>
                <p className="font-mono text-white text-xs">{briefData.CTA || "// GENERANDO CIERRE..."}</p>
               </div>
            </div>
          </div>
        </section>
      )}

      {/* OPERATIONAL BAR */}
      <div className="vc-control-bar">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-text-muted font-mono text-[10px] tracking-widest uppercase">// OPS</span>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="border-glass-border text-white text-[10px] tracking-widest uppercase rounded-xl">
            {syncing ? <RefreshCw className="animate-spin mr-2" size={14} /> : <RefreshCw className="mr-2" size={14} />}
            SYNC INSTAGRAM
          </Button>
          {lastSyncAt && (
            <span className="text-[#666666] font-mono text-xs">
              último sync: {formatDistanceToNow(new Date(lastSyncAt), { locale: es })}
            </span>
          )}
        </div>
      </div>

      {/* INTELLIGENCE LAYER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="vc-stat-card border-l-[var(--accent)]">
          <div className="vc-section-title">// MEJOR ÁNGULO</div>
          <div className="text-white font-mono text-sm font-bold uppercase mb-1">Matemática Innegable</div>
          <div className="text-2xl font-bold font-mono text-vc-accent">8.4% <span className="text-xs text-text-muted">saves</span></div>
        </div>
        <div className="vc-stat-card border-l-[#CC8800]">
          <div className="vc-section-title">// DURACIÓN ÓPTIMA</div>
          <div className="text-2xl font-bold font-mono text-white">15-30s</div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="vc-card p-0 overflow-hidden border-glass-border">
        <table className="vc-table">
          <thead>
            <tr>
              <th className="w-[56px]"></th>
              <th>Fecha</th>
              <th>Tema / Angulo</th>
              <th>Views</th>
              <th>Saves%</th>
              <th className="text-right">Firma</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {reels.map((reel) => (
              <tr key={reel.id} className="hover:bg-white/[0.01] transition-colors border-t border-white/[0.05]">
                <td className="py-3 px-4">
                   <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.02)", borderRadius: "2px" }} />
                </td>
                <td className="text-white/40">{format(new Date(reel.fecha), "dd/MM")}</td>
                <td className="font-bold text-white">{reel.tema || "// SIN CLASIFICAR"}</td>
                <td className="text-white/60">{reel.views.toLocaleString()}</td>
                <td className="text-[var(--accent)]">{reel.savesPct.toFixed(1)}%</td>
                <td className="text-right">
                  <span className={`vc-badge ${getFirmaBadgeStyle(reel.firma)}`}>
                    {reel.firma}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
