# RacePredictionCommentの保存・参照契約

この文書は、horecast-predictorが生成したレース予想コメントをHorecastへ保存し、画面に表示する際の契約を定める。初回は全体を通読する。実装やマイグレーションを変更するときは、「保存形式」と「アクセス制御」を確認する。

## warningsは辞書配列のJSONBとして保存する

`warnings` は `jsonb NOT NULL DEFAULT '[]'::jsonb` とする。各要素は警告内容を表す辞書で、`message` は文字列、`code` と `horse_number` は任意の文字列として扱う。

```json
[
  {
    "code": "missing_recent_races",
    "message": "近走データが不足しています",
    "horse_number": "7"
  }
]
```

Horecastの画面には `message` を表示する。`message` が文字列ではない要素は表示しない。`openai_batch_id` は内部処理用の値であり、画面表示用の型や公開レスポンスには含めない。

## generated_atは必須のコメント生成時刻とする

`generated_at` は `timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP` とする。predictorはコメントを保存するときに生成時刻を必ず指定する。DBのデフォルト値は、サーバー側から直接登録するときに値が省略されてもNULLを保存しないための補助として使う。

## upsertはレース・プロバイダー・プロンプト版の組み合わせで行う

一意キーは `netkeiba_race_id, provider, prompt_version` の3列とする。同じ組み合わせを再生成した場合は、新しい行を増やさず既存行を更新する。`netkeiba_race_id` には `Race.netkeiba_race_id` への外部キー制約を維持する。

## ブラウザ用ロールには直接アクセスを許可しない

`RacePredictionComment` はRLSを有効にし、anon・authenticated向けのポリシーは作成しない。HorecastはServer ComponentからPrisma経由で読み取り、ブラウザからSupabaseへ直接問い合わせない。predictorはサーバー側で管理するservice_roleキーを使って書き込む。

service_roleキーはブラウザへ渡さない。本番適用前に、predictorのSSMパラメータ `SUPABASE_KEY` がservice_roleキーまたは同等の秘密キーであることを確認する。
