"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Calendar, MessageSquare, Settings, Menu, X } from "lucide-react";
import { PasswordGate } from "../PasswordGate";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "// BRIEF", icon: Film, route: "/reels" },
  { label: "// THREADS", icon: MessageSquare, route: "/threads" },
  { label: "// ESTRATEGIA", icon: Calendar, route: "/plan-90d" },
  { label: "// CONFIGURACIÓN", icon: Settings, route: "/cuenta" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const Logo = () => (
    <div className="px-6 py-8">
      <div className="font-mono text-xl font-bold tracking-tighter text-white">
        VILLACLUB™
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--accent)]">
        OPERATIONAL // CONSOLE
      </div>
    </div>
  );

  const NavLinks = () => (
    <nav className="flex flex-1 flex-col gap-1 px-0 py-4">
      {NAV.map((item) => {
        const isActive = pathname === item.route || pathname?.startsWith(`${item.route}/`);
        return (
          <Link
            key={item.route}
            href={item.route}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "vc-sidebar-link",
              isActive && "active"
            )}
          >
            <item.icon size={14} strokeWidth={isActive ? 2.5 : 2} />
            <span className="tracking-widest">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <PasswordGate>
      <div className="relative min-h-screen bg-[#060608] selection:bg-[#0C2DF5]/30">
        {/* Desktop Sidebar */}
        <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-[220px] flex-col border-r border-[rgba(255,255,255,0.07)] bg-[#060608] lg:flex">
          <Logo />
          <NavLinks />
          <div className="mt-auto p-6 border-t border-[rgba(255,255,255,0.05)]">
            <div className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
              System // Stable
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] bg-[#060608]/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="font-mono text-sm font-bold tracking-tighter text-white">VILLACLUB™</div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-1"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="absolute left-0 top-0 bottom-0 w-[260px] bg-[#060608] border-r border-[rgba(255,255,255,0.07)]"
              onClick={e => e.stopPropagation()}
            >
              <Logo />
              <NavLinks />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className={cn(
          "relative min-h-screen transition-all duration-300",
          "lg:pl-[220px] pt-[56px] lg:pt-0"
        )}>
          <div className="mx-auto max-w-[1400px] p-6 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </PasswordGate>
  );
}
