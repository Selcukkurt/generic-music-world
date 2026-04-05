import type { NextRequest } from "next/server";

/** Best-effort client IP for audit PDFs (X-Forwarded-For first hop, then x-real-ip). */
export function getRequestClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  const cf = request.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  return "unknown";
}
