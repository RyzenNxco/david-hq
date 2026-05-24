import type { VentaCategoria, VentaPago, VentaProducto } from "@/lib/commissions";
import type { NotionPage } from "./types";
import { notionFetch } from "./client";
import {
  getDate,
  getRichText,
  getSelect,
  getTitle,
  getUrl,
  mapNotionEstado,
  mapNotionProd,
  mapNotionTipo,
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
  notionFunnel: string;
  notionDatos: string;
  needsCompletion: boolean;
};

type QueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

function parsePage(page: NotionPage): VentaSync | null {
  const props = page.properties;
  let cliente = getTitle(props);
  const datos = getRichText(props["datos"]);

  if (!cliente && datos) {
    const match = datos.match(/^([^,\n\d]+?)(?:[,\n]|\s\d|$)/);
    cliente = match ? match[1].trim() : datos.slice(0, 40).trim();
  }
  if (!cliente) cliente = `Cliente ${page.id.slice(-4)}`;

  let fecha = getDate(props["Fecha"]);
  if (fecha && fecha.length > 10) fecha = fecha.slice(0, 10);
  if (!fecha && page.created_time) fecha = page.created_time.slice(0, 10);

  let fechaCompletarPago = getDate(props["DIA A COMPLETAR PAGO"]);
  if (fechaCompletarPago && fechaCompletarPago.length > 10) {
    fechaCompletarPago = fechaCompletarPago.slice(0, 10);
  }

  const tipo = getSelect(props["TIPO"]);
  const estado = getSelect(props["Estado"]);
  const funnel = getSelect(props["Funnel"]);

  const categoria = mapNotionTipo(tipo);
  const pagoRaw = mapNotionEstado(estado);
  if (!fecha || !categoria || !pagoRaw) return null;

  const producto = mapNotionProd(funnel);
  const pago: VentaPago =
    producto === "downsell" && pagoRaw === "payfull" ? "downsell" : pagoRaw;

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
    notionFunnel: funnel,
    notionDatos: datos,
    needsCompletion: true,
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
              on_or_before: `${month}-31`,
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
