# リポジトリ構造定義書 (Repository Structure Document)

> 対象: Horecast - LLM予想表示機能追加後の構造
> 関連: [アーキテクチャ設計書](./architecture.md)

---

## プロジェクト全体構造

```text
horecast/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # Route Handlers (APIエンドポイント)
│   │   │   ├── races/
│   │   │   │   ├── route.ts        # GET /api/races
│   │   │   │   ├── dates/
│   │   │   │   │   └── route.ts    # GET /api/races/dates
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET /api/races/[id]
│   │   │   │       ├── navigation/
│   │   │   │       │   └── route.ts      # GET /api/races/[id]/navigation
│   │   │   │       └── llm-predict/
│   │   │   │           └── route.ts      # GET /api/races/[id]/llm-predict ← NEW
│   │   │   └── statistics/
│   │   │       └── route.ts        # GET /api/statistics
│   │   ├── components/             # 共有Reactコンポーネント
│   │   │   ├── ui/                 # shadcn/ui プリミティブ
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── skeleton.tsx    # ← NEW (スケルトンUI用)
│   │   │   │   └── table.tsx
│   │   │   ├── DateSelector.tsx
│   │   │   ├── EntryTable.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LlmPredictSection.tsx  # ← NEW (LLM予想表示)
│   │   │   ├── NavigationButtons.tsx
│   │   │   ├── PayoutTable.tsx
│   │   │   ├── RaceCard.tsx
│   │   │   ├── RaceResultTable.tsx
│   │   │   ├── RecommendedBets.tsx
│   │   │   ├── SidebarClient.tsx
│   │   │   └── StatisticsView.tsx
│   │   ├── lib/
│   │   │   └── statistics.ts
│   │   ├── races/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # レース詳細ページ（LlmPredictSection追加）
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                # ホームページ
│   └── lib/
│       └── utils.ts                # cn() ユーティリティ
├── prisma/
│   ├── schema.prisma               # スキーマ（LlmPredictモデル追加）← UPDATED
│   └── migrations/
│       ├── 0_init/
│       ├── 20250505091437_add_default_to_updated_at/
│       └── YYYYMMDDHHMMSS_add_llm_predict/ ← NEW
│           └── migration.sql
├── docs/                           # プロジェクトドキュメント
│   ├── ideas/
│   │   └── llm-predict.md
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md     # 本ドキュメント
│   ├── development-guidelines.md
│   └── glossary.md
├── public/                         # 静的アセット
├── .env                            # 環境変数（git管理外）
├── .env.example                    # 環境変数サンプル
├── components.json                 # shadcn/ui設定
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## ディレクトリ詳細

### `src/app/api/` (APIレイヤー)

**役割**: Next.js Route Handlers。DBからデータを取得してJSONで返す。

**配置ファイル**:
- `route.ts`: 各エンドポイントのハンドラー（1ディレクトリ1ファイル）

**命名規則**:
- ディレクトリ名はkebab-case（例: `llm-predict/`）
- ファイル名は常に `route.ts`（Next.js規約）

**依存関係**:
- 依存可能: Prisma Client (`@prisma/client`)
- 依存禁止: Reactコンポーネント、`src/app/components/`

**新規追加ファイル**:
```text
src/app/api/races/[id]/llm-predict/
└── route.ts   # LLM予想取得APIエンドポイント
```

---

### `src/app/components/` (UIレイヤー)

**役割**: Reactコンポーネント。データを表示するUIを構成する。

**配置ファイル**:
- 機能コンポーネント: `PascalCase.tsx`（例: `LlmPredictSection.tsx`）
- shadcn/ui プリミティブ: `src/app/components/ui/` 以下

**命名規則**:
- コンポーネントファイル: `PascalCase.tsx`
- Server Component: デフォルト（`'use client'` なし）
- Client Component: ファイル先頭に `'use client'` を明記

**LlmPredictSection の特性**:
- `'use client'` ディレクティブあり（useEffect + fetchを使用）
- Props: `{ raceId: number }`

**依存関係**:
- 依存可能: `src/app/components/ui/`, `src/lib/utils.ts`
- 依存禁止: Prisma Client（APIを経由すること）

**新規追加ファイル**:
```text
src/app/components/
├── LlmPredictSection.tsx   # LLM予想カードコンポーネント (Client Component)
└── ui/
    └── skeleton.tsx        # スケルトンローダーUI（未インストールなら追加）
```

---

### `src/app/races/[id]/` (ページレイヤー)

**役割**: レース詳細ページ（Server Component）。

**変更内容**:
- `page.tsx` に `<LlmPredictSection raceId={race.id} />` を追加
- `<EntryTable />` の直下に配置

**依存関係**:
- 依存可能: `src/app/components/`, APIエンドポイント（fetch）
- 依存禁止: Prisma Client（既存の直接fetchパターンは維持）

---

### `prisma/` (データレイヤー)

**役割**: DBスキーマ定義とマイグレーション管理。

**変更内容**:
- `schema.prisma`: `LlmPredict` モデルの追加、`Race` モデルへのリレーション追加
- `migrations/`: 新しいマイグレーションディレクトリを生成

**命名規則**:
- マイグレーションディレクトリ: `YYYYMMDDHHMMSS_[説明]/`（Prismaが自動生成）
- マイグレーション説明: snake_case（例: `add_llm_predict`）

---

### `docs/` (ドキュメント)

**配置ドキュメント**:

| ファイル | 内容 |
|---------|------|
| `ideas/llm-predict.md` | 機能アイデアの初期メモ |
| `product-requirements.md` | プロダクト要求定義書（PRD） |
| `functional-design.md` | 機能設計書 |
| `architecture.md` | アーキテクチャ設計書 |
| `repository-structure.md` | 本ドキュメント |
| `development-guidelines.md` | 開発ガイドライン |
| `glossary.md` | 用語集 |

---

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| APIエンドポイント | `src/app/api/[path]/` | `route.ts` 固定 | `llm-predict/route.ts` |
| ページコンポーネント | `src/app/[path]/` | `page.tsx` 固定 | `races/[id]/page.tsx` |
| 機能コンポーネント | `src/app/components/` | `PascalCase.tsx` | `LlmPredictSection.tsx` |
| UIプリミティブ | `src/app/components/ui/` | `kebab-case.tsx` | `skeleton.tsx` |
| ユーティリティ | `src/lib/` | `camelCase.ts` | `utils.ts` |
| 型定義 | 各ファイル内またはインライン | TypeScript interface | - |

### 型定義の配置方針

型定義はファイル内にインラインで定義する（独立した `types/` ディレクトリは作らない）:

```typescript
// src/app/api/races/[id]/llm-predict/route.ts 内で定義
export interface LlmPredictResponse {
  provider:    string;
  first_pick:  number;
  second_pick: number;
  third_pick:  number;
  comment:     string | null;
}
```

---

## 命名規則

### ディレクトリ名

| 種別 | 規則 | 例 |
|------|------|----|
| Next.js App Router | Next.js規約に従う | `api/`, `races/`, `[id]/` |
| APIサブパス | kebab-case | `llm-predict/`, `navigation/` |
| shadcn/ui | kebab-case | `ui/` |

### ファイル名

| 種別 | 規則 | 例 |
|------|------|----|
| Next.js特殊ファイル | Next.js規約固定 | `page.tsx`, `route.ts`, `layout.tsx` |
| Reactコンポーネント | PascalCase | `LlmPredictSection.tsx`, `EntryTable.tsx` |
| shadcn/uiプリミティブ | kebab-case | `skeleton.tsx`, `badge.tsx` |
| ユーティリティ関数 | camelCase | `utils.ts`, `statistics.ts` |

### TypeScript

| 種別 | 規則 | 例 |
|------|------|----|
| Interface / Type | PascalCase | `LlmPredictResponse`, `EntryWithMasters` |
| 変数・関数 | camelCase | `raceId`, `fetchLlmPredict` |
| 定数 | camelCase または UPPER_SNAKE_CASE | `providerLabels` |
| Reactコンポーネント関数 | PascalCase | `LlmPredictSection` |

---

## 依存関係のルール

### レイヤー間の依存（許可される方向）

```text
ページ (page.tsx)
  ↓ コンポーネントをimport
コンポーネント (components/*.tsx)
  ↓ APIをfetch
APIルート (api/*/route.ts)
  ↓ Prismaでクエリ
Prisma Client
  ↓
Supabase PostgreSQL
```

**禁止される依存**:
- コンポーネント → Prisma Client の直接import（❌）
- APIルート → Reactコンポーネントのimport（❌）
- ユーティリティ → アプリケーション固有コード（❌）

### 新規ファイルの依存チェックリスト

新しいファイルを追加する際は以下を確認:
- [ ] 循環依存が発生していないか
- [ ] `src/lib/` への依存は `utils.ts` 経由か
- [ ] Client Component は `'use client'` を先頭に記述しているか
- [ ] Prisma Client は APIルートのみで使用しているか

---

## スケーリング戦略

### 新しいLLMプロバイダー追加時

テーブルやAPIの変更は不要。データ投入のみで対応できる:

```text
1. ユーザー（オーナー）が新プロバイダーの予想をllm_predictsにINSERT
   （provider: "gemini" など）
2. LlmPredictSection が自動的に新プロバイダーのカードを表示
3. コード変更: 不要
```

### 新しいAPIエンドポイント追加時

```text
src/app/api/races/[id]/
├── route.ts              # 既存
├── navigation/route.ts   # 既存
└── [新機能]/route.ts     # 追加するだけ
```

---

## 除外設定

### .gitignore（追加すべき項目）

```gitignore
# 環境変数
.env
.env.local
.env.*.local

# ビルド成果物
.next/
out/

# 依存関係
node_modules/

# Prisma
*.db
*.db-journal

# OS
.DS_Store

# その他
*.pickle
```

> **注意**: 一時ファイルやローカル生成物（例: `*.pickle`）は、必要に応じて `.gitignore` に追加するか削除してください。
