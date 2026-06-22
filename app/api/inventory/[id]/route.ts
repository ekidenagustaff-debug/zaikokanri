import { NextRequest, NextResponse } from "next/server";
import { notion, parseInventory } from "@/lib/notion";

const LOCATION_COLS = ["水上村", "町田寮", "陸上部", "購買会", "オンライン"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const props: Record<string, unknown> = {
    商品名: { title: [{ text: { content: body.商品名 ?? "" } }] },
    備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
  };
  for (const loc of LOCATION_COLS) {
    if (body[loc] !== undefined) props[loc] = { number: body[loc] };
  }
  if (body.商品PageId) {
    props["商品"] = { relation: [{ id: body.商品PageId }] };
  }
  const page = await notion.pages.update({
    page_id: id,
    properties: props as Parameters<typeof notion.pages.update>[0]["properties"],
  });
  return NextResponse.json(parseInventory(page));
}
