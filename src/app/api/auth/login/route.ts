import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const telefone = normalizePhone(String(body?.telefone ?? ""));
    if (!isValidPhone(telefone)) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 }
      );
    }
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("users")
      .select("id, nome, telefone, role")
      .eq("telefone", telefone)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "Telefone não cadastrado" },
        { status: 404 }
      );
    }
    await sb
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.id);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
