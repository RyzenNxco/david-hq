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
  const target = new Date(fecha + "T12:00:00");
  const diff = Math.floor((target.getTime() - hoy.getTime()) / 86400000);
  if (diff < 0) return "red";
  if (diff === 0) return "yellow";
  return "green";
}
