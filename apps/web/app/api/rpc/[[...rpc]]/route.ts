import { router } from "@duopool/api";
import { RPCHandler } from "@orpc/server/fetch";

// Mounts the entire oRPC router under /api/rpc.
// Next 16 catch-all conventions: optional double-bracket so /api/rpc itself
// (no segment) also matches.

const handler = new RPCHandler(router);

async function handle(request: Request) {
  const result = await handler.handle(request, {
    prefix: "/api/rpc",
    context: {},
  });
  return result.matched
    ? result.response
    : new Response("Not Found", { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
