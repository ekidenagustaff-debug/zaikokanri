import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseSale } from "@/lib/notion";

export type ImportRow = {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  itemName: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  paymentStatus: string;
};

async function getImportedOrderNumbers(): Promise<Set<string>> {
  const res = await notion.dataSources.query({
    data_source_id: DS.sales,
    page_size: 100,
  });
  const imported = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.results.filter((r: any) => r.properties).forEach((r: any) => {
    const sale = parseSale(r);
    const match = sale.備考.match(/\[Wix#(\d+)\]/);
    if (match) imported.add(match[1]);
  });
  return imported;
}

export async function POST(req: NextRequest) {
  const rows: ImportRow[] = await req.json();

  const imported = await getImportedOrderNumbers();

  let added = 0;
  let skipped = 0;

  for (const row of rows) {
    if (imported.has(row.orderNumber)) {
      skipped++;
      continue;
    }

    const 商品名 = [row.itemName, row.size, row.color ? `(${row.color})` : ""]
      .filter(Boolean)
      .join(" ");

    await notion.pages.create({
      parent: { data_source_id: DS.sales, type: "data_source_id" },
      properties: {
        商品名: { title: [{ text: { content: 商品名 } }] },
        日付: { date: { start: row.orderDate } },
        販売数: { number: row.quantity },
        価格種別: { select: { name: "通常価格" } },
        販売拠点: { select: { name: "オンライン" } },
        販売額: { number: row.price * row.quantity },
        備考: { rich_text: [{ text: { content: `[Wix#${row.orderNumber}] ${row.customerName}` } }] },
      } as Parameters<typeof notion.pages.create>[0]["properties"],
    });

    imported.add(row.orderNumber);
    added++;
  }

  return NextResponse.json({ added, skipped });
}
