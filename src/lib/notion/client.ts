const NOTION_VERSION = "2022-06-28";

export function getNotionConfig() {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DB_ID;
  if (!apiKey) throw new Error("NOTION_API_KEY no configurada");
  if (!databaseId) throw new Error("NOTION_DB_ID no configurada");
  return { apiKey, databaseId };
}

export async function notionFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { apiKey } = getNotionConfig();
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? `Notion API error ${res.status}`);
  }
  return data as T;
}
