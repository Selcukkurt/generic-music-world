"use client";

import { getBearerTokenForMeApi } from "./meApiSession";

export async function meApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getBearerTokenForMeApi();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${typeof window !== "undefined" ? window.location.origin : ""}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...init, headers });
}
