"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ResponsiveTable from "@/components/ResponsiveTable";
import type { Product, SaleRecord } from "@/lib/notion";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-1">
      <div className={`w-8 h-1 rounded-full ${colors[color]} mb-2`} />
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"];
const PRICE_TYPES = ["通常価格", "関係者割引", "陸上部卸値", "購買会卸値"];

export default function DashboardPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [qForm, setQForm] = useState({ 商品PageId: "", 販売数: 1, 価格種別: "通常価格", 販売拠点: "水上村" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([s, inv, p]) => { setSales(s); setInventory(inv); setProducts(p); setLoading(false); });
  }, []);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlySales = sales.filter((s) => s.日付.startsWith(thisMonth));
  const monthlyRevenue = monthlySales.reduce((s, r) => s + (r.販売額 ?? 0), 0);
  const totalStock = inventory.reduce((s, r) => s + (r.水上村 ?? 0) + (r.町田寮 ?? 0) + (r.陸上部 ?? 0) + (r.購買会 ?? 0), 0);
  const locationTotals = LOCATIONS.map((loc) => ({
    loc,
    total: inventory.reduce((s, r) => s + ((r as unknown as Record<string, number | null>)[loc] ?? 0), 0),
  }));
  const totalRevenue = sales.reduce((s, r) => s + (r.販売額 ?? 0), 0);

  const selectedProduct = products.find((p) => p.pageId === qForm.商品PageId);
  const priceMap: Record<string, number | null> = {
    通常価格: selectedProduct?.通常価格 ?? null,
    関係者割引: selectedProduct?.関係者価格 ?? null,
    陸上部卸値: selectedProduct?.陸上部卸値 ?? null,
    購買会卸値: selectedProduct?.購買会卸値 ?? null,
  };
  const unitPrice = priceMap[qForm.価格種別] ?? null;
  const previewTotal = unitPrice != null ? unitPrice * qForm.販売数 : null;

  async function quickSave() {
    if (!qForm.商品PageId || !selectedProduct) return;
    setSaving(true);
    const 商品名 = selectedProduct.品名;
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...qForm, 商品名, 販売額: previewTotal, 日付: now.toISOString().slice(0, 10) }),
    });
    setSaving(false);
    setShowQuickSale(false);
    setQForm({ 商品PageId: "", 販売数: 1, 価格種別: "通常価格", 販売拠点: "水上村" });
    const s = await fetch("/api/sales").then((r) => r.json());
    setSales(s);
  }

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="text-sm text-slate-400 mt-0.5">{now.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <button
          onClick={() => setShowQuickSale(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow transition"
        >
          ＋ 販売を記録
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">読み込み中...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="今月の売上" value={`¥${monthlyRevenue.toLocaleString()}`} sub={`${monthlySales.length}件`} color="blue" />
            <StatCard label="累計売上" value={`¥${totalRevenue.toLocaleString()}`} sub={`全${sales.length}件`} color="violet" />
            <StatCard label="在庫総数" value={`${totalStock.toLocaleString()} 個`} sub={`${products.length}商品`} color="green" />
            <StatCard label="商品種類" value={`${products.length} 種`} color="amber" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">拠点別在庫数</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {locationTotals.map(({ loc, total }) => (
                <div key={loc} className="text-center bg-slate-50 rounded-xl py-3 px-2">
                  <p className="text-xs text-slate-500 mb-1">{loc}</p>
                  <p className="text-xl font-bold text-slate-800">{total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <ResponsiveTable
            title="最近の販売"
            link={{ label: "すべて見る", href: "/sales" }}
            columns={[
              { key: "date", label: "日付" },
              { key: "product", label: "商品" },
              { key: "location", label: "拠点" },
              { key: "qty", label: "数量" },
              { key: "amount", label: "販売額", className: "text-right" },
            ]}
            rows={sales.slice(0, 8).map((s) => ({
              date: s.日付,
              product: s.商品名,
              location: <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s.販売拠点}</span>,
              qty: s.販売数,
              amount: s.販売額 != null ? `¥${s.販売額.toLocaleString()}` : "-",
            }))}
          />
        </>
      )}

      {showQuickSale && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">販売を記録</h2>
              <button onClick={() => setShowQuickSale(false)} className="text-slate-300 hover:text-slate-500 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">商品</label>
                <select
                  value={qForm.商品PageId}
                  onChange={(e) => setQForm({ ...qForm, 商品PageId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {products.map((p) => (
                    <option key={p.pageId} value={p.pageId}>{p.品名}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">価格種別</label>
                  <select
                    value={qForm.価格種別}
                    onChange={(e) => setQForm({ ...qForm, 価格種別: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">拠点</label>
                  <select
                    value={qForm.販売拠点}
                    onChange={(e) => setQForm({ ...qForm, 販売拠点: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">数量</label>
                <input
                  type="number" min={1} value={qForm.販売数}
                  onChange={(e) => setQForm({ ...qForm, 販売数: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {previewTotal != null && (
                <div className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs text-blue-400">単価 ¥{unitPrice?.toLocaleString()}</span>
                  <span className="font-bold text-blue-700 text-lg">¥{previewTotal.toLocaleString()}</span>
                </div>
              )}
              <button
                onClick={quickSave}
                disabled={saving || !qForm.商品PageId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-40"
              >
                {saving ? "保存中..." : "記録する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
