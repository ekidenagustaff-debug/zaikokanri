import { NextRequest, NextResponse } from "next/server";
import { notion, parseExpense } from "@/lib/notion";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      件名: { title: [{ text: { content: body.件名 ?? "" } }] },
      日付: { date: { start: body.日付 } },
      金額: { number: body.金額 ?? 0 },
      カテゴリ: { select: { name: body.カテゴリ ?? "その他" } },
      備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
    } as Parameters<typeof notion.pages.update>[0]["properties"],
  });
  return NextResponse.json(parseExpense(page));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await notion.pages.update({ page_id: id, archived: true });
  return NextResponse.json({ ok: true });
}
