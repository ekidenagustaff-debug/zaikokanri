import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseSale } from "@/lib/notion";

export async function GET() {
  const res = await notion.dataSources.query({
    data_source_id: DS.sales,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 100,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(res.results.filter((r: any) => r.properties).map(parseSale));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const props: Record<string, unknown> = {
    商品名: { title: [{ text: { content: body.商品名 ?? "" } }] },
    日付: body.日付 ? { date: { start: body.日付 } } : { date: null },
    販売数: { number: body.販売数 ?? null },
    価格種別: body.価格種別 ? { select: { name: body.価格種別 } } : { select: null },
    販売拠点: body.販売拠点 ? { select: { name: body.販売拠点 } } : { select: null },
    販売額: { number: body.販売額 ?? null },
    備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
  };
  if (body.商品PageId) {
    props["商品"] = { relation: [{ id: body.商品PageId }] };
  }
  const page = await notion.pages.create({
    parent: { data_source_id: DS.sales, type: "data_source_id" },
    properties: props as Parameters<typeof notion.pages.create>[0]["properties"],
  });
  return NextResponse.json(parseSale(page));
}
