import { NextResponse } from "next/server";
import { notion, DS, parseSale } from "@/lib/notion";

// Read all page IDs already migrated (stored as [migrated:pageId] in 備考)
async function getMigratedSaleIds(): Promise<Set<string>> {
  const migrated = new Set<string>();
  let cursor: string | undefined;

  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.movements,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.results.filter((r: any) => r.properties).forEach((r: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const 備考 = r.properties["備考"]?.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
      const match = 備考.match(/\[migrated:([^\]]+)\]/);
      if (match) migrated.add(match[1]);
    });
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return migrated;
}

// Fetch all 販売ログ records
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAllSales(): Promise<any[]> {
  const all = [];
  let cursor: string | undefined;

  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.sales,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return all;
}

function classifySale(sale: ReturnType<typeof parseSale>): {
  種別: string;
  移動元: string;
  移動先: string;
} | null {
  // 送料は在庫移動なし
  if (sale.商品名 === "送料") return null;

  const isWix = /\[Wix#\d+\]/.test(sale.備考);
  if (isWix) {
    return { 種別: "Wix受注", 移動元: "水上村", 移動先: "顧客" };
  }

  const is拠点間陸上部 = sale.備考.includes("→陸上部") || sale.価格種別 === "陸上部卸値";
  if (is拠点間陸上部) {
    return { 種別: "拠点間移動", 移動元: sale.販売拠点 || "水上村", 移動先: "陸上部" };
  }

  const 移動元 = sale.販売拠点 || "水上村";
  return { 種別: "販売", 移動元, 移動先: "顧客" };
}

export async function POST() {
  const [migratedIds, allSales] = await Promise.all([
    getMigratedSaleIds(),
    getAllSales(),
  ]);

  let added = 0;
  let skipped = 0;
  let skippedShipping = 0;

  for (const raw of allSales) {
    const sale = parseSale(raw);

    if (migratedIds.has(sale.pageId)) {
      skipped++;
      continue;
    }

    const classification = classifySale(sale);
    if (!classification) {
      skippedShipping++;
      continue;
    }

    const { 種別, 移動元, 移動先 } = classification;
    const 備考text = `${sale.備考 ? sale.備考 + " " : ""}[migrated:${sale.pageId}]`;

    const props: Record<string, unknown> = {
      商品名: { title: [{ text: { content: sale.商品名 } }] },
      日付: sale.日付 ? { date: { start: sale.日付 } } : { date: null },
      移動数: { number: sale.販売数 ?? 0 },
      移動元: { select: { name: 移動元 } },
      移動先: { select: { name: 移動先 } },
      種別: { select: { name: 種別 } },
      備考: { rich_text: [{ text: { content: 備考text } }] },
    };

    if (sale.商品PageId) {
      props["商品"] = { relation: [{ id: sale.商品PageId }] };
    }

    await notion.pages.create({
      parent: { data_source_id: DS.movements, type: "data_source_id" },
      properties: props as Parameters<typeof notion.pages.create>[0]["properties"],
    });

    migratedIds.add(sale.pageId);
    added++;
  }

  return NextResponse.json({ added, skipped, skippedShipping, total: allSales.length });
}
