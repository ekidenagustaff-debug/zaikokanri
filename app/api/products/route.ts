import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseProduct } from "@/lib/notion";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.products,
      sorts: [{ property: "品名", direction: "ascending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return NextResponse.json(all.map(parseProduct));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const page = await notion.pages.create({
    parent: { data_source_id: DS.products, type: "data_source_id" },
    properties: {
      品名: { title: [{ text: { content: body.品名 ?? "" } }] },
      仕入れ数: { number: body.仕入れ数 ?? null },
      通常価格: { number: body.通常価格 ?? null },
      関係者価格: { number: body.関係者価格 ?? null },
      陸上部卸値: { number: body.陸上部卸値 ?? null },
      購買会卸値: { number: body.購買会卸値 ?? null },
      仕入れ額: { number: body.仕入れ額 ?? null },
      備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
      水上村: { number: 0 },
      町田寮: { number: 0 },
      陸上部: { number: 0 },
      購買会: { number: 0 },
      オンライン: { number: 0 },
    },
  });
  return NextResponse.json(parseProduct(page));
}
