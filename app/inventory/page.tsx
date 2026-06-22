"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import type { InventoryItem, Product } from "@/lib/notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会", "オンライン"] as const;
type Location = (typeof LOCATIONS)[number];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<InventoryItem>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

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
    setForm({ ...item });
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    const empty: Partial<InventoryItem> = { 商品名: "", 備考: "" };
    for (const loc of LOCATIONS) empty[loc] = 0;
    setForm(empty);
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
    const prod = products.find((p) => p.pageId === form.商品PageId);
    const 商品名 = prod
      ? `${prod.品名}${prod.サイズ ? ` ${prod.サイズ}` : ""}${prod.カラー ? ` (${prod.カラー})` : ""}`
      : (form.商品名 ?? "");
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, 商品名 }),
    });
    setSaving(false);
    setAdding(false);
    fetchAll();
  }

  const totalByLoc = LOCATIONS.reduce((acc, loc) => {
    acc[loc] = items.reduce((s, r) => s + (r[loc] ?? 0), 0);
    return acc;
  }, {} as Record<Location, number>);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">在庫</h1>
        <button
          onClick={startAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          ＋ 追加
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">読み込み中...</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="text-left px-4 py-3">商品名</th>
                  {LOCATIONS.map((l) => (
                    <th key={l} className="text-center px-3 py-3 w-24">{l}</th>
                  ))}
                  <th className="text-center px-3 py-3 w-16">合計</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const total = LOCATIONS.reduce((s, loc) => s + (item[loc] ?? 0), 0);
                  return (
                    <tr key={item.pageId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.商品名}</td>
                      {LOCATIONS.map((loc) => (
                        <td key={loc} className="px-3 py-3 text-center text-slate-700">
                          {item[loc] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-slate-700">{total}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          編集
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr className="bg-slate-50 font-semibold text-slate-600">
                  <td className="px-4 py-3">合計</td>
                  {LOCATIONS.map((loc) => (
                    <td key={loc} className="px-3 py-3 text-center">{totalByLoc[loc]}</td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    {LOCATIONS.reduce((s, loc) => s + totalByLoc[loc], 0)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {items.map((item) => {
              const total = LOCATIONS.reduce((s, loc) => s + (item[loc] ?? 0), 0);
              return (
                <div key={item.pageId} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-semibold text-slate-800 text-sm">{item.商品名}</p>
                    <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:underline ml-2 shrink-0">編集</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {LOCATIONS.map((loc) => (
                      <div key={loc} className="text-center">
                        <p className="text-xs text-slate-400">{loc}</p>
                        <p className="font-bold text-slate-700">{item[loc] ?? 0}</p>
                      </div>
                    ))}
                    <div className="text-center">
                      <p className="text-xs text-slate-400">合計</p>
                      <p className="font-bold text-slate-800">{total}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title="在庫数を編集" onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <p className="font-medium text-slate-800">{editing.商品名}</p>
            {LOCATIONS.map((loc) => (
              <div key={loc}>
                <label className="block text-xs text-slate-500 mb-1">{loc}</label>
                <input
                  type="number"
                  min={0}
                  value={form[loc] ?? 0}
                  onChange={(e) => setForm({ ...form, [loc]: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-500 mb-1">備考</label>
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
        <Modal title="在庫を追加" onClose={() => setAdding(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">商品</label>
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
            {LOCATIONS.map((loc) => (
              <div key={loc}>
                <label className="block text-xs text-slate-500 mb-1">{loc}</label>
                <input
                  type="number"
                  min={0}
                  value={form[loc] ?? 0}
                  onChange={(e) => setForm({ ...form, [loc]: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            ))}
            <button
              onClick={saveAdd}
              disabled={saving || !form.商品PageId}
              className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? "追加中..." : "追加"}
            </button>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
