import { NextRequest, NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";
import { getProductMap } from "@/lib/product-sync";

// 1回のリクエストで処理する最大件数
const BATCH_SIZE = 20;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cursor: string | undefined = body.cursor ?? undefined;

  const productMap = await getProductMap();

  const res = await notion.dataSources.query({
    data_source_id: DS.movements,
    page_size: 100,
    ...(cursor ? { start_cursor: cursor } : {}),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = res.results.filter((r: any) => r.properties);
  const nextCursor: string | null = res.has_more ? (res.next_cursor ?? null) : null;

  let fixed = 0;
  let skipped = 0;
  let processed = 0;

  for (const record of records) {
    if (processed >= BATCH_SIZE) break;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (record as any).properties;
    const relation: unknown[] = props["商品"]?.relation ?? [];
    if (relation.length > 0) {
      skipped++;
      continue;
    }

    const 商品名: string = props["商品名"]?.title?.[0]?.plain_text ?? "";
    if (!商品名) {
      skipped++;
      continue;
    }

    let productId = productMap.get(商品名) ?? null;
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
      page_id: (record as any).id,
      properties: {
        商品: { relation: [{ id: productId }] },
      } as Parameters<typeof notion.pages.update>[0]["properties"],
    });
    fixed++;
    processed++;
  }

  return NextResponse.json({
    fixed,
    skipped,
    done: nextCursor === null && processed < BATCH_SIZE,
    nextCursor,
  });
}
