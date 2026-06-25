"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "ダッシュボード", icon: "⊞" },
  { href: "/inventory", label: "在庫", icon: "◫" },
  { href: "/sales", label: "販売記録", icon: "¥" },
  { href: "/products", label: "商品マスタ", icon: "≡" },
  { href: "/accounting", label: "会計", icon: "∑" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="fixed top-0 left-0 h-full w-52 bg-slate-900 text-white flex flex-col z-40">
      <div className="px-5 py-5 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">在庫管理</p>
      </div>
      <div className="flex-1 py-3 overflow-y-auto">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span className="text-base w-5 text-center">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </div>
      <div className="px-4 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full text-left text-xs text-slate-500 hover:text-slate-300 transition px-3 py-2"
        >
          ログアウト
        </button>
      </div>
    </nav>
  );
}
