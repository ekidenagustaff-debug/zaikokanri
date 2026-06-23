import { notion, DS } from "./notion";

type 原因 = "販売" | "在庫移動" | "手動編集" | "Wix受注";

export async function logInventoryChange({
  商品名,
  商品PageId,
  拠点,
  変更前,
  変更後,
  原因,
  備考,
}: {
  商品名: string;
  商品PageId: string;
  拠点: string;
  変更前: number;
  変更後: number;
  原因: 原因;
  備考?: string;
}): Promise<void> {
  const 変動数 = 変更後 - 変更前;
  const sign = 変動数 >= 0 ? "+" : "";
  const title = `${商品名} / ${拠点} ${sign}${変動数}`;

  await notion.pages.create({
    parent: { data_source_id: DS.auditLog, type: "data_source_id" },
    properties: {
      変動内容: { title: [{ text: { content: title } }] },
      商品名: { rich_text: [{ text: { content: 商品名 } }] },
      商品PageId: { rich_text: [{ text: { content: 商品PageId } }] },
      拠点: { rich_text: [{ text: { content: 拠点 } }] },
      変更前: { number: 変更前 },
      変更後: { number: 変更後 },
      変動数: { number: 変動数 },
      原因: { select: { name: 原因 } },
      備考: { rich_text: [{ text: { content: 備考 ?? "" } }] },
    } as Parameters<typeof notion.pages.create>[0]["properties"],
  });
}
