"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import ResponsiveTable from "@/components/ResponsiveTable";
import type { WixOrderRow } from "@/app/api/wix/orders/route";

const STATUS_LABEL: Record<string, string> = {
  PAID: "支払済",
  NOT_PAID: "未払い",
  FULLY_REFUNDED: "返金済",
  PARTIALLY_REFUNDED: "一部返金",
  PENDING: "保留中",
};

const STATUS_COLOR: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  NOT_PAID: "bg-red-100 text-red-700",
  FULLY_REFUNDED: "bg-gray-100 text-gray-600",
  PARTIALLY_REFUNDED: "bg-yellow-100 text-yellow-700",
  PENDING: "bg-blue-100 text-blue-700",
};

export default function WixOrdersPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [orders, setOrders] = useState<WixOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [fetched, setFetched] = useState(false);

  async function fetchOrders() {
    setLoading(true);
    setImportResult(null);
    const res = await fetch(`/api/wix/orders?start=${start}&end=${end}`);
    const data = await res.json();
    setOrders(data);
    setFetched(true);
    setLoading(false);
  }

  async function importToNotion() {
    setImporting(true);
    setImportResult(null);
    const res = await fetch("/api/wix/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orders),
    });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
  }

  const productTotal = orders.filter((r) => !r.isShipping).reduce((s, r) => s + r.price * r.quantity, 0);
  const shippingTotal = orders.filter((r) => r.isShipping).reduce((s, r) => s + r.price, 0);
  const total = productTotal + shippingTotal;

  return (
    <Shell>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Wix 受注リスト</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">開始日</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">終了日</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <button onClick={fetchOrders} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
          {loading ? "取得中..." : "取得"}
        </button>
        {fetched && orders.length > 0 && (
          <button onClick={importToNotion} disabled={importing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
            {importing ? "インポート中..." : "📥 販売記録に取り込む"}
          </button>
        )}
        {fetched && (
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">{orders.filter((r) => !r.isShipping).length} 件（送料 ¥{shippingTotal.toLocaleString()}）</p>
            <p className="font-bold text-slate-800">合計 ¥{total.toLocaleString()}</p>
          </div>
        )}
      </div>

      {importResult && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${importResult.added > 0 ? "bg-green-50 text-green-800" : "bg-slate-50 text-slate-600"}`}>
          ✅ {importResult.added} 件追加、{importResult.skipped} 件はすでに登録済みのためスキップしました
        </div>
      )}

      {fetched && (
        <ResponsiveTable
          columns={[
            { key: "orderNumber", label: "注文番号" },
            { key: "date", label: "日付" },
            { key: "customerName", label: "顧客名" },
            { key: "itemName", label: "商品" },
            { key: "size", label: "サイズ" },
            { key: "color", label: "カラー" },
            { key: "quantity", label: "数量", className: "text-center" },
            { key: "price", label: "単価", className: "text-right" },
            { key: "subtotal", label: "小計", className: "text-right" },
            { key: "paymentStatus", label: "支払状況" },
          ]}
          rows={orders.map((row) => ({
            orderNumber: <span className="font-mono text-xs text-slate-400">{row.orderNumber}</span>,
            date: <span className="text-xs text-slate-400">{row.orderDate}</span>,
            customerName: row.customerName,
            itemName: row.isShipping
              ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">送料</span>
              : row.itemName,
            size: row.size || "-",
            color: row.color || "-",
            quantity: row.isShipping ? "-" : row.quantity,
            price: `¥${row.price.toLocaleString()}`,
            subtotal: `¥${(row.price * row.quantity).toLocaleString()}`,
            paymentStatus: (
              <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[row.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABEL[row.paymentStatus] ?? row.paymentStatus}
              </span>
            ),
          }))}
        />
      )}
    </Shell>
  );
}
