import { Link, useLocation } from "wouter";
import { BarChart3, Film, Eye, Cpu, Calendar, MessageSquare } from "lucide-react";
import { PasswordGate } from "../PasswordGate";
import { useEffect, useState } from "react";
import { useListReels, useListCompetitors, useListAccaiSessions } from "@workspace/api-client-react";
import { format, isToday, isThisWeek } from "date-fns";

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
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [threadsWeekCount, setThreadsWeekCount] = useState<number | null>(null);

  const { data: reels = [] } = useListReels();
  const { data: competitors = [] } = useListCompetitors();
  const { data: sessions = [] } = useListAccaiSessions();

  const unclassifiedCount = reels.filter(r => !r.tema).length;
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
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 bg-[#CC8800] text-black font-bold">
          {unclassifiedCount}
        </span>
      );
    }
    if (route === "/competidores" && competitors.length > 0) {
      return (
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 text-[#666666]">
          {competitors.length}
        </span>
      );
    }
    if (route === "/threads" && threadsWeekCount !== null && threadsWeekCount > 0) {
      return (
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 bg-[#0C2DF5]/20 text-[#0C2DF5]">
          {threadsWeekCount}
        </span>
      );
    }
    if (route === "/accai-ai" && sessionsToday > 0) {
      return (
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 text-[#666666]">
          {sessionsToday}
        </span>
      );
    }
    return null;
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-[#666666] font-mono text-center px-4">
        // ACCAI requiere desktop
      </div>
    );
  }

  return (
    <PasswordGate>
      <div className="min-h-screen bg-[#080808] text-[#F0F0F0] font-sans selection:bg-[#0C2DF5] selection:text-white">
        <aside className="fixed top-0 left-0 bottom-0 w-[240px] bg-[#080808] border-r border-[#1A1A1A] z-40 flex flex-col">
          <div className="p-6">
            <div className="font-mono text-[20px] text-white leading-none">ACCAI</div>
            <div className="text-[#0C2DF5] text-[11px] uppercase tracking-[0.15em] mt-1">
              // VILLACLUB
            </div>
          </div>

          <nav className="mt-4 flex flex-col flex-1">
            {NAV.map((item) => {
              const isActive = location === item.route || location.startsWith(`${item.route}/`);
              const Icon = item.icon;
              const badge = getBadge(item.route);
              return (
                <Link
                  key={item.route}
                  href={item.route}
                  className={`flex items-center gap-3 px-6 py-3.5 text-sm font-mono transition-colors ${
                    isActive
                      ? "text-[#0C2DF5] border-l-[3px] border-[#0C2DF5] bg-[#0C2DF5]/5"
                      : "text-[#666666] border-l-[3px] border-transparent hover:text-white hover:bg-white/5"
                  }`}
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {badge}
                </Link>
              );
            })}
          </nav>

          {/* Token status footer */}
          <div className="p-6 border-t border-[#1A1A1A]">
            {tokenStatus ? (
              <div
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  tokenStatus.valid && (tokenStatus.daysRemaining ?? 999) >= 7
                    ? "text-[#444444]"
                    : "text-[#FF2D20]"
                }`}
              >
                {tokenStatus.valid
                  ? `// IG: ${tokenStatus.daysRemaining}d restantes`
                  : `// IG: ${tokenStatus.error || "inválido"}`}
              </div>
            ) : (
              <div className="font-mono text-[10px] text-[#333333]">// IG: verificando...</div>
            )}
          </div>
        </aside>

        <main className="ml-[240px] p-8 min-h-screen">
          {children}
        </main>
      </div>
    </PasswordGate>
  );
}
