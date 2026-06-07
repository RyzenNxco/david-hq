"use client";

import { useState } from "react";
import { ETAPAS, formatContacto } from "@/lib/leads";

type Props = {
  initialUrl?: string;
  initialName?: string;
  isPotencial?: boolean;
};

// Redondea una fecha a la media hora más cercana (segundos a 0).
function roundToHalfHour(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setMinutes(Math.round(d.getMinutes() / 30) * 30);
  return d;
}

// Formatea un Date como valor para <input type="datetime-local"> en hora local
// ("YYYY-MM-DDTHH:mm"). No usamos toISOString para no convertir a UTC.
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Botones rápidos: cada uno setea el campo a (ahora + X) en milisegundos.
const H = 3600_000;
const QUICK_CONTACTO = [
  { label: "+1h", ms: 1 * H },
  { label: "+2h", ms: 2 * H },
  { label: "+6h", ms: 6 * H },
  { label: "+8h", ms: 8 * H },
  { label: "+12h", ms: 12 * H },
  { label: "+24h", ms: 24 * H },
  { label: "+2 días", ms: 48 * H },
  { label: "+7 días", ms: 7 * 24 * H },
] as const;

export function AgendarForm({ initialUrl = "", initialName = "", isPotencial = false }: Props) {
  const [mode, setMode] = useState<"venta" | "potencial">(isPotencial ? "potencial" : "venta");
  const [nombre, setNombre] = useState(initialName ? decodeURIComponent(initialName) : "");
  const [url, setUrl] = useState(initialUrl ? decodeURIComponent(initialUrl) : "");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  // Próximo contacto (modo potencial): fecha + hora. Por defecto, ahora redondeado
  // a la media hora más cercana. Formato datetime-local "YYYY-MM-DDTHH:mm".
  const [fechaContacto, setFechaContacto] = useState(() =>
    toDatetimeLocal(roundToHalfHour(new Date())),
  );
  const [fechaCompletar, setFechaCompletar] = useState("");
  const [notas, setNotas] = useState("");
  const [tipo, setTipo] = useState("SEGUIMIENTO");
  const [estado, setEstado] = useState("ACCESOS ✅ POR CARGAR ❌");
  const [etapa, setEtapa] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const guardar = async () => {
    if (!nombre.trim()) {
      setMessage({ type: "err", text: "Falta el nombre" });
      return;
    }
    if (mode === "potencial" && !fechaContacto) {
      setMessage({ type: "err", text: "Elegí fecha y hora de contacto" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "venta") {
        const res = await fetch("/api/notion/ventas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombre.trim(),
            fecha,
            fechaCompletar,
            url,
            notas,
            tipo,
            estado,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessage({ type: "ok", text: `✓ ${nombre} guardado en Notion` });
      } else {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombre.trim(),
            etapa,
            // Timestamp ISO con hora (ej: "2026-06-06T15:30:00").
            fecha_proximo_contacto: fechaContacto ? `${fechaContacto}:00` : null,
            fecha_completar_pago: fechaCompletar || null,
            url_manychat: url || null,
            notas: notas || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessage({ type: "ok", text: `✓ ${nombre} guardado en Supabase` });
      }
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Error al guardar",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex gap-2 rounded-xl border border-border p-1">
        <button
          type="button"
          onClick={() => setMode("venta")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "venta" ? "bg-accent text-background" : "text-muted"}`}
        >
          Venta → Notion
        </button>
        <button
          type="button"
          onClick={() => setMode("potencial")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "potencial" ? "bg-accent text-background" : "text-muted"}`}
        >
          Potencial → Supabase
        </button>
      </div>

      <div className="glass space-y-4 rounded-xl p-5">
        <div>
          <label className="text-xs text-muted">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted">URL ManyChat</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </div>
        {mode === "venta" ? (
          <div>
            <label className="text-xs text-muted">Fecha de pago</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted">Próximo contacto (fecha y hora)</label>
            {/* Botones rápidos: 1 toque = ahora + X */}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {QUICK_CONTACTO.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setFechaContacto(toDatetimeLocal(new Date(Date.now() + q.ms)))}
                  className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted hover:border-accent/50 hover:text-foreground"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={fechaContacto}
              onChange={(e) => setFechaContacto(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            />
            {fechaContacto ? (
              <p className="mt-1 text-xs text-muted">
                📅 {formatContacto(fechaContacto)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-danger">Elegí fecha y hora de contacto</p>
            )}
          </div>
        )}
        <div>
          <label className="text-xs text-muted">Fecha completar pago</label>
          <input
            type="date"
            value={fechaCompletar}
            onChange={(e) => setFechaCompletar(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </div>

        {mode === "venta" ? (
          <>
            <div>
              <label className="text-xs text-muted">Adquisición (TIPO)</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              >
                <option value="SEGUIMIENTO">Seguimiento</option>
                <option value="CLASE">Clase</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              >
                <option value="ACCESOS ✅ POR CARGAR ❌">ACCESOS ✅ POR CARGAR ❌</option>
                <option value="Pago">Pago</option>
                <option value="SEÑA CARGADA ⬆️">SEÑA CARGADA ⬆️</option>
                <option value="COMPLETA PAGO ⬆️">COMPLETA PAGO ⬆️</option>
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs text-muted">Etapa</label>
            <select
              value={etapa}
              onChange={(e) => setEtapa(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            >
              {ETAPAS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={guardar}
          disabled={loading || (mode === "potencial" && !fechaContacto)}
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-background disabled:opacity-50"
        >
          {loading ? "Guardando…" : mode === "venta" ? "Guardar en Notion" : "Guardar en Supabase"}
        </button>

        {message ? (
          <p
            className={`text-sm ${message.type === "ok" ? "text-accent" : "text-danger"}`}
          >
            {message.text}
          </p>
        ) : null}
      </div>

      <div className="glass rounded-xl p-4 text-xs text-muted">
        <p className="font-semibold text-foreground">Bookmarklet ManyChat</p>
        <p className="mt-2">
          Reemplazá <code className="text-accent">TU-APP</code> por{" "}
          <code className="text-foreground">david-hq.vercel.app</code> y guardalo en favoritos.
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-surface-2 p-2 font-mono text-[10px] text-foreground">
          {`javascript:(function(){var u=encodeURIComponent(location.href);var n='';var el=document.querySelector('[class*="subscriberTitle"]');if(el){n=encodeURIComponent(el.textContent.trim());}var m=confirm('Agendar como VENTA en Notion?\\n\\nOK = Venta\\nCancelar = Potencial');window.open('https://david-hq.vercel.app/agendar?url='+u+'&name='+n+(m?'':'&mode=pot'),'_blank','width=540,height=820');})();`}
        </pre>
      </div>
    </div>
  );
}
