"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import type { Product, SaleRecord } from "@/lib/notion";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-1">
      <div className={`w-8 h-1 rounded-full ${colors[color]} mb-2`} />
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"] as const;

export default function DashboardPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
    ]).then(([s, inv]) => { setSales(s); setInventory(inv); setLoading(false); });
  }, []);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const monthlySales = sales.filter((s) => s.日付.startsWith(thisMonth));
  const lastMonthlySales = sales.filter((s) => s.日付.startsWith(lastMonth));
  const monthlyRevenue = monthlySales.reduce((s, r) => s + (r.販売額 ?? 0), 0);
  const lastMonthRevenue = lastMonthlySales.reduce((s, r) => s + (r.販売額 ?? 0), 0);
  const totalRevenue = sales.reduce((s, r) => s + (r.販売額 ?? 0), 0);

  const activeInventory = inventory.filter((p) => !p.アーカイブ);

  // 在庫アラート: マイナスまたは5個以下
  type AlertLevel = "danger" | "warn";
  type Alert = { 品名: string; loc: string; n: number; level: AlertLevel };
  const alerts: Alert[] = activeInventory.flatMap((p) =>
    LOCATIONS.flatMap((loc): Alert[] => {
      const n = (p as unknown as Record<string, number | null>)[loc] ?? 0;
      if (n < 0) return [{ 品名: p.品名, loc, n, level: "danger" }];
      if (n <= 5 && n > 0) return [{ 品名: p.品名, loc, n, level: "warn" }];
      return [];
    })
  );

  const revenueChange = lastMonthRevenue > 0
    ? Math.round((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
    : null;

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="text-sm text-slate-400 mt-0.5">{now.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Link
          href="/sales"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow transition"
        >
          ＋ 販売を記録
        </Link>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">読み込み中...</div>
      ) : (
        <>
          {/* 売上サマリー */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="今月の売上"
              value={`¥${monthlyRevenue.toLocaleString()}`}
              sub={revenueChange != null ? `先月比 ${revenueChange > 0 ? "+" : ""}${revenueChange}%` : `${monthlySales.length}件`}
              color="blue"
            />
            <StatCard
              label="先月の売上"
              value={`¥${lastMonthRevenue.toLocaleString()}`}
              sub={`${lastMonthlySales.length}件`}
              color="violet"
            />
            <StatCard
              label="累計売上"
              value={`¥${totalRevenue.toLocaleString()}`}
              sub={`全${sales.length}件`}
              color="green"
            />
          </div>

          {/* 在庫アラート */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="font-bold text-slate-800">在庫アラート</p>
                <Link href="/inventory" className="text-xs text-blue-500 hover:underline">在庫ページへ</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {alerts.map((a, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.品名}</p>
                      <p className="text-xs text-slate-400">{a.loc}</p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      a.level === "danger" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    }`}>
                      {a.n} 個{a.level === "danger" ? " ⚠ マイナス" : " 残りわずか"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アラートなし */}
          {alerts.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 mb-6 text-sm text-emerald-700 font-medium">
              在庫に問題はありません
            </div>
          )}

          {/* 最近の販売 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-bold text-slate-800">最近の販売</p>
              <Link href="/sales" className="text-xs text-blue-500 hover:underline">すべて見る</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {sales.slice(0, 8).map((s) => (
                <div key={s.pageId} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.商品名}</p>
                    <p className="text-xs text-slate-400">{s.日付} · {s.販売拠点}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {s.販売額 != null ? `¥${s.販売額.toLocaleString()}` : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
