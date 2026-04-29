# プロジェクト用語集 (Glossary)

## 概要

Horecastプロジェクト内で使用される用語の定義を管理します。
ドキュメント・コード・コミュニケーションにおいて一貫した用語を使用するために参照してください。

**更新日**: 2026-03-01

---

## ドメイン用語（競馬）

### LLM予想

**定義**: OpenAI・Claudeなどの大規模言語モデル（LLM）がレースの出馬情報を分析して生成した競馬の着順予想。

**説明**: ユーザー（オーナー）がLLMパイプラインを通じて生成し、Supabaseの `llm_predicts` テーブルに格納する。Horecastはその結果を読み取ってUIに表示する。

**関連用語**: プロバイダー, Predict（既存のAI予想スコア）

**使用例**:
- 「OpenAIのLLM予想では3番が◎（本命）」
- 「LLM予想セクションにClaudeとOpenAIの予想を表示する」

**英語表記**: LLM Prediction

---

### プロバイダー

**定義**: LLM予想を生成するAIサービスの提供元。`llm_predicts.provider` カラムで識別する文字列。

**説明**: 現在は `"openai"` と `"claude"` の2種類。新しいプロバイダーは `provider` カラムに新しい文字列値を追加するだけでテーブル変更なく対応可能。

**関連用語**: LLM予想, LlmPredict（Prismaモデル）

**使用例**:
- `provider: "openai"` — OpenAI（GPT-4o等）による予想
- `provider: "claude"` — Anthropic Claude による予想
- 将来: `provider: "gemini"`, `provider: "grok"` 等

**英語表記**: Provider

---

### 推奨馬番

**定義**: LLMが予想した、特定の順位（◎○▲△）で推奨する馬の番号（1〜18番）。

**説明**: `llm_predicts` テーブルでは `first_pick`（◎）、`second_pick`（○）、`third_pick`（▲）、`fourth_pick`（△）の4フィールドで管理（全て必須）。既存の `Predict.score` による予想マークとは独立した機能。

**関連用語**: ランクマーク, Predict

**使用例**:
- `first_pick: 3` — 3番馬を◎（本命）として推奨
- `second_pick: 7` — 7番馬を○（対抗）として推奨
- `fourth_pick: 4` — 4番馬を△（連下）として推奨

**英語表記**: Recommended Horse Number / Pick

---

### ランクマーク

**定義**: 推奨馬番に付与する記号。競馬予想の慣習的な記号体系。

**説明**: HorecastではLLM予想と既存の予想スコアの両方でこの記号体系を使用する。

| マーク | 読み | 意味 | DBフィールド | 備考 |
|--------|------|------|------------|------|
| ◎ | 二重丸（ほんめい） | 本命：最も勝つ可能性が高い馬 | `first_pick` | 必須 |
| ○ | 丸（たいこう） | 対抗：本命に次いで有力な馬 | `second_pick` | 必須 |
| ▲ | 三角（たんあな） | 単穴：穴馬として有力な馬 | `third_pick` | 必須 |
| △ | 白三角（れんか） | 連下：連勝式で絡む可能性がある馬 | `fourth_pick` | 必須 |
| × | バツ | 注意馬 | （既存Predictのみ） | LlmPredictでは未使用 |

**関連用語**: 推奨馬番, Predict

**英語表記**: Rank Mark / Prediction Mark

---

### 予想コメント

**定義**: LLMが予想根拠として生成した自然言語のテキスト。`llm_predicts.comment` カラムに格納。

**説明**: 最大500文字を想定。なぜその馬を推奨するかの理由を説明する文章。オプション項目（NULL可）。

**関連用語**: LLM予想, LlmPredict

**使用例**: 「前走で上がり3Fトップを記録した3番が有力。このコースの適性も高い。」

**英語表記**: Prediction Comment

---

### レース

**定義**: 競馬のレース1つ。Horecastでは `Race` Prismaモデルで管理。

**主要属性**: track（競馬場）, number（レース番号）, name（レース名）, course_type（コース種別）, distance（距離）, race_time（レース時刻）

**関連用語**: 出馬表, Entry, Result

**英語表記**: Race

---

### 出馬表

**定義**: レースに出走する馬・騎手の一覧。`Entry` Prismaモデルで管理。

**関連用語**: Entry, HorseMaster, JockeyMaster, EntryTable（コンポーネント）

**英語表記**: Entry List / Race Card

---

### コース種別

**定義**: レースが行われるコースの種別。UIのカラーコーディングに使用。

| 種別 | 説明 | UIカラー |
|------|------|---------|
| 芝 | 芝生のコース | green系 |
| ダート | 砂のコース | amber系 |
| 障害 | 障害物を飛び越えるコース | blue系 |

**英語表記**: Course Type

---

## 技術用語

### Next.js App Router

**定義**: Next.js 13以降の新しいルーティングシステム。`src/app/` ディレクトリ構造でページとAPIを定義する。

**本プロジェクトでの用途**: ページ（`page.tsx`）とAPIエンドポイント（`route.ts`）の両方を `src/app/` 以下で管理。Server ComponentとClient Componentを使い分ける。

**バージョン**: Next.js 15.1.11

---

### Server Component

**定義**: サーバーサイドでレンダリングされるReactコンポーネント。`'use client'` ディレクティブなし。

**本プロジェクトでの用途**: レース詳細ページ（`/races/[id]/page.tsx`）など、DBからデータを取得して静的にレンダリングするコンポーネント。

**関連用語**: Client Component

---

### Client Component

**定義**: クライアントサイド（ブラウザ）で動作するReactコンポーネント。ファイル先頭に `'use client'` ディレクティブを記述。

**本プロジェクトでの用途**: `LlmPredictSection`（LLM予想の非同期fetch）, `DateSelector`（状態管理）など。

**関連用語**: Server Component

---

### Prisma

**定義**: TypeScript対応のORM（Object-Relational Mapper）。スキーマ定義・マイグレーション・型安全なDBクエリを提供。

**本プロジェクトでの用途**: Supabase PostgreSQLへのアクセスに使用。`prisma/schema.prisma` でスキーマを管理。

**バージョン**: 6.1.0

---

### Supabase

**定義**: PostgreSQLをベースにしたマネージドBaaSプラットフォーム。

**本プロジェクトでの用途**: メインデータベース。環境変数 `DATABASE_URL`（プールあり）と `DIRECT_URL`（直接接続）で接続。

---

### Route Handler

**定義**: Next.js App Routerの `route.ts` ファイルで定義するAPIエンドポイント。

**本プロジェクトでの用途**: `/api/races/[id]/llm-predict/route.ts` などのAPIエンドポイント実装。

**関連用語**: Next.js App Router

---

### shadcn/ui

**定義**: Radix UIとTailwind CSSをベースにしたコピー&ペースト型UIコンポーネントライブラリ。

**本プロジェクトでの用途**: Card, Badge, Table, Skeleton, Button などのUIプリミティブとして使用。`src/app/components/ui/` に配置。

---

## 略語・頭字語

### LLM

**正式名称**: Large Language Model（大規模言語モデル）

**意味**: GPT-4, Claude, Geminiなど、大量のテキストで学習した大規模なAIモデル。

**本プロジェクトでの使用**: LLM予想機能のプロバイダーとして使用（OpenAI, Anthropic Claude）。

---

### ORM

**正式名称**: Object-Relational Mapper

**意味**: オブジェクト指向言語とリレーショナルデータベースの間のマッピングを行うツール。

**本プロジェクトでの使用**: Prismaとして採用。

---

### PRD

**正式名称**: Product Requirements Document（プロダクト要求定義書）

**意味**: プロダクトが何を実現すべきかを定義するドキュメント。

**本プロジェクトでの使用**: `docs/product-requirements.md`

---

### RLS

**正式名称**: Row Level Security

**意味**: データベースの行レベルのアクセス制御。

**本プロジェクトでの使用**: Supabaseで `Predict`, `LlmPredict` テーブルに適用。

---

## アーキテクチャ用語

### LLMパイプライン

**定義**: ユーザー（オーナー）が管理する、LLMを呼び出してレース予想を生成しSupabaseに格納するバッチ処理またはスクリプト。

**本プロジェクトでの適用**: Horecastのスコープ外。オーナーが独立して管理・運用する。HorecastはDBを読み取るだけ。

```
LLMパイプライン（オーナー管理）
  ↓ INSERT
llm_predicts テーブル
  ↓ SELECT
Horecast UI
```

---

### スケルトンUI

**定義**: コンテンツのローディング中に実際のコンテンツと同じ形状で表示されるプレースホルダーUI。

**本プロジェクトでの適用**: `LlmPredictSection` のローディング状態で使用。shadcn/uiの `Skeleton` コンポーネントを活用。コンテンツシフト（CLS）を防ぐ。

---

## データモデル用語

### LlmPredict（Prismaモデル）

**定義**: LLMによるレース予想結果を格納するPrismaモデル。DBテーブル名は `llm_predicts`。

**主要フィールド**:
- `id`: 自動採番（PK）
- `race_id`: Raceへの外部キー
- `provider`: LLMプロバイダー識別子（"openai", "claude" 等）
- `first_pick`: ◎推奨馬番
- `second_pick`: ○推奨馬番
- `third_pick`: ▲推奨馬番
- `fourth_pick`: △推奨馬番
- `comment`: 予想コメント（NULL可）

**関連エンティティ**: Race

**制約**:
- `[race_id, provider]` でユニーク制約
- `race_id` にインデックス

---

### Race（Prismaモデル）

**定義**: 競馬レースを管理するPrismaモデル。

**主要フィールド**: id, netkeiba_race_id, track, number, name, course_type, distance, race_time

**関連エンティティ**: Entry, Predict, Result, Payout, RecommendedBet, LlmPredict

---

### Predict（Prismaモデル）

**定義**: 既存のAI予想スコアを管理するPrismaモデル。LLM予想（LlmPredict）とは別の機能。

**説明**: `score` フィールドによる数値スコアで馬を評価し、EntryTableで◎○▲△×のマークとして表示される。

**関連用語**: LlmPredict（新機能）, ランクマーク

---

## コンポーネント用語

### LlmPredictSection

**定義**: レース詳細ページでLLM予想を表示するReactクライアントコンポーネント。

**ファイルパス**: `src/app/components/LlmPredictSection.tsx`

**Props**: `{ raceId: number }`

**表示位置**: `/races/[id]` ページの出馬表（EntryTable）直下

---

### EntryTable

**定義**: 出馬表を表示するReactコンポーネント。馬・騎手・既存AI予想スコア（◎○▲△×）を表示。

**ファイルパス**: `src/app/components/EntryTable.tsx`

**関連用語**: Predict, 出馬表

---

### RecommendedBets

**定義**: AI生成の推奨馬券（三連複・三連単等）を表示するコンポーネント。LLM予想とは別の機能。

**ファイルパス**: `src/app/components/RecommendedBets.tsx`
