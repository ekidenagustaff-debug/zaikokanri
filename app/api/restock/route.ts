import { NextRequest, NextResponse } from "next/server";
import { increaseInventory } from "@/lib/inventory-sync";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 商品PageId, 拠点, 数量, 備考 } = body;
  if (!商品PageId || !拠点 || !数量) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  await increaseInventory(商品PageId, 拠点, Number(数量), "仕入れ", 備考 ?? "");
  return NextResponse.json({ ok: true });
}
