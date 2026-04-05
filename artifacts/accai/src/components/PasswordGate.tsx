import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Default to true while checking
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080808] text-white">
      <div className="text-center mb-[24px]">
        <h1 className="font-mono text-[48px] leading-none mb-2" data-testid="text-gate-title">ACCAI</h1>
        <div className="text-[#0C2DF5] text-[12px] uppercase tracking-[0.2em]" data-testid="text-gate-subtitle">
          // VILLACLUB INTERNAL
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[300px]">
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Contraseña"
          className={`w-full h-10 rounded-none border bg-[#0D0D0D] text-white placeholder:text-[#666666] focus-visible:ring-0 focus-visible:ring-offset-0 ${
            error ? "border-[#FF2D20]" : "border-[#1A1A1A]"
          }`}
          data-testid="input-gate-password"
        />
        <Button
          type="submit"
          className="w-full h-10 rounded-none bg-[#0C2DF5] text-white hover:bg-[#0C2DF5]/90 uppercase tracking-[0.1em]"
          data-testid="button-gate-submit"
        >
          Acceder
        </Button>
      </form>
    </div>
  );
}
