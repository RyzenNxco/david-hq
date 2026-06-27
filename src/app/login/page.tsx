"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage({
  searchParams,
}: {
  // Next.js 16: searchParams es una Promise (Async Request APIs).
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: urlError } = use(searchParams);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const inputStyle = {
    width: "100%",
    background: "#1a1a1d",
    border: "1px solid #2a2a2e",
    borderRadius: "8px",
    padding: "11px 14px",
    color: "#e4e4e7",
    fontSize: "14px",
    boxSizing: "border-box" as const,
    outline: "none",
    transition: "border-color 0.15s",
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
            Ingresá para acceder
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

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "10px" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@gmail.com"
              autoComplete="email"
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#00d4aa60")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2e")}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              style={inputStyle}
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
            {loading ? "Entrando..." : "Entrar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
