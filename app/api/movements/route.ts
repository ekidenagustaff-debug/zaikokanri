import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseMovement } from "@/lib/notion";
import { decreaseInventory, increaseInventory } from "@/lib/inventory-sync";

async function getPurchasePrice(商品PageId: string): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await notion.pages.retrieve({ page_id: 商品PageId }) as any;
  return page.properties["購買会卸値"]?.number ?? null;
}

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.movements,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return NextResponse.json(all.map(parseMovement));
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

  if (body.移動先 === "購買会") {
    // 購買会への移動 = 陸上部から購買会卸値で販売
    const 購買会卸値 = body.商品PageId ? await getPurchasePrice(body.商品PageId) : null;
    const 販売額 = 購買会卸値 != null ? 購買会卸値 * (body.移動数 ?? 0) : null;
    await Promise.all([
      decreaseInventory(body.商品PageId ?? null, body.移動元, body.移動数 ?? 0, "販売"),
      notion.pages.create({
        parent: { data_source_id: DS.sales, type: "data_source_id" },
        properties: {
          商品名: { title: [{ text: { content: body.商品名 ?? "" } }] },
          日付: body.日付 ? { date: { start: body.日付 } } : { date: null },
          販売数: { number: body.移動数 ?? null },
          価格種別: { select: { name: "購買会卸値" } },
          販売拠点: { select: { name: "購買会" } },
          販売額: { number: 販売額 },
          備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
          ...(body.商品PageId ? { 商品: { relation: [{ id: body.商品PageId }] } } : {}),
        } as Parameters<typeof notion.pages.create>[0]["properties"],
      }),
    ]);
  } else {
    await Promise.all([
      decreaseInventory(body.商品PageId ?? null, body.移動元, body.移動数 ?? 0, "在庫移動"),
      increaseInventory(body.商品PageId ?? null, body.移動先, body.移動数 ?? 0, "在庫移動"),
    ]);
  }

  return NextResponse.json(parseMovement(page));
}
