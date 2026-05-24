import type { NotionProperty } from "./types";
import type { VentaPago, VentaProducto } from "@/lib/commissions";

export function getTitle(props: Record<string, NotionProperty>): string {
  for (const prop of Object.values(props)) {
    if (prop.type === "title" && "title" in prop) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "";
}

export function getRichText(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== "rich_text" || !("rich_text" in prop)) return "";
  return prop.rich_text.map((t) => t.plain_text).join("");
}

export function getSelect(prop: NotionProperty | undefined): string {
  if (!prop) return "";
  if (prop.type === "select" && "select" in prop) {
    return prop.select?.name ?? "";
  }
  if (prop.type === "multi_select" && "multi_select" in prop) {
    return prop.multi_select[0]?.name ?? "";
  }
  if (prop.type === "status" && "status" in prop) {
    return prop.status?.name ?? "";
  }
  return "";
}

/** Busca propiedad por nombre exacto o similar (case-insensitive) */
export function getSelectByNames(
  props: Record<string, NotionProperty>,
  names: string[],
): string {
  for (const name of names) {
    const v = getSelect(props[name]);
    if (v) return v;
  }
  const lower = names.map((n) => n.toLowerCase());
  for (const [key, prop] of Object.entries(props)) {
    if (lower.includes(key.toLowerCase())) {
      const v = getSelect(prop);
      if (v) return v;
    }
  }
  return "";
}

export function getDate(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== "date" || !("date" in prop)) return null;
  return prop.date?.start ?? null;
}

export function getDateByNames(
  props: Record<string, NotionProperty>,
  names: string[],
): string | null {
  for (const name of names) {
    const d = getDate(props[name]);
    if (d) return d;
  }
  const lower = names.map((n) => n.toLowerCase());
  for (const [key, prop] of Object.entries(props)) {
    if (lower.includes(key.toLowerCase())) {
      const d = getDate(prop);
      if (d) return d;
    }
  }
  return null;
}

export function getUrl(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== "url" || !("url" in prop)) return "";
  return prop.url ?? "";
}

export function getNumber(prop: NotionProperty | undefined): number | null {
  if (!prop || prop.type !== "number" || !("number" in prop)) return null;
  return prop.number;
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .trim();
}

export function shouldIgnoreNotion(estado: string): boolean {
  const e = norm(estado);
  if (!e) return false;
  return e.includes("POR CARGAR") || e.includes("FALTA DATOS");
}

export function mapNotionTipo(tipo: string): "clase" | "seguimiento" | null {
  const t = norm(tipo);
  if (t.includes("CLASE")) return "clase";
  if (t.includes("SEGUIMIENTO")) return "seguimiento";
  return null;
}

export function mapNotionPago(tipoDePago: string, estado: string): VentaPago {
  const tp = norm(tipoDePago);
  if (tp.includes("SEÑA") || tp.includes("SENA")) return "sena";
  if (tp === "PAYFULL" || tp.includes("PAY FULL") || tp.includes("PAYFULL")) {
    return "payfull";
  }
  if (tp.includes("DOWNSELL")) return "downsell";

  const e = norm(estado);
  if (e.includes("SEÑA CARGADA") || e.includes("SENA CARGADA")) return "sena";
  if (
    e.includes("COMPLETA PAGO") ||
    e.includes("SANTI") ||
    (e.includes("CARGADA") && !e.includes("SEÑA") && !e.includes("SENA"))
  ) {
    return "payfull";
  }

  return "payfull";
}

export function mapNotionProd(
  funnel: string,
  tipoDePago: string,
): VentaProducto {
  const f = norm(funnel);
  const tp = norm(tipoDePago);
  if (tp.includes("DOWNSELL") || f.includes("DOWNSELL") || f.includes("FUNNEL ES HOY")) {
    return "downsell";
  }
  return "inscripcion";
}

const MONTO_KEYS = [
  "IMPORTE",
  "PAGO 1",
  "Pago 1",
  "Monto",
  "MONTO",
  "Importe",
];

export function getMontoFromProps(
  props: Record<string, NotionProperty>,
): number | null {
  for (const key of MONTO_KEYS) {
    const n = getNumber(props[key]);
    if (n != null && n > 0) return n;
  }
  for (const [, prop] of Object.entries(props)) {
    const n = getNumber(prop);
    if (n != null && n > 0) return n;
  }
  return null;
}
