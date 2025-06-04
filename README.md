# Horecast

Horecast は競馬のレース結果や AI 予想を表示する Next.js 製の Web アプリケーションです。レース情報を PostgreSQL データベースから取得し、出馬表やレース結果、配当、AI が算出したおすすめ馬券などを閲覧できます。

## 起動方法

1. 依存関係をインストールします。
   ```bash
   npm install
   ```
2. `.env` ファイルに以下の環境変数を設定します。（データベース接続情報など）
   ```
   DATABASE_URL=<PostgreSQL の接続 URL>
   DIRECT_URL=<PostgreSQL の接続 URL（内部用）>
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```
3. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```
   ブラウザで [http://localhost:3000](http://localhost:3000) を開くとアプリケーションが表示されます。

本番用ビルドを作成する場合は次を実行します。
```bash
npm run build
npm start
```

## プロジェクト構成

- **src/app/** – Next.js のページや API ルート、UI コンポーネントを配置
  - `api/` – Prisma を利用した API エンドポイント
  - `components/` – 画面で使用する React コンポーネント群
  - `races/` – `/races/[id]` ページなど、レース表示に関するルート
- **src/lib/** – 共通で使うユーティリティ
- **prisma/** – Prisma スキーマとマイグレーションファイル
- **public/** – 画像やアイコンなど静的アセット

## ディレクトリ構造

```
prisma/
  migrations/
  schema.prisma
public/
  favicon.ico
  ...
src/
  app/
    api/
      races/
        [id]/route.ts
        route.ts
    components/
      EntryTable.tsx
      Header.tsx
      ...
    races/
      [id]/page.tsx
    layout.tsx
    page.tsx
  lib/
    utils.ts
```

## 使用技術

- **Next.js 15** / **React 19** – アプリケーションフレームワーク
- **TypeScript** – 型安全なフロントエンド開発
- **Prisma** – PostgreSQL と接続する ORM
- **Tailwind CSS** – UI スタイリング
- **shadcn/ui** – 汎用 UI コンポーネント
- **date-fns**, **lodash** などのユーティリティライブラリ

