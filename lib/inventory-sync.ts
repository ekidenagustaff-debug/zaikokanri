import { notion, DS } from "./notion";

const LOCATION_PROPS = ["水上村", "町田寮", "陸上部", "購買会", "オンライン"] as const;
type Location = (typeof LOCATION_PROPS)[number];

async function findInventoryRecord(商品PageId: string): Promise<{ pageId: string; data: Record<Location, number> } | null> {
  const res = await notion.dataSources.query({
    data_source_id: DS.inventory,
    filter: { property: "商品", relation: { contains: 商品PageId } },
    page_size: 1,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = res.results.find((r: any) => r.properties) as any;
  if (!page) return null;

  const data = {} as Record<Location, number>;
  for (const loc of LOCATION_PROPS) {
    data[loc] = page.properties[loc]?.number ?? 0;
  }
  return { pageId: page.id, data };
}

export async function decreaseInventory(商品PageId: string | null, 拠点: string, 数量: number): Promise<void> {
  if (!商品PageId || !LOCATION_PROPS.includes(拠点 as Location)) return;
  const record = await findInventoryRecord(商品PageId);
  if (!record) return;
  const current = record.data[拠点 as Location];
  await notion.pages.update({
    page_id: record.pageId,
    properties: { [拠点]: { number: Math.max(0, current - 数量) } },
  });
}

export async function increaseInventory(商品PageId: string | null, 拠点: string, 数量: number): Promise<void> {
  if (!商品PageId || !LOCATION_PROPS.includes(拠点 as Location)) return;
  const record = await findInventoryRecord(商品PageId);
  if (!record) return;
  const current = record.data[拠点 as Location];
  await notion.pages.update({
    page_id: record.pageId,
    properties: { [拠点]: { number: current + 数量 } },
  });
}
