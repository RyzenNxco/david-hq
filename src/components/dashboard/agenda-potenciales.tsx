"use client";

import { useCallback, useEffect, useState } from "react";
import { ETAPAS, contactoSemaforo, type Lead } from "@/lib/leads";
import type { VentaSync } from "@/lib/notion/ventas";
import { RefreshCw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

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

type DateFilter = "hoy" | "todas";
type EtapaFilter = "todas" | number;

function getTodayString(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function formatFechaHora(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  
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

function formatMonto(monto: number | null): string {
  if (monto == null) return "";
  return `$${monto.toLocaleString("es-AR")}`;
}

function sortLeadsByDate(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const semA = contactoSemaforo(a.fecha_proximo_contacto);
    const semB = contactoSemaforo(b.fecha_proximo_contacto);

    const priority = { red: 0, yellow: 1, green: 2, gray: 3 };
    
    if (priority[semA] !== priority[semB]) {
      return priority[semA] - priority[semB];
    }

    const dateA = a.fecha_proximo_contacto ? new Date(a.fecha_proximo_contacto) : new Date(9999, 11, 31);
    const dateB = b.fecha_proximo_contacto ? new Date(b.fecha_proximo_contacto) : new Date(9999, 11, 31);
    
    return dateA.getTime() - dateB.getTime();
  });
}

function LeadCard({ lead }: { lead: Lead }) {
  const sem = contactoSemaforo(lead.fecha_proximo_contacto);
  const config = SEMAFORO_CONFIG[sem];
  const etapa = ETAPAS.find((e) => e.id === lead.etapa);
  const etapaColor = ETAPA_COLORS[lead.etapa] ?? "bg-border/20 text-muted border-border";

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-4 transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium leading-tight text-foreground">{lead.nombre}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${config.bg} ${config.text} border ${config.border}`}>
          {config.label}
        </span>
      </div>

      <p className="mt-2 font-mono text-xs text-muted">
        {formatFechaHora(lead.fecha_proximo_contacto)}
      </p>

      {lead.notas ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted/80 italic">
          {lead.notas}
        </p>
      ) : null}

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
            ManyChat
          </a>
        ) : null}
      </div>
    </div>
  );
}

type SenaPendiente = {
  id: string;
  cliente: string;
  fecha: string;
  montoCobrado: number | null;
  linkManyChat: string;
};

function SenaCard({ sena }: { sena: SenaPendiente }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-caution/30 bg-caution/10 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{sena.cliente}</p>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{formatFechaHora(sena.fecha)}</span>
          {sena.montoCobrado ? (
            <span className="font-medium text-caution">{formatMonto(sena.montoCobrado)}</span>
          ) : null}
        </div>
      </div>
      {sena.linkManyChat ? (
        <a
          href={sena.linkManyChat}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 rounded-md bg-violet/20 border border-violet/30 px-2 py-1 text-[10px] font-medium text-violet hover:bg-violet/30 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}

function SenasPendientesPanel() {
  const [senas, setSenas] = useState<SenaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchSenas = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/notion/ventas");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        const today = getTodayString();
        const ventas: VentaSync[] = data.ventas || [];
        
        // Filter: TIPO DE PAGO = SEÑA and not completed payment
        const senasPendientes = ventas
          .filter((v) => {
            const esSena = v.notionTipoDePago?.toUpperCase().includes("SEÑA") || 
                          v.notionTipoDePago?.toUpperCase().includes("SENA") ||
                          v.pago === "sena";
            const noCompleto = !v.completoPago;
            
            // Use FUP date if available, otherwise fechaCompletarPago
            const fechaSeguimiento = v.fechaFup || v.fechaCompletarPago;
            const esHoy = fechaSeguimiento === today;
            
            return esSena && noCompleto && esHoy;
          })
          .map((v) => ({
            id: v.notionId,
            cliente: v.cliente,
            fecha: v.fechaFup || v.fechaCompletarPago || v.fecha,
            montoCobrado: v.montoCobrado,
            linkManyChat: v.linkManyChat,
          }));
        
        setSenas(senasPendientes);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar señas");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSenas();
  }, []);

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-foreground">
          Señas pendientes hoy
          {!loading && !error && (
            <span className="ml-2 text-xs font-normal text-muted">({senas.length})</span>
          )}
        </h3>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted" />
        )}
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-center text-xs text-muted py-4">Cargando...</p>
          ) : error ? (
            <p className="text-center text-xs text-danger py-4">{error}</p>
          ) : senas.length === 0 ? (
            <p className="text-center text-xs text-muted py-4">No hay señas pendientes para hoy</p>
          ) : (
            senas.map((sena) => <SenaCard key={sena.id} sena={sena} />)
          )}
        </div>
      )}
    </div>
  );
}

export function AgendaPotenciales() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoy");
  const [etapaFilter, setEtapaFilter] = useState<EtapaFilter>("todas");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeads(data.leads || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = getTodayString();

  const filteredLeads = leads.filter((lead) => {
    // Etapa filter
    if (etapaFilter !== "todas" && lead.etapa !== etapaFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter === "hoy") {
      const fecha = lead.fecha_proximo_contacto?.slice(0, 10);
      return fecha === today;
    }
    
    return true;
  });

  const sortedLeads = sortLeadsByDate(filteredLeads);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agenda - Potenciales</h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left column: Potenciales with filters */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date toggle */}
            <div className="flex rounded-lg border border-border bg-background/50 p-0.5">
              <button
                type="button"
                onClick={() => setDateFilter("hoy")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  dateFilter === "hoy"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("todas")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  dateFilter === "todas"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Todas
              </button>
            </div>

            {/* Etapa chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEtapaFilter("todas")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  etapaFilter === "todas"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted border-border hover:text-foreground hover:border-foreground/50"
                }`}
              >
                Todas
              </button>
              {ETAPAS.map((etapa) => {
                const isActive = etapaFilter === etapa.id;
                const color = ETAPA_COLORS[etapa.id] || "";
                return (
                  <button
                    key={etapa.id}
                    type="button"
                    onClick={() => setEtapaFilter(etapa.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                      isActive
                        ? color
                        : "bg-transparent text-muted border-border hover:text-foreground hover:border-foreground/50"
                    }`}
                  >
                    {etapa.emoji} {etapa.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {/* Empty state */}
          {!loading && sortedLeads.length === 0 && !error ? (
            <div className="rounded-xl border border-border bg-surface/50 px-4 py-8 text-center">
              <p className="text-sm text-muted">
                {dateFilter === "hoy" 
                  ? "No hay potenciales para hoy" 
                  : "No hay potenciales activos"}
              </p>
            </div>
          ) : null}

          {/* Loading state */}
          {loading ? (
            <div className="rounded-xl border border-border bg-surface/50 p-6">
              <p className="text-center text-sm text-muted">Cargando potenciales...</p>
            </div>
          ) : null}

          {/* Lead cards grid */}
          {!loading && sortedLeads.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </div>

        {/* Right column: Señas pendientes */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <SenasPendientesPanel />
        </div>
      </div>
    </div>
  );
}
