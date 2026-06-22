"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import type { Product } from "@/lib/notion";

const emptyForm = (): Partial<Product> => ({
  品名: "",
  仕入れ数: undefined,
  通常価格: undefined,
  関係者価格: undefined,
  陸上部卸値: undefined,
  購買会卸値: undefined,
  原価: undefined,
  仕入れ額: undefined,
  備考: "",
  アーカイブ: false,
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

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

  async function toggleArchive(p: Product) {
    await fetch(`/api/products/${p.pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, アーカイブ: !p.アーカイブ }),
    });
    fetchProducts();
  }

  function numField(key: keyof Product) {
    return (
      <input
        type="number"
        value={(form[key] as number) ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value === "" ? undefined : Number(e.target.value) })}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
    );
  }

  const active = products.filter((p) => !p.アーカイブ);
  const archived = products.filter((p) => p.アーカイブ);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">商品マスタ</h1>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition">
          ＋ 商品を追加
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
                  <th className="text-left px-4 py-3">品名</th>
                  <th className="text-right px-3 py-3">通常価格</th>
                  <th className="text-right px-3 py-3">関係者価格</th>
                  <th className="text-right px-3 py-3">陸上部卸値</th>
                  <th className="text-right px-3 py-3">購買会卸値</th>
                  <th className="text-right px-3 py-3">原価</th>
                  <th className="text-right px-3 py-3">仕入れ数</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.map((p) => <ProductRow key={p.pageId} p={p} onEdit={openEdit} onToggleArchive={toggleArchive} />)}
                {archived.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={8} className="px-4 py-2 text-xs text-slate-400 bg-slate-50 font-medium">アーカイブ済み</td>
                    </tr>
                    {archived.map((p) => <ProductRow key={p.pageId} p={p} onEdit={openEdit} onToggleArchive={toggleArchive} archived />)}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {active.map((p) => <ProductCard key={p.pageId} p={p} onEdit={openEdit} onToggleArchive={toggleArchive} />)}
            {archived.length > 0 && (
              <>
                <p className="text-xs text-slate-400 font-medium px-1 mt-4">アーカイブ済み</p>
                {archived.map((p) => <ProductCard key={p.pageId} p={p} onEdit={openEdit} onToggleArchive={toggleArchive} archived />)}
              </>
            )}
          </div>
        </>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{modal === "add" ? "商品を追加" : "商品を編集"}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <Field label="品名 *">
                <input
                  type="text"
                  value={form.品名 ?? ""}
                  onChange={(e) => setForm({ ...form, 品名: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="アディダスパーカー M (グリーン)"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="通常価格（¥）">{numField("通常価格")}</Field>
                <Field label="関係者価格（¥）">{numField("関係者価格")}</Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="陸上部卸値（¥）">{numField("陸上部卸値")}</Field>
                <Field label="購買会卸値（¥）">{numField("購買会卸値")}</Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="原価（¥）">{numField("原価")}</Field>
                <Field label="仕入れ数">{numField("仕入れ数")}</Field>
              </div>
              <Field label="仕入れ額（¥）">{numField("仕入れ額")}</Field>
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
    </Shell>
  );
}

function yen(v: number | null | undefined) {
  return v != null ? `¥${v.toLocaleString()}` : "-";
}

function ProductRow({ p, onEdit, onToggleArchive, archived }: {
  p: Product;
  onEdit: (p: Product) => void;
  onToggleArchive: (p: Product) => void;
  archived?: boolean;
}) {
  return (
    <tr className={archived ? "opacity-40" : "hover:bg-slate-50"}>
      <td className="px-4 py-3 font-medium text-slate-800">{p.品名}</td>
      <td className="px-3 py-3 text-right text-slate-600">{yen(p.通常価格)}</td>
      <td className="px-3 py-3 text-right text-slate-600">{yen(p.関係者価格)}</td>
      <td className="px-3 py-3 text-right text-slate-600">{yen(p.陸上部卸値)}</td>
      <td className="px-3 py-3 text-right text-slate-600">{yen(p.購買会卸値)}</td>
      <td className="px-3 py-3 text-right text-slate-600">{yen(p.原価)}</td>
      <td className="px-3 py-3 text-right text-slate-600">{p.仕入れ数?.toLocaleString() ?? "-"}</td>
      <td className="px-3 py-3 text-right space-x-2">
        <button onClick={() => onEdit(p)} className="text-xs text-blue-500 hover:underline">編集</button>
        <button onClick={() => onToggleArchive(p)} className="text-xs text-slate-400 hover:underline">
          {archived ? "復元" : "アーカイブ"}
        </button>
      </td>
    </tr>
  );
}

function ProductCard({ p, onEdit, onToggleArchive, archived }: {
  p: Product;
  onEdit: (p: Product) => void;
  onToggleArchive: (p: Product) => void;
  archived?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 ${archived ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-slate-800 text-sm">{p.品名}</p>
        <div className="space-x-2 shrink-0 ml-2">
          <button onClick={() => onEdit(p)} className="text-xs text-blue-500 hover:underline">編集</button>
          <button onClick={() => onToggleArchive(p)} className="text-xs text-slate-400 hover:underline">
            {archived ? "復元" : "アーカイブ"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>通常価格: {yen(p.通常価格)}</span>
        <span>関係者価格: {yen(p.関係者価格)}</span>
        <span>陸上部卸値: {yen(p.陸上部卸値)}</span>
        <span>購買会卸値: {yen(p.購買会卸値)}</span>
        <span>原価: {yen(p.原価)}</span>
        <span>仕入れ数: {p.仕入れ数?.toLocaleString() ?? "-"}</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
