import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseExpense } from "@/lib/notion";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.expenses,
      sorts: [{ property: "日付", direction: "descending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...res.results.filter((r: any) => r.properties));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return NextResponse.json(all.map(parseExpense));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const page = await notion.pages.create({
    parent: { data_source_id: DS.expenses, type: "data_source_id" },
    properties: {
      件名: { title: [{ text: { content: body.件名 ?? "" } }] },
      日付: { date: { start: body.日付 } },
      金額: { number: body.金額 ?? 0 },
      カテゴリ: { select: { name: body.カテゴリ ?? "その他" } },
      備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
    } as Parameters<typeof notion.pages.create>[0]["properties"],
  });
  return NextResponse.json(parseExpense(page));
}
