import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const configuredAppHost = process.env.APP_HOST?.trim().toLowerCase();
const appHost = configuredAppHost || "app.xpansive.org";

function requestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0] || request.headers.get("host") || "";

  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/" || requestHost(request) !== appHost) {
    return NextResponse.next();
  }

  const appUrl = request.nextUrl.clone();
  appUrl.pathname = "/app";

  return NextResponse.rewrite(appUrl);
}

export const config = {
  matcher: "/",
};
