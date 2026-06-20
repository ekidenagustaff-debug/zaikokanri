"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import type { Product } from "@/lib/notion";

const COLORS = ["クリーム", "グリーン", "ブラック", "その他"];

const emptyForm = (): Partial<Product> => ({
  品名: "",
  サイズ: "",
  カラー: "",
  仕入れ数: undefined,
  通常価格: undefined,
  関係者価格: undefined,
  陸上部卸値: undefined,
  購買会卸値: undefined,
  原価: undefined,
  仕入れ額: undefined,
  備考: "",
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const data = await fetch("/api/products").then((r) => r.json());
    setProducts(data);
    setLoading(false);
  }

  function openAdd() {
    setForm(emptyForm());
    setSelected(null);
    setModal("add");
  }

  function openEdit(p: Product) {
    setForm({ ...p });
    setSelected(p);
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    if (modal === "add") {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else if (selected) {
      await fetch(`/api/products/${selected.pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setModal(null);
    fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm("この商品を削除しますか？")) return;
    setDeleting(id);
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleting(null);
    fetchProducts();
  }

  function numField(key: keyof Product) {
    return (
      <input
        type="number"
        value={form[key] as number ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value === "" ? undefined : Number(e.target.value) })}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
    );
  }

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">📋 商品マスタ</h1>
          <button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            ＋ 商品を追加
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="text-left px-4 py-3">品名</th>
                  <th className="text-left px-3 py-3">サイズ</th>
                  <th className="text-left px-3 py-3">カラー</th>
                  <th className="text-right px-3 py-3">仕入れ数</th>
                  <th className="text-right px-3 py-3">通常価格</th>
                  <th className="text-right px-3 py-3">関係者価格</th>
                  <th className="text-right px-3 py-3">原価</th>
                  <th className="text-right px-3 py-3">仕入れ額</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.pageId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.品名}</td>
                    <td className="px-3 py-3 text-gray-600">{p.サイズ || "-"}</td>
                    <td className="px-3 py-3 text-gray-600">{p.カラー || "-"}</td>
                    <td className="px-3 py-3 text-right">{p.仕入れ数?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3 text-right">¥{p.通常価格?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3 text-right">¥{p.関係者価格?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3 text-right">¥{p.原価?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3 text-right">¥{p.仕入れ額?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">編集</button>
                      <button
                        onClick={() => deleteProduct(p.pageId)}
                        disabled={deleting === p.pageId}
                        className="text-red-400 hover:underline text-xs disabled:opacity-50"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">{modal === "add" ? "商品を追加" : "商品を編集"}</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                <Field label="品名 *">
                  <input
                    type="text"
                    value={form.品名 ?? ""}
                    onChange={(e) => setForm({ ...form, 品名: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="サイズ">
                    <input
                      type="text"
                      value={form.サイズ ?? ""}
                      onChange={(e) => setForm({ ...form, サイズ: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="S, M, L, XL..."
                    />
                  </Field>
                  <Field label="カラー">
                    <select
                      value={form.カラー ?? ""}
                      onChange={(e) => setForm({ ...form, カラー: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">-</option>
                      {COLORS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="仕入れ数">{numField("仕入れ数")}</Field>
                  <Field label="仕入れ額（¥）">{numField("仕入れ額")}</Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="通常価格（¥）">{numField("通常価格")}</Field>
                  <Field label="関係者価格（¥）">{numField("関係者価格")}</Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="陸上部卸値（¥）">{numField("陸上部卸値")}</Field>
                  <Field label="購買会卸値（¥）">{numField("購買会卸値")}</Field>
                </div>
                <Field label="原価（¥）">{numField("原価")}</Field>
                <Field label="備考">
                  <input
                    type="text"
                    value={form.備考 ?? ""}
                    onChange={(e) => setForm({ ...form, 備考: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <button
                  onClick={save}
                  disabled={saving || !form.品名}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg mt-2 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
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
