# CLAUDE.md

このファイルは、このリポジトリでコードを操作する際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 一般的な開発コマンド

```bash
# Turbopackを使った開発サーバー
npm run dev

# 本番環境用ビルド（Prismaの生成とマイグレーションを含む）
npm run build

# 本番サーバー
npm start

# リンティング
npm run lint
```

## 環境設定

`.env` に必要な環境変数：

- `DATABASE_URL` - Supabase PostgreSQL接続文字列
- `DIRECT_URL` - Supabase直接接続文字列
- `NEXT_PUBLIC_API_URL` - APIベースURL（ローカル開発用: <http://localhost:3000>）
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics ID（オプション）

## アーキテクチャ概要

これは以下の主要なアーキテクチャパターンを持つNext.js 15競馬予想アプリケーションです：

### データベース & ORM

- **Prisma ORM** with PostgreSQL (Supabase)
- 主要エンティティ: `Race`, `Entry`, `HorseMaster`, `JockeyMaster`, `Predict`, `Result`, `Payout`, `RecommendedBet`
- 全モデルでタイムスタンプ付きの自動増分IDを使用
- レース結果にはAI予想（`Predict`）と推奨馬券（`RecommendedBet`）が含まれる

### API構造

- `/api/races` - 日付別レース取得（最寄りのレース日がデフォルト）
- `/api/races/[id]` - 関連データ全てを含む単一レース取得
- `/api/races/[id]/navigation` - ナビゲーション用の前後レースID取得
- `/api/races/dates` - 利用可能なレース日付取得

### ページアーキテクチャ

- **ホームページ** (`/`) - 競馬場別グループ化による日付ベースのレース一覧
- **レース詳細** (`/races/[id]`) - 以下を含む完全なレース情報：
  - AI予想付き出馬表
  - 推奨馬券
  - レース結果（終了済みの場合）
  - 配当情報（利用可能な場合）
  - レース間ナビゲーション

### 主要コンポーネント

- `EntryTable` - 馬、騎手、AI予想スコアの表示
- `RaceCard` - ホームページのレース概要カード
- `RecommendedBets` - AI生成の馬券推奨
- `RaceResultTable` - レース着順とオッズ
- `PayoutTable` - 馬券配当情報
- `DateSelector` - カレンダーベースのレース日選択
- `NavigationButtons` - 前後レースナビゲーション

### データフローパターン

1. **クライアントサイドデータ取得** - 動的コンテンツ用（ホームページで`useState`/`useEffect`使用）
2. **サーバーサイドデータ取得** - レース詳細用（サーバーコンポーネントで`fetch`使用）
3. **ノーキャッシュ戦略** (`cache: 'no-store'`) - リアルタイムレースデータ用
4. **グループ化データ表示** - 競馬場と日付でlodash `groupBy`使用

### スタイリング & UI

- **Tailwind CSS** - コース種別（芝/ダート/障害）に基づくカスタムグラデーション
- **shadcn/ui** - 一貫したUIパターン用コンポーネント
- **レスポンシブデザイン** - モバイルファーストアプローチ
- **日本語テキスト** - 適切なフォント処理（Geist）をサポート

### 時間処理

- タイムゾーン対応の日付フォーマットに`date-fns`と`date-fns-tz`を使用
- レース時刻はUTCで保存、ローカルタイムゾーンで表示
- 日付ベースのレースフィルタリングとナビゲーション

## 開発ノート

- TypeScriptパスエイリアス: `@/*` は `./src/*` にマップ
- Next.jsとTypeScriptルールでESLint設定済み
- 変更後は`npm run lint`を実行してコード品質を確保
- データベーススキーマ変更にはPrismaマイグレーションが必要
- 全レースデータは外部ソース（netkeiba ID参照）から取得

## Playwright MCP使用ルール

### 絶対的な禁止事項

1. **いかなる形式のコード実行も禁止**

   - Python、JavaScript、Bash等でのブラウザ操作
   - MCPツールを調査するためのコード実行
   - subprocessやコマンド実行によるアプローチ

2. **利用可能なのはMCPツールの直接呼び出しのみ**

   - playwright:browser_navigate
   - playwright:browser_screenshot
   - 他のPlaywright MCPツール

3. **エラー時は即座に報告**
   - 回避策を探さない
   - 代替手段を実行しない
   - エラーメッセージをそのまま伝える

