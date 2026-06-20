"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "🏠 ダッシュボード" },
  { href: "/products", label: "📋 商品マスタ" },
  { href: "/inventory", label: "📦 在庫" },
  { href: "/sales", label: "💰 販売記録" },
  { href: "/movements", label: "🔄 在庫移動" },
  { href: "/accounting", label: "📊 会計" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-800 mr-4">📦 在庫管理</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ログアウト
        </button>
      </div>
    </nav>
  );
}
