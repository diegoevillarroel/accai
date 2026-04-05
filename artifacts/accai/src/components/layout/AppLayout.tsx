import { Link, useLocation } from "wouter";
import { BarChart3, Film, Eye, Cpu, Calendar } from "lucide-react";
import { PasswordGate } from "./PasswordGate";
import { useEffect, useState } from "react";

const navItems = [
  { label: "CUENTA", icon: BarChart3, route: "/cuenta" },
  { label: "REELS", icon: Film, route: "/reels" },
  { label: "COMPETIDORES", icon: Eye, route: "/competidores" },
  { label: "ACCAI AI", icon: Cpu, route: "/accai-ai" },
  { label: "PLAN 90D", icon: Calendar, route: "/plan-90d" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
        {/* Sidebar */}
        <aside className="fixed top-0 left-0 bottom-0 w-[240px] bg-[#080808] border-r border-[#1A1A1A] z-40">
          <div className="p-6">
            <div className="font-mono text-[20px] text-white leading-none">ACCAI</div>
            <div className="text-[#0C2DF5] text-[11px] uppercase tracking-[0.15em] mt-1">
              // VILLACLUB
            </div>
          </div>

          <nav className="mt-8 flex flex-col">
            {navItems.map((item) => {
              const isActive = location === item.route || location.startsWith(`${item.route}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.route}
                  href={item.route}
                  className={`flex items-center gap-3 px-6 py-4 text-sm font-mono transition-colors ${
                    isActive
                      ? "text-[#0C2DF5] border-l-[3px] border-[#0C2DF5] bg-[#0C2DF5]/5"
                      : "text-[#666666] border-l-[3px] border-transparent hover:text-white hover:bg-white/5"
                  }`}
                  data-testid={`link-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-[240px] p-8 min-h-screen">
          {children}
        </main>
      </div>
    </PasswordGate>
  );
}
