import { NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";

// 販売拠点「オンライン」を「水上村」に統合する一括移行。
// 何度実行しても安全（オンラインが無くなれば done: true を返す）。
export async function POST() {
  let updated = 0;

  // オンラインのレコードが無くなるまで繰り返す（1回のクエリで最大100件処理）
  const res = await notion.dataSources.query({
    data_source_id: DS.sales,
    filter: { property: "販売拠点", select: { equals: "オンライン" } },
    page_size: 100,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = res.results.filter((r: any) => r.properties);

  for (const record of records) {
    await notion.pages.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page_id: (record as any).id,
      properties: {
        販売拠点: { select: { name: "水上村" } },
      } as Parameters<typeof notion.pages.update>[0]["properties"],
    });
    updated++;
  }

  // オンラインが1件も無くなれば完了
  return NextResponse.json({ updated, done: records.length === 0 });
}
