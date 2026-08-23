import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 は環境変数ファイルを自動読み込みしないため明示的に読む。
// 本番のようにプラットフォーム側から環境変数が渡る場合はファイルが無いので無視する。
try {
  process.loadEnvFile();
} catch {
  // ファイルが無い環境では何もしない
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // マイグレーションは接続プーラを介さない直結を使う。
    // 実行時のクライアントはドライバアダプタ経由で DATABASE_URL を使う（src/lib/prisma.ts）。
    url: env("DIRECT_URL"),
  },
});
