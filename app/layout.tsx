import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "在庫管理システム",
  description: "在庫管理ウェブアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-50">{children}</body>
    </html>
  );
}
