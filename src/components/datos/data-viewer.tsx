"use client";

import { useEffect, useState } from "react";
import {
  getPlantillas,
  getEtiquetas,
  getAutomatizaciones,
  getAudios,
  updateEstadoUso,
  type Plantilla,
  type Etiqueta,
  type Automatizacion,
  type Audio,
} from "@/lib/supabase";
import { COLORES_ETAPA } from "@/lib/clasificadores";

type Tab = "plantillas" | "etiquetas" | "automatizaciones" | "audios";

// Estados de uso (sistema de limpieza compartido por el equipo).
const ESTADOS_USO = [
  { key: "activo", color: "#4ade80", label: "Activo" },
  { key: "a_veces", color: "#fbbf24", label: "A veces" },
  { key: "desuso", color: "#64748b", label: "En desuso" },
] as const;

// Filtro por estado de uso de la tab Audios.
const FILTROS_USO = [
  { key: "vigentes", label: "Vigentes" },
  { key: "todos", label: "Todos" },
  { key: "activo", label: "🟢 Activos" },
  { key: "a_veces", label: "🟡 A veces" },
  { key: "desuso", label: "⚪ En desuso" },
] as const;

type FiltroUso = (typeof FILTROS_USO)[number]["key"];

function formatDur(seg: number | null): string {
  if (seg == null) return "";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 3 círculos clickeables para marcar el estado de uso del audio.
function EstadoUsoSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (estado: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {ESTADOS_USO.map((e) => {
        const active = value === e.key;
        return (
          <button
            key={e.key}
            onClick={(ev) => {
              ev.stopPropagation();
              onChange(e.key);
            }}
            title={e.label}
            aria-label={e.label}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              padding: 0,
              cursor: "pointer",
              background: active ? e.color : "transparent",
              border: `2px solid ${e.color}`,
              opacity: active ? 1 : 0.4,
              boxShadow: active ? `0 0 0 2px ${e.color}33` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

// Modal grande para un audio: reproductor + transcripción completa con scroll.
function AudioModal({ audio, onClose }: { audio: Audio; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const etapa = audio.etapa;
  const dur = formatDur(audio.duracion_seg);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0f1117",
          border: "1px solid #1e2230",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 30,
            height: 30,
            borderRadius: 7,
            border: "1px solid #2a3045",
            background: "#161a23",
            color: "#8b93a8",
            fontSize: 15,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 12, paddingRight: 36 }}>
          {audio.nombre}
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {etapa && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 5,
                background: (COLORES_ETAPA[etapa] || "#94a3b8") + "22",
                color: COLORES_ETAPA[etapa] || "#94a3b8",
                border: `1px solid ${(COLORES_ETAPA[etapa] || "#94a3b8")}44`,
              }}
            >
              {etapa}
            </span>
          )}
          {dur && <span style={{ fontSize: 11, color: "#64748b" }}>{dur}</span>}
          {audio.etiqueta_manychat && (
            <span style={{ fontSize: 11, color: "#64748b" }}>{audio.etiqueta_manychat}</span>
          )}
        </div>

        {audio.url_audio && (
          <audio controls src={audio.url_audio} style={{ width: "100%", marginBottom: 16 }} />
        )}

        <p
          style={{
            fontSize: 14,
            color: "#cbd5e1",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            margin: 0,
            marginBottom: 18,
          }}
        >
          {audio.transcripcion || "(Sin transcripción)"}
        </p>

        <button
          onClick={() => {
            navigator.clipboard.writeText(audio.transcripcion || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: 13,
            fontWeight: 700,
            background: copied ? "rgba(74,222,128,.1)" : "#161a23",
            border: `1px solid ${copied ? "#4ade80" : "#2a3045"}`,
            borderRadius: 8,
            color: copied ? "#4ade80" : "#cbd5e1",
            cursor: "pointer",
          }}
        >
          {copied ? "✓ Copiado" : "📋 Copiar transcripción"}
        </button>
      </div>
    </div>
  );
}

// Business ID de ManyChat (constante). ManyChat no permite deep-link a una
// etiqueta/automatización puntual, así que los links llevan a la sección.
const MC_BUSINESS_ID = "fb992340";
const MC_TAGS_URL = `https://app.manychat.com/${MC_BUSINESS_ID}/settings#tags`;
const MC_AUTOMATION_URL = `https://app.manychat.com/${MC_BUSINESS_ID}/automation`;

function ManyChatLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#60a5fa",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      ↗ ManyChat
    </a>
  );
}

// Lightbox simple: imagen casi a pantalla completa, clic en cualquier lado cierra.
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 60,
        cursor: "zoom-out",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{ maxWidth: "95vw", maxHeight: "95vh", objectFit: "contain", borderRadius: 8 }}
      />
    </div>
  );
}

// Modal tipo Notion para una plantilla: overlay oscuro + card centrada (~600px).
function PlantillaModal({
  plantilla,
  onClose,
  onOpenLightbox,
}: {
  plantilla: Plantilla;
  onClose: () => void;
  onOpenLightbox: (src: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const img = plantilla.url_imagen_netlify || plantilla.url_imagen;
  const etapa = plantilla.etapa;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0f1117",
          border: "1px solid #1e2230",
          borderRadius: 14,
          padding: 24,
        }}
      >
        {/* X cerrar */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 30,
            height: 30,
            borderRadius: 7,
            border: "1px solid #2a3045",
            background: "#161a23",
            color: "#8b93a8",
            fontSize: 15,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        {/* Nombre */}
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 12, paddingRight: 36 }}>
          {plantilla.nombre}
        </h2>

        {/* Meta: etapa, tipo, tasa */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {etapa && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 5,
                background: (COLORES_ETAPA[etapa] || "#94a3b8") + "22",
                color: COLORES_ETAPA[etapa] || "#94a3b8",
                border: `1px solid ${(COLORES_ETAPA[etapa] || "#94a3b8")}44`,
              }}
            >
              {etapa}
            </span>
          )}
          {plantilla.tipo_mensaje && (
            <span style={{ fontSize: 11, color: "#64748b" }}>{plantilla.tipo_mensaje}</span>
          )}
          {(plantilla.tasa_respuesta ?? 0) > 0 && (
            <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
              {plantilla.tasa_respuesta}% respuesta
            </span>
          )}
        </div>

        {/* Imagen grande (clic = lightbox) */}
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={plantilla.nombre}
            onClick={() => onOpenLightbox(img)}
            style={{
              width: "100%",
              maxHeight: 320,
              objectFit: "contain",
              borderRadius: 10,
              marginBottom: 16,
              background: "#161a23",
              cursor: "zoom-in",
            }}
          />
        )}

        {/* Texto completo */}
        <p
          style={{
            fontSize: 14,
            color: "#cbd5e1",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            margin: 0,
            marginBottom: 18,
          }}
        >
          {plantilla.texto || ""}
        </p>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(plantilla.texto || "");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            style={{
              flex: 1,
              minWidth: 140,
              padding: "10px",
              fontSize: 13,
              fontWeight: 700,
              background: copied ? "rgba(74,222,128,.1)" : "#161a23",
              border: `1px solid ${copied ? "#4ade80" : "#2a3045"}`,
              borderRadius: 8,
              color: copied ? "#4ade80" : "#cbd5e1",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copiado" : "📋 Copiar texto"}
          </button>
          {plantilla.url_video && (
            <a
              href={plantilla.url_video}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: 140,
                padding: "10px",
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center",
                background: "#161a23",
                border: "1px solid #2a3045",
                borderRadius: 8,
                color: "#60a5fa",
                textDecoration: "none",
              }}
            >
              ▶ Ver video
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function DataViewer() {
  const [tab, setTab] = useState<Tab>("plantillas");
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [automatizaciones, setAutomatizaciones] = useState<Automatizacion[]>([]);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("todas");
  const [usoFiltro, setUsoFiltro] = useState<FiltroUso>("vigentes");
  const [selected, setSelected] = useState<Plantilla | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<Audio | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Escape: cierra primero el lightbox; si no, el modal abierto.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else if (selected) setSelected(null);
      else if (selectedAudio) setSelectedAudio(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, selected, selectedAudio]);

  useEffect(() => {
    (async () => {
      try {
        const [p, e, a, au] = await Promise.all([
          getPlantillas(),
          getEtiquetas(),
          getAutomatizaciones(),
          getAudios(),
        ]);
        setPlantillas(p);
        setEtiquetas(e);
        setAutomatizaciones(a);
        setAudios(au);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, []);

  // Optimistic update del estado de uso (sin recargar toda la lista).
  const handleEstadoUso = async (audio: Audio, nuevo: string) => {
    const anterior = audio.estado_uso;
    setAudios((prev) => prev.map((x) => (x.id === audio.id ? { ...x, estado_uso: nuevo } : x)));
    try {
      await updateEstadoUso(audio.id, nuevo);
    } catch (err) {
      console.error(err);
      setAudios((prev) => prev.map((x) => (x.id === audio.id ? { ...x, estado_uso: anterior } : x)));
    }
  };

  const etapas = [
    "todas",
    ...Array.from(
      new Set(
        [
          ...plantillas.map((p) => p.etapa),
          ...etiquetas.map((e) => e.etapa_embudo),
          ...audios.map((a) => a.etapa),
        ].filter(Boolean) as string[],
      ),
    ),
  ];

  const Badge = ({ etapa }: { etapa: string | null }) =>
    etapa ? (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 5,
          background: (COLORES_ETAPA[etapa] || "#94a3b8") + "22",
          color: COLORES_ETAPA[etapa] || "#94a3b8",
          border: `1px solid ${(COLORES_ETAPA[etapa] || "#94a3b8")}44`,
        }}
      >
        {etapa}
      </span>
    ) : null;

  const filtrarPlantillas = plantillas.filter(
    (p) =>
      (etapaFiltro === "todas" || p.etapa === etapaFiltro) &&
      (p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (p.texto || "").toLowerCase().includes(search.toLowerCase())),
  );
  const filtrarEtiquetas = etiquetas.filter(
    (e) =>
      (etapaFiltro === "todas" || e.etapa_embudo === etapaFiltro) &&
      e.nombre.toLowerCase().includes(search.toLowerCase()),
  );
  const filtrarAuto = automatizaciones.filter((a) =>
    a.nombre.toLowerCase().includes(search.toLowerCase()),
  );
  const filtrarAudios = audios.filter((a) => {
    const estado = a.estado_uso || "activo";
    const matchUso =
      usoFiltro === "todos"
        ? true
        : usoFiltro === "vigentes"
          ? estado !== "desuso"
          : estado === usoFiltro;
    const matchEtapa = etapaFiltro === "todas" || a.etapa === etapaFiltro;
    const q = search.toLowerCase();
    const matchSearch =
      a.nombre.toLowerCase().includes(q) || (a.transcripcion || "").toLowerCase().includes(q);
    return matchUso && matchEtapa && matchSearch;
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1e2230" }}>
        {(
          [
            { k: "plantillas", label: `📋 Plantillas (${plantillas.length})` },
            { k: "etiquetas", label: `🏷️ Etiquetas (${etiquetas.length})` },
            { k: "automatizaciones", label: `⚡ Automatizaciones (${automatizaciones.length})` },
            { k: "audios", label: `🎤 Audios (${audios.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: "none",
              border: "none",
              borderBottom: "2px solid",
              borderColor: tab === t.k ? "#4ade80" : "transparent",
              color: tab === t.k ? "#eef0f5" : "#8b93a8",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            background: "#161a23",
            border: "1px solid #1e2230",
            borderRadius: 8,
            padding: "9px 14px",
            color: "#eef0f5",
            fontSize: 13,
            outline: "none",
          }}
        />
        {tab !== "automatizaciones" && (
          <select
            value={etapaFiltro}
            onChange={(e) => setEtapaFiltro(e.target.value)}
            style={{
              background: "#161a23",
              border: "1px solid #1e2230",
              borderRadius: 8,
              padding: "9px 14px",
              color: "#eef0f5",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {etapas.map((e) => (
              <option key={e} value={e}>
                {e === "todas" ? "Todas las etapas" : e}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Filtro por estado de uso (solo Audios) */}
      {tab === "audios" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {FILTROS_USO.map((f) => (
            <button
              key={f.key}
              onClick={() => setUsoFiltro(f.key)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: 7,
                border: "1px solid",
                borderColor: usoFiltro === f.key ? "#4ade80" : "#1e2230",
                background: usoFiltro === f.key ? "rgba(74,222,128,.1)" : "#161a23",
                color: usoFiltro === f.key ? "#4ade80" : "#8b93a8",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8b93a8" }}>Cargando desde Supabase...</div>
      ) : (
        <>
          {tab === "plantillas" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
              {filtrarPlantillas.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  style={{ background: "#0f1117", border: "1px solid #1e2230", borderRadius: 12, padding: 16, cursor: "pointer" }}
                >
                  {(p.url_imagen_netlify || p.url_imagen) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url_imagen_netlify || p.url_imagen!}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 10, background: "#161a23" }}
                    />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{p.nombre}</span>
                    <Badge etapa={p.etapa} />
                  </div>
                  <p style={{ fontSize: 12, color: "#8b93a8", lineHeight: 1.5, marginBottom: 10, whiteSpace: "pre-wrap" }}>
                    {(p.texto || "").slice(0, 160)}
                    {(p.texto || "").length > 160 ? "..." : ""}
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#64748b" }}>
                    {p.tipo_mensaje && <span>{p.tipo_mensaje}</span>}
                    {p.url_video && (
                      <a
                        href={p.url_video}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#60a5fa", textDecoration: "none" }}
                      >
                        ▶ Video
                      </a>
                    )}
                    {(p.tasa_respuesta ?? 0) > 0 && (
                      <span style={{ marginLeft: "auto", color: "#4ade80", fontWeight: 700 }}>{p.tasa_respuesta}%</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(p.texto || "");
                    }}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "7px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "#161a23",
                      border: "1px solid #2a3045",
                      borderRadius: 7,
                      color: "#cbd5e1",
                      cursor: "pointer",
                    }}
                  >
                    📋 Copiar texto
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "etiquetas" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
              {filtrarEtiquetas.map((e) => (
                <div
                  key={e.id}
                  style={{
                    background: "#0f1117",
                    border: "1px solid #1e2230",
                    borderRadius: 10,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.nombre}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {e.carpeta} · {e.tipo}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <ManyChatLink href={MC_TAGS_URL} />
                    </div>
                  </div>
                  <Badge etapa={e.etapa_embudo} />
                </div>
              ))}
            </div>
          )}

          {tab === "automatizaciones" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
              {filtrarAuto.map((a) => (
                <div key={a.id} style={{ background: "#0f1117", border: "1px solid #1e2230", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{a.nombre}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 5,
                        background: a.estado === "activa" ? "rgba(74,222,128,.12)" : "rgba(248,113,113,.12)",
                        color: a.estado === "activa" ? "#4ade80" : "#f87171",
                      }}
                    >
                      {a.estado}
                    </span>
                  </div>
                  {a.etiqueta_dispara && (
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Trigger: {a.etiqueta_dispara}</div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <ManyChatLink href={MC_AUTOMATION_URL} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "audios" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
              {filtrarAudios.map((a) => {
                const estado = a.estado_uso || "activo";
                const dur = formatDur(a.duracion_seg);
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAudio(a)}
                    style={{
                      background: "#0f1117",
                      border: "1px solid #1e2230",
                      borderRadius: 12,
                      padding: 16,
                      cursor: "pointer",
                      opacity: estado === "desuso" ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{a.nombre}</span>
                      <Badge etapa={a.etapa} />
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
                      {dur || "—"}
                      {a.etiqueta_manychat ? ` · ${a.etiqueta_manychat}` : ""}
                    </div>
                    {a.url_audio && (
                      <audio
                        controls
                        src={a.url_audio}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: "100%", marginBottom: 10 }}
                      />
                    )}
                    <p style={{ fontSize: 12, color: "#8b93a8", lineHeight: 1.5, marginBottom: 10, whiteSpace: "pre-wrap" }}>
                      {(a.transcripcion || "").slice(0, 150)}
                      {(a.transcripcion || "").length > 150 ? "..." : ""}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        paddingTop: 10,
                        borderTop: "1px solid #1e2230",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(a.transcripcion || "");
                        }}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          background: "#161a23",
                          border: "1px solid #2a3045",
                          borderRadius: 7,
                          color: "#cbd5e1",
                          cursor: "pointer",
                        }}
                      >
                        📋 Copiar
                      </button>
                      <EstadoUsoSelector value={estado} onChange={(nuevo) => handleEstadoUso(a, nuevo)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {selected && (
        <PlantillaModal
          plantilla={selected}
          onClose={() => setSelected(null)}
          onOpenLightbox={(src) => setLightbox(src)}
        />
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      {selectedAudio && <AudioModal audio={selectedAudio} onClose={() => setSelectedAudio(null)} />}
    </div>
  );
}
