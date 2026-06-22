import { NextRequest, NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";
import { createProductIfNotExists } from "@/lib/product-sync";

// スプレッドシートから読み取った在庫データ（一回限りのインポート用）
const INVENTORY_DATA = [
  { 品名: "ラージトートバッグ",             サイズ: "",   カラー: "クリーム", 水上村: 25,  町田寮: 0,   陸上部: 1,  購買会: 27, オンライン: 0 },
  { 品名: "今治マフラータオル",             サイズ: "",   カラー: "グリーン", 水上村: 125, 町田寮: 46,  陸上部: 6,  購買会: 25, オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "S",  カラー: "グリーン", 水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "M",  カラー: "グリーン", 水上村: 2,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "L",  カラー: "グリーン", 水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "XL", カラー: "グリーン", 水上村: 1,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "S",  カラー: "クリーム", 水上村: 3,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "M",  カラー: "クリーム", 水上村: 31,  町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "L",  カラー: "クリーム", 水上村: 24,  町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "アディダスパーカー",             サイズ: "XL", カラー: "クリーム", 水上村: 14,  町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "メガホン第102回箱根駅伝モデル", サイズ: "",   カラー: "グリーン", 水上村: 55,  町田寮: 59,  陸上部: 5,  購買会: 39, オンライン: 0 },
  { 品名: "ショートトートバッグ",           サイズ: "",   カラー: "グリーン", 水上村: 124, 町田寮: 45,  陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "ポーチ",                         サイズ: "",   カラー: "グリーン", 水上村: 116, 町田寮: 35,  陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "ブルーピーク食堂チキンカレー",  サイズ: "",   カラー: "グリーン", 水上村: 56,  町田寮: 110, 陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "マグカップ",                     サイズ: "",   カラー: "グリーン", 水上村: 13,  町田寮: 6,   陸上部: 7,  購買会: 0,  オンライン: 0 },
  { 品名: "プレミアムタンブラー",           サイズ: "",   カラー: "グリーン", 水上村: 35,  町田寮: 8,   陸上部: 10, 購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー",                     サイズ: "",   カラー: "ブラック", 水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー",                     サイズ: "",   カラー: "クリーム", 水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー",                     サイズ: "",   カラー: "ホワイト", 水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
  { 品名: "タンブラー",                     サイズ: "",   カラー: "グリーン", 水上村: 0,   町田寮: 0,   陸上部: 0,  購買会: 0,  オンライン: 0 },
];

const LOCATION_COLS = ["水上村", "町田寮", "陸上部", "購買会", "オンライン"] as const;

async function getAllInventoryRecords(): Promise<Map<string, string>> {
  const map = new Map<string, string>(); // 商品名 -> pageId
  let cursor: string | undefined;

  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.inventory,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.results.filter((r: any) => r.properties).forEach((r: any) => {
      const 商品名 = r.properties["商品名"]?.title?.[0]?.plain_text ?? "";
      if (商品名) map.set(商品名, r.id);
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

  const inventoryMap = await getAllInventoryRecords();
  let updated = 0;
  let created = 0;

  for (const row of INVENTORY_DATA) {
    const 商品名 = [row.品名, row.サイズ, row.カラー ? `(${row.カラー})` : ""]
      .filter(Boolean)
      .join(" ");

    const 商品PageId = await createProductIfNotExists(商品名);
    const locProps = Object.fromEntries(LOCATION_COLS.map((loc) => [loc, { number: row[loc] }]));
    const existingPageId = inventoryMap.get(商品名);

    if (existingPageId) {
      await notion.pages.update({
        page_id: existingPageId,
        properties: locProps as Parameters<typeof notion.pages.update>[0]["properties"],
      });
      updated++;
    } else {
      await notion.pages.create({
        parent: { data_source_id: DS.inventory, type: "data_source_id" },
        properties: {
          商品名: { title: [{ text: { content: 商品名 } }] },
          商品: { relation: [{ id: 商品PageId }] },
          ...locProps,
        } as Parameters<typeof notion.pages.create>[0]["properties"],
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, updated, created, products: INVENTORY_DATA.length });
}
