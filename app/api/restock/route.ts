import { NextRequest, NextResponse } from "next/server";
import { notion, DS } from "@/lib/notion";
import { logMovement } from "@/lib/inventory-sync";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 商品PageId, 拠点, 数量, 備考 } = body;
  if (!商品PageId || !拠点 || !数量) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const qty = Number(数量);

  // 商品マスタから品名と仕入れ数を取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productPage = await notion.pages.retrieve({ page_id: 商品PageId }) as any;
  const 品名: string = productPage.properties["品名"]?.title?.[0]?.plain_text ?? "";
  const 仕入れ数: number = productPage.properties["仕入れ数"]?.number ?? 0;

  // 在庫移動ログから仕入れ元発の累計入荷数を集計（この商品分）
  let totalAllocated = 0;
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.movements,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.results.filter((r: any) => r.properties).forEach((r: any) => {
      const relation: { id: string }[] = r.properties["商品"]?.relation ?? [];
      if (relation[0]?.id !== 商品PageId) return;
      const 移動元: string = r.properties["移動元"]?.select?.name ?? "";
      if (移動元 === "仕入れ元") {
        totalAllocated += r.properties["移動数"]?.number ?? 0;
      }
    });
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  const overLimit = 仕入れ数 > 0 && totalAllocated + qty > 仕入れ数;
  if (overLimit && !body.confirmed) {
    return NextResponse.json(
      {
        warning: `仕入れ数（${仕入れ数}個）を超えます。すでに${totalAllocated}個配分済みのため、あと${仕入れ数 - totalAllocated}個の予定でした。このまま登録しますか？`,
        remaining: 仕入れ数 - totalAllocated,
        requiresConfirm: true,
      },
      { status: 200 },
    );
  }

  // 在庫移動ログに記録（移動元=仕入れ元, 種別=入荷）
  await logMovement({
    商品名: 品名,
    商品PageId,
    日付: new Date().toISOString().slice(0, 10),
    移動数: qty,
    移動元: "仕入れ元",
    移動先: 拠点,
    種別: "入荷",
    備考: 備考 ?? "",
  });

  return NextResponse.json({ ok: true });
}
