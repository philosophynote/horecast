# Cloudflare Workers へのデプロイ

horecast は [OpenNext](https://opennext.js.org/cloudflare)（`@opennextjs/cloudflare`）で Cloudflare Workers 向けにビルドして配信する。
Vercel の無料枠（Fast Origin Transfer 月10GB）を使い切って停止されたため、転送量に課金のない Cloudflare へ移した。

## 構成

| ファイル | 役割 |
| --- | --- |
| `wrangler.jsonc` | Worker の名前、互換性フラグ、静的ファイル、バインディング |
| `open-next.config.ts` | OpenNext の設定（キャッシュの置き場と再生成のキュー） |
| `src/lib/prisma.ts` | `maxUses: 1` で接続をリクエストごとに作り直す |

`wrangler.jsonc` のバインディング:

- `ASSETS` — `/_next/static` などの静的ファイル。Worker を通らずに配信される
- `NEXT_INC_CACHE_KV`（Workers KV）— ISR のページ（レース詳細）と `unstable_cache` の置き場。`id` は書いておらず、初回デプロイで wrangler が作って紐づける
- `NEXT_CACHE_DO_QUEUE`（Durable Object）— 期限切れページの再生成を重複なく流すキュー
- `WORKER_SELF_REFERENCE` — 再生成のときに Worker が自分自身を呼ぶための参照

`open-next.config.ts` の `enableCacheInterception` で、キャッシュ済みのページは Next.js のサーバーを起こさずに返す。

## コマンド

```bash
npm run cf:build     # Workers 向けにビルド（.open-next/ に出力。中で npm run build を呼ぶ）
npm run cf:preview   # ビルドして、手元の Workers 実行環境（workerd）で起動
npm run cf:deploy    # ビルドしてデプロイ（wrangler にログイン済みであること）
```

`npm run build` は `prisma migrate deploy` を含むので、`cf:build` も `DIRECT_URL` の DB へマイグレーションを当てる。
手元で実行するときは接続先がローカル DB であることを確かめる。

手元で動かすときは、リポジトリ直下に `.dev.vars` を置く（コミットしない）。

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/horecast
```

## 初回のセットアップ

1. Cloudflare のアカウントを作る（無料プランでよい）
2. ダッシュボードの Workers & Pages で GitHub のリポジトリ `philosophynote/horecast` を取り込む（Workers Builds）
   - Worker の名前: `horecast`（`wrangler.jsonc` の `name` と同じにする）
   - ビルドコマンド: `npx opennextjs-cloudflare build`
   - デプロイコマンド: `npx opennextjs-cloudflare deploy`
3. ビルド用の変数を登録する
   - `DIRECT_URL` — マイグレーション用の接続文字列。ビルド環境から直結できない場合は Supabase のセッションプーラの URL を使う
   - `NEXT_PUBLIC_API_URL` — `https://www.horecast.net`
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — Google Analytics の ID（任意）
4. 実行時の値を Worker の「変数とシークレット」に **シークレット** として登録する（通常の変数はデプロイのたびに `wrangler.jsonc` の内容で上書きされる）
   - `DATABASE_URL` — Supabase の接続文字列（プーラ経由）
   - `CRON_SECRET` — `/api/cron/delete-old-entries` の認証に使う値
5. `main` へ push するか、ダッシュボードからデプロイを実行する
6. `https://horecast.<アカウントのサブドメイン>.workers.dev` で次を確かめる
   - トップページにレース一覧が出る（DB に接続できている）
   - レース詳細を2回開き、2回目の応答ヘッダーに `x-opennext-cache: HIT` が付く
   - `/robots.txt` が返る
7. ドメインを移す
   - `horecast.net` を Cloudflare に追加し、レジストラでネームサーバーを Cloudflare のものへ変える
   - Worker の「ドメインとルート」でカスタムドメイン `www.horecast.net` を割り当てる
   - Vercel 側のドメイン設定と Git 連携を外す
8. Cloudflare のセキュリティ設定で AI クローラーのブロックを有効にする（`robots.txt` を守らないクローラー対策）

ダッシュボードの項目名は変わることがある。見つからないときは近い名前の項目を探す。

## 無料プランの上限

| 上限 | 値 | 超えたとき |
| --- | --- | --- |
| リクエスト | 1日10万回 | その日は Worker がエラーを返す（UTC の 0 時に戻る） |
| CPU 時間 | 1リクエスト 10ms | エラー 1102（Worker exceeded resource limits） |
| Worker のサイズ | gzip 後 3 MiB | デプロイが失敗する |
| KV への書き込み | 1日1,000回 | ISR のキャッシュが保存されず、毎回描画になる |

2026-11-14 時点のサイズは gzip 後 2,821 KiB（上限 3,072 KiB の 92%）。依存を足すと超えうる。
`npx wrangler deploy --dry-run --outdir <出力先>` でデプロイせずにサイズを確かめられる。

上限に当たるようなら Workers Paid（月5ドル。1,000万リクエスト、CPU 時間は月3,000万ms、サイズ 10 MiB）へ上げる。
転送量はどちらのプランでも課金されない。

## 注意

- **DB 接続** — Workers ではソケットをリクエストをまたいで使い回せない。`maxUses: 1` を外すと、DB を使う2回目以降のリクエストが応答しなくなる。接続の張り直しが遅いときは Hyperdrive（Cloudflare の接続プール）を検討する
- **API のキャッシュ** — `CDN-Cache-Control` を付けているが、Worker は Cloudflare のキャッシュより手前で動くので、API の応答は毎回 Worker が作る。ISR のページだけが KV から返る
- **Next.js のバージョン** — `@opennextjs/cloudflare` は対応する Next.js の範囲を peerDependencies で絞っている（1.20.17 は `>=16.4.5`）。Next.js を上げるときはアダプタも合わせる
- **Vercel 専用の部品** — `@vercel/speed-insights` は Vercel 上でしか動かないので外した
