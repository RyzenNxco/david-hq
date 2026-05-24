"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lead } from "@/lib/leads";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

type Transcripcion = {
  id: string;
  titulo?: string;
  nombre?: string;
  contenido?: string;
  lead_id?: string | null;
  created_at?: string;
};

export function TranscripcionesList() {
  const [items, setItems] = useState<Transcripcion[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, lRes] = await Promise.all([
        fetch("/api/transcripciones"),
        fetch("/api/leads"),
      ]);
      const tData = await tRes.json();
      const lData = await lRes.json();
      if (!tRes.ok) throw new Error(tData.error);
      if (!lRes.ok) throw new Error(lData.error);
      setItems(tData.transcripciones);
      setLeads(lData.leads);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const linkLead = async (transcripcionId: string, leadId: string) => {
    try {
      const res = await fetch("/api/transcripciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transcripcionId, lead_id: leadId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems((list) =>
        list.map((t) =>
          t.id === transcripcionId ? { ...t, lead_id: leadId || null } : t,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al vincular");
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-sm text-muted">
          No hay transcripciones en Supabase todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => {
            const title = t.titulo || t.nombre || `Transcripción ${t.id.slice(0, 8)}`;
            const linked = leads.find((l) => l.id === t.lead_id);
            return (
              <div key={t.id} className="glass rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{title}</p>
                    {t.created_at ? (
                      <p className="mt-1 font-mono text-[10px] text-muted">
                        {new Date(t.created_at).toLocaleDateString("es-AR")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {linked ? (
                      <>
                        <Link
                          href="/potenciales"
                          className="rounded-lg border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent"
                        >
                          Ver en Potenciales
                        </Link>
                        <Link
                          href="/tracker"
                          className="rounded-lg border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent"
                        >
                          Ver en Tracker
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted">Vincular a lead</label>
                  <select
                    value={t.lead_id ?? ""}
                    onChange={(e) => linkLead(t.id, e.target.value)}
                    className="mt-1 w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                  >
                    <option value="">— Sin vincular —</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {t.contenido ? (
                  <p className="mt-3 line-clamp-3 text-xs text-muted">{t.contenido}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
