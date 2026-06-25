import { NextResponse } from "next/server";
import { notion, DS, parseProduct } from "@/lib/notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"] as const;

export async function GET() {
  // 商品マスタ全件取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProducts: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.products,
      sorts: [{ property: "品名", direction: "ascending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allProducts.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  // 在庫移動ログ全件取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMovements: any[] = [];
  cursor = undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.movements,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allMovements.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  // 在庫移動ログから商品×拠点の在庫数を集計
  const net: Record<string, Record<string, number>> = {};
  for (const m of allMovements) {
    const props = m.properties;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relation: { id: string }[] = props["商品"]?.relation ?? [];
    if (relation.length === 0) continue;
    const productId = relation[0].id;
    const 移動数: number = props["移動数"]?.number ?? 0;
    const 移動元: string = props["移動元"]?.select?.name ?? "";
    const 移動先: string = props["移動先"]?.select?.name ?? "";

    if (!net[productId]) net[productId] = {};

    if (LOCATIONS.includes(移動先 as typeof LOCATIONS[number])) {
      net[productId][移動先] = (net[productId][移動先] ?? 0) + 移動数;
    }
    if (LOCATIONS.includes(移動元 as typeof LOCATIONS[number])) {
      net[productId][移動元] = (net[productId][移動元] ?? 0) - 移動数;
    }
  }

  // 商品マスタに計算値を上書きして返す（DBは更新しない）
  const products = allProducts.map(parseProduct).map((p) => {
    const computed = net[p.pageId];
    if (!computed) return p;
    return {
      ...p,
      水上村: computed["水上村"] ?? 0,
      町田寮: computed["町田寮"] ?? 0,
      陸上部: computed["陸上部"] ?? 0,
      購買会: computed["購買会"] ?? 0,
    };
  });

  return NextResponse.json(products);
}
