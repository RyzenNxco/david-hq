import { createClient } from "./client";

// Cliente de navegador (singleton) usado por el ManyChat Sync y el visor /datos.
// Reutiliza el cliente @supabase/ssr del proyecto en lugar de crear una segunda
// instancia con @supabase/supabase-js.
const supabase = createClient();

// ─── TIPOS ─────────────────────────────────────────────
export type Plantilla = {
  id: string;
  nombre: string;
  texto: string;
  etapa: string | null;
  area: string | null;
  tipo_mensaje: string | null;
  botones: string | null;
  url_imagen: string | null;
  url_imagen_netlify: string | null;
  url_video: string | null;
  tiene_foto: boolean | null;
  tiene_video: boolean | null;
  adjunto_tipo: string | null;
  categoria_meta: string | null;
  estado_meta: string | null;
  envios: number | null;
  respuestas: number | null;
  tasa_respuesta: number | null;
  carpeta: string | null;
  id_manychat: string | null;
  fuente: string | null;
  activa: boolean | null;
  ultima_sync: string | null;
};

export type Etiqueta = {
  id: string;
  nombre: string;
  descripcion: string | null;
  etapa_embudo: string | null;
  tipo: string | null;
  activa: boolean | null;
  contactos_count: number | null;
  carpeta: string | null;
  id_manychat: string | null;
  ultima_sync: string | null;
};

export type Automatizacion = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo_trigger: string | null;
  etapa_embudo: string | null;
  estado: string | null;
  etiqueta_dispara: string | null;
  etiqueta_agrega: string | null;
  etiqueta_quita: string | null;
  canal: string | null;
  carpeta: string | null;
  id_manychat: string | null;
  ultima_sync: string | null;
};

export type Audio = {
  id: string;
  nombre: string;
  archivo: string;
  transcripcion: string | null;
  url_audio: string | null;
  etapa: string | null;
  etiqueta_manychat: string | null;
  duracion_seg: number | null;
  estado_uso: string | null; // 'activo' | 'a_veces' | 'desuso'
  activa: boolean | null;
};

// ─── QUERIES ───────────────────────────────────────────
export async function getPlantillas() {
  const { data, error } = await supabase
    .from("plantillas")
    .select("*")
    .order("tasa_respuesta", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as Plantilla[];
}

export async function getEtiquetas() {
  const { data, error } = await supabase
    .from("etiquetas")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return data as Etiqueta[];
}

export async function getAutomatizaciones() {
  const { data, error } = await supabase
    .from("automatizaciones")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return data as Automatizacion[];
}

export async function getAudios() {
  const { data, error } = await supabase
    .from("audios")
    .select("*")
    .order("etapa")
    .order("nombre");
  if (error) throw error;
  return data as Audio[];
}

export async function updateEstadoUso(id: string, estado_uso: string) {
  const { error } = await supabase
    .from("audios")
    .update({ estado_uso })
    .eq("id", id);
  if (error) throw error;
}

// ─── UPSERT (para el sync) ─────────────────────────────
// onConflict: 'nombre' es CRÍTICO — evita duplicados al re-sincronizar.
export async function upsertEtiquetas(rows: Partial<Etiqueta>[]) {
  const { error } = await supabase
    .from("etiquetas")
    .upsert(rows, { onConflict: "nombre" });
  if (error) throw error;
}

export async function upsertPlantillas(rows: Partial<Plantilla>[]) {
  const { error } = await supabase
    .from("plantillas")
    .upsert(rows, { onConflict: "nombre" });
  if (error) throw error;
}

export async function upsertAutomatizaciones(rows: Partial<Automatizacion>[]) {
  const { error } = await supabase
    .from("automatizaciones")
    .upsert(rows, { onConflict: "nombre" });
  if (error) throw error;
}
