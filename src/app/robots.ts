import type { MetadataRoute } from "next"

/**
 * AI の学習・検索用クローラー。サイト全体を辿られると Vercel の無料枠
 * （Fast Origin Transfer）を使い切るので、まとめて断る。
 * robots.txt を守らないクローラーは Vercel Firewall の AI Bots ルールで止める
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "cohere-ai",
  "Diffbot",
  "Omgilibot",
  "YouBot",
  "DuckAssistBot",
  "MistralAI-User",
  "PetalBot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
]

/**
 * 検索エンジン向け。検索条件やページ送りの組み合わせが無数にある画面と API は辿らせない。
 * レース詳細は ISR で CDN から返すので許可する
 */
export const DISALLOWED_PATHS = ["/api/", "/time-index", "/jockeys"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS },
    ],
  }
}
