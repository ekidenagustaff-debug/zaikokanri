import { NextRequest, NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";

// スプレッドシートから読み取った在庫データ（一回限りのインポート用）
const INVENTORY_DATA = [
  { 品名: "ラージトートバッグ (クリーム)",             水上村: 25,  町田寮: 0,   陸上部: 1,  購買会: 27, オンライン: 0 },
  { 品名: "今治マフラータオル (グリーン)",             水上村: 125, 町田寮: 46,  陸上部: 6,  購買会: 25, オンライン: 0 },
  { 品名: "アディダスパーカー S (グリーン)",           水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー M (グリーン)",           水上村: 2,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー L (グリーン)",           水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー XL (グリーン)",          水上村: 1,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー S (クリーム)",           水上村: 3,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー M (クリーム)",           水上村: 31,  町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー L (クリーム)",           水上村: 24,  町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー XL (クリーム)",          水上村: 14,  町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "メガホン第102回箱根駅伝モデル (グリーン)", 水上村: 55,  町田寮: 59,  陸上部: 5,  購買会: 39, オンライン: 0 },
  { 品名: "ショートトートバッグ (グリーン)",           水上村: 124, 町田寮: 45,  陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "ポーチ (グリーン)",                         水上村: 116, 町田寮: 35,  陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "ブルーピーク食堂チキンカレー (グリーン)",  水上村: 56,  町田寮: 110, 陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "マグカップ (グリーン)",                     水上村: 13,  町田寮: 6,   陸上部: 7,  購買会: 0,  オンライン: 0 },
  { 品名: "プレミアムタンブラー (グリーン)",           水上村: 35,  町田寮: 8,   陸上部: 10, 購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー (ブラック)",                     水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー (クリーム)",                     水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー (ホワイト)",                     水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー (グリーン)",                     水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
];

const LOCATION_COLS = ["水上村", "町田寮", "陸上部", "購買会", "オンライン"] as const;

async function getProductMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.products,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.results.filter((r: any) => r.properties).forEach((r: any) => {
      const 品名 = r.properties["品名"]?.title?.[0]?.plain_text ?? "";
      if (品名) map.set(品名, r.id);
    });
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return map;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== (process.env.CRON_SECRET ?? "").trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productMap = await getProductMap();
  let updated = 0;
  let created = 0;

  for (const row of INVENTORY_DATA) {
    const locProps = Object.fromEntries(LOCATION_COLS.map((loc) => [loc, { number: row[loc] }]));
    const existingId = productMap.get(row.品名);

    if (existingId) {
      await notion.pages.update({
        page_id: existingId,
        properties: locProps as Parameters<typeof notion.pages.update>[0]["properties"],
      });
      updated++;
    } else {
      await notion.pages.create({
        parent: { data_source_id: DS.products, type: "data_source_id" },
        properties: {
          品名: { title: [{ text: { content: row.品名 } }] },
          ...locProps,
        } as Parameters<typeof notion.pages.create>[0]["properties"],
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, updated, created });
}
