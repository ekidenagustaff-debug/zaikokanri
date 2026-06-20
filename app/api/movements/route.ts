import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseMovement } from "@/lib/notion";

export async function GET() {
  const res = await notion.dataSources.query({
    data_source_id: DS.movements,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 100,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(res.results.filter((r: any) => r.properties).map(parseMovement));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const props: Record<string, unknown> = {
    商品名: { title: [{ text: { content: body.商品名 ?? "" } }] },
    日付: body.日付 ? { date: { start: body.日付 } } : { date: null },
    移動数: { number: body.移動数 ?? null },
    移動元: body.移動元 ? { select: { name: body.移動元 } } : { select: null },
    移動先: body.移動先 ? { select: { name: body.移動先 } } : { select: null },
    備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
  };
  if (body.商品PageId) {
    props["商品"] = { relation: [{ id: body.商品PageId }] };
  }
  const page = await notion.pages.create({
    parent: { data_source_id: DS.movements, type: "data_source_id" },
    properties: props as Parameters<typeof notion.pages.create>[0]["properties"],
  });
  return NextResponse.json(parseMovement(page));
}
