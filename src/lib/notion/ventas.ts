import type { VentaCategoria, VentaPago, VentaProducto } from "@/lib/commissions";
import type { NotionPage } from "./types";
import { notionFetch } from "./client";
import {
  getDate,
  getMontoFromProps,
  getRichText,
  getSelect,
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

function parsePage(page: NotionPage): VentaSync | null {
  const props = page.properties;
  let cliente = getTitle(props);
  const datos = getRichText(props["datos"]);

  if (!cliente && datos) {
    const match = datos.match(/^([^,\n\d]+?)(?:[,\n]|\s\d|$)/);
    cliente = match ? match[1].trim() : datos.slice(0, 40).trim();
  }
  if (!cliente) cliente = `Cliente ${page.id.slice(-4)}`;

  const estado = getSelect(props["Estado"]);
  if (shouldIgnoreNotion(estado)) return null;

  let fecha = getDate(props["Fecha"]);
  if (fecha && fecha.length > 10) fecha = fecha.slice(0, 10);
  if (!fecha && page.created_time) fecha = page.created_time.slice(0, 10);
  if (!fecha) return null;

  let fechaCompletarPago = getDate(props["DIA A COMPLETAR PAGO"]);
  if (fechaCompletarPago && fechaCompletarPago.length > 10) {
    fechaCompletarPago = fechaCompletarPago.slice(0, 10);
  }

  const tipo = getSelect(props["TIPO"]);
  const tipoDePago = getSelect(props["TIPO DE PAGO"]);
  const funnel = getSelect(props["Funnel"]);

  const categoria = mapNotionTipo(tipo);
  if (!categoria) return null;

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
    linkManyChat: getUrl(props["URL MANY"]),
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
  let ignored = 0;
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
      const parsed = parsePage(page);
      if (parsed) ventas.push(parsed);
      else ignored++;
    }

    hasMore = res.has_more;
    cursor = res.next_cursor ?? undefined;
  }

  ventas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { ventas, ignored };
}
