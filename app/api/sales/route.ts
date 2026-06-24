import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseSale } from "@/lib/notion";
import { decreaseInventory, logMovement } from "@/lib/inventory-sync";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.sales,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return NextResponse.json(all.map(parseSale));
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

  const 移動先 = body.価格種別 === "陸上部卸値" ? "陸上部" : "顧客";
  const 種別 = body.価格種別 === "陸上部卸値" ? "拠点間移動" : "販売";

  await Promise.all([
    decreaseInventory(body.商品PageId ?? null, body.販売拠点, body.販売数 ?? 1),
    body.商品名 && body.商品名 !== "送料"
      ? logMovement({
          商品名: body.商品名,
          商品PageId: body.商品PageId ?? null,
          日付: body.日付 ?? new Date().toISOString().slice(0, 10),
          移動数: body.販売数 ?? 1,
          移動元: body.販売拠点 ?? "水上村",
          移動先,
          種別,
          備考: body.備考 ?? "",
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json(parseSale(page));
}
