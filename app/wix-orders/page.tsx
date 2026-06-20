"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
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

  const total = orders.reduce((s, r) => s + r.price * r.quantity, 0);

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
            <p className="text-xs text-slate-400">{orders.length} 行</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium">注文番号</th>
                <th className="text-left px-3 py-3 font-medium">日付</th>
                <th className="text-left px-3 py-3 font-medium">顧客名</th>
                <th className="text-left px-3 py-3 font-medium">商品</th>
                <th className="text-left px-3 py-3 font-medium">サイズ</th>
                <th className="text-left px-3 py-3 font-medium">カラー</th>
                <th className="text-center px-3 py-3 font-medium">数量</th>
                <th className="text-right px-3 py-3 font-medium">単価</th>
                <th className="text-right px-3 py-3 font-medium">小計</th>
                <th className="text-left px-3 py-3 font-medium">支払状況</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-2 font-mono text-slate-400 text-xs">{row.orderNumber}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{row.orderDate}</td>
                  <td className="px-3 py-2 text-slate-700">{row.customerName}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{row.itemName}</td>
                  <td className="px-3 py-2 text-slate-500">{row.size || "-"}</td>
                  <td className="px-3 py-2 text-slate-500">{row.color || "-"}</td>
                  <td className="px-3 py-2 text-center">{row.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-600">¥{row.price.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-semibold">¥{(row.price * row.quantity).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[row.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[row.paymentStatus] ?? row.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
