export type NotionPage = {
  id: string;
  created_time?: string;
  properties: Record<string, NotionProperty>;
};

export type NotionProperty =
  | { type: "title"; title: { plain_text: string }[] }
  | { type: "rich_text"; rich_text: { plain_text: string }[] }
  | { type: "select"; select: { name: string } | null }
  | { type: "date"; date: { start: string | null } | null }
  | { type: "checkbox"; checkbox: boolean }
  | { type: "url"; url: string | null }
  | { type: "number"; number: number | null }
  | { type: string };
