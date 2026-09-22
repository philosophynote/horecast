# リポジトリガイドライン

競馬予想アプリ「horecast」（Next.js 16 + Prisma + Supabase）のガイドラインです。コードを変更する前に目を通してください。

## プロジェクト構成

- `src/app/` — App Routerのページ、APIルート、UIコンポーネント
- `src/app/api/**/route.ts` — サーバーエンドポイント（レース一覧・レース詳細・前後ナビゲーション・統計・不要データ削除のcron）
- `src/app/components/` — 機能単位のコンポーネント。`src/app/components/ui/` は再利用するUIプリミティブ
- `src/app/lib/` と `src/lib/` — 共有ヘルパー（`src/lib/prisma.ts` がPrismaクライアント）
- `prisma/` — スキーマ（`schema.prisma`）とマイグレーション。接続とマイグレーションの設定は `prisma.config.ts`
- `public/` — 静的ファイル（画像、アイコン、`public/data/` 配下のJSON）
- `docs/` — 設計ドキュメント（アーキテクチャ、機能設計、開発ガイドラインなど）

## 開発コマンド

```bash
npm install          # 依存関係のインストール
npm run dev          # Turbopackで開発サーバーを起動（http://localhost:3000）
npm run lint         # ESLint（eslint .）を実行。Next 16 で next lint は廃止された
npm test             # Vitestを1回実行（vitest run）
npm run test:watch   # Vitestをウォッチモードで実行
npm run build        # prisma generate → prisma migrate deploy → next build
npm start            # 本番ビルドをローカルで起動
```

## 環境設定

`.env` に必要な環境変数：

- `DATABASE_URL` — Supabase PostgreSQL接続文字列（実行時はドライバアダプタ経由で使用）
- `DIRECT_URL` — Supabase直接接続文字列（マイグレーションはプーラを介さずこちらを使う）
- `NEXT_PUBLIC_API_URL` — 公開URL。`layout.tsx` の `metadataBase` に使う（未設定なら `http://localhost:3000`）
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — Google Analytics ID（任意。未設定ならGAタグを出力しない）

## アーキテクチャ概要

### データベースとORM

- PostgreSQL（Supabase）を **Prisma ORM** 経由で利用
- 主なモデル: `Race`, `Entry`, `HorseMaster`, `JockeyMaster`, `Predict`, `HorseIndicator`, `HorseTimeIndex`, `RacePredictionComment`, `Result`, `Payout`, `RecommendedBet`
- 全モデルが自動採番のIDとタイムスタンプを持つ
- レースにはAI予想（`Predict` / `HorseIndicator`）と推奨馬券（`RecommendedBet`）が紐づく
- `HorseTimeIndex` はpredictorが生成する走破タイム指数。`Race` にない過去レースも持つため外部キーはなく、`netkeiba_race_id` で結合する
- レースデータは外部ソース（netkeibaのID）を参照して取り込む

### APIルート

- `/api/races` — 日付でレースを取得（未指定なら直近のレース開催日）
- `/api/races/[id]` — 関連データを含む単一レースの取得
- `/api/races/[id]/navigation` — 前後レースのID取得
- `/api/races/dates` — 開催日一覧の取得
- `/api/statistics` — 期間指定の的中・回収率統計（未指定なら過去30日）
- `/api/cron/delete-old-entries` — 1か月より古いデータの削除（定期実行用）

### ページ構成

- **トップページ**（`/`）— クライアントコンポーネント。日付を選んでレース一覧を競馬場ごとに表示し、統計タブも持つ
- **レース詳細**（`/races/[id]`）— サーバーコンポーネント。出馬表とAI予想、推奨馬券、レース結果、配当、前後レースへのナビゲーションを表示
- **タイム指数**（`/time-index`）— サーバーコンポーネント。`HorseTimeIndex` を絞り込み（競馬場・芝ダート・距離・クラス・馬場・期間・信頼度）付きで一覧・分布・馬ごとの推移として表示する。絞り込みはGETフォームでURLのクエリに持ち、期間未指定なら最新開催日から1週間を既定にして全件走査を避ける。`Race` に存在する行だけレース詳細へリンクする

### 主要コンポーネント

- `EntryTable` — 出馬表（馬・騎手・AI予想スコア）
- `RaceCard` — トップページのレース概要カード
- `RecommendedBets` — AIが生成した推奨馬券
- `RaceResultTable` — レース結果とオッズ
- `PayoutTable` — 払戻情報
- `RacePredictionComments` — AI予想のコメントと警告
- `StatisticsView` — モデル別の成績統計
- `TimeIndexFilterForm` / `TimeIndexTable` / `TimeIndexDistribution` / `TimeIndexHorseTrend` — タイム指数ダッシュボードの絞り込み・一覧・分布（SVGヒストグラム）・馬ごとの推移（SVG折れ線）。純粋なヘルパーは `src/app/lib/timeIndexFilters.ts`、DBアクセスは `src/app/lib/timeIndex.ts`
- `DateSelector` — カレンダーによる開催日選択
- `NavigationButtons` — 前後レースへの移動

### データ取得の方針

1. **クライアント側フェッチ** — トップページなど動的に切り替わる画面（`useState` / `useEffect` からAPIルートを呼ぶ）
2. **サーバー側直接クエリ** — レース詳細はサーバーコンポーネントからPrismaを直接呼ぶ（APIルートを経由しない）
3. **キャッシュなし**（`cache: 'no-store'`）— リアルタイム性が必要なレースデータ
4. **グルーピング表示** — 競馬場や券種ごとの集約にlodashの `groupBy` を使う

### スタイリングとUI

- **Tailwind CSS** — コース種別（芝／ダート／障害）に応じたグラデーションを使い分ける
- **shadcn/ui** — UIパターンを揃えるためのコンポーネント
- **レスポンシブ** — モバイルファースト
- **日本語テキスト** — Geistフォントで表示

### 日時の扱い

- 日付整形は `date-fns` と `date-fns-tz` を使う
- レース時刻はUTCで保存し、表示時にローカルタイムゾーンへ変換する
- レースの絞り込みとナビゲーションは日付を基準にする

## コーディング規約

- TypeScriptと関数コンポーネントで書く
- 名前はドメイン用語（race, entry, payout, predict）に合わせて具体的にする
- Next.jsのファイル規約に従う: `page.tsx`, `layout.tsx`, `route.ts`
- コンポーネントファイルは `PascalCase`（例: `RaceCard.tsx`）、ユーティリティ関数は `camelCase`
- 編集するファイルの既存スタイルに合わせる。コメントは短く、意図を書く
- TypeScriptのパスエイリアス: `@/*` は `./src/*`
- ESLintはNext.jsとTypeScriptのルールで設定済み

## テスト方針

- テストランナーはVitest。設定は `vitest.config.mts`（node環境、`@/*` エイリアス）
- テストは対象コードの隣に `*.test.ts(x)` の名前で置く
- 変更したら `npm run lint` と `npm test` を実行する
- `.github/workflows/test.yml` が `main` へのpushとPRでlintとテストを実行する
- 主要な画面は手動でも確認する: トップページ、`/races/[id]`、関連するAPIレスポンス
- データベーススキーマを変更したらPrismaマイグレーションを追加する

## コミットとPull Request

- コミットは小さく、目的を1つに絞る。変更内容が分かるメッセージにまとめる（日本語・英語どちらでもよい）
- 履歴では `(#31)` のようなissue参照や、`fix:` `feat:` といったprefixを使うことがある
- コミット前に可能な範囲で `npm run lint` を実行し、エラーがないことを確認する
- PRには目的、変更範囲、UI変更ならスクリーンショット、マイグレーションの影響（`prisma/migrations`）、動作確認の手順を書く
- テストやビルドを実行できなかった場合は、その旨をPRの説明に書く
- 親issueを1つのPRにまとめず、子issueごとにPRを分け、依存順にbaseを積む（スタックPR）

## セキュリティと設定

- シークレットや `.env` の内容をコミットしない
- Prismaを使う操作には `DATABASE_URL` と `DIRECT_URL` が必要
- 機微な値をログに出さない。SQLやコマンドにユーザー入力をそのまま渡さない

## Playwright MCPの利用ルール

### 禁止事項

1. **いかなる形式のコード実行も禁止**
   - Python、JavaScript、Bash等でのブラウザ操作
   - MCPツールを調査するためのコード実行
   - subprocessやコマンド実行によるアプローチ

2. **使ってよいのはMCPツールの直接呼び出しだけ**
   - `playwright:browser_navigate`
   - `playwright:browser_screenshot`
   - その他のPlaywright MCPツール

3. **エラー時は即座に報告する**
   - 回避策を探さない
   - 代替手段を実行しない
   - エラーメッセージをそのまま伝える

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
