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

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"] as const;

function Tooltip({ items, color }: { items: Movement[]; color: string }) {
  const [show, setShow] = useState(false);
  const total = items.reduce((s, m) => s + (m.移動数 ?? 0), 0);
  if (items.length === 0) return <span className="text-slate-300">—</span>;
  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <span className={`cursor-default font-semibold ${color}`}>{total}</span>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-slate-800 text-white text-xs rounded-xl shadow-xl p-3 space-y-1.5">
          {items.map((m) => (
            <div key={m.pageId} className="flex justify-between gap-2">
              <span className="text-slate-300 truncate">{m.種別}{m.備考 ? `・${m.備考}` : ""}</span>
              <span className="font-bold shrink-0">×{m.移動数}</span>
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

function stockColor(n: number) {
  if (n < 0) return "text-red-600 font-bold";
  if (n <= 5) return "text-amber-500 font-semibold";
  return "text-slate-800";
}

export default function StockLogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("水上村");

  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [start, setStart] = useState(yearAgo);
  const [end, setEnd] = useState(today);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/movements").then((r) => r.json()),
    ]).then(([p, m]) => {
      setProducts(p);
      setMovements(m);
      setLoading(false);
    });
  }, []);

  // 上下の横スクロールバーを同期させる
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const syncScroll = (from: "top" | "table") => () => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (!top || !table) return;
    if (from === "top") table.scrollLeft = top.scrollLeft;
    else top.scrollLeft = table.scrollLeft;
  };

  const loc = selectedLocation;
  const activeProducts = products.filter((p) => !p.アーカイブ);

  // 期間内で拠点に関係する商品IDを収集
  const relevantProductIds = new Set<string>();
  for (const m of movements) {
    if (m.日付 >= start && m.日付 <= end && (m.移動元 === loc || m.移動先 === loc) && m.商品PageId) {
      relevantProductIds.add(m.商品PageId);
    }
  }

  // 表示対象商品（アーカイブ除外、期間内に動きのあるもの）
  const visibleProducts = activeProducts.filter((p) => relevantProductIds.has(p.pageId));

  // 商品ごとの期間開始前の在庫数を計算
  const initialStock = new Map<string, number>();
  for (const p of visibleProducts) {
    const before = movements.filter((m) =>
      m.日付 < start && m.商品PageId === p.pageId &&
      (m.移動元 === loc || m.移動先 === loc)
    );
    const s = before.reduce((acc, m) => {
      if (m.移動先 === loc) return acc + (m.移動数 ?? 0);
      if (m.移動元 === loc) return acc - (m.移動数 ?? 0);
      return acc;
    }, 0);
    initialStock.set(p.pageId, s);
  }

  // 期間内の日付一覧（動きのある日のみ）
  const activeDatesSet = new Set<string>();
  for (const m of movements) {
    if (m.日付 >= start && m.日付 <= end && (m.移動元 === loc || m.移動先 === loc)) {
      activeDatesSet.add(m.日付);
    }
  }
  const activeDates = [...activeDatesSet].sort().reverse(); // 新しい順

  // 商品×日付の増加・減少マップ
  type DayData = { 増加: Movement[]; 減少: Movement[] };
  const grid = new Map<string, Map<string, DayData>>(); // productId → date → DayData
  for (const p of visibleProducts) {
    const byDate = new Map<string, DayData>();
    for (const m of movements) {
      if (m.商品PageId !== p.pageId) continue;
      if (m.日付 < start || m.日付 > end) continue;
      if (m.移動元 !== loc && m.移動先 !== loc) continue;
      if (!byDate.has(m.日付)) byDate.set(m.日付, { 増加: [], 減少: [] });
      const d = byDate.get(m.日付)!;
      if (m.移動先 === loc) d.増加.push(m);
      if (m.移動元 === loc) d.減少.push(m);
    }
    grid.set(p.pageId, byDate);
  }

  // 商品ごとに日付順に在庫数を積み上げ
  const stockByProductDate = new Map<string, Map<string, number>>(); // productId → date → 在庫数
  for (const p of visibleProducts) {
    const byDate = grid.get(p.pageId)!;
    const stockMap = new Map<string, number>();
    let s = initialStock.get(p.pageId) ?? 0;
    for (const date of [...activeDates].reverse()) {
      const d = byDate.get(date);
      const inc = d?.増加.reduce((acc, m) => acc + (m.移動数 ?? 0), 0) ?? 0;
      const dec = d?.減少.reduce((acc, m) => acc + (m.移動数 ?? 0), 0) ?? 0;
      s += inc - dec;
      stockMap.set(date, s);
    }
    stockByProductDate.set(p.pageId, stockMap);
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold text-slate-800 mb-6">在庫変動ログ</h1>

      {/* フィルタ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-wrap gap-4 items-end">
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
      ) : visibleProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-10 text-center text-slate-400 text-sm">
          この期間・拠点に変動はありません
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          {/* 上部の横スクロールバー（下の表と同期） */}
          <div ref={topScrollRef} onScroll={syncScroll("top")} className="overflow-x-auto">
            <div style={{ width: `${180 + visibleProducts.length * 120}px`, height: 1 }} />
          </div>
          <div ref={tableScrollRef} onScroll={syncScroll("table")} className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: `${180 + visibleProducts.length * 120}px` }}>
            <thead>
              {/* 商品名ヘッダー */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 text-left px-4 py-2 text-slate-500 font-medium border-r border-slate-200 w-28">日付</th>
                {visibleProducts.map((p) => (
                  <th key={p.pageId} colSpan={3} className="px-2 py-2 text-center text-slate-700 font-semibold border-r border-slate-200 last:border-r-0">
                    {p.品名}
                  </th>
                ))}
              </tr>
              {/* 在庫数/増加/減少 サブヘッダー */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 border-r border-slate-200" />
                {visibleProducts.map((p) => (
                  <th key={p.pageId} colSpan={3} className="border-r border-slate-200 last:border-r-0">
                    <div className="grid grid-cols-3">
                      <span className="px-2 py-1.5 text-center text-slate-500 font-medium">在庫</span>
                      <span className="px-2 py-1.5 text-center text-emerald-600 font-medium">増加</span>
                      <span className="px-2 py-1.5 text-center text-red-500 font-medium">減少</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDates.map((date) => (
                <tr key={date} className="hover:bg-slate-50">
                  <td className="sticky left-0 bg-white hover:bg-slate-50 px-4 py-2.5 text-slate-500 border-r border-slate-200 whitespace-nowrap font-medium">
                    {date}
                  </td>
                  {visibleProducts.map((p) => {
                    const d = grid.get(p.pageId)?.get(date);
                    const 在庫数 = stockByProductDate.get(p.pageId)?.get(date) ?? null;
                    return (
                      <td key={p.pageId} colSpan={3} className="border-r border-slate-200 last:border-r-0">
                        <div className="grid grid-cols-3">
                          <div className="px-2 py-2.5 text-center">
                            {在庫数 !== null ? (
                              <span className={stockColor(在庫数)}>{在庫数}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </div>
                          <div className="px-2 py-2.5 text-center">
                            <Tooltip items={d?.増加 ?? []} color="text-emerald-600" />
                          </div>
                          <div className="px-2 py-2.5 text-center">
                            <Tooltip items={d?.減少 ?? []} color="text-red-500" />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
