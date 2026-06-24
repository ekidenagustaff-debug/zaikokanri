import { NextResponse } from "next/server";

// 在庫数の直接編集は廃止。在庫移動ログ経由でのみ変動させること。
export async function PUT() {
  return NextResponse.json(
    { error: "在庫数の直接編集は無効です。入荷・在庫移動・販売から記録してください。" },
    { status: 403 },
  );
}
