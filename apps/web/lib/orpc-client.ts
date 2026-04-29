import type { contract } from "@duopool/contracts";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";

// Base URL for RPC endpoint. RPCLink calls `new URL(url)` internally without
// a base, so the URL must be ABSOLUTE in both browser and server contexts —
// a relative `/api/rpc` would throw "Invalid URL".
//
// NEXT_PUBLIC_BASE_URL is inlined at build time, so it's available in both
// the browser and the server (RSC). Falls back to localhost for dev.
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  `http://localhost:${process.env.PORT ?? 3000}`;

const link = new RPCLink({ url: `${BASE_URL}/api/rpc` });

export const orpc: ContractRouterClient<typeof contract> =
  createORPCClient(link);
