"use client";

import { useEffect, useRef, useState } from "react";
import { ETAPAS, formatContacto } from "@/lib/leads";
import { createClient } from "@/lib/supabase/client";

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
  // Potencial: ¿tiene fecha aproximada de pago? → columna tiene_fecha_pago.
  // El campo de fecha (fechaAproxPago → fecha_aprox_pago) solo se muestra si está marcado.
  const [tieneFechaPago, setTieneFechaPago] = useState(false);
  const [fechaAproxPago, setFechaAproxPago] = useState("");
  // Potencial: lead que requiere gestión especial → columna lead_complicado.
  const [leadComplicado, setLeadComplicado] = useState(false);
  const [notas, setNotas] = useState("");
  const [tipo, setTipo] = useState("SEGUIMIENTO");
  // TIPO DE PAGO (modo venta) → propiedad "TIPO DE PAGO" en Notion.
  const [tipoDePago, setTipoDePago] = useState("SEÑA");
  const [estado, setEstado] = useState("ACCESOS ✅ POR CARGAR ❌");
  // Cotización USD y precio del programa (ARS): opcionales, modo venta.
  const [cotizacionUsd, setCotizacionUsd] = useState("");
  const [precioPrograma, setPrecioPrograma] = useState("");
  const [etapa, setEtapa] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  // Modo venta: archivo (imagen pegada o PDF subido) que se adjunta en Notion.
  const [archivoUrl, setArchivoUrl] = useState<string>("");
  const [archivoError, setArchivoError] = useState("");
  const archivoInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Sube un archivo al bucket "ventas-archivos" y guarda su URL pública.
  const subirArchivo = async (file: File) => {
    setArchivoError("");
    try {
      const ext = file.type === "application/pdf" || file.name.endsWith(".pdf") ? "pdf" : "png";
      const path = `ventas/venta_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("ventas-archivos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("ventas-archivos")
        .getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      setArchivoUrl(publicUrl);
    } catch {
      setArchivoError("Error al subir el archivo");
    }
  };

  // Pegar imagen desde el portapapeles (Ctrl+V) en la zona de paste.
  const onPasteArchivo = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const file = new File([blob], `venta_${Date.now()}.png`, { type: blob.type });
        await subirArchivo(file);
        break;
      }
    }
  };

  // Seleccionar archivo (imagen o PDF) desde el input oculto.
  const onSelectArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await subirArchivo(file);
  };

  // Pre-carga desde la URL al montar (una sola vez): ?name, ?url, ?mode=pot.
  // Si un parámetro no viene, ese campo queda como está (vacío).
  // No toca fechaContacto (precarga de fecha+hora) ni las validaciones.
  // setState dentro del effect es intencional: window.location solo existe en el
  // cliente, así que no se puede leer en el inicializador de useState (rompe SSR).
  // Corre una sola vez al montar.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("name");
    const u = params.get("url");
    const m = params.get("mode");
    if (n) setNombre(decodeURIComponent(n));
    if (u) setUrl(decodeURIComponent(u));
    // mode=pot → "potencial"; cualquier otro caso (o ausente) → "venta".
    setMode(m === "pot" ? "potencial" : "venta");
  }, []);

  // En venta, "Fecha completar pago" solo aplica (y es obligatoria) cuando el
  // TIPO DE PAGO es SEÑA o DOWNSELL. Para PAYFULL/COMPLETA PAGO va oculta y null.
  const requiereFechaPago =
    mode === "venta" && (tipoDePago === "SEÑA" || tipoDePago === "DOWNSELL");

  const guardar = async () => {
    if (!nombre.trim()) {
      setMessage({ type: "err", text: "Falta el nombre" });
      return;
    }
    if (mode === "potencial" && !fechaContacto) {
      setMessage({ type: "err", text: "Elegí fecha y hora de contacto" });
      return;
    }
    if (requiereFechaPago && !fechaCompletar) {
      setMessage({ type: "err", text: "Indicá la fecha para completar el pago" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "venta") {
        const ventaBody: Record<string, unknown> = {
          nombre: nombre.trim(),
          fecha,
          // Solo se envía si el TIPO DE PAGO lo requiere; si no, vacío → null.
          fechaCompletar: requiereFechaPago ? fechaCompletar : "",
          url,
          notas,
          tipo,
          tipoDePago,
          estado,
          cotizacionUsd,
          precioPrograma,
        };
        // Si hay archivo subido, se adjunta como propiedad de archivos en Notion.
        if (archivoUrl) {
          ventaBody["Archivos y multimedia"] = {
            files: [
              { type: "external", name: "archivo", external: { url: archivoUrl } },
            ],
          };
        }
        const res = await fetch("/api/notion/ventas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ventaBody),
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
            tiene_fecha_pago: tieneFechaPago,
            // Solo se guarda fecha si el checkbox está marcado; si no, null.
            fecha_aprox_pago: tieneFechaPago && fechaAproxPago ? fechaAproxPago : null,
            lead_complicado: leadComplicado,
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
        {mode === "potencial" ? (
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tieneFechaPago}
                onChange={(e) => setTieneFechaPago(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span>¿Tiene fecha aproximada de pago?</span>
            </label>
            {/* El campo de fecha solo aparece si el checkbox está marcado. */}
            {tieneFechaPago ? (
              <div>
                <label className="text-xs text-muted">Fecha aproximada de pago</label>
                <input
                  type="date"
                  value={fechaAproxPago}
                  onChange={(e) => setFechaAproxPago(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={leadComplicado}
                onChange={(e) => setLeadComplicado(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span>Lead complicado / gestión</span>
            </label>
          </>
        ) : null}

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
                <option value="FALTAN DATOS">FALTAN DATOS</option>
                <option value="ACCESOS ✅ POR CARGAR ❌">ACCESOS ✅ POR CARGAR ❌</option>
                <option value="Pago">Pago</option>
                <option value="SEÑA CARGADA ⬆️">SEÑA CARGADA ⬆️</option>
                <option value="COMPLETA PAGO ⬆️">COMPLETA PAGO ⬆️</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted">Tipo de pago</label>
              <select
                value={tipoDePago}
                onChange={(e) => setTipoDePago(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              >
                <option value="SEÑA">SEÑA</option>
                <option value="PAYFULL">PAYFULL</option>
                <option value="COMPLETA PAGO">COMPLETA PAGO</option>
                <option value="DOWNSELL">DOWNSELL</option>
              </select>
            </div>
            {/* Solo visible (y obligatoria) si el tipo de pago es SEÑA o DOWNSELL */}
            {requiereFechaPago ? (
              <div>
                <label className="text-xs text-muted">Fecha completar pago</label>
                <input
                  type="date"
                  value={fechaCompletar}
                  onChange={(e) => setFechaCompletar(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
                {!fechaCompletar ? (
                  <p className="mt-1 text-xs text-danger">
                    Indicá la fecha para completar el pago
                  </p>
                ) : null}
              </div>
            ) : null}
            {/* Cotización USD: opcional, no bloquea el guardado. */}
            <div>
              <label className="text-xs text-muted">Cotización USD</label>
              <input
                type="number"
                value={cotizacionUsd}
                onChange={(e) => setCotizacionUsd(e.target.value)}
                placeholder="ej: 1430"
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              />
            </div>
            {/* Precio del programa (ARS): opcional, con atajo al precio actual. */}
            <div>
              <label className="text-xs text-muted">Precio del programa (ARS)</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  value={precioPrograma}
                  onChange={(e) => setPrecioPrograma(e.target.value)}
                  placeholder="ej: 281710"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPrecioPrograma("281710")}
                  className="shrink-0 rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-muted hover:border-accent/50 hover:text-foreground"
                >
                  Usar precio actual
                </button>
              </div>
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

        {mode === "venta" ? (
          <div>
            <label className="text-xs text-muted">Archivo (imagen / PDF)</label>
            {archivoUrl ? (
              <div className="relative mt-1 inline-block">
                <img
                  src={archivoUrl}
                  alt="archivo"
                  className="h-[100px] rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => setArchivoUrl("")}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-background"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => archivoInputRef.current?.click()}
                onPaste={onPasteArchivo}
                className="mt-1 cursor-pointer rounded-lg border-2 border-dashed border-neutral-600 bg-surface-2 px-3 py-6 text-center text-sm text-muted"
              >
                📋 Pegá una imagen acá (Ctrl+V) o hacé clic para subir PDF
              </div>
            )}
            <input
              ref={archivoInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={onSelectArchivo}
              className="hidden"
            />
            {archivoError ? (
              <p className="mt-1 text-xs text-danger">{archivoError}</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => guardar()}
          disabled={
            loading ||
            (mode === "potencial" && !fechaContacto) ||
            (requiereFechaPago && !fechaCompletar)
          }
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
