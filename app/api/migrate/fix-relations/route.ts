import { NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";
import { getProductMap } from "@/lib/product-sync";

// 1回のリクエストで処理する最大件数
const BATCH_SIZE = 25;

// 「商品」リレーション未設定のレコードだけを毎回検索する。前回処理した分は
// 自動的に対象から外れるため、1ページ内で処理しきれず取りこぼす問題や、
// 編集で並び順がズレてカーソルが壊れる問題を受けない。
export async function POST() {
  const productMap = await getProductMap();

  const res = await notion.dataSources.query({
    data_source_id: DS.movements,
    filter: { property: "商品", relation: { is_empty: true } },
    page_size: 100,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = res.results.filter((r: any) => r.properties);

  let fixed = 0;
  let unmatched = 0;
  let processed = 0;

  for (const record of records) {
    if (processed >= BATCH_SIZE) break;
    processed++;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (record as any).properties;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleRuns: any[] = props["商品名"]?.title ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const 商品名: string = titleRuns.map((t: any) => t.plain_text).join("");

    let productId = 商品名 ? (productMap.get(商品名) ?? null) : null;
    if (!productId && 商品名) {
      for (const [name, id] of productMap.entries()) {
        if (商品名.startsWith(name) || name.startsWith(商品名)) {
          productId = id;
          break;
        }
      }
    }

    if (!productId) {
      unmatched++;
      continue;
    }

    await notion.pages.update({
      page_id: (record as any).id,
      properties: {
        商品: { relation: [{ id: productId }] },
      } as Parameters<typeof notion.pages.update>[0]["properties"],
    });
    fixed++;
  }

  return NextResponse.json({
    fixed,
    unmatched, // 商品マスタに一致する商品が見つからず修正できなかった件数
    done: records.length === 0,
  });
}
