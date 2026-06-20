"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
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
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">
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
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="text-left px-4 py-3">日付</th>
                  <th className="text-left px-4 py-3">商品</th>
                  <th className="text-center px-3 py-3">販売数</th>
                  <th className="text-left px-3 py-3">価格種別</th>
                  <th className="text-left px-3 py-3">拠点</th>
                  <th className="text-right px-3 py-3">販売額</th>
                  <th className="text-left px-3 py-3">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((s) => (
                  <tr key={s.pageId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{s.日付}</td>
                    <td className="px-4 py-3 font-medium">{s.商品名}</td>
                    <td className="px-3 py-3 text-center">{s.販売数}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        s.価格種別 === "通常価格" ? "bg-green-100 text-green-700" :
                        s.価格種別 === "関係者割引" ? "bg-blue-100 text-blue-700" :
                        s.価格種別 === "陸上部卸値" ? "bg-orange-100 text-orange-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>{s.価格種別}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{s.販売拠点}</td>
                    <td className="px-3 py-3 text-right font-medium">
                      {s.販売額 != null ? `¥${s.販売額.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-3 py-3 text-gray-500">{s.備考}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      </main>
    </div>
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
