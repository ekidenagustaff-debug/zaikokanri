@AGENTS.md

# データ操作の方針

Notionへのデータ書き込み・読み込みは、APIサーバー（Next.js dev server）経由ではなく、
**MCP Notionツール（mcp__Notion__*）を直接使う**こと。

- `notion-create-pages`: 販売記録・経費などの新規登録
- `notion-update-page`: 在庫数などのプロパティ更新
- `notion-query-data-sources`: データの検索・集計（view modeを優先）
- `notion-fetch`: DBスキーマ・データソースURLの確認

dev serverの起動（npx next dev など）は不要。
