import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseProduct } from "@/lib/notion";

const LOCATION_COLS = ["水上村", "町田寮", "陸上部", "購買会"];

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
  const props: Record<string, unknown> = {
    品名: { title: [{ text: { content: body.品名 ?? "" } }] },
    備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
  };
  for (const loc of LOCATION_COLS) {
    props[loc] = { number: body[loc] ?? 0 };
  }
  const page = await notion.pages.create({
    parent: { data_source_id: DS.products, type: "data_source_id" },
    properties: props as Parameters<typeof notion.pages.create>[0]["properties"],
  });
  return NextResponse.json(parseProduct(page));
}
