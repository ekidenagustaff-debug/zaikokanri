import { notion, DS } from "./notion";
import { logInventoryChange } from "./audit-log";

const LOCATION_PROPS = ["水上村", "町田寮", "陸上部"] as const;
type Location = (typeof LOCATION_PROPS)[number];

async function getProductSnapshot(商品PageId: string): Promise<{ 品名: string; value: number; page: unknown }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await notion.pages.retrieve({ page_id: 商品PageId }) as any;
  const 品名 = page.properties["品名"]?.title?.[0]?.plain_text ?? "";
  return { 品名, value: 0, page };
}

async function getLocationValue(商品PageId: string, 拠点: Location): Promise<{ value: number; 品名: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await notion.pages.retrieve({ page_id: 商品PageId }) as any;
  const value = page.properties[拠点]?.number ?? 0;
  const 品名 = page.properties["品名"]?.title?.[0]?.plain_text ?? "";
  return { value, 品名 };
}

export async function decreaseInventory(
  商品PageId: string | null,
  拠点: string,
  数量: number,
  原因: "販売" | "在庫移動" | "Wix受注" | "仕入れ" = "販売",
): Promise<void> {
  if (!商品PageId || !LOCATION_PROPS.includes(拠点 as Location)) return;
  const { value: current, 品名 } = await getLocationValue(商品PageId, 拠点 as Location);
  const next = Math.max(0, current - 数量);
  await notion.pages.update({
    page_id: 商品PageId,
    properties: { [拠点]: { number: next } },
  });
  await logInventoryChange({ 商品名: 品名, 商品PageId, 拠点, 変更前: current, 変更後: next, 原因 }).catch(() => {});
}

export async function increaseInventory(
  商品PageId: string | null,
  拠点: string,
  数量: number,
  原因: "販売" | "在庫移動" | "Wix受注" | "仕入れ" = "在庫移動",
  備考?: string,
): Promise<void> {
  if (!商品PageId || !LOCATION_PROPS.includes(拠点 as Location)) return;
  const { value: current, 品名 } = await getLocationValue(商品PageId, 拠点 as Location);
  const next = current + 数量;
  await notion.pages.update({
    page_id: 商品PageId,
    properties: { [拠点]: { number: next } },
  });
  await logInventoryChange({ 商品名: 品名, 商品PageId, 拠点, 変更前: current, 変更後: next, 原因, 備考 }).catch(() => {});
}

async function logMovement(params: {
  商品名: string;
  商品PageId: string | null;
  日付: string;
  移動数: number;
  移動元: string;
  移動先: string;
  種別: string;
  備考?: string;
}): Promise<void> {
  const props: Record<string, unknown> = {
    商品名: { title: [{ text: { content: params.商品名 } }] },
    日付: { date: { start: params.日付 } },
    移動数: { number: params.移動数 },
    移動元: { select: { name: params.移動元 } },
    移動先: { select: { name: params.移動先 } },
    種別: { select: { name: params.種別 } },
    備考: { rich_text: [{ text: { content: params.備考 ?? "" } }] },
  };
  if (params.商品PageId) {
    props["商品"] = { relation: [{ id: params.商品PageId }] };
  }
  await notion.pages.create({
    parent: { data_source_id: DS.movements, type: "data_source_id" },
    properties: props as Parameters<typeof notion.pages.create>[0]["properties"],
  });
}

export { getProductSnapshot, logMovement };
