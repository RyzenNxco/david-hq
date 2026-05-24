import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transcripciones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ transcripciones: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar transcripciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, lead_id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transcripciones")
      .update({ lead_id: lead_id ?? null })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ transcripcion: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar transcripción";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
