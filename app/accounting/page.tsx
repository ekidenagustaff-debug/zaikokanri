"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ResponsiveTable from "@/components/ResponsiveTable";
import type { SaleRecord, Product, ExpenseRecord } from "@/lib/notion";

const CATEGORIES = ["仕入れ", "交通費", "消耗品", "人件費", "その他"] as const;
const CATEGORY_COLORS: Record<string, string> = {
  仕入れ: "bg-blue-100 text-blue-700",
  交通費: "bg-green-100 text-green-700",
  消耗品: "bg-orange-100 text-orange-700",
  人件費: "bg-purple-100 text-purple-700",
  その他: "bg-slate-100 text-slate-600",
};

const emptyForm = { 件名: "", 日付: new Date().toISOString().slice(0, 10), 金額: "", カテゴリ: "その他", 備考: "" };

export default function AccountingPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, p, e] = await Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/expenses").then((r) => r.json()),
    ]);
    setSales(s); setProducts(p); setExpenses(e); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalRevenue = sales.reduce((s, r) => s + (r.販売額 ?? 0), 0);
  const totalCost = products.reduce((s, p) => s + (p.仕入れ額 ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.金額 ?? 0), 0);
  const profit = totalRevenue - totalCost - totalExpenses;

  const byLocation: Record<string, number> = {};
  for (const s of sales) byLocation[s.販売拠点] = (byLocation[s.販売拠点] ?? 0) + (s.販売額 ?? 0);

  const byProduct: Record<string, { 通常: number; 関係者: number; 陸上部: number; 購買会: number; 合計: number }> = {};
  for (const s of sales) {
    const key = s.商品名;
    if (!byProduct[key]) byProduct[key] = { 通常: 0, 関係者: 0, 陸上部: 0, 購買会: 0, 合計: 0 };
    const amt = s.販売額 ?? 0;
    byProduct[key].合計 += amt;
    if (s.価格種別 === "通常価格") byProduct[key].通常 += amt;
    else if (s.価格種別 === "関係者割引") byProduct[key].関係者 += amt;
    else if (s.価格種別 === "陸上部卸値") byProduct[key].陸上部 += amt;
    else if (s.価格種別 === "購買会卸値") byProduct[key].購買会 += amt;
  }

  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.カテゴリ] = (byCategory[e.カテゴリ] ?? 0) + (e.金額 ?? 0);

  // 販売総数を商品PageId別に集計
  const soldByPageId: Record<string, number> = {};
  for (const s of sales) {
    if (s.商品PageId) soldByPageId[s.商品PageId] = (soldByPageId[s.商品PageId] ?? 0) + (s.販売数 ?? 0);
  }

  // 照合表（アーカイブ除外）
  const reconciliation = products
    .filter((p) => !p.アーカイブ)
    .map((p) => {
      const 在庫 = (p.水上村 ?? 0) + (p.町田寮 ?? 0) + (p.陸上部 ?? 0) + (p.購買会 ?? 0);
      const 販売総数 = soldByPageId[p.pageId] ?? 0;
      const 仕入れ数 = p.仕入れ数 ?? 0;
      const 差_個数 = 仕入れ数 - 在庫 - 販売総数;
      const 差_額 = p.原価 != null ? 差_個数 * p.原価 : null;
      return { p, 在庫, 販売総数, 仕入れ数, 差_個数, 差_額 };
    });

  function openNew() { setForm({ ...emptyForm }); setEditId(null); setShowForm(true); }
  function openEdit(e: ExpenseRecord) {
    setForm({ 件名: e.件名, 日付: e.日付, 金額: String(e.金額 ?? ""), カテゴリ: e.カテゴリ || "その他", 備考: e.備考 });
    setEditId(e.pageId);
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    const body = { ...form, 金額: Number(form.金額) };
    if (editId) {
      await fetch(`/api/expenses/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function del(id: string) {
    if (!confirm("この経費を削除しますか？")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">会計</h1>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow transition">
          ＋ 経費を追加
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">読み込み中...</div>
      ) : (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="累計売上" value={`¥${totalRevenue.toLocaleString()}`} color="blue" />
            <Card label="総仕入れ額" value={`¥${totalCost.toLocaleString()}`} color="slate" />
            <Card label="経費合計" value={`¥${totalExpenses.toLocaleString()}`} color="orange" />
            <Card
              label="利益"
              value={`${profit >= 0 ? "" : "-"}¥${Math.abs(profit).toLocaleString()}`}
              color={profit >= 0 ? "green" : "red"}
            />
          </div>

          {/* 拠点別売上 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
            <p className="text-sm font-bold text-slate-700 mb-3">拠点別売上</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["水上村", "町田寮", "陸上部", "購買会"].map((loc) => (
                <div key={loc} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">{loc}</p>
                  <p className="font-bold text-slate-800">¥{(byLocation[loc] ?? 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 経費一覧 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">経費一覧</p>
              <span className="text-sm text-slate-500">合計 <span className="font-bold text-slate-800">¥{totalExpenses.toLocaleString()}</span></span>
            </div>
            {expenses.length === 0 ? (
              <p className="text-slate-400 text-sm px-6 py-8 text-center">経費がまだ登録されていません</p>
            ) : (
              <>
                {/* カテゴリ別内訳 */}
                <div className="px-6 py-3 border-b border-slate-50 flex flex-wrap gap-2">
                  {Object.entries(byCategory).map(([cat, amt]) => (
                    <span key={cat} className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? "bg-slate-100 text-slate-600"}`}>
                      {cat} ¥{amt.toLocaleString()}
                    </span>
                  ))}
                </div>
                {/* テーブル(デスクトップ) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">日付</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">件名</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">カテゴリ</th>
                        <th className="text-right text-xs font-semibold text-slate-500 px-6 py-3">金額</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((e) => (
                        <tr key={e.pageId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-sm text-slate-500 tabular-nums">{e.日付}</td>
                          <td className="px-4 py-3 text-sm text-slate-800 font-medium">{e.件名}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[e.カテゴリ] ?? "bg-slate-100 text-slate-600"}`}>{e.カテゴリ || "その他"}</span>
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-slate-800 tabular-nums">¥{(e.金額 ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openEdit(e)} className="text-xs text-blue-500 hover:text-blue-700 mr-2">編集</button>
                            <button onClick={() => del(e.pageId)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* カード(モバイル) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <div key={e.pageId} className="px-5 py-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{e.件名}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{e.日付}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[e.カテゴリ] ?? "bg-slate-100 text-slate-600"}`}>{e.カテゴリ || "その他"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-base font-bold text-slate-800 tabular-nums">¥{(e.金額 ?? 0).toLocaleString()}</p>
                        <button onClick={() => openEdit(e)} className="text-xs text-blue-500 hover:text-blue-700">編集</button>
                        <button onClick={() => del(e.pageId)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 在庫照合表 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-700">在庫照合表</p>
              <p className="text-xs text-slate-400 mt-0.5">仕入れ数 − 在庫 − 販売総数 ＝ 差（0なら一致）</p>
            </div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">商品名</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">仕入れ数</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">在庫</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">販売総数</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">差（個）</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-6 py-3">差（額）</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliation.map(({ p, 在庫, 販売総数, 仕入れ数, 差_個数, 差_額 }) => (
                    <tr key={p.pageId} className={`hover:bg-slate-50 ${差_個数 !== 0 ? "bg-red-50" : ""}`}>
                      <td className="px-6 py-3 text-slate-800 font-medium">{p.品名}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{仕入れ数}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{在庫}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{販売総数}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${差_個数 === 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {差_個数 > 0 ? `+${差_個数}` : 差_個数}
                      </td>
                      <td className={`px-6 py-3 text-right tabular-nums font-bold ${差_額 === null ? "text-slate-400" : 差_額 === 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {差_額 === null ? "—" : `${差_額 > 0 ? "+" : ""}¥${差_額.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {reconciliation.map(({ p, 在庫, 販売総数, 仕入れ数, 差_個数, 差_額 }) => (
                <div key={p.pageId} className={`px-5 py-4 ${差_個数 !== 0 ? "bg-red-50" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-800 text-sm">{p.品名}</p>
                    <span className={`text-sm font-bold ${差_個数 === 0 ? "text-emerald-600" : "text-red-600"}`}>
                      差: {差_個数 > 0 ? `+${差_個数}` : 差_個数}個
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400 mb-0.5">仕入れ数</p><p className="font-bold text-slate-700">{仕入れ数}</p></div>
                    <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400 mb-0.5">在庫</p><p className="font-bold text-slate-700">{在庫}</p></div>
                    <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400 mb-0.5">販売総数</p><p className="font-bold text-slate-700">{販売総数}</p></div>
                  </div>
                  {差_額 !== null && 差_額 !== 0 && (
                    <p className="text-xs text-red-600 font-semibold mt-2 text-right">差額: {差_額 > 0 ? "+" : ""}¥{差_額.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 商品別売上 */}
          <ResponsiveTable
            title="商品別売上内訳"
            columns={[
              { key: "name", label: "商品名" },
              { key: "normal", label: "通常価格", className: "text-right" },
              { key: "member", label: "関係者割引", className: "text-right" },
              { key: "wholesale1", label: "陸上部卸値", className: "text-right" },
              { key: "wholesale2", label: "購買会卸値", className: "text-right" },
              { key: "total", label: "合計", className: "text-right" },
            ]}
            rows={Object.entries(byProduct).map(([name, data]) => ({
              name,
              normal: `¥${data.通常.toLocaleString()}`,
              member: `¥${data.関係者.toLocaleString()}`,
              wholesale1: `¥${data.陸上部.toLocaleString()}`,
              wholesale2: `¥${data.購買会.toLocaleString()}`,
              total: `¥${data.合計.toLocaleString()}`,
            }))}
          />
        </>
      )}

      {/* 経費入力モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">{editId ? "経費を編集" : "経費を追加"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-300 hover:text-slate-500 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">件名</label>
                <input
                  value={form.件名}
                  onChange={(e) => setForm({ ...form, 件名: e.target.value })}
                  placeholder="例：大会遠征交通費"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">日付</label>
                  <input
                    type="date"
                    value={form.日付}
                    onChange={(e) => setForm({ ...form, 日付: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">金額</label>
                  <input
                    type="number"
                    min={0}
                    value={form.金額}
                    onChange={(e) => setForm({ ...form, 金額: e.target.value })}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">カテゴリ</label>
                <select
                  value={form.カテゴリ}
                  onChange={(e) => setForm({ ...form, カテゴリ: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">備考</label>
                <input
                  value={form.備考}
                  onChange={(e) => setForm({ ...form, 備考: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={save}
                disabled={saving || !form.件名 || !form.金額}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-40"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-800",
    slate: "bg-slate-50 text-slate-800",
    orange: "bg-orange-50 text-orange-800",
    green: "bg-green-50 text-green-800",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-2xl p-5 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-1 font-medium">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
