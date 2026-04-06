"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { useGetReel, useDeleteReel, getListReelsQueryKey } from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Cpu } from "lucide-react";
import { useAccaiStream } from "@/lib/useAccaiStream";

export function ReelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reelId = params?.id ? parseInt(params.id as string, 10) : 0;

  const { data: reel, isLoading, refetch } = useGetReel(reelId);
  const deleteReel = useDeleteReel();
  const { response, isStreaming, stream, clear } = useAccaiStream();
  const [analysisMode, setAnalysisMode] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!reel) return;
    if (!confirm("¿Eliminar este reel?")) return;
    await deleteReel.mutateAsync(reelId);
    queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
    router.push("/reels");
  };

  const handleAnalyze = async (mode: string) => {
    setAnalysisMode(mode);
    clear();
    await stream({ mode, reelId });
  };

  if (isLoading) return <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", fontSize: "12px", padding: "40px" }}>// cargando...</div>;
  if (!reel) return <div style={{ color: "var(--danger)", fontFamily: "var(--font-display)", fontSize: "12px", padding: "40px" }}>// reel no encontrado</div>;

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button onClick={() => router.push("/reels")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "var(--font-display)" }}>
          <ArrowLeft size={14} /> VOLVER
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--text-primary)", margin: 0 }}>{reel.tema ?? "(sin tema)"}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "4px" }}>{reel.fecha}</div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "VIEWS", value: reel.views.toLocaleString() },
          { label: "SAVES", value: `${reel.savesPct.toFixed(1)}%` },
          { label: "S/1K", value: reel.savesPer1k.toFixed(2) },
          { label: "FIRMA", value: reel.firma },
        ].map(stat => (
          <div key={stat.label} className="vc-stat-card">
            <div style={{ fontSize: "9px", fontFamily: "var(--font-display)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{stat.label}</div>
            <div style={{ fontSize: "22px", fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Meta */}
      <div className="vc-card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <div>
            <div className="vc-section-title">ÁNGULO</div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{reel.angulo ?? "—"}</div>
          </div>
          <div>
            <div className="vc-section-title">FORMATO</div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{reel.formato ?? "—"}</div>
          </div>
          <div>
            <div className="vc-section-title">SEGUIDORES AL PUBLICAR</div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{reel.followersAtPublish.toLocaleString()}</div>
          </div>
        </div>
        {reel.transcripcion && (
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--glass-border)" }}>
            <div className="vc-section-title">TRANSCRIPCIÓN</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{reel.transcripcion}</div>
          </div>
        )}
        {reel.notas && (
          <div style={{ marginTop: "16px" }}>
            <div className="vc-section-title">NOTAS</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{reel.notas}</div>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div className="vc-card">
        <div className="vc-section-title">ACCAI ANÁLISIS</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["AUTOPSIA", "BRIEF", "PATRONES"].map(mode => (
            <button key={mode} onClick={() => handleAnalyze(mode)} disabled={isStreaming} className={`vc-mode-tab ${analysisMode === mode ? "active" : ""}`}>
              <Cpu size={11} style={{ display: "inline", marginRight: "4px" }} />{mode}
            </button>
          ))}
        </div>
        {(response || isStreaming) && (
          <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--glass-border)", borderRadius: "6px", padding: "16px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "var(--font-body)" }}>
            {response || <span className="loading-pulse">// analizando...</span>}
          </div>
        )}
      </div>
    </div>
  );
}
