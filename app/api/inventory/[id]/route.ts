import { NextRequest, NextResponse } from "next/server";
import { notion, parseProduct } from "@/lib/notion";
import { logInventoryChange } from "@/lib/audit-log";

const LOCATION_COLS = ["水上村", "町田寮", "陸上部"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // 変更前の値を取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const before = await notion.pages.retrieve({ page_id: id }) as any;
  const 品名: string = before.properties["品名"]?.title?.[0]?.plain_text ?? "";

  const props: Record<string, unknown> = {
    備考: { rich_text: [{ text: { content: body.備考 ?? "" } }] },
  };
  const changedLocs: { loc: string; 変更前: number; 変更後: number }[] = [];
  for (const loc of LOCATION_COLS) {
    if (body[loc] !== undefined) {
      props[loc] = { number: body[loc] };
      const 変更前 = before.properties[loc]?.number ?? 0;
      const 変更後: number = body[loc];
      if (変更前 !== 変更後) changedLocs.push({ loc, 変更前, 変更後 });
    }
  }

  const page = await notion.pages.update({
    page_id: id,
    properties: props as Parameters<typeof notion.pages.update>[0]["properties"],
  });

  // ログを非同期で記録（失敗しても本体には影響しない）
  Promise.all(
    changedLocs.map(({ loc, 変更前, 変更後 }) =>
      logInventoryChange({ 商品名: 品名, 商品PageId: id, 拠点: loc, 変更前, 変更後, 原因: "手動編集" }),
    ),
  ).catch(() => {});

  return NextResponse.json(parseProduct(page));
}
