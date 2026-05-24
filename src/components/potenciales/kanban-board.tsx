"use client";

import { useCallback, useEffect, useState } from "react";
import { ETAPAS, contactoSemaforo, type Lead } from "@/lib/leads";
import { RefreshCw } from "lucide-react";

const SEMAFORO_CLASS = {
  red: "bg-danger",
  yellow: "bg-caution",
  green: "bg-success",
  gray: "bg-border",
};

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeads(data.leads);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const moveLead = async (id: string, etapa: number) => {
    const prev = leads;
    setLeads((list) =>
      list.map((l) => (l.id === id ? { ...l, etapa } : l)),
    );
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch {
      setLeads(prev);
      setError("No se pudo mover el lead");
    }
  };

  const onDrop = (etapa: number) => {
    if (dragId) {
      moveLead(dragId, etapa);
      setDragId(null);
    }
  };

  if (loading) {
    return (
      <p className="text-center text-sm text-muted py-12">Cargando potenciales…</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
          <p className="mt-2 text-xs text-muted">
            Verificá que la tabla <code className="text-foreground">leads</code> exista en
            Supabase y que RLS permita lectura con la anon key.
          </p>
        </div>
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((col) => {
          const cards = leads.filter((l) => l.etapa === col.id);
          return (
            <div
              key={col.id}
              className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-surface/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
            >
              <div className="border-b border-border px-3 py-3">
                <p className="text-sm font-semibold">
                  {col.emoji} {col.label}
                </p>
                <p className="text-xs text-muted">{cards.length}</p>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
                {cards.map((lead) => {
                  const sem = contactoSemaforo(lead.fecha_proximo_contacto);
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragId(lead.id)}
                      className="cursor-grab rounded-lg border border-border bg-surface-2 p-3 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{lead.nombre}</p>
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${SEMAFORO_CLASS[sem]}`}
                          title={lead.fecha_proximo_contacto ?? "Sin fecha"}
                        />
                      </div>
                      {lead.fecha_proximo_contacto ? (
                        <p className="mt-2 font-mono text-[10px] text-muted">
                          Contacto: {lead.fecha_proximo_contacto}
                        </p>
                      ) : null}
                      {lead.notas ? (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted">{lead.notas}</p>
                      ) : null}
                      {lead.url_manychat ? (
                        <a
                          href={lead.url_manychat}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-violet hover:text-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          💬 ManyChat
                        </a>
                      ) : null}
                    </div>
                  );
                })}
                {cards.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-muted">Sin leads</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Arrastrá las tarjetas entre columnas para cambiar etapa. Para agregar leads nuevos usá{" "}
        <strong className="text-foreground">Agendar Lead</strong> en modo Potencial.
      </p>
    </div>
  );
}
