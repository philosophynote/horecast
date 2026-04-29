# 開発ガイドライン (Development Guidelines)

> 対象: Horecast - Next.js 15 / Prisma / Supabase / Tailwind CSS / TypeScript

---

## コーディング規約

### 命名規則

#### 変数・関数

```typescript
// ✅ 良い例
const raceId = params.id;
const llmPredicts = await fetchLlmPredicts(raceId);
function formatProviderLabel(provider: string): string { }
const isLoading = true;
const hasComment = predict.comment !== null;

// ❌ 悪い例
const data = await fetch(id);
function fmt(p: string): string { }
const flag = true;
```

**原則**:
- 変数: camelCase、意味のある名詞または名詞句
- 関数: camelCase、動詞で始める（`fetch`, `format`, `calculate`, `handle`）
- Boolean: `is`, `has`, `should` で始める
- 定数: camelCase（1ファイル内のローカル定数はcamelCase、グローバル定数はUPPER_SNAKE_CASE）

#### Reactコンポーネント・型定義

```typescript
// コンポーネント: PascalCase
export function LlmPredictSection({ raceId }: LlmPredictSectionProps) { }
export function EntryTable({ entries, predicts }: EntryTableProps) { }

// インターフェース: PascalCase（Iプレフィックスなし）
interface LlmPredictSectionProps {
  raceId: number;
}

interface LlmPredictResponse {
  provider:    string;
  first_pick:  number;
  second_pick: number;
  third_pick:  number;
  comment:     string | null;
}

// 型エイリアス: PascalCase
type RankMark = '◎' | '○' | '▲';
```

#### DBカラム名との対応

Prismaモデルのカラム名は **snake_case**（DB規約に準拠）:
```typescript
// Prismaモデルフィールド（snake_case）
model LlmPredict {
  first_pick  Int
  second_pick Int
  third_pick  Int
}

// TypeScriptの変数（camelCase）
const { first_pick, second_pick, third_pick } = predict;
```

---

### コードフォーマット

**インデント**: 2スペース（既存プロジェクト規約）

**セミコロン**: あり（TypeScript推奨）

**引用符**: ダブルクォートまたはバックティック（JSX属性はダブルクォート）

**ESLint**: `npm run lint` でチェック。変更後は必ず実行。

---

### コメント規約

**コメントは「なぜ」を説明する**:
```typescript
// ✅ 良い例: なぜそうするかを説明
// LLM予想はページ初期表示をブロックしないようクライアントサイドで取得
useEffect(() => {
  fetchLlmPredicts(raceId);
}, [raceId]);

// キャッシュなし: LLM予想はリアルタイム性が重要
const response = await fetch(`/api/races/${id}/llm-predict`, {
  cache: 'no-store',
});

// ❌ 悪い例: コードを読めば分かることを書く
// useEffectでフェッチする
useEffect(() => {
  fetchLlmPredicts(raceId);
}, [raceId]);
```

**JSDocは公開APIに限定**（内部実装には不要）:
```typescript
/**
 * LLM予想結果をAPIから取得する
 * @param raceId - レースID
 * @returns LLMプロバイダーごとの予想配列
 */
async function fetchLlmPredicts(raceId: number): Promise<LlmPredictResponse[]>
```

---

### エラーハンドリング

**Next.js APIルートのエラーハンドリング**:
```typescript
// src/app/api/races/[id]/llm-predict/route.ts
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const raceId = parseInt(id);
    if (isNaN(raceId)) {
      return NextResponse.json({ error: 'Invalid race ID' }, { status: 400 });
    }

    const predicts = await prisma.llmPredict.findMany({
      where: { race_id: raceId },
    });

    return NextResponse.json(predicts);
  } catch (error) {
    console.error('[llm-predict] DB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Reactコンポーネントのエラーハンドリング**:
```typescript
// クライアントコンポーネントでのfetchエラー
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetch(`/api/races/${raceId}/llm-predict`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    })
    .then(data => setPredicts(data))
    .catch(() => setError('予想データの取得に失敗しました'));
}, [raceId]);
```

**原則**:
- エラーを無視しない（console.error または setError で必ず記録）
- ユーザー向けメッセージは日本語で分かりやすく
- LLM予想のエラーはページ全体に波及させない（コンポーネント内で吸収）

---

### Reactコンポーネント設計

**Server Component vs Client Component の使い分け**:

| 種別 | 条件 | 例 |
|------|------|----|
| Server Component | デフォルト。DB/API fetchをサーバーで実行 | `page.tsx`, `EntryTable.tsx` |
| Client Component | `useState`, `useEffect`, イベントハンドラーを使う | `LlmPredictSection.tsx`, `DateSelector.tsx` |

**Client Componentの必須ルール**:
```typescript
'use client'; // ← ファイル先頭に必ず記述

import { useState, useEffect } from 'react';
```

**コンポーネントのProps設計**:
```typescript
// ✅ 良い例: 必要な最小限のPropsのみ
interface LlmPredictSectionProps {
  raceId: number;
}

// ❌ 悪い例: 未使用のPropsや過剰な設計
interface LlmPredictSectionProps {
  raceId: number;
  className?: string;    // 未使用なら不要
  onLoad?: () => void;   // 不要な場合は追加しない
}
```

---

### Prismaの使用規則

**クエリは必ずAPIルート内で実行**:
```typescript
// ✅ 正しい場所: src/app/api/*/route.ts
import { prisma } from '@/lib/prisma'; // または直接import

const predicts = await prisma.llmPredict.findMany({
  where: { race_id: raceId },
  orderBy: { provider: 'asc' },
});
```

**型の活用**:
```typescript
import type { LlmPredict } from '@prisma/client';

// Prismaの生成型をそのまま活用
function formatPredict(predict: LlmPredict): string {
  return `${predict.provider}: ◎${predict.first_pick}`;
}
```

---

## Git運用ルール

### ブランチ戦略

```text
main          ← 本番環境（Vercel等にデプロイ）
  └─ feature/llm-predict-section    ← 新機能開発
  └─ fix/llm-predict-display-bug    ← バグ修正
  └─ security                       ← 現在の作業ブランチ
```

**ブランチ種別**:
- `feature/[機能名]`: 新機能開発（例: `feature/llm-predict-section`）
- `fix/[修正内容]`: バグ修正（例: `fix/skeleton-flicker`）
- `refactor/[対象]`: リファクタリング
- `docs/[対象]`: ドキュメントのみの変更

### コミットメッセージ規約

**Conventional Commits に準拠**:
```text
<type>(<scope>): <subject>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: フォーマット変更（動作に影響しない）
- `refactor`: リファクタリング
- `chore`: ビルド・設定の変更

**scope（このプロジェクトで使用）**:
- `llm-predict`: LLM予想機能
- `prisma`: DBスキーマ・マイグレーション
- `api`: APIルート
- `ui`: UIコンポーネント
- `docs`: ドキュメント

**例**:
```text
feat(prisma): LlmPredictモデルをスキーマに追加

- race_idとproviderの複合ユニーク制約を設定
- race_idにインデックスを追加
- Raceモデルにリレーションを追加

feat(api): LLM予想取得エンドポイントを実装

GET /api/races/[id]/llm-predict
- race_idでllm_predictsを全件取得
- データなしの場合は空配列を返す

feat(ui): LlmPredictSectionコンポーネントを追加

- レース詳細ページの出馬表直下に表示
- スケルトンローダーでローディング状態を表示
- プロバイダーごとにカードを横並びで表示
```

### プルリクエストプロセス

**作成前のチェック**:
- [ ] `npm run lint` がエラーなし
- [ ] TypeScript型エラーなし（`npx tsc --noEmit`）
- [ ] レース詳細ページで動作確認済み
- [ ] モバイル表示を確認済み

**PRテンプレート**:
```markdown
## 概要
[変更内容の簡潔な説明]

## 変更内容
- [ ] Prismaスキーマ変更
- [ ] APIエンドポイント追加
- [ ] UIコンポーネント追加
- [ ] ページへの組み込み

## 確認方法
1. Supabaseにテストデータを INSERT
2. /races/[id] ページでLLM予想セクションが表示されることを確認
3. データなし時に「予想データなし」が表示されることを確認

## スクリーンショット
[PC表示・モバイル表示]
```

---

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 20.x LTS | ランタイム |
| npm | 10.x | パッケージマネージャー |
| Git | latest | バージョン管理 |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd horecast

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定
cp .env.example .env
# .env を編集して DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_API_URL を設定

# 4. Prismaの初期化
npx prisma generate
npx prisma migrate dev

# 5. 開発サーバーの起動
npm run dev
```

### LLM予想機能の動作確認用テストデータ

```sql
-- Supabaseダッシュボードまたはpsqlで実行
INSERT INTO llm_predicts (race_id, provider, first_pick, second_pick, third_pick, comment)
VALUES
  (1, 'openai', 3, 7, 1, '前走で上がり3Fトップを記録した3番が有力。'),
  (1, 'claude', 5, 2, 8, 'このコースと距離で実績のある5番を本命に。');
```

---

## テスト戦略

### テストの種類とカバレッジ目標

| 種別 | 対象 | カバレッジ |
|------|------|----------|
| ユニットテスト | APIルートのロジック | 主要パスをカバー |
| 手動テスト | UIコンポーネント | 目視確認 |

### ユニットテスト例（APIルート）

```typescript
// __tests__/api/llm-predict.test.ts
describe('GET /api/races/[id]/llm-predict', () => {
  it('有効なraceIdでLLM予想を返す', async () => {
    // モックデータでテスト
  });

  it('データが存在しない場合は空配列を返す', async () => {
    // 空配列のレスポンスを確認
  });

  it('無効なraceIdの場合は400を返す', async () => {
    // バリデーションのテスト
  });
});
```

---

## コードレビュー基準

### LLM予想機能固有のチェックポイント

**データ取得**:
- [ ] `cache: 'no-store'` が設定されているか（リアルタイムデータ）
- [ ] Prisma Clientがサーバーサイドのみで使用されているか

**エラーハンドリング**:
- [ ] LLM予想エラー時にページ全体がクラッシュしないか
- [ ] データなし時に適切なメッセージが表示されるか

**パフォーマンス**:
- [ ] LlmPredictSectionがクライアントサイドで非同期取得しているか（ページ初期表示をブロックしない）
- [ ] スケルトンUIがローディング中に表示されるか

**拡張性**:
- [ ] 新しいLLMプロバイダーが追加されたとき、コード変更なしで表示されるか

### 共通チェックポイント

**機能性**:
- [ ] 要件を満たしているか（PRD確認）
- [ ] エラーケースが考慮されているか

**可読性**:
- [ ] 命名が意図を伝えているか
- [ ] 複雑なロジックにコメントがあるか

**保守性**:
- [ ] 1コンポーネントの責務が明確か
- [ ] 重複コードがないか

### レビューコメントの書き方

```markdown
# ✅ 良い例（理由と代替案を添える）
[推奨] LLM予想が0件の場合もスケルトンが表示され続けます。
isLoadingとデータなし状態を分けて管理することで改善できます。

# ❌ 悪い例
この実装はよくないです。
```

**優先度の明示**:
- `[必須]`: バグ・セキュリティ問題・要件未達
- `[推奨]`: コード品質・保守性の改善
- `[提案]`: より良い実装の提案
- `[質問]`: 意図確認
