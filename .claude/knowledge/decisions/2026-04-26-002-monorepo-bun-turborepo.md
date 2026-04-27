# ADR-002: Monorepo with Bun workspaces + Turborepo

**Status:** Accepted
**Date:** 2026-04-26

## Context

Multiple workspaces (`apps/web`, `packages/database`, `packages/contracts`, `packages/api`) need to share types and code while preserving the topological boundaries enforced by ADR-001 (5-Layer Data Flow). We also want fast install, parallelized type-check / lint / test, and a single `bun verify` quality gate.

## Decision

- **Bun workspaces** (root `package.json` with `"workspaces": ["apps/*", "packages/*"]`) for package linking and a single shared `node_modules`.
- **Turborepo** as the task orchestrator (`turbo.json`) with pipelines for `build`, `type-check`, `lint`, `test`, and `dev`. Tasks are cached and parallelized.
- **Bun as the runtime** for scripts (`bun --env-file=...`, `bun run dev`, `bun test`). Not pnpm, not npm.
- TypeScript compiler option `allowImportingTsExtensions: true` so cross-package imports use explicit `.ts` extensions — Bun runs `.ts` natively without a build step.

## Consequences

- **(+)** A single `bun verify` runs type-check + lint + test across the workspace in parallel — quality gate scales to N packages with no extra config.
- **(+)** Package boundaries are physical (each has its own `package.json` + `tsconfig.json`), so `apps/web` *cannot* accidentally import `packages/database` internals — only the package's `exports` map.
- **(+)** Faster install vs npm (Bun's resolver) — relevant during the live demo if any deps need to be resolved.
- **(−)** Diverges from duo-admin's pnpm setup, but Bun workspaces behave identically for the topology we need. Tooling like Drizzle/Next/oRPC are package-manager agnostic.
- **(−)** Some libraries (drizzle-kit, certain Next plugins) require explicit `--bun` flags when run via `bunx`. Mitigated in the per-package scripts.

## Quality gate impact

Turborepo `pipelines` map directly to the `bun verify` command. New packages must declare `type-check`, `lint`, and `test` scripts to participate.
