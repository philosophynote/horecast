# Cloudflare Workers へのデプロイ

horecast は [OpenNext](https://opennext.js.org/cloudflare)（`@opennextjs/cloudflare`）で Cloudflare Workers 向けにビルドして配信する。
Vercel の無料枠（Fast Origin Transfer 月10GB）を使い切って停止されたため、転送量に課金のない Cloudflare へ移した。

## 構成

| ファイル | 役割 |
| --- | --- |
| `wrangler.jsonc` | Worker の名前、互換性フラグ、静的ファイル、バインディング |
| `open-next.config.ts` | OpenNext の設定（キャッシュの置き場と再生成のキュー） |
| `src/lib/prisma.ts` | Prisma クライアントと接続プールをリクエストごとに作る（`getPrisma()`） |

`wrangler.jsonc` のバインディング:

- `ASSETS` — `/_next/static` などの静的ファイル。Worker を通らずに配信される
- `NEXT_INC_CACHE_R2_BUCKET`（R2 バケット `horecast-opennext-cache`）— ISR のページ（レース詳細）と `unstable_cache` の置き場
- `NEXT_CACHE_DO_QUEUE`（Durable Object）— 期限切れページの再生成を重複なく流すキュー
- `WORKER_SELF_REFERENCE` — 再生成のときに Worker が自分自身を呼ぶための参照

`open-next.config.ts` の `enableCacheInterception` で、キャッシュ済みのページは Next.js のサーバーを起こさずに返す。

キャッシュの置き場を Workers KV にしないのは、無料枠の書き込みが1日1,000回までだから。レース詳細は5分ごとに作り直すので、
24レースを開かれ続けると4時間ほどで使い切る。超えると保存に失敗し、古いページが残ったまま予想や払戻が更新されなくなる。
R2 は書き込みが月100万回まで無料で、超えても止まらない（超過分が課金される）。

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

1. Cloudflare のアカウントを作る（無料プランでよい）。Workers & Pages を一度開き、`workers.dev` のサブドメインを決めておく
2. R2 を有効にし、バケット `horecast-opennext-cache` を作る（ダッシュボードの R2、または `npx wrangler r2 bucket create horecast-opennext-cache`）
   - R2 を有効にするときに支払い方法の登録を求められる。無料枠（下の表）の範囲なら請求は発生しない
   - デプロイコマンドは Worker を上げる前に、ビルド時のキャッシュ（トップページなど）をこのバケットへ書き込む。バケットが無ければその場で作るが、R2 が有効でないとここで失敗するので先に済ませる
3. ダッシュボードの Workers & Pages で GitHub のリポジトリ `philosophynote/horecast` を取り込む（Workers Builds）
   - Worker の名前: `horecast`（`wrangler.jsonc` の `name` と同じにする）
   - ビルドコマンド: `npx opennextjs-cloudflare build`
   - デプロイコマンド: `npx opennextjs-cloudflare deploy`
   - API トークンは既定（自動作成）のものでよい。R2 の編集権限を含む。自分で作ったトークンを使うなら Workers R2 Storage の編集権限を付ける
4. ビルド用の変数を登録する
   - `DIRECT_URL` — マイグレーション用の接続文字列。ビルド環境から直結できない場合は Supabase のセッションプーラの URL を使う
   - `NEXT_PUBLIC_API_URL` — `https://www.horecast.net`
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — Google Analytics の ID（任意）
5. 実行時の値を Worker の「変数とシークレット」に **シークレット** として登録する（通常の変数はデプロイのたびに `wrangler.jsonc` の内容で上書きされる）
   - `DATABASE_URL` — Supabase の接続文字列。トランザクションプーラ（ポート 6543）のものを使う。リクエストごとに接続を張るので、直結やセッションプーラでは接続数の上限に当たりやすい
   - `CRON_SECRET` — `/api/cron/delete-old-entries` の認証に使う値
6. `main` へ push するか、ダッシュボードからデプロイを実行する
7. `https://horecast.<アカウントのサブドメイン>.workers.dev` で次を確かめる
   - トップページにレース一覧が出る（DB に接続できている）
   - レース詳細を2回開き、2回目の応答ヘッダーに `x-opennext-cache: HIT` が付く
   - `/robots.txt` が返る
8. ドメインを移す
   - `horecast.net` を Cloudflare に追加し、レジストラでネームサーバーを Cloudflare のものへ変える
   - Worker の「ドメインとルート」でカスタムドメイン `www.horecast.net` を割り当てる
   - Vercel 側のドメイン設定と Git 連携を外す
9. Cloudflare のセキュリティ設定で AI クローラーのブロックを有効にする（`robots.txt` を守らないクローラー対策）

ダッシュボードの項目名は変わることがある。見つからないときは近い名前の項目を探す。

### 初回のデプロイがキャッシュの書き込みで失敗するとき

キャッシュの書き込みは、一時的な Worker（`open-next-cache-populate`）を Cloudflare 上で動かして行う。
Workers Builds の中でこれが通らない場合は、手元から1回デプロイする。

```bash
npx wrangler login
npm run cf:deploy   # 中で npm run build（prisma migrate deploy を含む）が走る。.env の DIRECT_URL の接続先に注意
```

2回目以降も Workers Builds で失敗するなら、ビルドのログにある失敗箇所（R2 の権限、`workers.dev` のサブドメイン）を確かめる。

## 無料プランの上限

| 上限 | 値 | 超えたとき |
| --- | --- | --- |
| リクエスト | 1日10万回 | その日は Worker がエラーを返す（UTC の 0 時に戻る） |
| CPU 時間 | 1リクエスト 10ms | エラー 1102（Worker exceeded resource limits） |
| Worker のサイズ | gzip 後 3 MiB | デプロイが失敗する |
| Durable Object（再生成のキュー） | 1日10万リクエスト | ページの再生成が流れず、古いページが残る |
| R2 への書き込み（Class A） | 月100万回まで無料 | 止まらない。超過分が課金される（100万回あたり 4.5 ドル） |
| R2 からの読み出し（Class B） | 月1,000万回まで無料 | 止まらない。超過分が課金される（100万回あたり 0.36 ドル） |
| R2 の保存量 | 10 GB まで無料 | 止まらない。超過分が課金される（1 GB あたり月 0.015 ドル） |

ISR のページを1回作り直すと R2 へ1回書き込み、キャッシュ済みのページを1回返すと1回読み出す。
24レースが5分ごとに作り直され続けても書き込みは1日 6,912 回、月に約21万回で、無料の範囲に収まる。
キャッシュのキーにはビルドごとの ID が入るので、デプロイのたびに前のビルドの分がバケットに残る（今のビルドからは読まれない）。保存量が増えてきたら R2 の画面から古いビルドの分を消す。

2026-11-14 時点のサイズは gzip 後 2,821 KiB（上限 3,072 KiB の 92%）。依存を足すと超えうる。
`npx wrangler deploy --dry-run --outdir <出力先>` でデプロイせずにサイズを確かめられる。

上限に当たるようなら Workers Paid（月5ドル。1,000万リクエスト、CPU 時間は月3,000万ms、サイズ 10 MiB）へ上げる。
転送量はどちらのプランでも課金されない。

## 注意

- **DB 接続** — Workers ではソケットを別のリクエストから使えない。`getPrisma()` はクライアントと接続プールをリクエストごとに作り、`maxUses: 1` で使い終えた接続を閉じる。クライアントをモジュールの直下に置いて使い回すと、同時アクセスが重なったときに応答しなくなる（手元の workerd で同時30件のうち18件が 500 になった）
- **クライアントを作る負荷** — リクエストごとにクライアントを作るぶん、DB を使うリクエスト1回あたり 3〜4ms 増える（手元の workerd での計測）。R2 から返るキャッシュ済みのページには掛からない。CPU 時間の上限（エラー 1102）に当たるようなら Workers Paid へ上げる
- **DB の接続数** — 1リクエストが同時に開く接続は3本まで（`src/lib/prisma.ts` の `max`）。全体の上限は無いので、同時リクエスト数 × 3 が DB 側の上限を超えると「too many clients」で 500 になる（手元の PostgreSQL は上限100で、同時60件の `/api/races` の約半数が失敗した）。接続の張り直しが遅い、または接続数が足りないときは Hyperdrive（Cloudflare の接続プール）を検討する
- **API のキャッシュ** — `CDN-Cache-Control` を付けているが、Worker は Cloudflare のキャッシュより手前で動くので、API の応答は毎回 Worker が作る。ISR のページだけが R2 から返る
- **Next.js のバージョン** — `@opennextjs/cloudflare` は対応する Next.js の範囲を peerDependencies で絞っている（1.20.17 は `>=16.4.5`）。Next.js を上げるときはアダプタも合わせる
- **Vercel 専用の部品** — `@vercel/speed-insights` は Vercel 上でしか動かないので外した
