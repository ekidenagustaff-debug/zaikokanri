import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseProduct } from "@/lib/notion";

export async function GET() {
  const res = await notion.dataSources.query({
    data_source_id: DS.products,
    sorts: [{ property: "品名", direction: "ascending" }],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(res.results.filter((r: any) => r.properties).map(parseProduct));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const page = await notion.pages.create({
    parent: { data_source_id: DS.products, type: "data_source_id" },
    properties: {
      品名: { title: [{ text: { content: body.品名 ?? "" } }] },
      サイズ: { rich_text: [{ text: { content: body.サイズ ?? "" } }] },
      カラー: body.カラー ? { select: { name: body.カラー } } : { select: null },
      仕入れ数: { number: body.仕入れ数 ?? null },
      通常価格: { number: body.通常価格 ?? null },
      関係者価格: { number: body.関係者価格 ?? null },
      陸上部卸値: { number: body.陸上部卸値 ?? null },
      購買会卸値: { number: body.購買会卸値 ?? null },
      原価: { number: body.原価 ?? null },
      仕入れ額: { number: body.仕入れ額 ?? null },
      備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
    },
  });
  return NextResponse.json(parseProduct(page));
}
