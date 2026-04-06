import { Link, useLocation } from "wouter";
import { BarChart3, Film, Eye, Cpu, Calendar, MessageSquare } from "lucide-react";
import { PasswordGate } from "../PasswordGate";
import { useEffect, useState } from "react";
import { useListReels, useListCompetitors, useListAccaiSessions } from "@workspace/api-client-react";
import { isToday, isThisWeek } from "date-fns";

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
        <span style={{
          marginLeft: "auto",
          fontSize: "9px",
          fontFamily: "var(--font-display)",
          padding: "2px 6px",
          background: "rgba(204,136,0,0.2)",
          color: "#CC8800",
          border: "1px solid rgba(204,136,0,0.3)",
          borderRadius: "3px",
          fontWeight: "bold",
        }}>
          {unclassifiedCount}
        </span>
      );
    }
    if (route === "/competidores" && competitors.length > 0) {
      return (
        <span style={{
          marginLeft: "auto",
          fontSize: "9px",
          fontFamily: "var(--font-display)",
          color: "var(--text-muted)",
        }}>
          {competitors.length}
        </span>
      );
    }
    if (route === "/threads" && threadsWeekCount !== null && threadsWeekCount > 0) {
      return (
        <span style={{
          marginLeft: "auto",
          fontSize: "9px",
          fontFamily: "var(--font-display)",
          padding: "2px 6px",
          background: "var(--accent-subtle)",
          color: "var(--vc-accent)",
          border: "1px solid rgba(12,45,245,0.3)",
          borderRadius: "3px",
        }}>
          {threadsWeekCount}
        </span>
      );
    }
    if (route === "/accai-ai" && sessionsToday > 0) {
      return (
        <span style={{
          marginLeft: "auto",
          fontSize: "9px",
          fontFamily: "var(--font-display)",
          color: "var(--text-muted)",
        }}>
          {sessionsToday}
        </span>
      );
    }
    return null;
  };

  if (isMobile) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-display)",
        textAlign: "center",
        padding: "16px",
        fontSize: "12px",
      }}>
        // ACCAI requiere desktop
      </div>
    );
  }

  return (
    <PasswordGate>
      <div style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body)",
      }}>
        {/* Sidebar */}
        <aside style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "240px",
          background: "rgba(6, 6, 8, 0.95)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRight: "1px solid var(--glass-border)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Logo */}
          <div style={{ padding: "28px 24px 20px" }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              color: "white",
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}>
              ACCAI™
            </div>
            <div style={{
              color: "var(--vc-accent)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "4px",
              fontFamily: "var(--font-display)",
            }}>
              // VILLACLUB
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: "8px" }}>
            {NAV.map((item) => {
              const isActive = location === item.route || location.startsWith(`${item.route}/`);
              const Icon = item.icon;
              const badge = getBadge(item.route);
              return (
                <Link
                  key={item.route}
                  href={item.route}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 20px",
                    fontSize: "13px",
                    fontFamily: "var(--font-body)",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? "var(--accent-subtle)" : "transparent",
                    borderLeft: `2px solid ${isActive ? "var(--vc-accent)" : "transparent"}`,
                    transition: "background 150ms, color 150ms, border-color 150ms",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-hover)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }
                  }}
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon size={15} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge}
                </Link>
              );
            })}
          </nav>

          {/* Token status footer */}
          <div style={{
            padding: "20px 24px",
            borderTop: "1px solid var(--glass-border)",
          }}>
            {tokenStatus ? (
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: tokenStatus.valid && (tokenStatus.daysRemaining ?? 999) >= 7
                  ? "var(--text-muted)"
                  : "#FF2D20",
              }}>
                {tokenStatus.valid
                  ? `// ig: ${tokenStatus.daysRemaining}d`
                  : `// ig: ${tokenStatus.error || "inválido"}`}
              </div>
            ) : (
              <div className="loading-pulse">// ig: verificando</div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ marginLeft: "240px", padding: "32px", minHeight: "100vh" }}>
          {children}
        </main>
      </div>
    </PasswordGate>
  );
}
