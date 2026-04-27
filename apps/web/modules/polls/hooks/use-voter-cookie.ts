"use client";

import { useEffect, useState } from "react";

const COOKIE_NAME = "dp_voter";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

function writeCookie(value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: cookie IS the voter id transport — atomic 1-vote-per-device invariant lives here
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; max-age=${ONE_YEAR_SECONDS}; path=/; samesite=lax`;
}

function generateVoterId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for very old environments
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns a stable per-device voter id (UUID v4) persisted in the `dp_voter`
 * cookie. Generated lazily on first call. Used as the unique key that backs
 * the "1 vote per device per poll" invariant on the server.
 */
export function useVoterCookie(): string | null {
  const [voterId, setVoterId] = useState<string | null>(null);

  useEffect(() => {
    let id = readCookie();
    if (!id) {
      id = generateVoterId();
      writeCookie(id);
    }
    setVoterId(id);
  }, []);

  return voterId;
}
