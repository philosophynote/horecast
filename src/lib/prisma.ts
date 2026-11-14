import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { cache } from "react"

/**
 * 1リクエストが同時に開く DB 接続の上限。プールをリクエストごとに持つと全体の上限が無くなるので、
 * ここで絞る（既定の 10 のままだと、同時60件で DB の接続数 100 を使い切った）。
 * Workers が1リクエストで同時に張れる接続も 6 本までなので、それより小さくする
 */
const MAX_CONNECTIONS_PER_REQUEST = 3

// Prisma 7 では接続をドライバアダプタ経由で渡す。
// maxUses: 1 は 1回使った接続を閉じる指定。使い終えた接続をプールに残さない
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: MAX_CONNECTIONS_PER_REQUEST,
      maxUses: 1,
    }),
  })

/**
 * Prisma クライアント（と接続プール）をリクエストごとに作る。
 *
 * Cloudflare Workers ではソケットを別のリクエストから使えない。クライアントを使い回すとプールも
 * 共有され、同時接続が上限を超えたときに、待っているリクエストの接続が別のリクエストの処理の中で
 * 作られて応答しなくなる（30件を同時に投げると半数以上が 500 になった）。
 *
 * - サーバーコンポーネントの描画中は React の `cache` が同じクライアントを返す
 * - ルートハンドラでは呼ぶたびに新しく作るので、ハンドラの先頭で1回だけ呼んで使い回す
 * - モジュールの直下では呼ばない（リクエストをまたいで残る）
 */
export const getPrisma = cache(createPrismaClient)
