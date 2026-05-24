import type { NotionProperty } from "./types";

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
  if (!prop || prop.type !== "select" || !("select" in prop)) return "";
  return prop.select?.name ?? "";
}

export function getDate(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== "date" || !("date" in prop)) return null;
  return prop.date?.start ?? null;
}

export function getCheckbox(prop: NotionProperty | undefined): boolean {
  if (!prop || prop.type !== "checkbox" || !("checkbox" in prop)) return false;
  return prop.checkbox;
}

export function getUrl(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== "url" || !("url" in prop)) return "";
  return prop.url ?? "";
}

export function mapNotionEstado(
  estado: string,
): "sena" | "payfull" | "downsell" | null {
  if (!estado) return null;
  const e = estado.toUpperCase().trim();
  if (e.includes("SEÑA CARGADA") || e.includes("SENA CARGADA")) return "sena";
  if (e.includes("COMPLETA PAGO")) return "payfull";
  if (e.includes("CARGADA")) return "payfull";
  if (e.includes("SANTI")) return "payfull";
  if (e === "PAGO" || e.startsWith("PAGO ")) return "payfull";
  if (e.includes("FALTA DATOS")) return null;
  if (e.includes("POR CARGAR")) return null;
  return null;
}

export function mapNotionTipo(tipo: string): "clase" | "seguimiento" | null {
  const t = (tipo || "").toUpperCase();
  if (t === "CLASE") return "clase";
  if (t === "SEGUIMIENTO") return "seguimiento";
  return null;
}

export function mapNotionProd(funnel: string): "inscripcion" | "downsell" {
  const f = (funnel || "").toUpperCase();
  if (f.includes("DOWNSELL") || f.includes("FUNNEL ES HOY")) return "downsell";
  return "inscripcion";
}
