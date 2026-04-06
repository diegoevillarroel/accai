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
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base)",
      backgroundImage: "radial-gradient(circle at 50% 50%, rgba(12,45,245,0.08) 0%, transparent 60%)",
      color: "white",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "48px",
            lineHeight: 1,
            marginBottom: "10px",
            color: "white",
            letterSpacing: "-0.01em",
          }}
          data-testid="text-gate-title"
        >
          ACCAI™
        </h1>
        <div
          style={{
            color: "var(--vc-accent)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            fontFamily: "var(--font-display)",
          }}
          data-testid="text-gate-subtitle"
        >
          // VILLACLUB INTERNAL
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", width: "300px" }}>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Contraseña"
          style={{
            width: "100%",
            height: "44px",
            background: "var(--glass)",
            border: `1px solid ${error ? "var(--danger)" : "var(--glass-border)"}`,
            padding: "10px 14px",
            color: "white",
            fontSize: "13px",
            fontFamily: "var(--font-body)",
            outline: "none",
            borderRadius: "6px",
            transition: "border-color 150ms, box-shadow 150ms",
          }}
          onFocus={e => {
            if (!error) {
              e.currentTarget.style.borderColor = "var(--vc-accent)";
              e.currentTarget.style.boxShadow = "0 0 0 1px var(--accent-glow)";
            }
          }}
          onBlur={e => {
            if (!error) {
              e.currentTarget.style.borderColor = "var(--glass-border)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
          data-testid="input-gate-password"
        />
        <button
          type="submit"
          style={{
            width: "100%",
            height: "44px",
            background: "var(--vc-accent)",
            color: "white",
            border: "none",
            fontSize: "12px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
            borderRadius: "6px",
            transition: "filter 150ms",
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
          onMouseLeave={e => (e.currentTarget.style.filter = "none")}
          data-testid="button-gate-submit"
        >
          Acceder
        </button>
        {error && (
          <div style={{
            color: "var(--danger)",
            fontSize: "11px",
            fontFamily: "var(--font-display)",
            textAlign: "center",
          }}>
            // contraseña incorrecta
          </div>
        )}
      </form>
    </div>
  );
}
