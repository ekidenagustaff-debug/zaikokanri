"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import type { InventoryItem, Product } from "@/lib/notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<InventoryItem & { 商品PageId: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [inv, prod] = await Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setItems(inv);
    setProducts(prod);
    setLoading(false);
  }

  function startEdit(item: InventoryItem) {
    setEditing(item);
    setForm({ ...item, 商品PageId: item.商品PageId ?? undefined });
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setForm({ 在庫数: 0 });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/inventory/${editing.pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(null);
    fetchAll();
  }

  async function saveAdd() {
    setSaving(true);
    // Auto-fill 商品名 from selected product
    const prod = products.find((p) => p.pageId === form.商品PageId);
    const 商品名 = prod ? `${prod.品名}${prod.サイズ ? ` ${prod.サイズ}` : ""}${prod.カラー ? ` (${prod.カラー})` : ""}` : (form.商品名 ?? "");
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, 商品名 }),
    });
    setSaving(false);
    setAdding(false);
    fetchAll();
  }

  // Group items by product
  const productMap: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    const key = item.商品名 || item.商品PageId || "不明";
    if (!productMap[key]) productMap[key] = [];
    productMap[key].push(item);
  }

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">📦 在庫（拠点別）</h1>
          <button
            onClick={startAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            ＋ 在庫行を追加
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="text-left px-4 py-3">商品名</th>
                  {LOCATIONS.map((l) => (
                    <th key={l} className="text-center px-3 py-3 w-24">{l}</th>
                  ))}
                  <th className="text-center px-3 py-3 w-16">合計</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(productMap).map(([name, rows]) => {
                  const byLocation: Record<string, InventoryItem> = {};
                  for (const row of rows) byLocation[row.拠点] = row;
                  const total = rows.reduce((s, r) => s + (r.在庫数 ?? 0), 0);
                  return (
                    <tr key={name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{name}</td>
                      {LOCATIONS.map((loc) => {
                        const row = byLocation[loc];
                        return (
                          <td key={loc} className="px-3 py-3 text-center">
                            {row ? (
                              <button
                                onClick={() => startEdit(row)}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                {row.在庫数 ?? "-"}
                              </button>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center font-bold text-gray-700">{total}</td>
                      <td />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <Modal title="在庫数を編集" onClose={() => setEditing(null)}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">商品名</label>
                <p className="font-medium">{editing.商品名} / {editing.拠点}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">在庫数</label>
                <input
                  type="number"
                  value={form.在庫数 ?? ""}
                  onChange={(e) => setForm({ ...form, 在庫数: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">備考</label>
                <input
                  type="text"
                  value={form.備考 ?? ""}
                  onChange={(e) => setForm({ ...form, 備考: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </Modal>
        )}

        {/* Add modal */}
        {adding && (
          <Modal title="在庫行を追加" onClose={() => setAdding(false)}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">商品</label>
                <select
                  value={form.商品PageId ?? ""}
                  onChange={(e) => setForm({ ...form, 商品PageId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">選択してください</option>
                  {products.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {p.品名}{p.サイズ ? ` ${p.サイズ}` : ""}{p.カラー ? ` (${p.カラー})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">拠点</label>
                <select
                  value={form.拠点 ?? ""}
                  onChange={(e) => setForm({ ...form, 拠点: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">選択してください</option>
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">在庫数</label>
                <input
                  type="number"
                  value={form.在庫数 ?? ""}
                  onChange={(e) => setForm({ ...form, 在庫数: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <button
                onClick={saveAdd}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? "追加中..." : "追加"}
              </button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
