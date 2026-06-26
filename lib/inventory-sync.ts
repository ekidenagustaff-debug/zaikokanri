import { notion, DS } from "./notion";

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

export { logMovement };
