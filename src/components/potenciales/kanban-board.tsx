"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ETAPAS,
  contactoSemaforo,
  formatContacto,
  toDatetimeLocalValue,
  type Lead,
} from "@/lib/leads";
import { ChevronLeft, ChevronRight, RefreshCw, Trash2, X } from "lucide-react";

const SEMAFORO_CLASS = {
  red: "bg-danger",
  yellow: "bg-caution",
  green: "bg-success",
  gray: "bg-border",
};

function etapaLabel(etapa: number) {
  const e = ETAPAS.find((x) => x.id === etapa);
  return e ? `${e.emoji} ${e.label}` : `Etapa ${etapa}`;
}

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const [form, setForm] = useState<Lead | null>(null);
  const [savingLead, setSavingLead] = useState(false);

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

  const setField = <K extends keyof Lead>(key: K, value: Lead[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const numField = (key: "monto_sena" | "monto_total", raw: string) =>
    setField(key, raw === "" ? null : (parseFloat(raw) || 0));

  const saveLead = async () => {
    if (!form) return;
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSavingLead(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          etapa: form.etapa,
          estado: form.estado,
          fecha_proximo_contacto: form.fecha_proximo_contacto || null,
          fecha_completar_pago: form.fecha_completar_pago || null,
          monto_sena: form.monto_sena,
          monto_total: form.monto_total,
          url_manychat: form.url_manychat || null,
          notas: form.notas || null,
          objecion: form.objecion || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el lead");
    } finally {
      setSavingLead(false);
    }
  };

  const deleteLead = async () => {
    if (!form) return;
    if (!confirm(`¿Eliminar el lead "${form.nombre}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/leads/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el lead");
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
                      onClick={() => setForm({ ...lead })}
                      className="cursor-pointer rounded-lg border border-border bg-surface-2 p-3 hover:border-accent/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{lead.nombre}</p>
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${SEMAFORO_CLASS[sem]}`}
                          title={lead.fecha_proximo_contacto ?? "Sin fecha"}
                        />
                      </div>
                      {lead.fecha_proximo_contacto ? (
                        <p className="mt-2 text-[10px] text-muted">
                          Contacto: {formatContacto(lead.fecha_proximo_contacto)}
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
        Arrastrá las tarjetas entre columnas o hacé click en una para editarla. Para agregar
        leads nuevos usá <strong className="text-foreground">Agendar Lead</strong> en modo
        Potencial.
      </p>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar lead</h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navegación entre columnas / etapas */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-2 py-2">
              <button
                type="button"
                onClick={() => setField("etapa", Math.max(0, form.etapa - 1))}
                disabled={form.etapa <= 0}
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground disabled:opacity-30"
                title="Columna anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">{etapaLabel(form.etapa)}</span>
              <button
                type="button"
                onClick={() =>
                  setField("etapa", Math.min(ETAPAS.length - 1, form.etapa + 1))
                }
                disabled={form.etapa >= ETAPAS.length - 1}
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground disabled:opacity-30"
                title="Columna siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setField("nombre", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Estado</label>
                <input
                  value={form.estado}
                  onChange={(e) => setField("estado", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted">Próximo contacto</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(form.fecha_proximo_contacto)}
                    onChange={(e) =>
                      setField(
                        "fecha_proximo_contacto",
                        e.target.value ? `${e.target.value}:00` : null,
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Completar pago</label>
                  <input
                    type="date"
                    value={form.fecha_completar_pago ?? ""}
                    onChange={(e) => setField("fecha_completar_pago", e.target.value || null)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted">Monto seña</label>
                  <input
                    type="number"
                    value={form.monto_sena ?? ""}
                    onChange={(e) => numField("monto_sena", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Monto total</label>
                  <input
                    type="number"
                    value={form.monto_total ?? ""}
                    onChange={(e) => numField("monto_total", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted">URL ManyChat</label>
                <input
                  value={form.url_manychat ?? ""}
                  onChange={(e) => setField("url_manychat", e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Objeción</label>
                <input
                  value={form.objecion ?? ""}
                  onChange={(e) => setField("objecion", e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Notas</label>
                <textarea
                  value={form.notas ?? ""}
                  onChange={(e) => setField("notas", e.target.value || null)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={deleteLead}
                className="rounded-lg border border-border p-2 text-muted hover:border-danger hover:text-danger"
                title="Eliminar lead"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveLead}
                disabled={savingLead}
                className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-background disabled:opacity-50"
              >
                {savingLead ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
