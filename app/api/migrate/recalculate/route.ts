import { NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"] as const;
type Location = (typeof LOCATIONS)[number];

// 在庫移動ログ全件取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAllMovements(): Promise<any[]> {
  const all = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.movements,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return all;
}

// 商品マスタ全件取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAllProducts(): Promise<any[]> {
  const all = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.products,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return all;
}

export async function POST() {
  const [movements, products] = await Promise.all([
    getAllMovements(),
    getAllProducts(),
  ]);

  // 在庫移動ログから商品×拠点ごとの在庫数を集計
  const net: Record<string, Record<Location, number>> = {};

  for (const m of movements) {
    const props = m.properties;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relation: { id: string }[] = props["商品"]?.relation ?? [];
    if (relation.length === 0) continue;
    const productId = relation[0].id;
    const 移動数: number = props["移動数"]?.number ?? 0;
    const 移動元: string = props["移動元"]?.select?.name ?? "";
    const 移動先: string = props["移動先"]?.select?.name ?? "";

    if (!net[productId]) {
      net[productId] = { 水上村: 0, 町田寮: 0, 陸上部: 0, 購買会: 0 };
    }

    if (LOCATIONS.includes(移動先 as Location)) {
      net[productId][移動先 as Location] += 移動数;
    }
    if (LOCATIONS.includes(移動元 as Location)) {
      net[productId][移動元 as Location] -= 移動数;
    }
  }

  // 商品マスタを更新（在庫をゼロリセット → 計算値をセット）
  let updated = 0;
  let zeroed = 0;

  for (const product of products) {
    const id: string = product.id;
    const computed = net[id] ?? { 水上村: 0, 町田寮: 0, 陸上部: 0, 購買会: 0 };

    await notion.pages.update({
      page_id: id,
      properties: {
        水上村: { number: Math.max(0, computed.水上村) },
        町田寮: { number: Math.max(0, computed.町田寮) },
        陸上部: { number: Math.max(0, computed.陸上部) },
        購買会: { number: Math.max(0, computed.購買会) },
      } as Parameters<typeof notion.pages.update>[0]["properties"],
    });

    if (net[id]) {
      updated++;
    } else {
      zeroed++;
    }
  }

  return NextResponse.json({
    updated,
    zeroed,
    totalProducts: products.length,
    totalMovements: movements.length,
  });
}
