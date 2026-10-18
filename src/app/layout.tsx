import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_JP } from "next/font/google";
import "./globals.css";
import { Header } from "./components/Header";
import { ThemeProvider } from "./components/ThemeProvider";
import { GoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights } from "@vercel/speed-insights/next";

// どちらも可変フォントではないので weight を列挙する。
// 日本語グリフは Google の unicode-range 分割を next/font がまとめて自己ホストする
const plexSans = IBM_Plex_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
  title: "Horecast - AI競馬予想",
  description: "AI競馬予想アプリケーション",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Horecast - AI競馬予想",
    description: "AI競馬予想アプリケーション",
    images: [
      {
        url: "/running_horse.png",
        width: 1200,
        height: 630,
        alt: "Horecast - AI競馬予想",
      },
    ],
  },
};

// OS 設定に連動する。ヘッダーの手動切替には追従しない
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1210" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // フォント変数は <html> に置く。Tailwind の preflight が html に font-family を当てるため
  // suppressHydrationWarning は next-themes が html の class / style を書き換えるため
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
        <SpeedInsights />
      </body>
    </html>
  );
}
