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
} from "@workspace/api-client-react";
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
      <div className="flex items-center gap-4 border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
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

      {/* STAT CARDS */}
      <div className="grid grid-cols-4 gap-6">
        <div className="border border-[#1A1A1A] p-6">
          <div className="text-[#666666] text-xs uppercase tracking-wider mb-2 font-mono" data-testid="text-stat-views-label">Views Totales</div>
          <div className="text-3xl font-mono" data-testid="text-stat-views-value">
            {isLoadingLatest ? <span className="text-[#0C2DF5] text-sm">// cargando...</span> : (latestSnapshot ? latestSnapshot.views.toLocaleString() : "-")}
          </div>
        </div>
        <div className="border border-[#1A1A1A] p-6">
          <div className="text-[#666666] text-xs uppercase tracking-wider mb-2 font-mono" data-testid="text-stat-followers-label">Seguidores Ganados</div>
          <div className="text-3xl font-mono text-[#00CC66]" data-testid="text-stat-followers-value">
            {isLoadingLatest ? <span className="text-[#0C2DF5] text-sm">// cargando...</span> : (latestSnapshot ? `+${latestSnapshot.followersGained.toLocaleString()}` : "-")}
          </div>
        </div>
        <div className="border border-[#1A1A1A] p-6">
          <div className="text-[#666666] text-xs uppercase tracking-wider mb-2 font-mono" data-testid="text-stat-visits-label">Visitas al Perfil</div>
          <div className="text-3xl font-mono" data-testid="text-stat-visits-value">
            {isLoadingLatest ? <span className="text-[#0C2DF5] text-sm">// cargando...</span> : (latestSnapshot ? latestSnapshot.profileVisits.toLocaleString() : "-")}
          </div>
        </div>
        <div className="border border-[#1A1A1A] p-6">
          <div className="text-[#666666] text-xs uppercase tracking-wider mb-2 font-mono" data-testid="text-stat-conversion-label">Conversion</div>
          <div className="text-3xl font-mono" data-testid="text-stat-conversion-value">
            {isLoadingLatest ? <span className="text-[#0C2DF5] text-sm">// cargando...</span> : (latestSnapshot ? `${latestSnapshot.conversionPct.toFixed(1)}%` : "-")}
          </div>
        </div>
      </div>

      {/* TIMING CHART */}
      <section>
        <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest mb-6">// MEJOR HORA PARA PUBLICAR</h2>
        {timingLoading ? (
          <div className="text-[#666666] font-mono text-xs">// cargando datos de audiencia...</div>
        ) : timing && timing.hourly.length > 0 ? (
          <div className="space-y-4">
            {/* Bar chart */}
            <div className="flex items-end gap-[2px] h-32 border-b border-[#1A1A1A] pb-2">
              {allHours.map(({ hour, avg }) => {
                const heightPct = maxAvg > 0 ? (avg / maxAvg) * 100 : 0;
                const isTop = top3Hours.has(hour);
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: "100%" }}>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full transition-all ${isTop ? "bg-[#0C2DF5]" : "bg-[#1A1A1A] group-hover:bg-[#333333]"}`}
                    />
                    {/* Tooltip on hover */}
                    {avg > 0 && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#0D0D0D] border border-[#1A1A1A] px-2 py-1 text-[9px] font-mono text-[#F0F0F0] whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                        {Math.round(avg).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hour labels (every 4 hours) */}
            <div className="flex gap-[2px]">
              {allHours.map(({ hour }) => (
                <div key={hour} className="flex-1 text-center">
                  {hour % 4 === 0 && (
                    <span className="text-[9px] font-mono text-[#444444]">{hour}h</span>
                  )}
                </div>
              ))}
            </div>

            {/* Top 3 windows */}
            <div className="flex gap-4 pt-2">
              {timing.recommendedWindows.slice(0, 3).map((w, i) => (
                <div key={w.hour} className="border border-[#0C2DF5]/30 bg-[#0C2DF5]/5 px-4 py-2 flex items-center gap-3">
                  <span className="text-[#0C2DF5] font-mono text-xs">🔵</span>
                  <div>
                    <div className="text-white font-mono text-xs font-bold">VENTANA ÓPTIMA #{i + 1}</div>
                    <div className="text-[#0C2DF5] font-mono text-sm">{w.label}</div>
                    <div className="text-[#666666] font-mono text-[10px]">~{Math.round(w.avgOnline).toLocaleString()} online</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[#666666] font-mono text-xs border border-[#1A1A1A] p-4">
            // Sin datos de audiencia disponibles. Sincroniza primero.
          </div>
        )}
      </section>

      {/* ACTUALIZAR PERIODO */}
      <section>
        <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest mb-6" data-testid="title-update-period">// ACTUALIZAR PERIODO</h2>
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
        <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest mb-6" data-testid="title-history">// HISTORIAL</h2>
        <div className="border border-[#1A1A1A]">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-normal">Periodo</th>
                <th className="py-4 px-6 font-normal">Views</th>
                <th className="py-4 px-6 font-normal">Seguidores</th>
                <th className="py-4 px-6 font-normal">Visitas</th>
                <th className="py-4 px-6 font-normal">Conversion%</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {isLoadingSnapshots ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#0C2DF5]">// cargando...</td></tr>
              ) : snapshots.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#666666]">// Sin datos registrados</td></tr>
              ) : (
                snapshots.map((snap, idx) => (
                  <tr key={snap.id} className={idx % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"}>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">{format(new Date(snap.periodStart), "dd/MM/yyyy")} — {format(new Date(snap.periodEnd), "dd/MM/yyyy")}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">{snap.views.toLocaleString()}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A] text-[#00CC66]">{snap.followersGained > 0 ? `+${snap.followersGained.toLocaleString()}` : snap.followersGained.toLocaleString()}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">{snap.profileVisits.toLocaleString()}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">{snap.conversionPct.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DIRECTIVA */}
      <section>
        <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest mb-6" data-testid="title-directive">// DIRECTIVA ESTRATEGICA ACTUAL</h2>
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
