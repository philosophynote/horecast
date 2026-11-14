import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// Cloudflare Workers 向けのビルド設定（OpenNext）。
// - incrementalCache: ISR のページと unstable_cache を R2 に置く。Workers KV は無料枠の書き込みが
//   1日1,000回までで、5分ごとの再生成では足りず、超えると古いページが更新されなくなる
// - queue: 期限切れページの再生成を Durable Object のキューで流す
// - enableCacheInterception: キャッシュ済みのページは Next.js のサーバーを起こさずに返す（CPU 時間の節約）
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  enableCacheInterception: true,
});
