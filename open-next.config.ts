import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// Cloudflare Workers 向けのビルド設定（OpenNext）。
// - incrementalCache: ISR のページと unstable_cache を Workers KV に置く
// - queue: 期限切れページの再生成を Durable Object のキューで流す
// - enableCacheInterception: キャッシュ済みのページは Next.js のサーバーを起こさずに返す（CPU 時間の節約）
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  queue: doQueue,
  enableCacheInterception: true,
});
