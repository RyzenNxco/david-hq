import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ lead: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
