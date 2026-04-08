import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

type RateWindow = {
  count: number;
  resetAt: number;
};

type GlobalRateStore = typeof globalThis & {
  __apiRateLimitStore?: Map<string, RateWindow>;
};

const globalRateStore = globalThis as GlobalRateStore;
const rateLimitStore =
  globalRateStore.__apiRateLimitStore ?? new Map<string, RateWindow>();

if (!globalRateStore.__apiRateLimitStore) {
  globalRateStore.__apiRateLimitStore = rateLimitStore;
}

function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

function attachRateHeaders(
  response: NextResponse,
  window: RateWindow,
): NextResponse {
  const remaining = Math.max(0, MAX_REQUESTS - window.count);
  response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(window.resetAt / 1000)),
  );
  return response;
}

function pruneExpiredWindows(now: number): void {
  for (const [key, window] of rateLimitStore.entries()) {
    if (now >= window.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

export function proxy(request: NextRequest) {
  const now = Date.now();
  pruneExpiredWindows(now);

  const key = getClientKey(request);
  const current = rateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    const freshWindow: RateWindow = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };

    rateLimitStore.set(key, freshWindow);
    return attachRateHeaders(NextResponse.next(), freshWindow);
  }

  if (current.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );

    const response = NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429 },
    );

    response.headers.set("Retry-After", String(retryAfterSeconds));
    return attachRateHeaders(response, current);
  }

  const updatedWindow: RateWindow = {
    ...current,
    count: current.count + 1,
  };

  rateLimitStore.set(key, updatedWindow);
  return attachRateHeaders(NextResponse.next(), updatedWindow);
}

export const proxyConfig = {
  matcher: "/api/:path*",
};
