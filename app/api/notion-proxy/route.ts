import { NextRequest, NextResponse } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Notion-Version",
};

async function handle(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Falta el parametro url" }, { status: 400, headers: CORS });
  }
  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  const nv = req.headers.get("notion-version");
  headers["Notion-Version"] = nv || "2022-06-28";
  headers["Content-Type"] = "application/json";

  let body: string | undefined = undefined;
  if (req.method === "POST" || req.method === "PATCH") {
    body = await req.text();
  }

  const r = await fetch(target, { method: req.method, headers, body });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
export async function PATCH(req: NextRequest) { return handle(req); }
export async function DELETE(req: NextRequest) { return handle(req); }

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}
