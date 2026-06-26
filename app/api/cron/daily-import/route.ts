import { NextRequest, NextResponse } from "next/server";
import { notion, DS, parseSale } from "@/lib/notion";
import { createProductIfNotExists } from "@/lib/product-sync";
import { logMovement } from "@/lib/inventory-sync";

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
    res.results.filter((r: any) => r.properties).forEach((r: any) => {
      const sale = parseSale(r);
      const match = sale.備考.match(/\[Wix#(\d+)\]/);
      if (match) imported.add(match[1]);
    });
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return imported;
}

export async function GET(req: NextRequest) {
  // Vercel Cron Jobs の認証チェック
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${(process.env.CRON_SECRET ?? "").trim()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 当日（JST）の日付を取得
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = jstNow.toISOString().slice(0, 10);

  const API_KEY = process.env.WIX_API_KEY!;
  const SITE_ID = process.env.WIX_SITE_ID!;
  const url = "https://www.wixapis.com/stores/v2/orders/query";

  const startTime = new Date(today).setHours(0, 0, 0, 0);
  const endTime = new Date(today).setHours(23, 59, 59, 999);

  // Wix注文を取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  const limit = 100;

  for (let i = 0; i < 10; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_KEY,
        "wix-site-id": SITE_ID,
      },
      body: JSON.stringify({ query: { paging: { limit, offset: i * limit } } }),
    });
    const data = await res.json();
    const orders = data.orders || [];
    if (orders.length === 0) break;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orders.forEach((order: any) => {
      const orderTime = new Date(order.dateCreated).getTime();
      if (orderTime < startTime || orderTime > endTime) return;

      const orderDate = new Date(order.dateCreated).toISOString().slice(0, 10);
      const orderNumber = String(order.number);
      const buyer = order.buyerInfo || {};
      const billing = order.billingInfo?.address || {};
      const customerName = ((buyer.lastName || billing.lastName || "") + " " + (buyer.firstName || billing.firstName || "")).trim();

      if (order.lineItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        order.lineItems.forEach((item: any) => {
          let size = "", color = "";
          if (item.options) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            item.options.forEach((opt: any) => {
              const label = (opt.option || "").toLowerCase();
              if (label.includes("サイズ") || label.includes("size")) size = opt.selection || "";
              else if (label.includes("カラー") || label.includes("color") || label.includes("色")) color = opt.selection || "";
            });
          }
          rows.push({ orderNumber, orderDate, customerName, itemName: item.name, size, color, quantity: item.quantity, price: item.priceData?.price ?? 0, paymentStatus: order.paymentStatus, isShipping: false });
        });
      }

      const shipping = order.totals?.shipping ? Number(order.totals.shipping) : 0;
      if (shipping > 0) {
        rows.push({ orderNumber, orderDate, customerName, itemName: "送料", size: "", color: "", quantity: 1, price: shipping, paymentStatus: order.paymentStatus, isShipping: true });
      }
    });

    if (orders.length < limit) break;
  }

  // 重複チェック
  const imported = await getImportedOrderNumbers();
  let added = 0, skipped = 0;

  for (const row of rows) {
    if (imported.has(row.orderNumber)) {
      skipped++;
      continue;
    }

    if (row.isShipping) {
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
      const 商品名 = [row.itemName, row.size, row.color ? `(${row.color})` : ""].filter(Boolean).join(" ");
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
      await logMovement({
        商品名,
        商品PageId,
        日付: row.orderDate,
        移動数: row.quantity,
        移動元: "水上村",
        移動先: "顧客",
        種別: "Wix受注",
        備考: `[Wix#${row.orderNumber}] ${row.customerName}`,
      });
    }

    imported.add(row.orderNumber);
    added++;
  }

  console.log(`[cron/daily-import] ${today}: added=${added}, skipped=${skipped}`);
  return NextResponse.json({ date: today, added, skipped });
}
