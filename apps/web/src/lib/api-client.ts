import "server-only";

import { headers } from "next/headers";

import { authStubHeaderNames } from "@eth-staking/domain";

function resolveApiRoot() {
  const rawBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, "");

  return normalizedBaseUrl.endsWith("/v1") ? normalizedBaseUrl : `${normalizedBaseUrl}/v1`;
}

async function getForwardedHeaders() {
  const requestHeaders = await headers();
  const forwardedHeaders = new Headers();

  for (const headerName of Object.values(authStubHeaderNames)) {
    const headerValue = requestHeaders.get(headerName);

    if (headerValue) {
      forwardedHeaders.set(headerName, headerValue);
    }
  }

  return forwardedHeaders;
}

export async function fetchApiJson<T>(path: string): Promise<T> {
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${resolveApiRoot()}${sanitizedPath}`, {
    method: "GET",
    headers: await getForwardedHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed for '${sanitizedPath}' with status ${response.status}`);
  }

  return (await response.json()) as T;
}
