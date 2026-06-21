import { notion, DS } from "./notion";

async function findInventoryRecord(商品PageId: string, 拠点: string): Promise<{ pageId: string; 在庫数: number } | null> {
  const res = await notion.dataSources.query({
    data_source_id: DS.inventory,
    filter: {
      and: [
        { property: "商品", relation: { contains: 商品PageId } },
        { property: "拠点", select: { equals: 拠点 } },
      ],
    },
    page_size: 1,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = res.results.find((r: any) => r.properties) as any;
  if (!page) return null;

  const 在庫数 = page.properties["在庫数"]?.number ?? 0;
  return { pageId: page.id, 在庫数 };
}

export async function decreaseInventory(商品PageId: string | null, 拠点: string, 数量: number): Promise<void> {
  if (!商品PageId) return;
  const record = await findInventoryRecord(商品PageId, 拠点);
  if (!record) return;
  await notion.pages.update({
    page_id: record.pageId,
    properties: { 在庫数: { number: Math.max(0, record.在庫数 - 数量) } },
  });
}

export async function increaseInventory(商品PageId: string | null, 拠点: string, 数量: number): Promise<void> {
  if (!商品PageId) return;
  const record = await findInventoryRecord(商品PageId, 拠点);
  if (!record) return;
  await notion.pages.update({
    page_id: record.pageId,
    properties: { 在庫数: { number: record.在庫数 + 数量 } },
  });
}
