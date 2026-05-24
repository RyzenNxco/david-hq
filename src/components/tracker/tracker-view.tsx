"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calcCommission,
  catLabel,
  formatMoney,
  pagoLabel,
} from "@/lib/commissions";
import { formatMonthLabel, currentMonthKey, shiftMonth } from "@/lib/month";
import type { VentaSync } from "@/lib/notion/ventas";
import {
  loadOverrides,
  saveOverride,
  type VentaOverride,
} from "@/lib/tracker-overrides";
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";

type VentaRow = VentaSync & {
  override?: VentaOverride;
  comision: number;
  montoDisplay: number;
  needsCompletion: boolean;
};

function mergeVentas(ventas: VentaSync[], overrides: Record<string, VentaOverride>): VentaRow[] {
  return ventas.map((v) => {
    const override = overrides[v.notionId];
    const monto = override?.monto ?? v.montoNotion ?? 0;
    const needsCompletion = monto <= 0;

    if (needsCompletion) {
      return { ...v, override, comision: 0, montoDisplay: 0, needsCompletion: true };
    }

    const calc = calcCommission({
      moneda: override?.moneda ?? "ARS",
      monto,
      cotiz: override?.cotiz ?? 1430,
      ticketUsdIn: override?.ticketUsd ?? (v.producto === "downsell" ? 55 : 197),
      cat: v.categoria,
      pago: v.pago,
      prod: v.producto,
    });

    return {
      ...v,
      override,
      comision: calc.comision,
      montoDisplay: monto,
      needsCompletion: false,
    };
  });
}

export function TrackerView() {
  const [month, setMonth] = useState(currentMonthKey);
  const [ventas, setVentas] = useState<VentaSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignored, setIgnored] = useState(0);
  const [overrideVersion, setOverrideVersion] = useState(0);
  const [modalId, setModalId] = useState<string | null>(null);
  const [form, setForm] = useState<VentaOverride>({
    moneda: "ARS",
    monto: 0,
    cotiz: 1430,
  });

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/notion/ventas?month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error de sync");
      setVentas(data.ventas);
      setIgnored(data.ignored ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    sync();
  }, [sync]);

  const rows = useMemo(
    () => mergeVentas(ventas, loadOverrides()),
    [ventas, overrideVersion],
  );

  const pending = rows.filter((r) => r.needsCompletion).length;
  const totalComision = rows.reduce((s, r) => s + r.comision, 0);

  const openModal = (notionId: string) => {
    const v = ventas.find((x) => x.notionId === notionId);
    const ov = loadOverrides()[notionId];
    setForm(
      ov ?? {
        moneda: "ARS",
        monto: v?.montoNotion ?? 0,
        cotiz: 1430,
        ticketUsd: v?.producto === "downsell" ? 55 : 197,
      },
    );
    setModalId(notionId);
  };

  const saveModal = () => {
    if (!modalId || !form.monto || form.monto <= 0) return;
    saveOverride(modalId, form);
    setModalId(null);
    setOverrideVersion((v) => v + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center font-semibold">
            {formatMonthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Sincronizar Notion"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted">Ventas del mes</p>
          <p className="mt-1 text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted">Comisión neta (ARS)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-accent">
            {formatMoney(totalComision)}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted">Pendientes de completar</p>
          <p className="mt-1 text-2xl font-bold text-warning">{pending}</p>
          {ignored > 0 ? (
            <p className="mt-1 text-[11px] text-muted">
              {ignored} ignoradas (POR CARGAR / FALTA DATOS / sin TIPO o fecha)
            </p>
          ) : null}
        </div>
      </div>

      {pending > 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {pending} venta{pending > 1 ? "s" : ""} desde Notion sin monto — completá monto y
          cotización para calcular comisión.
        </div>
      ) : null}

      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Comisión</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    Cargando ventas…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    No hay ventas este mes. Verificá que Notion tenga Fecha, TIPO y Estado
                    válidos.
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr
                    key={v.notionId}
                    className="border-b border-border/50 hover:bg-surface-2/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{v.fecha}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{v.cliente}</span>
                        {v.linkManyChat ? (
                          <a
                            href={v.linkManyChat}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet hover:text-accent"
                          >
                            💬
                          </a>
                        ) : null}
                        <a
                          href={`https://notion.so/${v.notionId.replace(/-/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-info"
                          title="Abrir en Notion"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {v.needsCompletion ? (
                          <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                            COMPLETAR
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {v.needsCompletion
                        ? "—"
                        : formatMoney(
                            v.montoDisplay,
                            v.override?.moneda ?? "ARS",
                          )}
                    </td>
                    <td className="px-4 py-3">{pagoLabel(v.pago)}</td>
                    <td className="px-4 py-3">{catLabel(v.categoria)}</td>
                    <td className="px-4 py-3 font-mono text-accent">
                      {v.needsCompletion ? "—" : formatMoney(v.comision)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openModal(v.notionId)}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent"
                      >
                        {v.needsCompletion ? "Completar" : "Editar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-xl p-6">
            <h3 className="text-lg font-semibold">Completar venta</h3>
            <p className="mt-1 text-sm text-muted">
              Monto y cotización se guardan en este navegador (no modifican Notion).
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted">Moneda</label>
                <select
                  value={form.moneda}
                  onChange={(e) =>
                    setForm({ ...form, moneda: e.target.value as "ARS" | "USD" })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted">Monto cobrado</label>
                <input
                  type="number"
                  value={form.monto || ""}
                  onChange={(e) =>
                    setForm({ ...form, monto: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Cotización USD/ARS</label>
                <input
                  type="number"
                  value={form.cotiz || ""}
                  onChange={(e) =>
                    setForm({ ...form, cotiz: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Ticket USD (opcional)</label>
                <input
                  type="number"
                  value={form.ticketUsd ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ticketUsd: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setModalId(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveModal}
                className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-background"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
