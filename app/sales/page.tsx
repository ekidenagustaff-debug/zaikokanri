"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ResponsiveTable from "@/components/ResponsiveTable";
import type { Product, SaleRecord } from "@/lib/notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"];
const PRICE_TYPES = ["通常価格", "関係者割引", "陸上部卸値", "購買会卸値"];

function priceForType(product: Product, type: string): number | null {
  if (type === "通常価格") return product.通常価格;
  if (type === "関係者割引") return product.関係者価格;
  if (type === "陸上部卸値") return product.陸上部卸値;
  if (type === "購買会卸値") return product.購買会卸値;
  return null;
}

type SortKey = "date" | "amount" | "product";
type SortOrder = "asc" | "desc";

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    商品PageId: "",
    日付: new Date().toISOString().slice(0, 10),
    販売数: 1,
    価格種別: "通常価格",
    販売拠点: "水上村",
    備考: "",
  });
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    fetchAll();
  }, []);

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

  const filteredAndSorted = sales
    .filter((s) => {
      const keyword = searchKeyword.toLowerCase();
      return (
        s.商品名.toLowerCase().includes(keyword) ||
        s.販売拠点.toLowerCase().includes(keyword) ||
        s.備考.toLowerCase().includes(keyword)
      );
    })
    .sort((a, b) => {
      let aVal: string | number, bVal: string | number;

      if (sortKey === "date") {
        aVal = a.日付;
        bVal = b.日付;
      } else if (sortKey === "amount") {
        aVal = a.販売額 ?? 0;
        bVal = b.販売額 ?? 0;
      } else {
        aVal = a.商品名;
        bVal = b.商品名;
      }

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

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

  return (
    <Shell>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">💰 販売記録</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            ＋ 販売を記録
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">検索</label>
                <input
                  type="text"
                  placeholder="商品名、拠点、備考で検索..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ソート項目</label>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">日付</option>
                    <option value="amount">販売額</option>
                    <option value="product">商品名</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">並び順</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">新しい順</option>
                    <option value="asc">古い順</option>
                  </select>
                </div>
              </div>
            </div>

            <ResponsiveTable
              columns={[
                { key: "date", label: "日付" },
                { key: "product", label: "商品" },
                { key: "qty", label: "販売数", className: "text-center" },
                { key: "priceType", label: "価格種別" },
                { key: "location", label: "拠点" },
                { key: "amount", label: "販売額", className: "text-right" },
                { key: "notes", label: "備考" },
              ]}
              rows={filteredAndSorted.map((s) => ({
                date: s.日付,
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
                location: s.販売拠点,
                amount: s.販売額 != null ? `¥${s.販売額.toLocaleString()}` : "-",
                notes: s.備考,
              }))}
            />
            {filteredAndSorted.length === 0 && searchKeyword && (
              <div className="text-center py-8 text-gray-400 text-sm">
                「{searchKeyword}」に一致する販売記録がありません
              </div>
            )}
          </>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">販売を記録</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                <Field label="日付">
                  <input
                    type="date"
                    value={form.日付}
                    onChange={(e) => setForm({ ...form, 日付: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="商品 *">
                  <select
                    value={form.商品PageId}
                    onChange={(e) => setForm({ ...form, 商品PageId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">選択してください</option>
                    {products.map((p) => (
                      <option key={p.pageId} value={p.pageId}>
                        {p.品名}{p.サイズ ? ` ${p.サイズ}` : ""}{p.カラー ? ` (${p.カラー})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="価格種別">
                    <select
                      value={form.価格種別}
                      onChange={(e) => setForm({ ...form, 価格種別: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {PRICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="販売拠点">
                    <select
                      value={form.販売拠点}
                      onChange={(e) => setForm({ ...form, 販売拠点: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="販売数">
                  <input
                    type="number"
                    min={1}
                    value={form.販売数}
                    onChange={(e) => setForm({ ...form, 販売数: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                {unitPrice != null && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <span className="text-gray-500">単価: </span>
                    <span className="font-medium">¥{unitPrice.toLocaleString()}</span>
                    <span className="text-gray-500 ml-4">合計: </span>
                    <span className="font-bold text-blue-700">¥{販売額?.toLocaleString()}</span>
                  </div>
                )}
                <Field label="備考">
                  <input
                    type="text"
                    value={form.備考}
                    onChange={(e) => setForm({ ...form, 備考: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <button
                  onClick={save}
                  disabled={saving || !form.商品PageId}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
