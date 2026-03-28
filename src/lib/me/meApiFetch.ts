"use client";

import { getBearerTokenForMeApi } from "./meApiSession";

export async function meApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getBearerTokenForMeApi();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
