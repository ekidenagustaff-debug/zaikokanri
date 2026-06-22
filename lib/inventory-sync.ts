import { notion } from "./notion";

const LOCATION_PROPS = ["水上村", "町田寮", "陸上部", "購買会", "オンライン"] as const;
type Location = (typeof LOCATION_PROPS)[number];

async function getLocationValue(商品PageId: string, 拠点: Location): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await notion.pages.retrieve({ page_id: 商品PageId }) as any;
  return page.properties[拠点]?.number ?? 0;
}

export async function decreaseInventory(商品PageId: string | null, 拠点: string, 数量: number): Promise<void> {
  if (!商品PageId || !LOCATION_PROPS.includes(拠点 as Location)) return;
  const current = await getLocationValue(商品PageId, 拠点 as Location);
  await notion.pages.update({
    page_id: 商品PageId,
    properties: { [拠点]: { number: Math.max(0, current - 数量) } },
  });
}

export async function increaseInventory(商品PageId: string | null, 拠点: string, 数量: number): Promise<void> {
  if (!商品PageId || !LOCATION_PROPS.includes(拠点 as Location)) return;
  const current = await getLocationValue(商品PageId, 拠点 as Location);
  await notion.pages.update({
    page_id: 商品PageId,
    properties: { [拠点]: { number: current + 数量 } },
  });
}
