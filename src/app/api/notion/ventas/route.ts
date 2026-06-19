import { NextResponse } from "next/server";
import { notionFetch } from "@/lib/notion/client";
import { fetchVentasFromNotion } from "@/lib/notion/ventas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;

    const { ventas, ignored, stats } = await fetchVentasFromNotion(month ?? undefined);

    return NextResponse.json({
      ventas,
      ignored,
      stats,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al sincronizar Notion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { getNotionConfig } = await import("@/lib/notion/client");
    const { databaseId } = getNotionConfig();

    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const url = String(body.url ?? "").trim();
    if (url) {
      const dup = await notionFetch<{
        results: { id: string }[];
      }>(`databases/${databaseId}/query`, {
        method: "POST",
        body: {
          filter: {
            property: "URL MANY",
            url: { equals: url },
          },
          page_size: 1,
        },
      });
      if (dup.results.length > 0) {
        return NextResponse.json(
          { error: "Ya existe una venta con esa URL de ManyChat" },
          { status: 409 },
        );
      }
    }

    const properties: Record<string, unknown> = {
      Nombre: { title: [{ text: { content: nombre } }] },
      ADQUISICION: { select: { name: body.tipo || "SEGUIMIENTO" } },
      "TIPO DE PAGO": {
        select: { name: body.tipoDePago || "SEÑA" },
      },
      // "TIPO" es la columna ESTADO en el Notion de VENTAS (no "Estado" ni "").
      TIPO: {
        select: { name: body.estado || "ACCESOS ✅ POR CARGAR ❌" },
      },
    };

    if (body.fecha) properties.Fecha = { date: { start: body.fecha } };
    if (body.fechaCompletar) {
      properties["DIA A COMPLETAR PAGO"] = { date: { start: body.fechaCompletar } };
    }
    if (url) properties["URL MANY"] = { url };
    if (body.notas) {
      properties.datos = { rich_text: [{ text: { content: String(body.notas) } }] };
    }
    // El archivo NO va como propiedad: se agrega como bloque en el cuerpo de la página.
    const archivo = body["Archivos y multimedia"] as
      | { files?: { external?: { url?: string }; name?: string }[] }
      | undefined;
    const archivoUrl = archivo?.files?.[0]?.external?.url?.trim();

    const children: unknown[] = [];
    if (archivoUrl) {
      const esPdf = archivoUrl.toLowerCase().endsWith(".pdf");
      if (esPdf) {
        children.push({
          object: "block",
          type: "pdf",
          pdf: { type: "external", external: { url: archivoUrl } },
        });
      } else {
        children.push({
          object: "block",
          type: "image",
          image: { type: "external", external: { url: archivoUrl } },
        });
      }
    }

    const page = await notionFetch<{ id: string }>("pages", {
      method: "POST",
      body: {
        parent: { database_id: databaseId },
        properties,
        ...(children.length > 0 ? { children } : {}),
      },
    });

    return NextResponse.json({ id: page.id, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear en Notion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
