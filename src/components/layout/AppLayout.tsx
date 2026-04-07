"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Film, Eye, Cpu, Calendar, MessageSquare } from "lucide-react";
import { PasswordGate } from "../PasswordGate";
import { useEffect, useState } from "react";
import { useListReels, useListCompetitors, useListAccaiSessions } from "@/lib/api-client-react";
import { isToday, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface TokenStatus {
  valid: boolean;
  daysRemaining: number | null;
  error?: string;
}

const NAV = [
  { label: "CUENTA", icon: BarChart3, route: "/cuenta" },
  { label: "REELS", icon: Film, route: "/reels" },
  { label: "COMPETIDORES", icon: Eye, route: "/competidores" },
  { label: "ACCAI AI", icon: Cpu, route: "/accai-ai" },
  { label: "PLAN 90D", icon: Calendar, route: "/plan-90d" },
  { label: "THREADS", icon: MessageSquare, route: "/threads" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [threadsWeekCount, setThreadsWeekCount] = useState<number | null>(null);

  const { data: reels = [] } = useListReels();
  const { data: competitors = [] } = useListCompetitors();
  const { data: sessions = [] } = useListAccaiSessions();

  const unclassifiedCount = reels.filter(r => !r.tema || r.tema === "(sin clasificar)").length;
  const sessionsToday = sessions.filter(s => {
    try { return isToday(new Date(s.createdAt)); } catch { return false; }
  }).length;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetch("/api/instagram/token-status")
      .then(r => r.json())
      .then(d => setTokenStatus(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/threads/posts")
      .then(r => r.json())
      .then((posts: Array<{ postedAt?: string | null }>) => {
        const count = posts.filter(p => {
          try { return p.postedAt && isThisWeek(new Date(p.postedAt)); } catch { return false; }
        }).length;
        setThreadsWeekCount(count);
      })
      .catch(() => {});
  }, []);

  const getBadge = (route: string) => {
    if (route === "/reels" && unclassifiedCount > 0) {
      return (
        <span className="ml-auto rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400">
          {unclassifiedCount}
        </span>
      );
    }
    if (route === "/competidores" && competitors.length > 0) {
      return (
        <span className="ml-auto font-mono text-[9px] text-white/35">
          {competitors.length}
        </span>
      );
    }
    if (route === "/threads" && threadsWeekCount !== null && threadsWeekCount > 0) {
      return (
        <span className="ml-auto rounded-md border border-[var(--vc-accent)]/35 bg-[var(--accent-subtle)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--vc-accent)]">
          {threadsWeekCount}
        </span>
      );
    }
    if (route === "/accai-ai" && sessionsToday > 0) {
      return (
        <span className="ml-auto font-mono text-[9px] text-white/35">
          {sessionsToday}
        </span>
      );
    }
    return null;
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-base)] p-6 text-center">
        <div className="vc-gate-card max-w-sm">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--vc-accent)]">ACCAI</p>
          <h2 className="mt-3 font-mono text-lg text-white">Vista de escritorio</h2>
          <p className="mt-3 font-[family-name:var(--font-body)] text-sm leading-relaxed text-white/50">
            Esta consola está optimizada para pantallas anchas. Abre ACCAI desde un ordenador o amplía la ventana del navegador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PasswordGate>
      <div className="relative min-h-screen font-[family-name:var(--font-body)] text-[var(--text-primary)]">
        <div className="vc-app-bg" aria-hidden />
        <aside
          className={cn(
            "vc-sidebar fixed top-0 bottom-0 left-0 z-40 flex w-[264px] flex-col border-r border-white/[0.08]"
          )}
        >
          <div className="border-b border-white/[0.06] px-6 pb-5 pt-8">
            <div className="font-mono text-xl font-semibold tracking-tight text-white">ACCAI™</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--vc-accent)]">
              VILLACLUB
            </div>
            <p className="mt-4 font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-white/40">
              Inteligencia operativa para tu contenido y conversión.
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {NAV.map((item) => {
              const isActive = pathname === item.route || pathname?.startsWith(`${item.route}/`);
              const Icon = item.icon;
              const badge = getBadge(item.route);
              return (
                <Link
                  key={item.route}
                  href={item.route}
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/[0.08] text-white shadow-[0_0_0_1px_rgba(77,108,255,0.35)]"
                      : "text-white/45 hover:bg-white/[0.05] hover:text-white/85"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-[var(--vc-accent)]/20 text-[var(--vc-accent)]"
                        : "bg-white/[0.04] text-white/40 group-hover:text-white/70"
                    )}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/[0.06] px-6 py-5">
            {tokenStatus ? (
              <div
                className={cn(
                  "font-mono text-[9px] uppercase tracking-[0.12em]",
                  tokenStatus.valid && (tokenStatus.daysRemaining ?? 999) >= 7
                    ? "text-white/35"
                    : "text-[var(--danger)]"
                )}
              >
                {tokenStatus.valid
                  ? `Instagram · ${tokenStatus.daysRemaining ?? "—"} días`
                  : `Instagram · ${tokenStatus.error || "token inválido"}`}
              </div>
            ) : (
              <div className="loading-pulse">Verificando token…</div>
            )}
          </div>
        </aside>

        <main className="relative z-10 min-h-screen pl-[264px]">
          <div className="mx-auto max-w-[1600px] px-8 py-10 pb-16">{children}</div>
        </main>
      </div>
    </PasswordGate>
  );
}
