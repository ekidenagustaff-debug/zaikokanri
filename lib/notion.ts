import { Client } from "@notionhq/client";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Data source IDs (collection IDs from Notion)
export const DS = {
  products: process.env.NOTION_DB_PRODUCTS!,
  sales: process.env.NOTION_DB_SALES!,
  movements: process.env.NOTION_DB_MOVEMENTS!,
  auditLog: process.env.NOTION_DB_AUDIT_LOG!,
  expenses: process.env.NOTION_DB_EXPENSES!,
};

export type Product = {
  pageId: string;
  品名: string;
  サイズ: string;
  カラー: string;
  仕入れ数: number | null;
  通常価格: number | null;
  関係者価格: number | null;
  陸上部卸値: number | null;
  購買会卸値: number | null;
  仕入れ額: number | null;
  原価: number | null;
  備考: string;
  水上村: number | null;
  町田寮: number | null;
  陸上部: number | null;
  購買会: number | null;
  オンライン: number | null;
  アーカイブ: boolean;
};

export type SaleRecord = {
  pageId: string;
  日付: string;
  商品名: string;
  商品PageId: string | null;
  販売数: number | null;
  価格種別: string;
  販売拠点: string;
  販売額: number | null;
  備考: string;
};

export type AuditLogRecord = {
  pageId: string;
  変動内容: string;
  日時: string;
  商品名: string;
  商品PageId: string;
  拠点: string;
  変更前: number | null;
  変更後: number | null;
  変動数: number | null;
  原因: string;
  備考: string;
};

export type ExpenseRecord = {
  pageId: string;
  件名: string;
  日付: string;
  金額: number | null;
  カテゴリ: string;
  備考: string;
};

export type MovementRecord = {
  pageId: string;
  日付: string;
  商品名: string;
  商品PageId: string | null;
  移動数: number | null;
  移動元: string;
  移動先: string;
  備考: string;
};

function getRichText(prop: unknown): string {
  const p = prop as { rich_text?: { plain_text: string }[] } | undefined;
  return p?.rich_text?.map((t) => t.plain_text).join("") ?? "";
}

function getTitle(prop: unknown): string {
  const p = prop as { title?: { plain_text: string }[] } | undefined;
  return p?.title?.map((t) => t.plain_text).join("") ?? "";
}

function getNumber(prop: unknown): number | null {
  const p = prop as { number?: number | null } | undefined;
  return p?.number ?? null;
}

function getSelect(prop: unknown): string {
  const p = prop as { select?: { name: string } | null } | undefined;
  return p?.select?.name ?? "";
}

function getDate(prop: unknown): string {
  const p = prop as { date?: { start: string } | null } | undefined;
  return p?.date?.start ?? "";
}

function getRelationId(prop: unknown): string | null {
  const p = prop as { relation?: { id: string }[] } | undefined;
  return p?.relation?.[0]?.id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseProduct(page: any): Product {
  const props = page.properties;
  return {
    pageId: page.id,
    品名: getTitle(props["品名"]),
    サイズ: getRichText(props["サイズ"]),
    カラー: getSelect(props["カラー"]),
    仕入れ数: getNumber(props["仕入れ数"]),
    通常価格: getNumber(props["通常価格"]),
    関係者価格: getNumber(props["関係者価格"]),
    陸上部卸値: getNumber(props["陸上部卸値"]),
    購買会卸値: getNumber(props["購買会卸値"]),

    仕入れ額: getNumber(props["仕入れ額"]),
    原価: getNumber(props["原価"]),
    備考: getRichText(props["備考"]),
    水上村: getNumber(props["水上村"]),
    町田寮: getNumber(props["町田寮"]),
    陸上部: getNumber(props["陸上部"]),
    購買会: getNumber(props["購買会"]),
    オンライン: getNumber(props["オンライン"]),
    アーカイブ: (props["アーカイブ"] as { checkbox?: boolean } | undefined)?.checkbox ?? false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSale(page: any): SaleRecord {
  const props = page.properties;
  return {
    pageId: page.id,
    日付: getDate(props["日付"]),
    商品名: getTitle(props["商品名"]),
    商品PageId: getRelationId(props["商品"]),
    販売数: getNumber(props["販売数"]),
    価格種別: getSelect(props["価格種別"]),
    販売拠点: getSelect(props["販売拠点"]),
    販売額: getNumber(props["販売額"]),
    備考: getRichText(props["備考"]),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAuditLog(page: any): AuditLogRecord {
  const props = page.properties;
  return {
    pageId: page.id,
    変動内容: getTitle(props["変動内容"]),
    日時: (props["日時"] as { created_time?: string } | undefined)?.created_time ?? page.created_time ?? "",
    商品名: getRichText(props["商品名"]),
    商品PageId: getRichText(props["商品PageId"]),
    拠点: getRichText(props["拠点"]),
    変更前: getNumber(props["変更前"]),
    変更後: getNumber(props["変更後"]),
    変動数: getNumber(props["変動数"]),
    原因: getSelect(props["原因"]),
    備考: getRichText(props["備考"]),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseExpense(page: any): ExpenseRecord {
  const props = page.properties;
  return {
    pageId: page.id,
    件名: getTitle(props["件名"]),
    日付: getDate(props["日付"]),
    金額: getNumber(props["金額"]),
    カテゴリ: getSelect(props["カテゴリ"]),
    備考: getRichText(props["備考"]),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMovement(page: any): MovementRecord {
  const props = page.properties;
  return {
    pageId: page.id,
    日付: getDate(props["日付"]),
    商品名: getTitle(props["商品名"]),
    商品PageId: getRelationId(props["商品"]),
    移動数: getNumber(props["移動数"]),
    移動元: getSelect(props["移動元"]),
    移動先: getSelect(props["移動先"]),
    備考: getRichText(props["備考"]),
  };
}
