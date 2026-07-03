"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import ResponsiveTable from "@/components/ResponsiveTable";
import type { Product, SaleRecord } from "@/lib/notion";
import type { WixOrderRow } from "@/app/api/wix/orders/route";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"];
const PRICE_TYPES = ["通常価格", "関係者割引", "陸上部卸値", "購買会卸値", "プレゼント"];
const STATUS_COLOR: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  NOT_PAID: "bg-red-100 text-red-700",
  FULLY_REFUNDED: "bg-gray-100 text-gray-600",
  PARTIALLY_REFUNDED: "bg-yellow-100 text-yellow-700",
  PENDING: "bg-blue-100 text-blue-700",
};
const STATUS_LABEL: Record<string, string> = {
  PAID: "支払済", NOT_PAID: "未払い", FULLY_REFUNDED: "返金済",
  PARTIALLY_REFUNDED: "一部返金", PENDING: "保留中",
};

function priceForType(product: Product, type: string): number | null {
  if (type === "通常価格") return product.通常価格;
  if (type === "関係者割引") return product.関係者価格;
  if (type === "陸上部卸値") return product.陸上部卸値;
  if (type === "購買会卸値") return product.購買会卸値;
  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense>
      <SalesPageInner />
    </Suspense>
  );
}

function SalesPageInner() {
  const searchParams = useSearchParams();
  const filterProductId = searchParams.get("productId");
  const filterName = searchParams.get("name");
  const filterDate = searchParams.get("date");
  const filterLoc = searchParams.get("loc");
  const hasLinkFilter = Boolean(filterProductId || filterDate || filterLoc);

  const [tab, setTab] = useState<"manual" | "wix">("manual");

  // 販売記録
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    商品PageId: "", 日付: new Date().toISOString().slice(0, 10),
    販売数: 1, 価格種別: "通常価格", 販売拠点: "水上村", 備考: "",
  });
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  // Wix受注
  const today = new Date().toISOString().slice(0, 10);
  const [wixStart, setWixStart] = useState(today);
  const [wixEnd, setWixEnd] = useState(today);
  const [wixOrders, setWixOrders] = useState<WixOrderRow[]>([]);
  const [wixLoading, setWixLoading] = useState(false);
  const [wixFetched, setWixFetched] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [s, p] = await Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setSales(s);
    setProducts(p);
    setLoading(false);
  }

  const selectedProduct = products.find((p) => p.pageId === form.商品PageId);
  const unitPrice = selectedProduct ? priceForType(selectedProduct, form.価格種別) : null;
  const 販売額 = unitPrice != null ? unitPrice * form.販売数 : null;

  const filtered = sales
    .filter((s) => {
      if (filterProductId) {
        // 商品リレーションが未設定の古いレコードも拾えるよう、商品名の完全一致もOKとする
        const matchesById = s.商品PageId === filterProductId;
        const matchesByName = filterName != null && s.商品名 === filterName;
        if (!matchesById && !matchesByName) return false;
      }
      if (filterDate && s.日付 !== filterDate) return false;
      if (filterLoc && s.販売拠点 !== filterLoc) return false;
      const kw = searchKeyword.toLowerCase();
      return s.商品名.toLowerCase().includes(kw) || s.販売拠点.toLowerCase().includes(kw) || s.備考.toLowerCase().includes(kw);
    })
    .sort((a, b) => (b.日付 ?? "").localeCompare(a.日付 ?? ""));

  async function save() {
    if (!form.商品PageId) return;
    setSaving(true);
    const prod = products.find((p) => p.pageId === form.商品PageId);
    const 商品名 = prod ? `${prod.品名}${prod.サイズ ? ` ${prod.サイズ}` : ""}${prod.カラー ? ` (${prod.カラー})` : ""}` : "";
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, 商品名, 販売額 }),
    });
    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function fetchWixOrders() {
    setWixLoading(true);
    setImportResult(null);
    const res = await fetch(`/api/wix/orders?start=${wixStart}&end=${wixEnd}`);
    setWixOrders(await res.json());
    setWixFetched(true);
    setWixLoading(false);
  }

  async function importToNotion() {
    setImporting(true);
    setImportResult(null);
    const res = await fetch("/api/wix/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wixOrders),
    });
    setImportResult(await res.json());
    setImporting(false);
    fetchAll();
  }

  const wixProductTotal = wixOrders.filter((r) => !r.isShipping).reduce((s, r) => s + r.price * r.quantity, 0);
  const wixShippingTotal = wixOrders.filter((r) => r.isShipping).reduce((s, r) => s + r.price, 0);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">販売記録</h1>
        {tab === "manual" && (
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl font-medium transition">
            ＋ 販売を記録
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab("manual")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "manual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          販売一覧
        </button>
        <button onClick={() => setTab("wix")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "wix" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Wix受注
        </button>
      </div>

      {tab === "manual" && (
        <>
          {loading ? <p className="text-slate-400 text-sm">読み込み中...</p> : (
            <>
              {hasLinkFilter && (
                <div className="bg-blue-50 text-blue-800 rounded-xl px-4 py-3 mb-4 text-sm flex items-center justify-between gap-3">
                  <span>
                    絞り込み中
                    {filterDate ? `：${filterDate}` : ""}
                    {filterLoc ? `・${filterLoc}` : ""}
                    {filterProductId ? "・指定の商品" : ""}
                  </span>
                  <Link href="/sales" className="text-xs font-medium underline hover:no-underline shrink-0">
                    絞り込みを解除
                  </Link>
                </div>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
                <input
                  type="text"
                  placeholder="商品名・拠点・備考で検索..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <ResponsiveTable
                columns={[
                  { key: "date", label: "日付" },
                  { key: "product", label: "商品" },
                  { key: "qty", label: "数量", className: "text-center" },
                  { key: "priceType", label: "価格種別" },
                  { key: "location", label: "拠点" },
                  { key: "amount", label: "販売額", className: "text-right" },
                  { key: "notes", label: "備考" },
                ]}
                rows={filtered.map((s) => ({
                  date: <span className="text-xs text-slate-400">{s.日付}</span>,
                  product: s.商品名,
                  qty: s.販売数,
                  priceType: (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      s.価格種別 === "通常価格" ? "bg-green-100 text-green-700" :
                      s.価格種別 === "関係者割引" ? "bg-blue-100 text-blue-700" :
                      s.価格種別 === "陸上部卸値" ? "bg-orange-100 text-orange-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>{s.価格種別}</span>
                  ),
                  location: <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s.販売拠点}</span>,
                  amount: s.販売額 != null ? `¥${s.販売額.toLocaleString()}` : "-",
                  notes: <span className="text-xs text-slate-400">{s.備考}</span>,
                }))}
              />
            </>
          )}
        </>
      )}

      {tab === "wix" && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">開始日</label>
              <input type="date" value={wixStart} onChange={(e) => setWixStart(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">終了日</label>
              <input type="date" value={wixEnd} onChange={(e) => setWixEnd(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <button onClick={fetchWixOrders} disabled={wixLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
              {wixLoading ? "取得中..." : "取得"}
            </button>
            {wixFetched && wixOrders.length > 0 && (
              <button onClick={importToNotion} disabled={importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                {importing ? "取り込み中..." : "販売記録に取り込む"}
              </button>
            )}
            {wixFetched && (
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">{wixOrders.filter((r) => !r.isShipping).length} 件（送料 ¥{wixShippingTotal.toLocaleString()}）</p>
                <p className="font-bold text-slate-800">合計 ¥{(wixProductTotal + wixShippingTotal).toLocaleString()}</p>
              </div>
            )}
          </div>

          {importResult && (
            <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${importResult.added > 0 ? "bg-green-50 text-green-800" : "bg-slate-50 text-slate-600"}`}>
              ✅ {importResult.added} 件追加、{importResult.skipped} 件はスキップ済み
            </div>
          )}

          {wixFetched && (
            <ResponsiveTable
              columns={[
                { key: "orderNumber", label: "注文番号" },
                { key: "date", label: "日付" },
                { key: "customerName", label: "顧客名" },
                { key: "itemName", label: "商品" },
                { key: "size", label: "サイズ" },
                { key: "quantity", label: "数量", className: "text-center" },
                { key: "price", label: "単価", className: "text-right" },
                { key: "paymentStatus", label: "支払状況" },
              ]}
              rows={wixOrders.map((row) => ({
                orderNumber: <span className="font-mono text-xs text-slate-400">{row.orderNumber}</span>,
                date: <span className="text-xs text-slate-400">{row.orderDate}</span>,
                customerName: row.customerName,
                itemName: row.isShipping
                  ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">送料</span>
                  : row.itemName,
                size: row.size || "-",
                quantity: row.isShipping ? "-" : row.quantity,
                price: `¥${row.price.toLocaleString()}`,
                paymentStatus: (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[row.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABEL[row.paymentStatus] ?? row.paymentStatus}
                  </span>
                ),
              }))}
            />
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">販売を記録</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <Field label="日付">
                <input type="date" value={form.日付}
                  onChange={(e) => setForm({ ...form, 日付: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="商品 *">
                <select value={form.商品PageId}
                  onChange={(e) => setForm({ ...form, 商品PageId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">選択してください</option>
                  {products.filter(p => !p.アーカイブ).map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {p.品名}{p.サイズ ? ` ${p.サイズ}` : ""}{p.カラー ? ` (${p.カラー})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="価格種別">
                  <select value={form.価格種別}
                    onChange={(e) => setForm({ ...form, 価格種別: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {PRICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="販売拠点">
                  <select value={form.販売拠点}
                    onChange={(e) => setForm({ ...form, 販売拠点: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="販売数">
                <input type="number" min={1} value={form.販売数}
                  onChange={(e) => setForm({ ...form, 販売数: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              {unitPrice != null && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-slate-400">単価 ¥{unitPrice.toLocaleString()}</span>
                  <span className="font-bold text-blue-700">合計 ¥{販売額?.toLocaleString()}</span>
                </div>
              )}
              <Field label="備考">
                <input type="text" value={form.備考}
                  onChange={(e) => setForm({ ...form, 備考: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <button onClick={save} disabled={saving || !form.商品PageId}
                className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 font-semibold">
                {saving ? "保存中..." : "記録する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
