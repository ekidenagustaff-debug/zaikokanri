"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import type { Product, MovementRecord, AuditLogRecord } from "@/lib/notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部"] as const;
const MOVE_DESTINATIONS = ["水上村", "町田寮", "陸上部", "購買会"] as const;
type Location = (typeof LOCATIONS)[number];

function HistorySection({
  movements,
  restocks,
  onAddMove,
  onAddRestock,
}: {
  movements: MovementRecord[];
  restocks: AuditLogRecord[];
  onAddMove: () => void;
  onAddRestock: () => void;
}) {
  const [tab, setTab] = useState<"move" | "restock">("move");

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setTab("move")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "move" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            在庫移動
          </button>
          <button
            onClick={() => setTab("restock")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "restock" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            入荷
          </button>
        </div>
        {tab === "move" ? (
          <button onClick={onAddMove} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition">
            ＋ 移動を記録
          </button>
        ) : (
          <button onClick={onAddRestock} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition">
            ＋ 入荷を記録
          </button>
        )}
      </div>

      {tab === "move" ? (
        <>
          <div className="hidden lg:block bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="text-left px-4 py-3">日付</th>
                  <th className="text-left px-4 py-3">商品</th>
                  <th className="text-center px-3 py-3">移動数</th>
                  <th className="text-left px-3 py-3">移動元</th>
                  <th className="text-left px-3 py-3">移動先</th>
                  <th className="text-left px-3 py-3">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">記録がありません</td></tr>
                ) : movements.slice(0, 30).map((m) => (
                  <tr key={m.pageId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{m.日付}</td>
                    <td className="px-4 py-3 text-slate-800">{m.商品名}</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">{m.移動数}</td>
                    <td className="px-3 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{m.移動元}</span></td>
                    <td className="px-3 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{m.移動先}</span></td>
                    <td className="px-3 py-3 text-slate-500">{m.備考}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden space-y-2">
            {movements.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">記録がありません</p>
            ) : movements.slice(0, 30).map((m) => (
              <div key={m.pageId} className="bg-white rounded-xl border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-800">{m.商品名}</span>
                  <span className="text-slate-400 text-xs">{m.日付}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{m.移動元}</span>
                  <span className="text-slate-400">→</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{m.移動先}</span>
                  <span className="text-slate-600 font-semibold ml-auto">{m.移動数}個</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="hidden lg:block bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="text-left px-4 py-3">日時</th>
                  <th className="text-left px-4 py-3">商品</th>
                  <th className="text-center px-3 py-3">数量</th>
                  <th className="text-left px-3 py-3">拠点</th>
                  <th className="text-left px-3 py-3">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restocks.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">記録がありません</td></tr>
                ) : restocks.slice(0, 30).map((r) => (
                  <tr key={r.pageId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{r.日時.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-slate-800">{r.商品名}</td>
                    <td className="px-3 py-3 text-center font-semibold text-emerald-600">+{r.変動数}</td>
                    <td className="px-3 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">{r.拠点}</span></td>
                    <td className="px-3 py-3 text-slate-500">{r.備考}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden space-y-2">
            {restocks.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">記録がありません</p>
            ) : restocks.slice(0, 30).map((r) => (
              <div key={r.pageId} className="bg-white rounded-xl border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-800">{r.商品名}</span>
                  <span className="text-slate-400 text-xs">{r.日時.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{r.拠点}</span>
                  <span className="text-emerald-600 font-bold ml-auto">+{r.変動数}個</span>
                </div>
                {r.備考 && <p className="text-slate-400 mt-1">{r.備考}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function stockColor(n: number): string {
  if (n <= 0) return "text-red-600 font-bold";
  if (n <= 5) return "text-red-500 font-semibold";
  if (n <= 10) return "text-orange-500 font-semibold";
  if (n <= 20) return "text-amber-500";
  if (n <= 30) return "text-yellow-600";
  return "text-slate-700";
}

const emptyMoveForm = () => ({
  商品PageId: "",
  日付: new Date().toISOString().slice(0, 10),
  移動数: 1,
  移動元: "水上村",
  移動先: "陸上部",
  備考: "",
});

const emptyRestockForm = () => ({
  商品PageId: "",
  拠点: "水上村",
  数量: 1,
  備考: "",
});

export default function InventoryPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [restocks, setRestocks] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [moveForm, setMoveForm] = useState(emptyMoveForm());
  const [moveSaving, setMoveSaving] = useState(false);
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [restockForm, setRestockForm] = useState(emptyRestockForm());
  const [restockSaving, setRestockSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [inv, mv, al] = await Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/movements").then((r) => r.json()),
      fetch("/api/audit-log").then((r) => r.json()),
    ]);
    setItems(inv);
    setMovements(mv);
    setRestocks((al as AuditLogRecord[]).filter((r) => r.原因 === "仕入れ"));
    setLoading(false);
  }

  async function toggleArchive(item: Product) {
    await fetch(`/api/products/${item.pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, アーカイブ: !item.アーカイブ }),
    });
    fetchAll();
  }

  async function saveRestock() {
    if (!restockForm.商品PageId) return;
    setRestockSaving(true);
    await fetch("/api/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restockForm),
    });
    setRestockSaving(false);
    setShowRestockForm(false);
    setRestockForm(emptyRestockForm());
    fetchAll();
  }

  async function saveMove() {
    if (!moveForm.商品PageId) return;
    setMoveSaving(true);
    const prod = activeItems.find((p) => p.pageId === moveForm.商品PageId);
    await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...moveForm, 商品名: prod?.品名 ?? "" }),
    });
    setMoveSaving(false);
    setShowMoveForm(false);
    setMoveForm(emptyMoveForm());
    fetchAll();
  }

  const activeItems = items.filter((i) => !i.アーカイブ);
  const archivedItems = items.filter((i) => i.アーカイブ);

  const totalByLoc = LOCATIONS.reduce((acc, loc) => {
    acc[loc] = activeItems.reduce((s, r) => s + (r[loc] ?? 0), 0);
    return acc;
  }, {} as Record<Location, number>);

  return (
    <Shell>
      {/* ── 在庫テーブル ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">在庫</h1>
        <button
          onClick={() => setShowRestockForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          ＋ 入荷を記録
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">読み込み中...</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block bg-white rounded-xl shadow overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="text-left px-4 py-3">商品名</th>
                  {LOCATIONS.map((l) => (
                    <th key={l} className="text-center px-3 py-3 w-24">{l}</th>
                  ))}
                  <th className="text-center px-3 py-3 w-16">合計</th>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeItems.map((item) => {
                  const total = LOCATIONS.reduce((s, loc) => s + (item[loc] ?? 0), 0);
                  return (
                    <tr key={item.pageId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.品名}</td>
                      {LOCATIONS.map((loc) => {
                        const n = item[loc] ?? 0;
                        return (
                          <td key={loc} className={`px-3 py-3 text-center ${stockColor(n)}`}>{n}</td>
                        );
                      })}
                      <td className="px-3 py-3 text-center font-bold text-slate-700">{total}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => toggleArchive(item)} className="text-xs text-slate-400 hover:underline">アーカイブ</button>
                      </td>
                    </tr>
                  );
                })}
                {archivedItems.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={8} className="px-4 py-2 text-xs text-slate-400 bg-slate-50 font-medium">アーカイブ済み</td>
                    </tr>
                    {archivedItems.map((item) => {
                      const total = LOCATIONS.reduce((s, loc) => s + (item[loc] ?? 0), 0);
                      return (
                        <tr key={item.pageId} className="opacity-40">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.品名}</td>
                          {LOCATIONS.map((loc) => (
                            <td key={loc} className="px-3 py-3 text-center text-slate-500">{item[loc] ?? 0}</td>
                          ))}
                          <td className="px-3 py-3 text-center font-bold text-slate-700">{total}</td>
                          <td className="px-3 py-3 text-right">
                            <button onClick={() => toggleArchive(item)} className="text-xs text-slate-400 hover:underline">復元</button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
                <tr className="bg-slate-50 font-semibold text-slate-600">
                  <td className="px-4 py-3">合計</td>
                  {LOCATIONS.map((loc) => (
                    <td key={loc} className="px-3 py-3 text-center">{totalByLoc[loc]}</td>
                  ))}
                  <td className="px-3 py-3 text-center">{LOCATIONS.reduce((s, loc) => s + totalByLoc[loc], 0)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-3 mb-8">
            {activeItems.map((item) => {
              const total = LOCATIONS.reduce((s, loc) => s + (item[loc] ?? 0), 0);
              return (
                <div key={item.pageId} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-semibold text-slate-800 text-sm">{item.品名}</p>
                    <div className="shrink-0 ml-2">
                      <button onClick={() => toggleArchive(item)} className="text-xs text-slate-400 hover:underline">アーカイブ</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {LOCATIONS.map((loc) => {
                      const n = item[loc] ?? 0;
                      return (
                        <div key={loc} className="text-center">
                          <p className="text-xs text-slate-400">{loc}</p>
                          <p className={`font-bold ${stockColor(n)}`}>{n}</p>
                        </div>
                      );
                    })}
                    <div className="text-center">
                      <p className="text-xs text-slate-400">合計</p>
                      <p className="font-bold text-slate-800">{total}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 履歴セクション ── */}
          <HistorySection
            movements={movements}
            restocks={restocks}
            onAddMove={() => setShowMoveForm(true)}
            onAddRestock={() => setShowRestockForm(true)}
          />
        </>
      )}

      {/* 入荷記録モーダル */}
      {showRestockForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">入荷を記録</h2>
              <button onClick={() => setShowRestockForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">商品 *</label>
                <select
                  value={restockForm.商品PageId}
                  onChange={(e) => setRestockForm({ ...restockForm, 商品PageId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {activeItems.map((p) => (
                    <option key={p.pageId} value={p.pageId}>{p.品名}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">入荷先（拠点）</label>
                  <select
                    value={restockForm.拠点}
                    onChange={(e) => setRestockForm({ ...restockForm, 拠点: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">数量</label>
                  <input
                    type="number" min={1} value={restockForm.数量}
                    onChange={(e) => setRestockForm({ ...restockForm, 数量: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">備考</label>
                <input
                  type="text" value={restockForm.備考}
                  onChange={(e) => setRestockForm({ ...restockForm, 備考: e.target.value })}
                  placeholder="例：春季仕入れ分"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={saveRestock}
                disabled={restockSaving || !restockForm.商品PageId}
                className="w-full bg-emerald-600 text-white py-2 rounded-lg disabled:opacity-50 font-semibold"
              >
                {restockSaving ? "保存中..." : "入荷を記録する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移動記録モーダル */}
      {showMoveForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">在庫移動を記録</h2>
              <button onClick={() => setShowMoveForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">日付</label>
                <input
                  type="date" value={moveForm.日付}
                  onChange={(e) => setMoveForm({ ...moveForm, 日付: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">商品 *</label>
                <select
                  value={moveForm.商品PageId}
                  onChange={(e) => setMoveForm({ ...moveForm, 商品PageId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {activeItems.map((p) => (
                    <option key={p.pageId} value={p.pageId}>{p.品名}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">移動数</label>
                <input
                  type="number" min={1} value={moveForm.移動数}
                  onChange={(e) => setMoveForm({ ...moveForm, 移動数: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">移動元</label>
                  <select
                    value={moveForm.移動元}
                    onChange={(e) => setMoveForm({ ...moveForm, 移動元: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">移動先</label>
                  <select
                    value={moveForm.移動先}
                    onChange={(e) => setMoveForm({ ...moveForm, 移動先: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {MOVE_DESTINATIONS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                  {moveForm.移動先 === "購買会" && (
                    <p className="text-xs text-amber-600 mt-1">陸上部→購買会：購買会卸値で販売記録されます</p>
                  )}
                  {moveForm.移動先 === "陸上部" && ["水上村", "町田寮"].includes(moveForm.移動元) && (
                    <p className="text-xs text-amber-600 mt-1">ACC→陸上部：陸上部卸値でACCの販売記録が作成されます</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">備考</label>
                <input
                  type="text" value={moveForm.備考}
                  onChange={(e) => setMoveForm({ ...moveForm, 備考: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={saveMove}
                disabled={moveSaving || !moveForm.商品PageId}
                className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
              >
                {moveSaving ? "保存中..." : "記録する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
