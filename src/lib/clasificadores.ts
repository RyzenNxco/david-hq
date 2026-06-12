// Clasificación automática de datos de ManyChat por etapa del embudo y tipo.

export function clasificarEtiqueta(nombre: string): { tipo: string; etapa: string } {
  const n = nombre.toLowerCase();
  let tipo = "estado";
  let etapa = "General";

  // 🎤 = prefijo que usan las etiquetas de audio (Joaco) en ManyChat.
  if (nombre.includes("🎤")) {
    tipo = "accion";
    if (n.includes("analisis") || n.includes("audios analisis")) etapa = "Analisis";
    else if (n.includes("pitch")) etapa = "Pitch";
    else if (n.includes("precio")) etapa = "Precio";
  } else if (n.includes("seña") || n.includes("sena") || n.includes("venta concreta")) {
    tipo = "segmento";
    etapa = "Cobro/Ingreso";
  } else if (n.includes("botonera") || n.includes("transcripto") || n.includes("chat_")) {
    tipo = "sistema";
    etapa = "Sistema";
  } else if (n.includes("precio")) {
    tipo = "estado";
    etapa = "Precio";
  } else if (n.includes("analisis")) {
    tipo = "estado";
    etapa = "Analisis";
  } else if (n.includes("pitch")) {
    tipo = "estado";
    etapa = "Pitch";
  } else if (n.includes("seguimiento") || n.includes("reactiv") || n.includes("viejos") || n.includes("potencial")) {
    tipo = "segmento";
    etapa = "Reactivacion";
  } else if (n.includes("lead") || n.includes("comercial")) {
    tipo = "segmento";
    etapa = "General";
  }
  return { tipo, etapa };
}

export function clasificarPlantilla(nombre: string, texto: string): { area: string; etapa: string } {
  const n = nombre.toLowerCase();
  const t = (texto || "").toLowerCase();
  let area = "Comercial/Seguimiento";
  let etapa = "General";

  // Área
  if (/clase|black friday|navidad|vivo|recordatorio|encuesta|bono|consultoria|contactos nuevos/.test(n)) {
    area = "Marketing/Difusion";
  }

  // Etapa
  if (/cobrar|completar pago|comprobante|ingreso|bienvenida|luz verde|mini practigram/.test(n) || /saldo restante|darte el alta/.test(t)) {
    etapa = "Cobro/Ingreso";
  } else if (/plataforma|programa/.test(n)) {
    etapa = "Onboarding/Plataforma";
  } else if (/analisis|le analice|optimizacion|no tiene ig|vi tu instagram|pasame ig/.test(n)) {
    etapa = "Analisis";
  } else if (/pitch/.test(n)) {
    etapa = "Pitch";
  } else if (/precio|novalor|no ve el valor|silencio/.test(n)) {
    etapa = "Precio";
  } else if (/seña|sena|nosena|busca/.test(n)) {
    etapa = "Busca Sena";
  } else if (/reactivar|revivi|la otra vez|viejos|potencial|clave el visto|no respondio|espera|belico|socio/.test(n)) {
    etapa = "Reactivacion";
  } else if (/tecnologia|tiempo|plata|miedo|verguenza|locus|arrancando|edicion|estructura|formula|gancho|laboratorio|testimonio/.test(n)) {
    etapa = "Objecion/Valor";
  }
  return { area, etapa };
}

// Detecta tipo de adjunto desde el "tipo_mensaje" de ManyChat.
export function detectarAdjunto(tipoMensaje: string): string {
  const t = (tipoMensaje || "").toUpperCase();
  if (t.includes("VIDEO")) return "video";
  if (t.includes("IMAGEN") || t.includes("IMAGE")) return "imagen";
  if (t.includes("AUDIO")) return "audio";
  return "ninguno";
}

// Colores por etapa (para badges en la UI).
export const COLORES_ETAPA: Record<string, string> = {
  Analisis: "#60a5fa",
  Pitch: "#a78bfa",
  Precio: "#fbbf24",
  "Busca Sena": "#f472b6",
  "Cobro/Ingreso": "#4ade80",
  "Onboarding/Plataforma": "#34d399",
  Reactivacion: "#fb923c",
  "Objecion/Valor": "#f87171",
  Sistema: "#64748b",
  General: "#94a3b8",
};
