import React from "react";

interface Column {
  key: string;
  label: string;
  className?: string;
}

interface Row {
  [key: string]: React.ReactNode;
}

export default function ResponsiveTable({
  columns,
  rows,
  title,
  link,
}: {
  columns: Column[];
  rows: Row[];
  title?: string;
  link?: { label: string; href: string };
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      {title && (
        <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">{title}</h2>
          {link && (
            <a href={link.href} className="text-xs text-blue-500 hover:underline">
              {link.label} →
            </a>
          )}
        </div>
      )}

      {/* Desktop: table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 font-medium text-left ${col.className ?? ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3 ${col.className ?? ""}`}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-slate-300 text-sm">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="lg:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-300 text-sm">データがありません</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <div key={i} className="px-4 py-4 space-y-2 hover:bg-slate-50 transition">
                {columns.map((col) => (
                  <div key={col.key} className="flex justify-between items-start gap-3">
                    <span className="text-xs font-medium text-slate-400">{col.label}</span>
                    <span className="text-sm text-slate-700 text-right flex-1">{row[col.key]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
