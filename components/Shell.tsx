"use client";
import { useState } from "react";
import Nav from "./Nav";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-52 fixed top-0 left-0 h-full">
        <Nav />
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`fixed top-0 left-0 h-full w-52 bg-slate-900 z-40 lg:hidden transform transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Nav />
      </div>

      <main className="lg:ml-52 flex-1 w-full">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <span className="font-semibold text-slate-800">在庫管理</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
