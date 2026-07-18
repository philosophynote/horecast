import { NextRequest, NextResponse } from "next/server";

function isMaintenanceModeEnabled(): boolean {
  return process.env.MAINTENANCE_MODE === "true";
}

function createMaintenanceResponse(): NextResponse {
  return new NextResponse(
    `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>メンテナンス中 | Horecast</title>
  </head>
  <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#f8fafc;color:#0f172a;font-family:system-ui,sans-serif">
    <main style="max-width:32rem;padding:2rem;text-align:center">
      <h1 style="margin:0 0 1rem;font-size:1.5rem">ただいまメンテナンス中です</h1>
      <p style="margin:0;line-height:1.75">ご不便をおかけして申し訳ありません。しばらくしてから再度お試しください。</p>
    </main>
  </body>
</html>`,
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "3600",
        "x-robots-tag": "noindex, nofollow",
      },
    }
  );
}

export function middleware(_request: NextRequest): NextResponse {
  if (!isMaintenanceModeEnabled()) {
    return NextResponse.next();
  }

  return createMaintenanceResponse();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron/).*)",
  ],
};
