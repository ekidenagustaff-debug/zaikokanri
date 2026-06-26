import { NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";
import { getProductMap } from "@/lib/product-sync";

export async function POST() {
  // 商品マスタの名前→IDマップ
  const productMap = await getProductMap();

  // 在庫移動ログ全件取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
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

  // 商品リレーションが未設定のレコードを対象に補完
  let fixed = 0;
  let skipped = 0;

  for (const record of all) {
    const props = record.properties;
    const relation: unknown[] = props["商品"]?.relation ?? [];
    if (relation.length > 0) {
      skipped++;
      continue;
    }

    // 商品名からリレーション先を特定
    const 商品名: string = props["商品名"]?.title?.[0]?.plain_text ?? "";
    if (!商品名) {
      skipped++;
      continue;
    }

    // 完全一致で検索
    let productId = productMap.get(商品名) ?? null;

    // 完全一致しない場合、スペース区切りの先頭部分で前方一致を試みる
    if (!productId) {
      for (const [name, id] of productMap.entries()) {
        if (商品名.startsWith(name) || name.startsWith(商品名)) {
          productId = id;
          break;
        }
      }
    }

    if (!productId) {
      skipped++;
      continue;
    }

    await notion.pages.update({
      page_id: record.id,
      properties: {
        商品: { relation: [{ id: productId }] },
      } as Parameters<typeof notion.pages.update>[0]["properties"],
    });
    fixed++;
  }

  return NextResponse.json({ fixed, skipped, total: all.length });
}
