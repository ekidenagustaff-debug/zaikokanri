import { notion, DS } from "./notion";

const LOCATIONS = ["水上村", "町田寮", "陸上部", "購買会"];

export async function getProductMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const res = await notion.dataSources.query({
      data_source_id: DS.products,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.results.forEach((r: any) => {
      if (r.properties?.品名?.title?.[0]?.plain_text) {
        const name = r.properties.品名.title[0].plain_text;
        map.set(name, r.id);
      }
    });

    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return map;
}

export async function createProductIfNotExists(商品名: string): Promise<string> {
  const productMap = await getProductMap();
  if (productMap.has(商品名)) {
    return productMap.get(商品名)!;
  }

  // 商品マスタに新規作成
  const productPage = await notion.pages.create({
    parent: { data_source_id: DS.products, type: "data_source_id" },
    properties: {
      品名: { title: [{ text: { content: 商品名 } }] },
    } as Parameters<typeof notion.pages.create>[0]["properties"],
  });

  const productPageId = productPage.id;

  // 商品マスタに在庫カラムを初期値0で設定（別DBなし・統合済み）
  await notion.pages.update({
    page_id: productPageId,
    properties: Object.fromEntries(LOCATIONS.map((l) => [l, { number: 0 }])) as Parameters<typeof notion.pages.update>[0]["properties"],
  });

  return productPageId;
}
