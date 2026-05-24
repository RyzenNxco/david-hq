import type { VentaCategoria, VentaPago, VentaProducto } from "@/lib/commissions";
import type { NotionPage } from "./types";
import { notionFetch } from "./client";
import {
  getDateByNames,
  getEstadoFromProps,
  getMontoFromProps,
  getRichText,
  getSelectByNames,
  getTitle,
  getUrl,
  mapNotionPago,
  mapNotionProd,
  mapNotionTipo,
  shouldIgnoreNotion,
} from "./properties";

export type VentaSync = {
  notionId: string;
  cliente: string;
  fecha: string;
  fechaCompletarPago: string | null;
  categoria: VentaCategoria;
  pago: VentaPago;
  producto: VentaProducto;
  linkManyChat: string;
  notionEstado: string;
  notionTipo: string;
  notionTipoDePago: string;
  notionFunnel: string;
  notionDatos: string;
  montoNotion: number | null;
  needsCompletion: boolean;
};

export type IgnoreStats = {
  porCargarOFaltaDatos: number;
  sinFecha: number;
  sinTipo: number;
};

type QueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

function lastDayOfMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthKey}-${String(last).padStart(2, "0")}`;
}

function parsePage(
  page: NotionPage,
  stats: IgnoreStats,
): VentaSync | null {
  const props = page.properties;
  let cliente = getTitle(props);
  const datos = getRichText(props["datos"]);

  if (!cliente && datos) {
    const match = datos.match(/^([^,\n\d]+?)(?:[,\n]|\s\d|$)/);
    cliente = match ? match[1].trim() : datos.slice(0, 40).trim();
  }
  if (!cliente) cliente = `Cliente ${page.id.slice(-4)}`;

  const estado = getEstadoFromProps(props);
  if (shouldIgnoreNotion(estado)) {
    stats.porCargarOFaltaDatos++;
    return null;
  }

  let fecha = getDateByNames(props, [
    "Fecha",
    "FECHA",
    "Fecha de pago",
    "FECHA DE PAGO",
  ]);
  if (fecha && fecha.length > 10) fecha = fecha.slice(0, 10);
  if (!fecha && page.created_time) fecha = page.created_time.slice(0, 10);
  if (!fecha) {
    stats.sinFecha++;
    return null;
  }

  let fechaCompletarPago = getDateByNames(props, [
    "DIA A COMPLETAR PAGO",
    "Día a completar pago",
    "Fecha completar pago",
  ]);
  if (fechaCompletarPago && fechaCompletarPago.length > 10) {
    fechaCompletarPago = fechaCompletarPago.slice(0, 10);
  }

  const tipo = getSelectByNames(props, [
    "ADQUISICION",
    "Adquisición",
    "ADQUISICIÓN",
    "TIPO",
    "Tipo",
  ]);
  const tipoDePago = getSelectByNames(props, [
    "TIPO DE PAGO",
    "Tipo de pago",
    "FORMA DE PAGO",
    "Forma de pago",
  ]);
  const funnel = getSelectByNames(props, ["Funnel", "FUNNEL"]);

  let categoria = mapNotionTipo(tipo);
  if (!categoria) {
    // Muchas filas antiguas no tienen ADQUISICION — default seguimiento si el estado es válido
    categoria = "seguimiento";
  }

  const producto = mapNotionProd(funnel, tipoDePago);
  let pago = mapNotionPago(tipoDePago, estado);
  if (producto === "downsell" && pago === "payfull") pago = "downsell";

  const montoNotion = getMontoFromProps(props);
  const needsCompletion = montoNotion == null || montoNotion <= 0;

  return {
    notionId: page.id,
    cliente,
    fecha,
    fechaCompletarPago,
    categoria,
    pago,
    producto,
    linkManyChat: getUrl(props["URL MANY"]) || getUrl(props["URL ManyChat"]),
    notionEstado: estado,
    notionTipo: tipo,
    notionTipoDePago: tipoDePago,
    notionFunnel: funnel,
    notionDatos: datos,
    montoNotion,
    needsCompletion,
  };
}

export async function fetchVentasFromNotion(month?: string): Promise<{
  ventas: VentaSync[];
  ignored: number;
  stats: IgnoreStats;
}> {
  const { getNotionConfig } = await import("./client");
  const { databaseId } = getNotionConfig();

  const filter =
    month && /^\d{4}-\d{2}$/.test(month)
      ? {
          filter: {
            property: "Fecha",
            date: {
              on_or_after: `${month}-01`,
              on_or_before: lastDayOfMonth(month),
            },
          },
        }
      : {};

  const ventas: VentaSync[] = [];
  const stats: IgnoreStats = {
    porCargarOFaltaDatos: 0,
    sinFecha: 0,
    sinTipo: 0,
  };
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const body: Record<string, unknown> = {
      page_size: 100,
      ...filter,
    };
    if (cursor) body.start_cursor = cursor;

    const res = await notionFetch<QueryResponse>(
      `databases/${databaseId}/query`,
      { method: "POST", body },
    );

    for (const page of res.results) {
      if (!("properties" in page)) continue;
      const parsed = parsePage(page, stats);
      if (parsed) ventas.push(parsed);
    }

    hasMore = res.has_more;
    cursor = res.next_cursor ?? undefined;
  }

  const ignored = stats.porCargarOFaltaDatos + stats.sinFecha + stats.sinTipo;

  ventas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { ventas, ignored, stats };
}
