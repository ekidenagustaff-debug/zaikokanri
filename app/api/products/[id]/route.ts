import { NextRequest, NextResponse } from "next/server";
import { notion, parseProduct } from "@/lib/notion";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      品名: { title: [{ text: { content: body.品名 ?? "" } }] },
      サイズ: { rich_text: [{ text: { content: body.サイズ ?? "" } }] },
      カラー: body.カラー ? { select: { name: body.カラー } } : { select: null },
      仕入れ数: { number: body.仕入れ数 ?? null },
      通常価格: { number: body.通常価格 ?? null },
      関係者価格: { number: body.関係者価格 ?? null },
      陸上部卸値: { number: body.陸上部卸値 ?? null },
      購買会卸値: { number: body.購買会卸値 ?? null },
      原価: { number: body.原価 ?? null },
      仕入れ額: { number: body.仕入れ額 ?? null },
      備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
    },
  });
  return NextResponse.json(parseProduct(page));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await notion.pages.update({ page_id: id, archived: true });
  return NextResponse.json({ ok: true });
}
