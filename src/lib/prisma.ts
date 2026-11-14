import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7 では接続をドライバアダプタ経由で渡す。
// maxUses: 1 は Cloudflare Workers 用。Workers ではソケットをリクエストをまたいで使い回せず、
// プールに残った接続を次のリクエストが掴むと応答が返らなくなる。1回使った接続は閉じて作り直す
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, maxUses: 1 }),
  })

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
