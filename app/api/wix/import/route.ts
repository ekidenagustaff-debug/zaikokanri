import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseSale } from "@/lib/notion";
import { createProductIfNotExists } from "@/lib/product-sync";
import { decreaseInventory, logMovement } from "@/lib/inventory-sync";

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
  isShipping?: boolean;
};

async function getImportedOrderNumbers(): Promise<Set<string>> {
  const imported = new Set<string>();
  let cursor: string | undefined;

  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.sales,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.results
      .filter((r: any) => r.properties)
      .forEach((r: any) => {
        const sale = parseSale(r);
        const match = sale.備考.match(/\[Wix#(\d+)\]/);
        if (match) {
          const key = sale.商品名 === "送料" ? `${match[1]}-shipping` : match[1];
          imported.add(key);
        }
      });
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return imported;
}

export async function POST(req: NextRequest) {
  const rows: ImportRow[] = await req.json();

  const imported = await getImportedOrderNumbers();

  let added = 0;
  let skipped = 0;

  for (const row of rows) {
    const rowKey = row.isShipping ? `${row.orderNumber}-shipping` : row.orderNumber;
    if (imported.has(rowKey)) {
      skipped++;
      continue;
    }

    const 商品名 = row.isShipping
      ? "送料"
      : [row.itemName, row.size, row.color ? `(${row.color})` : ""].filter(Boolean).join(" ");

    if (row.isShipping) {
      // 送料は販売記録のみ登録（商品マスタ・在庫操作なし）
      await notion.pages.create({
        parent: { data_source_id: DS.sales, type: "data_source_id" },
        properties: {
          商品名: { title: [{ text: { content: "送料" } }] },
          日付: { date: { start: row.orderDate } },
          販売数: { number: 1 },
          価格種別: { select: { name: "通常価格" } },
          販売拠点: { select: { name: "水上村" } },
          販売額: { number: row.price },
          備考: { rich_text: [{ text: { content: `[Wix#${row.orderNumber}] ${row.customerName}` } }] },
        } as Parameters<typeof notion.pages.create>[0]["properties"],
      });
    } else {
      // 商品マスタに自動登録（存在しない場合）
      const 商品PageId = await createProductIfNotExists(商品名);

      await notion.pages.create({
        parent: { data_source_id: DS.sales, type: "data_source_id" },
        properties: {
          商品名: { title: [{ text: { content: 商品名 } }] },
          商品: { relation: [{ id: 商品PageId }] },
          日付: { date: { start: row.orderDate } },
          販売数: { number: row.quantity },
          価格種別: { select: { name: "通常価格" } },
          販売拠点: { select: { name: "水上村" } },
          販売額: { number: row.price * row.quantity },
          備考: { rich_text: [{ text: { content: `[Wix#${row.orderNumber}] ${row.customerName}` } }] },
        } as Parameters<typeof notion.pages.create>[0]["properties"],
      });

      // 在庫自動減算（水上村）+ 在庫移動ログ記録
      await Promise.all([
        decreaseInventory(商品PageId, "水上村", row.quantity, "Wix受注"),
        logMovement({
          商品名,
          商品PageId,
          日付: row.orderDate,
          移動数: row.quantity,
          移動元: "水上村",
          移動先: "顧客",
          種別: "Wix受注",
          備考: `[Wix#${row.orderNumber}] ${row.customerName}`,
        }),
      ]);
    }

    imported.add(rowKey);
    added++;
  }

  return NextResponse.json({ added, skipped });
}
