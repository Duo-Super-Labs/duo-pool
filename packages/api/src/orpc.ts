import { contract } from "@duopool/contracts";
import { implement } from "@orpc/server";

// `pub` is the implementation builder bound to our contract. Every procedure
// in this app is built from `pub` (no auth/tenant/permission middleware in
// DuoPool — anonymous voting via cookie). Compare with duo-admin where
// procedures derive from `protectedProcedure.use(tenantMiddleware).use(...)`.

export type AppContext = {
  // Resolved from the dp_voter cookie at the HTTP boundary
  // (apps/web/app/api/rpc/[[...rpc]]/route.ts). null if absent.
  voterId: string | null;
};

export const pub = implement(contract).$context<AppContext>();
