# 技術仕様書 (Architecture Design Document)

> 対象: Horecast - LLM予想表示機能
> 関連: [PRD](./product-requirements.md) / [機能設計書](./functional-design.md)

---

## テクノロジースタック

### 言語・ランタイム

| 技術 | バージョン | 備考 |
|------|-----------|------|
| Node.js | 20.x LTS | Next.js 15が推奨するLTSバージョン |
| TypeScript | 5.x | 既存プロジェクトのスタック |
| npm | 10.x | 既存プロジェクトのパッケージマネージャー |

### フレームワーク・ライブラリ

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Next.js | 15.1.11 | Webフレームワーク | 既存プロジェクトのスタック。App RouterによるServer/Client Component分離が可能 |
| React | 19.0.2 | UIライブラリ | Next.js 15と組み合わせ。Suspenseによるローディング制御に対応 |
| Prisma | 6.1.0 | ORM | 既存プロジェクトのスタック。TypeSafe なDB操作、マイグレーション管理 |
| Tailwind CSS | 3.4.1 | スタイリング | 既存プロジェクトのスタック。ユーティリティクラスで一貫したUI |
| shadcn/ui | latest | UIコンポーネント | 既存プロジェクトのスタック。Card・Badge・Skeleton等を活用 |

### データベース

| 技術 | 用途 | 選定理由 |
|------|------|----------|
| PostgreSQL (Supabase) | メインDB | 既存プロジェクトのスタック。Supabaseによるマネージドサービス |

### 開発ツール

| 技術 | バージョン | 用途 |
|------|-----------|------|
| ESLint | 9.x | コード品質管理 |
| Turbopack | Next.js組み込み | 開発サーバー高速化 |

---

## アーキテクチャパターン

### Next.js App Router のレイヤー構成

```
┌─────────────────────────────────────────────┐
│ UIレイヤー (React Components)                │
│  Server Components: /races/[id]/page.tsx     │
│  Client Components: LlmPredictSection.tsx    │
├─────────────────────────────────────────────┤
│ APIレイヤー (Next.js Route Handlers)         │
│  /api/races/[id]/llm-predict/route.ts        │
├─────────────────────────────────────────────┤
│ データレイヤー (Prisma ORM)                  │
│  prisma.llmPredict.findMany()                │
├─────────────────────────────────────────────┤
│ データベース (Supabase PostgreSQL)           │
│  llm_predicts テーブル                       │
└─────────────────────────────────────────────┘
```

#### UIレイヤー
- **Server Components**: ページ全体の骨格・レース基本情報（既存の`/races/[id]/page.tsx`）
- **Client Components**: LLM予想セクション（`LlmPredictSection.tsx`）
- **責務**: ユーザーへのデータ表示、ローディング/エラー状態の制御
- **禁止**: Server ComponentからPrismaを直接呼ばずAPIを経由する（LlmPredict専用）

#### APIレイヤー
- **Route Handlers**: Next.js App Routerの`route.ts`
- **責務**: リクエストのバリデーション、Prismaを通じたDB取得、レスポンス整形
- **禁止**: ビジネスロジックの肥大化（このレイヤーは薄く保つ）

#### データレイヤー
- **Prisma ORM**: TypeSafeなDB操作
- **責務**: DBへのCRUD操作、スキーマ管理（マイグレーション）
- **禁止**: ビジネスロジックの実装

---

## データ永続化戦略

### ストレージ方式

| データ種別 | ストレージ | フォーマット | 備考 |
|-----------|----------|-------------|------|
| LLM予想結果 | Supabase PostgreSQL | llm_predicts テーブル | ユーザー（オーナー）がINSERT |
| レース・出馬情報 | Supabase PostgreSQL | 既存テーブル群 | 既存の仕組みを流用 |

### LLM予想データの書き込みフロー（オーナー担当）

```
LLMパイプライン（オーナー管理）
  ↓ LLMを呼び出して予想生成
  ↓ Supabase REST API または Prisma で INSERT
llm_predicts テーブル
  ↓ Horecast が読み取り
ユーザーのブラウザに表示
```

### Prismaスキーマへの追加

```prisma
// prisma/schema.prisma に追加
model LlmPredict {
  id           Int      @id @default(autoincrement())
  race_id      Int
  provider     String   // "openai", "claude", etc.
  first_pick   Int      // ◎ 推奨馬番
  second_pick  Int      // ○ 推奨馬番
  third_pick   Int      // ▲ 推奨馬番
  fourth_pick  Int      // △ 推奨馬番
  comment      String?  // 予想コメント

  created_at   DateTime @default(now())
  updated_at   DateTime @default(now()) @updatedAt

  race         Race     @relation(fields: [race_id], references: [id])

  @@unique([race_id, provider])
  @@index([race_id])
}
```

---

## パフォーマンス要件

### レスポンスタイム

| 操作 | 目標時間 | 測定環境 |
|------|---------|---------|
| LLM予想API（`GET /api/races/[id]/llm-predict`） | 500ms以内 | Supabase標準プラン、日本リージョン |
| レース詳細ページ初期表示（FCP） | 3秒以内 | 3G環境、LlmPredictSectionはスケルトン表示 |
| LlmPredictSectionのデータ反映 | 2秒以内 | APIレスポンス後のReact再描画 |

### パフォーマンス設計方針

**LlmPredictSectionの非同期ロード**:
```
ページ初期表示（サーバーサイドレンダリング）
  → LlmPredictSectionはスケルトンUIを描画
  → クライアントサイドでuseEffect + fetch
  → データ取得後に実コンテンツを描画
```
→ ページ初期表示をブロックしない設計

**DBインデックス最適化**:
```sql
-- race_id インデックスで高速検索
CREATE INDEX idx_llm_predicts_race_id ON llm_predicts(race_id);
-- race_id + provider のユニーク制約（インデックスも兼ねる）
CREATE UNIQUE INDEX idx_llm_predicts_race_provider ON llm_predicts(race_id, provider);
```

---

## セキュリティアーキテクチャ

### データ保護

| 項目 | 対策 |
|------|------|
| DB接続情報 | `.env`の`DATABASE_URL`・`DIRECT_URL`で管理。クライアントに露出しない |
| LLM予想データ | レース公開情報のみ。個人情報なし |
| APIエンドポイント | サーバーサイド（Route Handler）でのみDB接続 |

### 入力検証

- `race_id`はNext.jsのルートパラメータとして受け取り、数値変換できない場合は400を返す
- DBクエリはPrismaを使用（SQLインジェクション対策済み）

### アクセス制御

- `/api/races/[id]/llm-predict` は認証なしの公開エンドポイント（既存APIと同方針）
- Supabaseのrow level security（RLS）は`llm_predicts`テーブルに適用（既存`Predict`と同方針）

---

## スケーラビリティ設計

### LLMプロバイダーの拡張性

```
現在                    将来的な追加
─────────               ─────────────────────────
provider: "openai"   →  provider: "gemini"
provider: "claude"   →  provider: "grok"
                        provider: "deepseek"
```

**テーブル変更不要**: `provider` カラムが文字列型のため、新しいLLMプロバイダーを追加してもスキーマ変更が不要。

**UI変更不要**: `LlmPredictSection` はAPIレスポンスの配列をループして表示するため、新プロバイダーが増えても自動的にカードが追加される。

### データ量増加への対応

- **想定データ量**: レース数 × LLMプロバイダー数（例: 1日50レース × 2プロバイダー = 100行/日）
- **年間想定**: 約36,000行（十分に管理可能）
- **インデックス**: `race_id`インデックスで検索を高速化

---

## テスト戦略

### ユニットテスト

- **対象**: `GET /api/races/[id]/llm-predict` Route Handler
- **ツール**: Vitest または Jest（プロジェクトに合わせて選択）
- **シナリオ**:
  - データあり: LlmPredict配列を正しく返す
  - データなし: 空配列を返す
  - 無効なrace_id: 適切なエラーを返す

### 統合テスト（手動）

1. Supabaseに直接テストデータをINSERT
2. `/races/[id]` ページでLlmPredictSectionが表示されることを確認
3. データなしの場合の「予想データなし」表示を確認
4. モバイル・PCの両端末でレイアウトを確認

---

## 技術的制約

### 環境要件

- **Node.js**: 20.x LTS以上
- **環境変数**: `DATABASE_URL`, `DIRECT_URL`（既存、変更不要）
- **新規パッケージ追加**: 不要（既存スタックで実装可能）

### Prismaマイグレーション

```bash
# スキーマ変更後に実行
npx prisma migrate dev --name add_llm_predict
npx prisma generate
```

本番環境では `npm run build` に含まれる `prisma migrate deploy` が自動実行される。

---

## 依存関係管理

| ライブラリ | 用途 | バージョン管理方針 |
|-----------|------|-------------------|
| @prisma/client | DBアクセス | 既存固定（6.1.0）、スキーマ変更時に合わせて更新 |
| next | フレームワーク | 既存固定（15.1.11）|
| react | UIライブラリ | 既存固定（19.0.2）|
| tailwindcss | スタイリング | 既存固定（3.4.1）|

**方針**: 新規パッケージを追加しない。既存スタックで実装する。
