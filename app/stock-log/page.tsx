"use client";
import { useEffect, useState, useRef } from "react";
import Shell from "@/components/Shell";
import type { Product } from "@/lib/notion";

type Movement = {
  pageId: string;
  日付: string;
  商品名: string;
  商品PageId: string | null;
  移動数: number | null;
  移動元: string;
  移動先: string;
  種別: string;
  備考: string;
};

type DayRow = {
  date: string;
  増加: Movement[];
  減少: Movement[];
  在庫数: number;
};

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"] as const;

function Tooltip({ items, color }: { items: Movement[]; color: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = items.reduce((s, m) => s + (m.移動数 ?? 0), 0);

  if (items.length === 0) return <span className="text-slate-200">—</span>;

  return (
    <div className="relative inline-block" ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <span className={`cursor-default font-semibold ${color}`}>{total}</span>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-xs rounded-xl shadow-xl p-3 space-y-1.5">
          {items.map((m) => (
            <div key={m.pageId} className="flex justify-between gap-2">
              <span className="text-slate-300 truncate">{m.種別}{m.備考 ? `・${m.備考}` : ""}</span>
              <span className="font-bold shrink-0">{m.移動元}→{m.移動先} × {m.移動数}</span>
            </div>
          ))}
          <div className="border-t border-slate-600 pt-1.5 flex justify-between font-bold">
            <span>合計</span><span>{total}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StockLogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("水上村");

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/movements");
    const data: Movement[] = await res.json();
    setMovements(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // フィルタ
  const filtered = movements.filter((m) => {
    if (m.日付 < start || m.日付 > end) return false;
    if (selectedProduct && m.商品PageId !== selectedProduct) return false;
    // 選択拠点に関係する移動のみ
    return m.移動元 === selectedLocation || m.移動先 === selectedLocation;
  });

  // 日付ごとに集計
  const byDate = new Map<string, { 増加: Movement[]; 減少: Movement[] }>();
  for (const m of filtered) {
    if (!byDate.has(m.日付)) byDate.set(m.日付, { 増加: [], 減少: [] });
    const day = byDate.get(m.日付)!;
    if (m.移動先 === selectedLocation) day.増加.push(m);
    if (m.移動元 === selectedLocation) day.減少.push(m);
  }

  // 日付一覧（範囲内全日付）
  const allDates: string[] = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    allDates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  allDates.reverse(); // 新しい順

  // 開始残高を計算（期間より前の累積）
  const beforeStart = movements.filter((m) => {
    if (m.日付 >= start) return false;
    if (selectedProduct && m.商品PageId !== selectedProduct) return false;
    return m.移動元 === selectedLocation || m.移動先 === selectedLocation;
  });
  let runningStock = beforeStart.reduce((s, m) => {
    if (m.移動先 === selectedLocation) return s + (m.移動数 ?? 0);
    if (m.移動元 === selectedLocation) return s - (m.移動数 ?? 0);
    return s;
  }, 0);

  // 古い順に在庫数を積み上げ
  const rows: DayRow[] = [];
  const ascDates = [...allDates].reverse();
  const stockByDate = new Map<string, number>();
  let stock = runningStock;
  for (const date of ascDates) {
    const day = byDate.get(date);
    const inc = day?.増加.reduce((s, m) => s + (m.移動数 ?? 0), 0) ?? 0;
    const dec = day?.減少.reduce((s, m) => s + (m.移動数 ?? 0), 0) ?? 0;
    stock += inc - dec;
    stockByDate.set(date, stock);
  }

  for (const date of allDates) {
    const day = byDate.get(date);
    rows.push({
      date,
      増加: day?.増加 ?? [],
      減少: day?.減少 ?? [],
      在庫数: stockByDate.get(date) ?? 0,
    });
  }

  const activeProducts = products.filter((p) => !p.アーカイブ);

  return (
    <Shell>
      <h1 className="text-xl font-bold text-slate-800 mb-6">在庫変動ログ</h1>

      {/* フィルタ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">商品</label>
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm min-w-48">
            <option value="">すべての商品</option>
            {activeProducts.map((p) => (
              <option key={p.pageId} value={p.pageId}>{p.品名}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">拠点</label>
          <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">開始日</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">終了日</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="text-left px-5 py-3">日付</th>
                <th className="text-center px-4 py-3">在庫数</th>
                <th className="text-center px-4 py-3 text-emerald-600">増加</th>
                <th className="text-center px-4 py-3 text-red-500">減少</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.filter((r) => r.増加.length > 0 || r.減少.length > 0 || r.date === today).map((row) => (
                <tr key={row.date} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{row.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${row.在庫数 < 0 ? "text-red-600" : row.在庫数 <= 5 ? "text-amber-500" : "text-slate-800"}`}>
                      {row.在庫数}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Tooltip items={row.増加} color="text-emerald-600" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Tooltip items={row.減少} color="text-red-500" />
                  </td>
                </tr>
              ))}
              {rows.every((r) => r.増加.length === 0 && r.減少.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">この期間に変動はありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
