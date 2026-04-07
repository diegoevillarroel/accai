"use client";
import { useState, useEffect } from "react";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const isOk = localStorage.getItem("vc_accai_ok");
    if (isOk !== "true") {
      setIsAuthenticated(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "villaclub2026") {
      localStorage.setItem("vc_accai_ok", "true");
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-base)] p-6">
      <div className="vc-app-bg" aria-hidden />
      <div className="relative z-10 w-full max-w-[400px]">
        <div className="vc-gate-card">
          <div className="mb-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--vc-accent)]">Acceso privado</p>
            <h1
              className="mt-3 bg-gradient-to-br from-white to-white/70 bg-clip-text font-mono text-4xl font-semibold tracking-tight text-transparent"
              data-testid="text-gate-title"
            >
              ACCAI™
            </h1>
            <p
              className="mt-2 text-sm text-white/45"
              data-testid="text-gate-subtitle"
            >
              Consola interna VILLACLUB
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="sr-only" htmlFor="accai-gate-password">
              Contraseña
            </label>
            <input
              id="accai-gate-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Contraseña"
              autoComplete="current-password"
              className={cnInput(error)}
              data-testid="input-gate-password"
            />
            <button
              type="submit"
              className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-[#4d6cff] to-[#3d5cff] text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-[0_8px_32px_-8px_rgba(77,108,255,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vc-accent)] active:scale-[0.98]"
              data-testid="button-gate-submit"
            >
              Entrar
            </button>
            {error && (
              <p className="text-center font-mono text-xs text-[var(--danger)]" role="alert">
                Contraseña incorrecta
              </p>
            )}
          </form>
        </div>
        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-wide text-white/20">
          Sesión en este dispositivo · no compartas acceso
        </p>
      </div>
    </div>
  );
}

function cnInput(error: boolean): string {
  const base =
    "h-12 w-full rounded-xl border bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[var(--vc-accent)] focus:ring-2 focus:ring-[var(--accent-glow)]";
  return error ? `${base} border-[var(--danger)]` : `${base} border-white/[0.1]`;
}
