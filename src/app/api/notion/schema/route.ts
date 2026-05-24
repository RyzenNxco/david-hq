import { NextResponse } from "next/server";
import { getNotionConfig, notionFetch } from "@/lib/notion/client";

export async function GET() {
  try {
    const { databaseId } = getNotionConfig();
    const db = await notionFetch<{
      title: { plain_text: string }[];
      properties: Record<
        string,
        { type: string; select?: { options: { name: string }[] } }
      >;
    }>(`databases/${databaseId}`);

    const properties = Object.entries(db.properties).map(([name, prop]) => ({
      name,
      type: prop.type,
      options:
        prop.type === "select"
          ? prop.select?.options?.map((o) => o.name)
          : undefined,
    }));

    return NextResponse.json({ properties });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
