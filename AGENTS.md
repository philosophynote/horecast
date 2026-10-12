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
- 主なモデル: `Race`, `Entry`, `HorseMaster`, `JockeyMaster`, `Predict`, `HorseIndicator`, `HorseTimeIndex`, `JockeyRacecourseRecord`, `RacePredictionComment`, `Result`, `Payout`, `RecommendedBet`
- 全モデルが自動採番のIDとタイムスタンプを持つ
- レースにはAI予想（`Predict` / `HorseIndicator`）と推奨馬券（`RecommendedBet`）が紐づく
- `HorseTimeIndex` はpredictorが生成する走破タイム指数。`Race` にない過去レースも持つため外部キーはなく、`netkeiba_race_id` で結合する
- `JockeyRacecourseRecord` はpredictorが集計する騎手成績（騎手 × 期間 × 競馬場 × 芝ダ × 距離帯）。`racecourse` / `surface` は `Race.track` / `Race.course_type` と同じ表記で、画面はレースの値をそのまま検索キーに使う。率は保存せず `rides` と各着数から計算する
- レースデータは外部ソース（netkeibaのID）を参照して取り込む

### APIルート

- `/api/races` — 日付（`date=yyyy-MM-dd`、未指定なら直近の開催日）のレース一覧を `{ date, summary, races }` で返す。各レースに独自予想とOpenAIの◎、確定済みか、推奨馬券の投資・払戻・的中を含み、`summary` はその日の生成済み・確定済み件数と独自予想の回収率・収支。関連は1回の `findMany` でまとめて取る（純粋な変換は `src/app/lib/raceList.ts`）
- `/api/races/[id]` — 関連データを含む単一レースの取得
- `/api/races/[id]/navigation` — 前後レースのID取得
- `/api/races/dates` — 開催日一覧の取得
- `/api/statistics` — 期間（`startDate` / `endDate`、`yyyy-MM-dd` のみ。不正は 400、未指定は保存規約の今日を含む30日）の的中・回収率統計。モデルごとに全体・レースごと・競馬場別（`trackStatistics`）・開催日ごとの累積収支（`cumulative`）を返す。確定済みのレースだけを対象にする。純粋な集計は `src/app/lib/investmentStats.ts`
- `/api/cron/delete-old-entries` — 1か月より古いデータの削除（定期実行用）

### ページ構成

- **トップページ**（`/`）— クライアントコンポーネント。開催日を横並びボタンで選び、本日のサマリー・AIピックアップ（両モデルの本命が一致した発走前のレース）・競馬場ごとのレース行（◎と的中／払戻／次に発走などの状態）を表示する。統計は `/statistics` へ
- **レース詳細**（`/races/[id]`）— サーバーコンポーネント。レース情報（想定ペース・状態・前後レース）、AIの結論（独自予想とOpenAIの印の比較と本命一致）、出馬表とAI指標（5段目盛り・直近5走のタイム指数）、AI予想コメント、推奨馬券（モデル切替）、確定後は結果と払戻を表示する。id が不正・該当なしは `notFound()`（`loading.tsx` があるためストリーミングになり、HTTP は 200 で `noindex` が付く）
- **投資成績**（`/statistics`）— 見出しはサーバーで描き、`InvestmentDashboard`（クライアント）が `/api/statistics` を取る。期間（7日／30日／90日と開始日・終了日）とモデル（独自予想／OpenAI）を切り替え、回収率・収支・的中率、累積収支の折れ線（Recharts）、券種別・競馬場別、レースごとの成績を表示する
- **タイム指数**（`/time-index`）— サーバーコンポーネント。指数の目盛り（70〜130、100 と 110 の目印）、絞り込み（競馬場・芝ダート・距離・クラス・馬場・信頼度・期間）、一覧（指数は 100 からの差を棒で表示）、分布（70未満と130以上を端の棒に持つヒストグラムと、件数・平均・最小・最大・信頼度の内訳、70未満が多いときの注意）、馬ごとの推移（折れ線。信頼度 低は白抜きの丸）を表示する。絞り込みはGETフォームでURLのクエリに持ち、期間未指定なら最新開催日から1週間を既定にして全件走査を避ける。`Race` に存在する行だけレース詳細へリンクする

### 主要コンポーネント

- `RaceHeader` / `RaceNavigation` / `AiVerdict` / `EntryTable` / `TimeIndexSparkline` / `RacePredictionCommentCard` / `RecommendedBets` / `RaceResultTable` / `PayoutTable` — レース詳細の見出し・前後レース・AIの結論・出馬表（指標は `IndicatorMeter`、タイム指数は小さな折れ線）・AIコメントのカード・推奨馬券（`'use client'`、表示用に整えたデータだけ受け取る）・結果・払戻。印・結論・スパークライン・結果と払戻の並び・馬券のまとめは `src/app/lib/raceDetail.ts`
- `RaceDateTabs` / `RaceDaySummaryCards` / `AiPickupList` / `TrackRaceList` / `RaceRow` — トップページの開催日ボタン・サマリー・ピックアップ・競馬場列・レース行。状態判定や日付の扱いは `src/app/lib/raceList.ts`
- `RacePredictionComments` — AIコメントの取得（async、Suspense で後から流す）。表示は `RacePredictionCommentCard`
- `InvestmentDashboard` / `InvestmentKpis` / `ReturnRateBar` / `CumulativeProfitChart` / `BetTypeBreakdown` / `TrackBreakdown` / `RaceStatisticsTable` — 投資成績ダッシュボードの取得と切替・主要指標・回収率の横棒（100% の目印つき）・累積収支の折れ線・券種別・競馬場別・レースごとの表。純粋ロジックは `src/app/lib/investmentStats.ts`
- `TimeIndexScale` / `TimeIndexFilterForm` / `TimeIndexTable` / `TimeIndexPagination` / `TimeIndexDistribution` / `TimeIndexHorseTrend` / `ConfidencePill` — タイム指数ダッシュボードの目盛り・絞り込み・一覧・ページ送り・分布（ヒストグラム）・馬ごとの推移（SVG折れ線）・信頼度の表示。クエリの組み立ては `src/app/lib/timeIndexFilters.ts`、表示用の座標計算は `src/app/lib/timeIndexChart.ts`、DBアクセスは `src/app/lib/timeIndex.ts`

### データ取得の方針

1. **クライアント側フェッチ** — トップページなど動的に切り替わる画面（`useState` / `useEffect` からAPIルートを呼ぶ）
2. **サーバー側直接クエリ** — レース詳細はサーバーコンポーネントからPrismaを直接呼ぶ（APIルートを経由しない）
3. **キャッシュなし**（`cache: 'no-store'`）— リアルタイム性が必要なレースデータ
4. **グルーピング表示** — 競馬場や券種ごとの集約にlodashの `groupBy` を使う

### スタイリングとUI

- **Tailwind CSS v4 + shadcn/ui** — 色はすべて `src/app/globals.css` のテーマ変数（`bg-background` `bg-card` `text-muted-foreground` `border-border` など）で指定し、`bg-white` や `text-gray-500` のような固定色は使わない
- **ライト／ダーク** — ライトは「ターフ」、ダークは「夜の計測盤」。`next-themes` が `<html>` に `class="dark"` を付け外しし、OS設定に従う＋ヘッダーの切替ボタンで変更できる。shadcn に無い役割は `text-positive`（プラス）`text-negative`（マイナス）`text-slow`（遅い指数）`bg-input-background`（入力欄）で指定する。`text-primary` `text-negative` `text-slow` は `/80` などで薄めない（ライトの `bg-muted` 上で 4.6:1 とぎりぎりのため）
- **書体** — 本文は IBM Plex Sans JP、数字は IBM Plex Mono。数字には `numeric` ユーティリティ（等幅＋桁揃え）を付け、`tabular-nums` 単独は使わない
- **共通の小部品**（`src/app/components/`） — `FrameNumber`（枠番の色付き番号）、`IndicatorMeter`（AI指標の5段目盛り）、`CourseTypeMark`（芝・ダート・障害の印。色は印だけで文字には付けない）、`SignedYen` / `ReturnRate`（符号付きの収支・回収率）。純粋なロジックは `src/app/lib/` の `frameColors.ts` `indicatorMeter.ts` `courseType.ts` `signedFormat.ts`
- **タイム指数の色** — 110 以上は強調（`text-primary`）、90 未満は遅い指数の色（`text-slow`）。判定は `timeIndexTone`（`src/app/lib/timeIndexChart.ts`）を使い、閾値を各所で書かない
- **グラフ** — shadcn/ui の Chart（`src/app/components/ui/chart.tsx`、Recharts 2.15）を使う。線の色は `ChartConfig` に `var(--primary)` のようなテーマ変数を渡す。`chart.tsx` は Tailwind v4 向けに `border-(--color-border)` の記法へ直してある。小さな図（スパークラインなど）は素の SVG にテーマのクラス（`stroke-primary` など）で色を付ける
- **レスポンシブ** — モバイルファースト。広い表は枠内で横スクロールさせる

### 日時の扱い

- 日付整形は `date-fns` と `date-fns-tz` を使う
- `race_time` は JST の壁時計を UTC として保存している（09:50 JST → `09:50Z`、`timestamp(6)`）。表示は `formatInTimeZone(..., 'UTC', ...)` で整形し、現在時刻と比べるときは `nowAsStoredClock`（+9時間）で同じ規約へ寄せる。`timestamptz` の列（`generated_at` など）だけ `'Asia/Tokyo'` で整形する
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
- predictorが書き込む新テーブルを追加するときは、マイグレーションに `service_role` への GRANT（テーブルの SELECT / INSERT / UPDATE / DELETE とシーケンスの USAGE / SELECT）を含める。RLS は有効にし、anon・authenticated 向けポリシーは作らない

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
