import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseInventory } from "@/lib/notion";

export async function GET() {
  const res = await notion.dataSources.query({
    data_source_id: DS.inventory,
    sorts: [{ property: "商品名", direction: "ascending" }],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(res.results.filter((r: any) => r.properties).map(parseInventory));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const props: Record<string, unknown> = {
    商品名: { title: [{ text: { content: body.商品名 ?? "" } }] },
    拠点: body.拠点 ? { select: { name: body.拠点 } } : { select: null },
    在庫数: { number: body.在庫数 ?? null },
    備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
  };
  if (body.商品PageId) {
    props["商品"] = { relation: [{ id: body.商品PageId }] };
  }
  const page = await notion.pages.create({
    parent: { data_source_id: DS.inventory, type: "data_source_id" },
    properties: props as Parameters<typeof notion.pages.create>[0]["properties"],
  });
  return NextResponse.json(parseInventory(page));
}
