import { NextRequest, NextResponse } from "next/server";

export type WixOrderRow = {
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "start と end パラメータが必要です" }, { status: 400 });
  }

  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  const API_KEY = process.env.WIX_API_KEY!;
  const SITE_ID = process.env.WIX_SITE_ID!;
  const url = "https://www.wixapis.com/stores/v2/orders/query";

  const allResults: WixOrderRow[] = [];
  const limit = 100;

  for (let i = 0; i < 10; i++) {
    const offset = i * limit;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_KEY,
        "wix-site-id": SITE_ID,
      },
      body: JSON.stringify({ query: { paging: { limit, offset } } }),
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
      const customerName =
        (buyer.lastName || billing.lastName || "") +
        " " +
        (buyer.firstName || billing.firstName || "");

      if (order.lineItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        order.lineItems.forEach((item: any) => {
          let size = "";
          let color = "";
          if (item.options) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            item.options.forEach((opt: any) => {
              const label = (opt.option || "").toLowerCase();
              const val = opt.selection || "";
              if (label.includes("サイズ") || label.includes("size")) size = val;
              else if (label.includes("カラー") || label.includes("color") || label.includes("色")) color = val;
            });
          }
          allResults.push({
            orderNumber,
            orderDate,
            customerName: customerName.trim(),
            itemName: item.name,
            size,
            color,
            quantity: item.quantity,
            price: item.priceData?.price ?? 0,
            paymentStatus: order.paymentStatus,
          });
        });
      }

      const shipping = order.totals?.shipping ? Number(order.totals.shipping) : 0;
      allResults.push({
        orderNumber,
        orderDate,
        customerName: customerName.trim(),
        itemName: "送料",
        size: "",
        color: "",
        quantity: 1,
        price: shipping,
        paymentStatus: order.paymentStatus,
      });
    });

    if (orders.length < limit) break;
  }

  return NextResponse.json(allResults);
}
