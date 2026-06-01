"use client";

import { useCallback, useEffect, useState } from "react";
import { ETAPAS, contactoSemaforo, type Lead } from "@/lib/leads";
import { RefreshCw, ExternalLink } from "lucide-react";

const SEMAFORO_CONFIG = {
  red: { bg: "bg-danger/20", border: "border-danger/50", text: "text-danger", label: "VENCIDO" },
  yellow: { bg: "bg-caution/20", border: "border-caution/50", text: "text-caution", label: "HOY" },
  green: { bg: "bg-success/20", border: "border-success/50", text: "text-success", label: "EN FECHA" },
  gray: { bg: "bg-border/20", border: "border-border", text: "text-muted", label: "SIN FECHA" },
};

const ETAPA_COLORS: Record<number, string> = {
  0: "bg-info/20 text-info border-info/30",
  1: "bg-violet/20 text-violet border-violet/30",
  2: "bg-warning/20 text-warning border-warning/30",
  3: "bg-accent/20 text-accent border-accent/30",
  4: "bg-danger/20 text-danger border-danger/30",
};

function formatFechaHora(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  
  // Check if it includes time (format: YYYY-MM-DD HH:MM or similar)
  if (fecha.includes(" ") || fecha.includes("T")) {
    const [datePart, timePart] = fecha.includes("T") 
      ? fecha.split("T") 
      : fecha.split(" ");
    const [year, month, day] = datePart.split("-");
    const time = timePart ? timePart.slice(0, 5) : null;
    return time ? `${day}/${month}/${year} ${time}` : `${day}/${month}/${year}`;
  }
  
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

function sortLeadsByDate(leads: Lead[]): Lead[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...leads].sort((a, b) => {
    const semA = contactoSemaforo(a.fecha_proximo_contacto);
    const semB = contactoSemaforo(b.fecha_proximo_contacto);

    // Priority: red (overdue) > yellow (today) > green (future) > gray (no date)
    const priority = { red: 0, yellow: 1, green: 2, gray: 3 };
    
    if (priority[semA] !== priority[semB]) {
      return priority[semA] - priority[semB];
    }

    // Within same priority, sort by date
    const dateA = a.fecha_proximo_contacto ? new Date(a.fecha_proximo_contacto) : new Date(9999, 11, 31);
    const dateB = b.fecha_proximo_contacto ? new Date(b.fecha_proximo_contacto) : new Date(9999, 11, 31);
    
    return dateA.getTime() - dateB.getTime();
  });
}

export function AgendaPotenciales() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const sortedLeads = sortLeadsByDate(leads);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface/50 p-6">
        <p className="text-center text-sm text-muted">Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agenda - Potenciales</h2>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {sortedLeads.length === 0 && !error ? (
        <div className="rounded-xl border border-border bg-surface/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">No hay potenciales activos</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedLeads.map((lead) => {
          const sem = contactoSemaforo(lead.fecha_proximo_contacto);
          const config = SEMAFORO_CONFIG[sem];
          const etapa = ETAPAS.find((e) => e.id === lead.etapa);
          const etapaColor = ETAPA_COLORS[lead.etapa] ?? "bg-border/20 text-muted border-border";

          return (
            <div
              key={lead.id}
              className={`rounded-xl border ${config.border} ${config.bg} p-4 transition-all hover:scale-[1.01]`}
            >
              {/* Header: Name + Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium leading-tight text-foreground">{lead.nombre}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${config.bg} ${config.text} border ${config.border}`}>
                  {config.label}
                </span>
              </div>

              {/* Date/Time */}
              <p className="mt-2 font-mono text-xs text-muted">
                {formatFechaHora(lead.fecha_proximo_contacto)}
              </p>

              {/* Notes */}
              {lead.notas ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted/80 italic">
                  {lead.notas}
                </p>
              ) : null}

              {/* Footer: Stage Badge + ManyChat Button */}
              <div className="mt-3 flex items-center justify-between gap-2">
                {etapa ? (
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${etapaColor}`}>
                    {etapa.emoji} {etapa.label}
                  </span>
                ) : (
                  <span />
                )}

                {lead.url_manychat ? (
                  <a
                    href={lead.url_manychat}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md bg-violet/20 border border-violet/30 px-2.5 py-1 text-xs font-medium text-violet hover:bg-violet/30 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir ManyChat
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
