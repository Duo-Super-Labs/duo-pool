import { contract } from "@duopool/contracts";
import { implement } from "@orpc/server";

// `pub` is the implementation builder bound to our contract. Every procedure
// in this app is built from `pub` (no auth/tenant/permission middleware in
// DuoPool — anonymous voting via cookie). Compare with duo-admin where
// procedures derive from `protectedProcedure.use(tenantMiddleware).use(...)`.

export const pub = implement(contract);
