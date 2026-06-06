import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isValidPhone, normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nome = String(body?.nome ?? "").trim();
    const telefone = normalizePhone(String(body?.telefone ?? ""));

    if (nome.length < 2) {
      return NextResponse.json(
        { error: "Nome muito curto" },
        { status: 400 }
      );
    }
    if (!isValidPhone(telefone)) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();
    const { data: existing } = await sb
      .from("users")
      .select("id")
      .eq("telefone", telefone)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Telefone já cadastrado — use Entrar" },
        { status: 409 }
      );
    }

    const { data, error } = await sb
      .from("users")
      .insert({ nome: nome.slice(0, 80), telefone, role: "user" })
      .select("id, nome, telefone, role")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Falha ao cadastrar" },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
