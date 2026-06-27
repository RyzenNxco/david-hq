"use client";

import { use, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage({
  searchParams,
}: {
  // Next.js 16: searchParams es una Promise (Async Request APIs).
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: urlError } = use(searchParams);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#111113",
          border: "1px solid #2a2a2e",
          borderRadius: "14px",
          padding: "40px 36px",
          width: "100%",
          maxWidth: "360px",
        }}
      >
        {/* Logo / título */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#00d4aa18",
              border: "1px solid #00d4aa40",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              fontSize: "18px",
            }}
          >
            ⚡
          </div>
          <h1
            style={{
              color: "#e4e4e7",
              fontSize: "18px",
              fontWeight: 700,
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            David HQ
          </h1>
          <p style={{ color: "#52525b", fontSize: "13px", margin: 0 }}>
            Ingresá tu email para acceder
          </p>
        </div>

        {/* Error de acceso no autorizado */}
        {urlError === "unauthorized" && (
          <div
            style={{
              background: "#ef444415",
              border: "1px solid #ef444430",
              borderRadius: "8px",
              padding: "12px 14px",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            Ese email no tiene acceso.
          </div>
        )}

        {/* Estado enviado */}
        {sent ? (
          <div
            style={{
              background: "#00d4aa15",
              border: "1px solid #00d4aa30",
              borderRadius: "10px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>📬</div>
            <p
              style={{
                color: "#00d4aa",
                fontSize: "14px",
                fontWeight: 600,
                margin: "0 0 6px",
              }}
            >
              Link enviado
            </p>
            <p style={{ color: "#52525b", fontSize: "13px", margin: 0 }}>
              Revisá {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "14px" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@gmail.com"
                required
                style={{
                  width: "100%",
                  background: "#1a1a1d",
                  border: "1px solid #2a2a2e",
                  borderRadius: "8px",
                  padding: "11px 14px",
                  color: "#e4e4e7",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#00d4aa60")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2e")}
              />
            </div>

            {error && (
              <p
                style={{
                  color: "#f87171",
                  fontSize: "12px",
                  margin: "0 0 12px",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#00d4aa80" : "#00d4aa",
                color: "#09090b",
                border: "none",
                borderRadius: "8px",
                padding: "11px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? "Enviando..." : "Enviar link de acceso →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
