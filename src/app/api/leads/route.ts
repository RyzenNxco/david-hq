import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("estado", "activo")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ leads: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .insert({ ...body, estado: body.estado ?? "activo" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ lead: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
