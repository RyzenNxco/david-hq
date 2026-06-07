export const ETAPAS = [
  { id: 0, label: "Análisis enviado", emoji: "📊" },
  { id: 1, label: "Pitch enviado", emoji: "🎯" },
  { id: 2, label: "Precio enviado", emoji: "💰" },
  { id: 3, label: "Busca seña", emoji: "🔑" },
  { id: 4, label: "Potencial compra", emoji: "🔥" },
] as const;

export type Lead = {
  id: string;
  nombre: string;
  etapa: number;
  estado: string;
  fecha_proximo_contacto: string | null;
  fecha_completar_pago: string | null;
  monto_sena: number | null;
  monto_total: number | null;
  url_manychat: string | null;
  notas: string | null;
  objecion: string | null;
  created_at?: string;
};

export function contactoSemaforo(fecha: string | null): "red" | "yellow" | "green" | "gray" {
  if (!fecha) return "gray";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // `fecha` puede ser solo date ("2026-06-06") o timestamp ISO
  // ("2026-06-06T15:30:00"). Comparamos siempre por día usando la parte fecha.
  const target = new Date(fecha.slice(0, 10) + "T12:00:00");
  const diff = Math.floor((target.getTime() - hoy.getTime()) / 86400000);
  if (diff < 0) return "red";
  if (diff === 0) return "yellow";
  return "green";
}

// Convierte un valor guardado (date o timestamp ISO) al formato que requiere
// <input type="datetime-local">: "YYYY-MM-DDTHH:mm" en hora local.
export function toDatetimeLocalValue(value: string | null): string {
  if (!value) return "";
  // Timestamp con hora → tomamos los primeros 16 caracteres ("YYYY-MM-DDTHH:mm").
  if (value.includes("T")) return value.slice(0, 16);
  // Solo fecha → asumimos 12:00 para no saltar de día por zona horaria.
  return `${value.slice(0, 10)}T12:00`;
}

// Formato legible para mostrar el próximo contacto, ej: "vie 6 jun, 15:30".
// Si el valor no trae hora (legacy date), muestra solo la fecha.
export function formatContacto(value: string | null): string {
  if (!value) return "";
  const hasTime = value.includes("T") && value.length > 10;
  const d = new Date(hasTime ? value : value.slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(d);
}
