import type { contract } from "@duopool/contracts";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";

// Base URL for RPC endpoint. In RSC the client is called from server context,
// so we resolve to absolute URL when running on the server.
function getRpcUrl() {
  // In RSC the client is called from server context, so we resolve to an
  // absolute URL when running on the server. In the browser we use a
  // relative path so the request goes to the same origin.
  if (typeof window !== "undefined") {
    return "/api/rpc";
  }
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`;
  return `${base}/api/rpc`;
}

const link = new RPCLink({ url: getRpcUrl });

export const orpc: ContractRouterClient<typeof contract> =
  createORPCClient(link);
