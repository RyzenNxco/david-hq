"use client";

import { useState, useCallback } from "react";
import {
  upsertEtiquetas,
  upsertPlantillas,
  upsertAutomatizaciones,
} from "@/lib/supabase";
import { clasificarEtiqueta, clasificarPlantilla, detectarAdjunto } from "@/lib/clasificadores";

type LogLine = { msg: string; type: "info" | "ok" | "err" };

// Formas crudas de los JSON que producen los bookmarklets.
type RawEtiqueta = { nombre: string; contactos?: number; carpeta?: string; id?: string };
type RawPlantilla = {
  nombre: string;
  texto?: string;
  categoria?: string;
  estado?: string;
  tipo?: string;
  carpeta?: string;
  id?: string;
};
type RawAutomatizacion = { nombre: string; estado?: string; trigger?: string; carpeta?: string; id?: string };

// Bookmarklets para copiar (mismo código probado).
const BOOKMARKLETS = {
  etiquetas: `javascript:(function(){var carpeta=prompt("Nombre de carpeta (Enter para omitir):","");if(carpeta===null)carpeta="todas";carpeta=carpeta.trim().replace(/\\s+/g,"-")||"todas";var fecha=new Date().toISOString().split("T")[0];var data=[];var rows=document.querySelectorAll("[class*=tagline]");rows.forEach(function(r){var input=r.querySelector("input");var id=r.getAttribute("data-id")||r.dataset.id||"";if(input&&input.value&&input.value.trim().length>0){data.push({nombre:input.value.trim(),contactos:0,id:id,carpeta:carpeta});}});if(data.length===0){var inputs=document.querySelectorAll("input[value]");inputs.forEach(function(inp){var v=inp.value.trim();var row=inp.closest("[data-id]");if(row&&v&&v.length>0&&v.length<150&&!["Introducir nombre","Search","Buscar"].includes(v)){data.push({nombre:v,contactos:0,id:row.getAttribute("data-id")||"",carpeta:carpeta});}});}var uniq=[...new Map(data.map(function(x){return[x.nombre,x];})).values()];if(uniq.length===0){alert("No se encontraron etiquetas.");return;}var j=JSON.stringify({tipo:"etiquetas",fecha:fecha,carpeta:carpeta,total:uniq.length,data:uniq},null,2);var b=new Blob([j],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=fecha+"_etiquetas_"+carpeta+".json";a.click();alert("OK "+uniq.length+" etiquetas -> "+carpeta);})();`,
  automatizaciones: `javascript:(function(){var carpeta=prompt("Nombre de carpeta (Enter para omitir):","");if(carpeta===null)carpeta="todas";carpeta=carpeta.trim().replace(/\\s+/g,"-")||"todas";var fecha=new Date().toISOString().split("T")[0];var data=[];document.querySelectorAll("[class*=flowItem],[class*=FlowItem],[class*=ruleItem],[class*=automation],[class*=Automation]").forEach(function(i){var n=(i.querySelector("[class*=name],[class*=title],h3,h4,span")||{}).textContent;if(n)n=n.trim();var cb=i.querySelector("input[type=checkbox]");if(n&&n.length>1)data.push({nombre:n,estado:cb?(cb.checked?"activa":"pausada"):"activa",trigger:"",carpeta:carpeta});});var uniq=[...new Map(data.map(function(x){return[x.nombre,x];})).values()];if(uniq.length===0){alert("No encontradas. Estar en Automation.");return;}var j=JSON.stringify({tipo:"automatizaciones",fecha:fecha,carpeta:carpeta,total:uniq.length,data:uniq},null,2);var b=new Blob([j],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=fecha+"_automatizaciones_"+carpeta+".json";a.click();alert("OK "+uniq.length+" automatizaciones -> "+carpeta);})();`,
};

const NAV_LINKS = [
  { label: "ManyChat", url: "https://app.manychat.com", color: "#a78bfa" },
  { label: "Plantillas", url: "https://app.manychat.com/fb992340/cms/templates", color: "#60a5fa" },
  { label: "Automatizaciones", url: "https://app.manychat.com/fb992340/automation", color: "#fbbf24" },
  { label: "Etiquetas", url: "https://app.manychat.com/fb992340/settings#tags", color: "#4ade80" },
  { label: "Live Chat", url: "https://app.manychat.com/fb992340/live-chat", color: "#f87171" },
];

export function ManyChatSync() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState({ ins: 0, err: 0, total: 0 });
  const [copied, setCopied] = useState<string | null>(null);

  const addLog = (msg: string, type: LogLine["type"] = "info") =>
    setLog((l) => [...l, { msg, type }]);

  const copyBM = (key: keyof typeof BOOKMARKLETS) => {
    navigator.clipboard.writeText(BOOKMARKLETS[key]);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFiles = useCallback(async (files: FileList) => {
    setBusy(true);
    setLog([]);
    let ins = 0,
      err = 0,
      total = 0;

    for (const file of Array.from(files)) {
      addLog(`📄 ${file.name}`, "info");
      try {
        const parsed = JSON.parse(await file.text()) as { tipo?: string; data?: unknown[] };
        const { tipo, data } = parsed;
        if (!tipo || !data) {
          addLog(`⚠️ Formato inválido`, "err");
          continue;
        }
        addLog(`Tipo: ${tipo} · ${data.length} registros`, "info");

        if (tipo === "etiquetas") {
          const rows = (data as RawEtiqueta[]).map((e) => {
            const c = clasificarEtiqueta(e.nombre);
            return {
              nombre: e.nombre,
              contactos_count: e.contactos || 0,
              carpeta: e.carpeta || "",
              id_manychat: e.id || "",
              tipo: c.tipo,
              etapa_embudo: c.etapa,
              activa: true,
              ultima_sync: new Date().toISOString(),
            };
          });
          await upsertEtiquetas(rows);
          ins += rows.length;
          addLog(`  ✅ ${rows.length} etiquetas guardadas`, "ok");
        } else if (tipo === "plantillas") {
          const rows = (data as RawPlantilla[]).map((p) => {
            const c = clasificarPlantilla(p.nombre, p.texto || "");
            return {
              nombre: p.nombre,
              texto: p.texto || "",
              categoria_meta: p.categoria || "MARKETING",
              estado_meta: p.estado || "APPROVED",
              tipo_mensaje: p.tipo || "TEXTO",
              adjunto_tipo: detectarAdjunto(p.tipo || ""),
              area: c.area,
              etapa: c.etapa,
              carpeta: p.carpeta || "",
              id_manychat: p.id || "",
              fuente: "manychat",
              activa: (p.estado || "APPROVED") !== "PAUSED",
              ultima_sync: new Date().toISOString(),
            };
          });
          await upsertPlantillas(rows);
          ins += rows.length;
          addLog(`  ✅ ${rows.length} plantillas guardadas`, "ok");
        } else if (tipo === "automatizaciones") {
          const rows = (data as RawAutomatizacion[]).map((a) => ({
            nombre: a.nombre,
            estado: a.estado || "activa",
            tipo_trigger: a.trigger ? "keyword" : "flow",
            etiqueta_dispara: a.trigger || "",
            carpeta: a.carpeta || "",
            id_manychat: a.id || "",
            canal: "whatsapp",
            ultima_sync: new Date().toISOString(),
          }));
          await upsertAutomatizaciones(rows);
          ins += rows.length;
          addLog(`  ✅ ${rows.length} automatizaciones guardadas`, "ok");
        }
        total += data.length;
      } catch (e) {
        addLog(`❌ ${e instanceof Error ? e.message : String(e)}`, "err");
        err++;
      }
    }

    setResults({ ins, err, total });
    addLog(`✅ Listo: ${ins} guardados, ${err} errores`, "ok");
    setBusy(false);
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* NAV de accesos rápidos */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              color: "#cbd5e1",
              background: "#161a23",
              border: "1px solid #1e2230",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: l.color }} />
            {l.label}
          </a>
        ))}
      </div>

      <p style={{ color: "#8b93a8", fontSize: 14, marginBottom: 32 }}>
        Extraé de ManyChat con los bookmarklets → subí el JSON → se guarda clasificado en Supabase
      </p>

      {/* Bookmarklets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginBottom: 32 }}>
        {(
          [
            { key: "etiquetas", icon: "🏷️", title: "Etiquetas", desc: "Settings → Tags", color: "#4ade80" },
            { key: "automatizaciones", icon: "⚡", title: "Automatizaciones", desc: "Automation", color: "#fbbf24" },
          ] as const
        ).map((bm) => (
          <div key={bm.key} style={{ background: "#0f1117", border: "1px solid #1e2230", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{bm.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{bm.title}</div>
            <div style={{ fontSize: 12, color: "#8b93a8", marginBottom: 14 }}>ManyChat → {bm.desc}</div>
            <button
              onClick={() => copyBM(bm.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                borderColor: copied === bm.key ? "#4ade80" : "#2a3045",
                background: copied === bm.key ? "rgba(74,222,128,.1)" : "#161a23",
                color: copied === bm.key ? "#4ade80" : "#8b93a8",
              }}
            >
              {copied === bm.key ? "✓ Copiado" : "📋 Copiar bookmarklet"}
            </button>
          </div>
        ))}
        <div style={{ background: "#0f1117", border: "1px solid #1e2230", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Plantillas</div>
          <div style={{ fontSize: 12, color: "#8b93a8", marginBottom: 14 }}>Usá la extracción de chat existente (botonera v31)</div>
          <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>Subí el TXT/JSON abajo</span>
        </div>
      </div>

      {/* Uploader */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        style={{ background: "#0f1117", border: "1px solid #1e2230", borderRadius: 14, padding: 28 }}
      >
        <label
          style={{
            display: "block",
            border: "2px dashed #2a3045",
            borderRadius: 10,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <input
            type="file"
            accept=".json"
            multiple
            hidden
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div style={{ fontSize: 36, marginBottom: 12 }}>📥</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
            {busy ? "Procesando..." : "Soltá los JSON acá o hacé clic"}
          </div>
          <div style={{ fontSize: 13, color: "#8b93a8" }}>
            Etiquetas, plantillas o automatizaciones · podés subir varios
          </div>
        </label>

        {log.length > 0 && (
          <div
            style={{
              marginTop: 20,
              background: "#161a23",
              border: "1px solid #1e2230",
              borderRadius: 8,
              padding: 14,
              maxHeight: 220,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: 11,
              lineHeight: 1.7,
            }}
          >
            {log.map((l, i) => (
              <div key={i} style={{ color: l.type === "ok" ? "#4ade80" : l.type === "err" ? "#f87171" : "#60a5fa" }}>
                {l.msg}
              </div>
            ))}
          </div>
        )}

        {results.total > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 20 }}>
            <Stat n={results.ins} label="Guardados" color="#4ade80" />
            <Stat n={results.err} label="Errores" color="#f87171" />
            <Stat n={results.total} label="Total" color="#cbd5e1" />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ background: "#161a23", border: "1px solid #1e2230", borderRadius: 10, padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 12, color: "#8b93a8" }}>{label}</div>
    </div>
  );
}
