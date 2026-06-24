import { NextResponse } from "next/server";

export async function GET() {
  const API_KEY = process.env.WIX_API_KEY!;
  const SITE_ID = process.env.WIX_SITE_ID!;
  const url = "https://www.wixapis.com/stores/v2/orders/query";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refunded: any[] = [];
  const limit = 100;

  for (let i = 0; i < 20; i++) {
    const offset = i * limit;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_KEY,
        "wix-site-id": SITE_ID,
      },
      body: JSON.stringify({
        query: {
          filter: JSON.stringify({ paymentStatus: "FULLY_REFUNDED" }),
          paging: { limit, offset },
        },
      }),
    });

    const data = await res.json();
    const orders = data.orders || [];
    if (orders.length === 0) break;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orders.forEach((order: any) => {
      const buyer = order.buyerInfo || {};
      const billing = order.billingInfo?.address || {};
      const customerName =
        ((buyer.lastName || billing.lastName || "") + " " + (buyer.firstName || billing.firstName || "")).trim();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (order.lineItems || []).map((item: any) => item.name).join(", ");
      refunded.push({
        orderNumber: String(order.number),
        orderDate: new Date(order.dateCreated).toISOString().slice(0, 10),
        customerName,
        items,
        total: order.totals?.total ?? 0,
      });
    });

    if (orders.length < limit) break;
  }

  return NextResponse.json(refunded);
}
