"use client";
import { useEffect, useState } from "react";
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

function Tooltip({ items, color, fixedTotal, loc }: { items: Movement[]; color: string; fixedTotal: number; loc: string }) {
  const [show, setShow] = useState(false);
  if (items.length === 0) return <span className={color}>{fixedTotal}</span>;
  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <span className={`cursor-default font-semibold ${color}`}>{fixedTotal}</span>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-slate-800 text-white text-xs rounded-xl shadow-xl p-3 space-y-1.5">
          <p className="text-slate-400 text-[10px] mb-1">この日の内訳</p>
          {items.map((m) => {
            const isInbound = m.移動先 === loc;
            const sign = isInbound ? "+" : "-";
            return (
              <div key={m.pageId} className="flex justify-between gap-2">
                <span className="text-slate-300 truncate">{m.種別}{m.備考 ? `・${m.備考}` : ""}</span>
                <span className="font-bold shrink-0">{sign}{m.移動数}</span>
              </div>
            );
          })}
          <div className="border-t border-slate-600 pt-1.5 flex justify-between font-bold">
            <span>累計</span><span>{fixedTotal}</span>
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

  // 仕入数：この拠点への受け入れ（在庫補充・他拠点からの移動受け）− この拠点からの払い出し（他拠点への移動送り）
  // 販売数：この拠点から顧客への払い出し（販売・Wix受注・プレゼント・販売(関係者価格)）
  // 在庫数 = 仕入数 − 販売数
  function splitMovement(m: Movement) {
    const isSale = m.移動元 === loc && m.移動先 === "顧客";
    const isIn = m.移動先 === loc; // 在庫補充・他拠点からの移動受け
    const isOut = m.移動元 === loc && m.移動先 !== "顧客"; // 他拠点への移動送り
    return { isSale, isIn, isOut };
  }

  // 商品ごとの期間開始前の仕入数・販売数を計算
  const initialPurchase = new Map<string, number>();
  const initialSold = new Map<string, number>();
  for (const p of visibleProducts) {
    const before = movements.filter((m) =>
      m.日付 < start && m.商品PageId === p.pageId &&
      (m.移動元 === loc || m.移動先 === loc)
    );
    let purchase = 0, sold = 0;
    for (const m of before) {
      const { isSale, isIn, isOut } = splitMovement(m);
      if (isIn) purchase += m.移動数 ?? 0;
      if (isOut) purchase -= m.移動数 ?? 0;
      if (isSale) sold += m.移動数 ?? 0;
    }
    initialPurchase.set(p.pageId, purchase);
    initialSold.set(p.pageId, sold);
  }

  // 期間内の日付一覧（動きのある日のみ）
  const activeDatesSet = new Set<string>();
  for (const m of movements) {
    if (m.日付 >= start && m.日付 <= end && (m.移動元 === loc || m.移動先 === loc)) {
      activeDatesSet.add(m.日付);
    }
  }
  const activeDates = [...activeDatesSet].sort().reverse(); // 新しい順

  // 商品×日付の在庫移動（仕入増減）・販売マップ
  type DayData = { 移動: Movement[]; 販売: Movement[] };
  const grid = new Map<string, Map<string, DayData>>(); // productId → date → DayData
  for (const p of visibleProducts) {
    const byDate = new Map<string, DayData>();
    for (const m of movements) {
      if (m.商品PageId !== p.pageId) continue;
      if (m.日付 < start || m.日付 > end) continue;
      if (m.移動元 !== loc && m.移動先 !== loc) continue;
      if (!byDate.has(m.日付)) byDate.set(m.日付, { 移動: [], 販売: [] });
      const d = byDate.get(m.日付)!;
      const { isSale, isIn, isOut } = splitMovement(m);
      if (isSale) d.販売.push(m);
      if (isIn || isOut) d.移動.push(m);
    }
    grid.set(p.pageId, byDate);
  }

  // 商品ごとに日付順に仕入数・在庫数・販売数を積み上げ
  const purchaseByProductDate = new Map<string, Map<string, number>>();
  const soldByProductDate = new Map<string, Map<string, number>>();
  const stockByProductDate = new Map<string, Map<string, number>>();
  for (const p of visibleProducts) {
    const byDate = grid.get(p.pageId)!;
    const purchaseMap = new Map<string, number>();
    const soldMap = new Map<string, number>();
    const stockMap = new Map<string, number>();
    let purchase = initialPurchase.get(p.pageId) ?? 0;
    let soldCumulative = initialSold.get(p.pageId) ?? 0;
    for (const date of [...activeDates].reverse()) {
      const d = byDate.get(date);
      for (const m of d?.移動 ?? []) {
        const { isIn } = splitMovement(m);
        purchase += isIn ? (m.移動数 ?? 0) : -(m.移動数 ?? 0);
      }
      const soldToday = d?.販売.reduce((acc, m) => acc + (m.移動数 ?? 0), 0) ?? 0;
      soldCumulative += soldToday;
      purchaseMap.set(date, purchase);
      soldMap.set(date, soldToday); // 販売数はその日の分のみ（累計しない）
      stockMap.set(date, purchase - soldCumulative);
    }
    purchaseByProductDate.set(p.pageId, purchaseMap);
    soldByProductDate.set(p.pageId, soldMap);
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-auto max-h-[85vh]">
          <table className="text-xs border-separate border-spacing-0" style={{ minWidth: `${180 + visibleProducts.length * 120}px` }}>
            <thead>
              {/* 商品名ヘッダー */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 top-0 z-30 h-9 bg-slate-50 text-left px-4 text-slate-500 font-medium border-b border-r border-slate-200 w-28">日付</th>
                {visibleProducts.map((p) => (
                  <th key={p.pageId} colSpan={3} className="sticky top-0 z-20 h-9 bg-slate-50 px-2 text-center text-slate-700 font-semibold border-b border-r border-slate-200 last:border-r-0">
                    {p.品名}
                  </th>
                ))}
              </tr>
              {/* 仕入数/在庫数/販売数 サブヘッダー */}
              <tr className="bg-slate-50">
                <th className="sticky left-0 top-9 z-30 bg-slate-50 border-b border-r border-slate-200" />
                {visibleProducts.map((p) => (
                  <th key={p.pageId} colSpan={3} className="sticky top-9 z-20 bg-slate-50 border-b border-r border-slate-200 last:border-r-0">
                    <div className="grid grid-cols-3">
                      <span className="px-2 py-1.5 text-center text-slate-500 font-medium">仕入数</span>
                      <span className="px-2 py-1.5 text-center text-slate-500 font-medium">在庫数</span>
                      <span className="px-2 py-1.5 text-center text-slate-500 font-medium">販売数</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDates.map((date) => (
                <tr key={date} className="hover:bg-slate-50">
                  <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-4 py-2.5 text-slate-500 border-b border-r border-slate-100 whitespace-nowrap font-medium">
                    {date}
                  </td>
                  {visibleProducts.map((p) => {
                    const d = grid.get(p.pageId)?.get(date);
                    const 仕入数 = purchaseByProductDate.get(p.pageId)?.get(date) ?? null;
                    const 在庫数 = stockByProductDate.get(p.pageId)?.get(date) ?? null;
                    const 販売数 = soldByProductDate.get(p.pageId)?.get(date) ?? null;
                    return (
                      <td key={p.pageId} colSpan={3} className="border-b border-r border-slate-100 last:border-r-0">
                        <div className="grid grid-cols-3">
                          <div className="px-2 py-2.5 text-center">
                            {仕入数 !== null ? (
                              <Tooltip items={d?.移動 ?? []} color="text-slate-800" fixedTotal={仕入数} loc={loc} />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </div>
                          <div className="px-2 py-2.5 text-center">
                            {在庫数 !== null ? (
                              <span className={stockColor(在庫数)}>{在庫数}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </div>
                          <div className="px-2 py-2.5 text-center">
                            {販売数 !== null ? (
                              <Tooltip items={d?.販売 ?? []} color="text-slate-800" fixedTotal={販売数} loc={loc} />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
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
      )}
    </Shell>
  );
}
