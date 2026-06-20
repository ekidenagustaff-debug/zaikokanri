"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import type { MovementRecord, Product } from "@/lib/notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"];

export default function MovementsPage() {
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    商品PageId: "",
    日付: new Date().toISOString().slice(0, 10),
    移動数: 1,
    移動元: "水上村",
    移動先: "陸上部",
    備考: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [m, p] = await Promise.all([
      fetch("/api/movements").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setMovements(m);
    setProducts(p);
    setLoading(false);
  }

  async function save() {
    if (!form.商品PageId) return;
    setSaving(true);
    const prod = products.find((p) => p.pageId === form.商品PageId);
    const 商品名 = prod ? `${prod.品名}${prod.サイズ ? ` ${prod.サイズ}` : ""}${prod.カラー ? ` (${prod.カラー})` : ""}` : "";
    await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, 商品名 }),
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
          <h1 className="text-xl font-bold text-gray-800">🔄 在庫移動</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            ＋ 移動を記録
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
                  <th className="text-center px-3 py-3">移動数</th>
                  <th className="text-left px-3 py-3">移動元</th>
                  <th className="px-3 py-3"></th>
                  <th className="text-left px-3 py-3">移動先</th>
                  <th className="text-left px-3 py-3">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m) => (
                  <tr key={m.pageId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{m.日付}</td>
                    <td className="px-4 py-3 font-medium">{m.商品名}</td>
                    <td className="px-3 py-3 text-center font-bold">{m.移動数}</td>
                    <td className="px-3 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{m.移動元}</span>
                    </td>
                    <td className="px-1 py-3 text-gray-400 text-center">→</td>
                    <td className="px-3 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{m.移動先}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{m.備考}</td>
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
                <h2 className="font-bold text-lg">在庫移動を記録</h2>
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
                <Field label="移動数">
                  <input
                    type="number"
                    min={1}
                    value={form.移動数}
                    onChange={(e) => setForm({ ...form, 移動数: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="移動元">
                    <select
                      value={form.移動元}
                      onChange={(e) => setForm({ ...form, 移動元: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="移動先">
                    <select
                      value={form.移動先}
                      onChange={(e) => setForm({ ...form, 移動先: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
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
