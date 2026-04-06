"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  useGetLatestSnapshot,
  useListSnapshots,
  useCreateSnapshot,
  useGetDirective,
  useSaveDirective,
  getListSnapshotsQueryKey,
  getGetLatestSnapshotQueryKey,
  getGetDirectiveQueryKey
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TimingHour { hour: number; avg: number; }
interface TimingData { hourly: TimingHour[]; recommendedWindows: Array<{hour: number; label: string; avgOnline: number}>; }

export function Cuenta() {
  const queryClient = useQueryClient();
  const { data: latestSnapshot, isLoading: isLoadingLatest } = useGetLatestSnapshot();
  const { data: snapshots = [], isLoading: isLoadingSnapshots } = useListSnapshots();
  const { data: directive, isLoading: isLoadingDirective } = useGetDirective();

  const createSnapshot = useCreateSnapshot();
  const saveDirective = useSaveDirective();

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [views, setViews] = useState("");
  const [followersGained, setFollowersGained] = useState("");
  const [profileVisits, setProfileVisits] = useState("");
  const [directiveContent, setDirectiveContent] = useState("");

  const [syncingIG, setSyncingIG] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [timing, setTiming] = useState<TimingData | null>(null);
  const [timingLoading, setTimingLoading] = useState(false);
  const [profile, setProfile] = useState<{ username?: string; followers_count?: number; media_count?: number; profile_picture_url?: string } | null>(null);

  useEffect(() => {
    if (directive) setDirectiveContent(directive.content);
  }, [directive]);

  useEffect(() => {
    setTimingLoading(true);
    fetch("/api/instagram/timing")
      .then(r => r.json())
      .then(d => setTiming(d))
      .catch(() => {})
      .finally(() => setTimingLoading(false));
    // Fetch IG profile
    fetch("/api/instagram/profile")
      .then(r => r.json())
      .then(d => { if (d.username) setProfile(d); })
      .catch(() => {});
  }, []);

  const handleSyncIG = async () => {
    setSyncingIG(true);
    try {
      const r = await fetch("/api/instagram/sync-account", { method: "POST" });
      const data = await r.json();
      if (data.views !== undefined) {
        queryClient.invalidateQueries({ queryKey: getGetLatestSnapshotQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSnapshotsQueryKey() });
        setLastSyncAt(new Date().toISOString());
      }
    } catch {}
    setSyncingIG(false);
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    createSnapshot.mutate({
      data: {
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        views: Number(views),
        followersGained: Number(followersGained),
        profileVisits: Number(profileVisits)
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSnapshotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLatestSnapshotQueryKey() });
        setPeriodStart(""); setPeriodEnd(""); setViews(""); setFollowersGained(""); setProfileVisits("");
      }
    });
  };

  const handleSaveDirective = () => {
    saveDirective.mutate({ data: { content: directiveContent } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDirectiveQueryKey() })
    });
  };

  const allHours = Array.from({ length: 24 }, (_, i) => {
    const d = timing?.hourly.find(h => h.hour === i);
    return { hour: i, avg: d?.avg ?? 0 };
  });
  const maxAvg = Math.max(...allHours.map(h => h.avg), 1);
  const top3Hours = new Set(timing?.recommendedWindows.slice(0, 3).map(w => w.hour) ?? []);

  return (
    <div className="space-y-12">
      {/* SYNC BAR */}
      <div className="vc-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px" }}>
        <Button
          onClick={handleSyncIG}
          disabled={syncingIG}
          className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
        >
          {syncingIG ? "// sincronizando..." : "SINCRONIZAR CUENTA"}
        </Button>
        {lastSyncAt && (
          <span className="text-[#666666] font-mono text-xs">
            // última sincronización: {format(new Date(lastSyncAt), "dd/MM/yyyy HH:mm")}
          </span>
        )}
      </div>

      {/* PROFILE PREVIEW */}
      {profile && (
        <div className="vc-card" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {profile.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt={profile.username}
              style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid var(--glass-border)", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-subtle)", border: "2px solid var(--vc-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--vc-accent)" }}>
                {(profile.username || "V").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--text-primary)" }}>@{profile.username}</div>
            <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
              {[
                { label: "Seguidores", val: (profile.followers_count || 0).toLocaleString() },
                { label: "Medios", val: (profile.media_count || 0).toString() },
              ].map(({ label, val }) => (
                <div key={label} style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{val}</span>{" "}{label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Views Totales", testId: "text-stat-views", val: latestSnapshot?.views.toLocaleString() ?? null, color: "var(--text-primary)" },
          { label: "Seguidores Ganados", testId: "text-stat-followers", val: latestSnapshot ? `+${latestSnapshot.followersGained.toLocaleString()}` : null, color: "var(--success)" },
          { label: "Visitas al Perfil", testId: "text-stat-visits", val: latestSnapshot?.profileVisits.toLocaleString() ?? null, color: "var(--text-primary)" },
          { label: "Conversión", testId: "text-stat-conversion", val: latestSnapshot ? `${latestSnapshot.conversionPct.toFixed(1)}%` : null, color: "var(--vc-accent)" },
        ].map(({ label, testId, val, color }) => (
          <div key={testId} className="vc-stat-card">
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-body)", marginBottom: "8px" }}
              data-testid={`${testId}-label`}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 700, color, lineHeight: 1 }}
              data-testid={`${testId}-value`}>
              {isLoadingLatest ? <span className="loading-pulse">// ...</span> : (val ?? "—")}
            </div>
          </div>
        ))}
      </div>

      {/* TIMING CHART */}
      <section>
        <h2 className="vc-section-title" style={{ marginBottom: "20px" }}>// MEJOR HORA PARA PUBLICAR</h2>
        {timingLoading ? (
          <div className="loading-pulse">// cargando datos de audiencia...</div>
        ) : timing && timing.hourly.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 24 vertical bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "120px", paddingBottom: "4px" }}>
              {allHours.map(({ hour, avg }) => {
                const heightPct = maxAvg > 0 ? (avg / maxAvg) * 100 : 2;
                const isTop = top3Hours.has(hour);
                return (
                  <div
                    key={hour}
                    title={avg > 0 ? `${hour}h — ${Math.round(avg).toLocaleString()} online` : `${hour}h`}
                    style={{
                      flex: 1,
                      height: `${Math.max(heightPct, 2)}%`,
                      background: isTop ? "var(--vc-accent)" : "var(--glass-border)",
                      boxShadow: isTop ? "0 0 8px var(--accent-glow)" : "none",
                      transition: "background 150ms",
                      cursor: "default",
                      minWidth: 0,
                    }}
                    onMouseEnter={e => { if (!isTop) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; }}
                    onMouseLeave={e => { if (!isTop) (e.currentTarget as HTMLElement).style.background = "var(--glass-border)"; }}
                  />
                );
              })}
            </div>

            {/* Hour labels */}
            <div style={{ display: "flex", gap: "4px" }}>
              {allHours.map(({ hour }) => (
                <div key={hour} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                  {hour % 6 === 0 && (
                    <span style={{ fontSize: "8px", fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>{hour}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Top 3 windows */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {timing.recommendedWindows.slice(0, 3).map((w, i) => (
                <div key={w.hour} className="vc-card" style={{ flex: 1, minWidth: "160px", padding: "16px" }}>
                  <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "var(--font-display)", marginBottom: "6px" }}>
                    VENTANA ÓPTIMA #{i + 1}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--vc-accent)", marginBottom: "2px" }}>{w.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>~{Math.round(w.avgOnline).toLocaleString()} online</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="vc-card" style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-display)" }}>
            // Sin datos de audiencia disponibles. Sincroniza primero.
          </div>
        )}
      </section>

      {/* ACTUALIZAR PERIODO */}
      <section>
        <div className="vc-section-title" data-testid="title-update-period">// ACTUALIZAR PERIODO</div>
        <form onSubmit={handleSavePeriod} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-[#666666] text-xs mb-2 block font-mono">INICIO</label>
            <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required className="w-full bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" data-testid="input-period-start" />
          </div>
          <div className="flex-1">
            <label className="text-[#666666] text-xs mb-2 block font-mono">FIN</label>
            <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required className="w-full bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" data-testid="input-period-end" />
          </div>
          <div className="flex-1">
            <label className="text-[#666666] text-xs mb-2 block font-mono">VIEWS</label>
            <Input type="number" value={views} onChange={e => setViews(e.target.value)} required min="0" className="w-full bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" data-testid="input-views" />
          </div>
          <div className="flex-1">
            <label className="text-[#666666] text-xs mb-2 block font-mono">SEGUIDORES</label>
            <Input type="number" value={followersGained} onChange={e => setFollowersGained(e.target.value)} required min="0" className="w-full bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" data-testid="input-followers" />
          </div>
          <div className="flex-1">
            <label className="text-[#666666] text-xs mb-2 block font-mono">VISITAS</label>
            <Input type="number" value={profileVisits} onChange={e => setProfileVisits(e.target.value)} required min="0" className="w-full bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" data-testid="input-visits" />
          </div>
          <Button type="submit" disabled={createSnapshot.isPending} className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest px-8 font-mono" data-testid="button-save-period">
            {createSnapshot.isPending ? "GUARDANDO..." : "GUARDAR PERIODO"}
          </Button>
        </form>
      </section>

      {/* HISTORIAL */}
      <section>
        <div className="vc-section-title" data-testid="title-history">// HISTORIAL</div>
        <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="vc-table">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Views</th>
                <th>Seguidores</th>
                <th>Visitas</th>
                <th>Conversion%</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingSnapshots ? (
                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center" }} className="loading-pulse">// cargando...</td></tr>
              ) : snapshots.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-display)", fontSize: "11px" }}>// Sin datos registrados</td></tr>
              ) : (
                snapshots.map((snap) => (
                  <tr key={snap.id}>
                    <td>{format(new Date(snap.periodStart), "dd/MM/yyyy")} — {format(new Date(snap.periodEnd), "dd/MM/yyyy")}</td>
                    <td>{snap.views.toLocaleString()}</td>
                    <td style={{ color: "var(--success)" }}>{snap.followersGained > 0 ? `+${snap.followersGained.toLocaleString()}` : snap.followersGained.toLocaleString()}</td>
                    <td>{snap.profileVisits.toLocaleString()}</td>
                    <td>{snap.conversionPct.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DIRECTIVA */}
      <section>
        <div className="vc-section-title" data-testid="title-directive">// DIRECTIVA ESTRATEGICA ACTUAL</div>
        <div className="space-y-4">
          <Textarea
            value={directiveContent}
            onChange={e => setDirectiveContent(e.target.value)}
            placeholder="Define el foco estrategico actual..."
            className="w-full h-32 bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white resize-none font-mono"
            data-testid="textarea-directive"
          />
          <Button
            onClick={handleSaveDirective}
            disabled={saveDirective.isPending || isLoadingDirective}
            className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest px-8 font-mono"
            data-testid="button-save-directive"
          >
            {saveDirective.isPending ? "GUARDANDO..." : "GUARDAR DIRECTIVA"}
          </Button>
        </div>
      </section>
    </div>
  );
}
