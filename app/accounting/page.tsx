"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import type { SaleRecord, Product } from "@/lib/notion";

export default function AccountingPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([s, p]) => {
      setSales(s);
      setProducts(p);
      setLoading(false);
    });
  }, []);

  const totalRevenue = sales.reduce((s, r) => s + (r.販売額 ?? 0), 0);
  const totalCost = products.reduce((s, p) => s + (p.仕入れ額 ?? 0), 0);
  const profit = totalRevenue - totalCost;

  // Per product
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

  // Per location
  const byLocation: Record<string, number> = {};
  for (const s of sales) {
    byLocation[s.販売拠点] = (byLocation[s.販売拠点] ?? 0) + (s.販売額 ?? 0);
  }

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-6">📊 会計サマリー</h1>

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card label="累計売上" value={`¥${totalRevenue.toLocaleString()}`} color="blue" />
              <Card label="総仕入れ額" value={`¥${totalCost.toLocaleString()}`} color="gray" />
              <Card
                label="利益"
                value={`${profit >= 0 ? "" : "-"}¥${Math.abs(profit).toLocaleString()}`}
                color={profit >= 0 ? "green" : "red"}
              />
            </div>

            {/* By location */}
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h2 className="font-bold text-gray-700 mb-3">拠点別売上</h2>
              <div className="grid grid-cols-4 gap-3">
                {["水上村", "町田寮", "陸上部", "購買会"].map((loc) => (
                  <div key={loc} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">{loc}</p>
                    <p className="font-bold text-gray-800">¥{(byLocation[loc] ?? 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Per product */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h2 className="font-bold text-gray-700">商品別売上内訳</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="text-left px-4 py-3">商品名</th>
                    <th className="text-right px-3 py-3">通常価格</th>
                    <th className="text-right px-3 py-3">関係者割引</th>
                    <th className="text-right px-3 py-3">陸上部卸値</th>
                    <th className="text-right px-3 py-3">購買会卸値</th>
                    <th className="text-right px-4 py-3 font-bold">合計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(byProduct).map(([name, data]) => (
                    <tr key={name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{name}</td>
                      <td className="px-3 py-3 text-right text-gray-600">¥{data.通常.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-600">¥{data.関係者.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-600">¥{data.陸上部.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-600">¥{data.購買会.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold">¥{data.合計.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-800",
    gray: "bg-gray-50 text-gray-800",
    green: "bg-green-50 text-green-800",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <p className="text-sm opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
