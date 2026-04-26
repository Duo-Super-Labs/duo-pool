# DuoPool

Live polls com tema cultura pop. Construído ao vivo na palestra **"AI Amplifica. O Processo É Seu."** (Univali, 2026-04-29).

## Sobre

DuoPool é o app de demonstração para a palestra. A audiência vota numa meta-poll *"Vibecoding ou Engenharia de Contexto?"* enquanto o apresentador implementa uma feature ao vivo (`polls.vote`) usando o pipeline `duo.*` (`/duo.plan` → `/duo.tasks` → `/duo.exec`).

A escolha de stack e arquitetura é **incidental** — o ponto pedagógico é o **processo** (Engenharia de Contexto), não a stack.

## Stack

Monorepo Bun workspaces + Turborepo, inspirado no starter `duo-admin`.

| Camada | Package |
|---|---|
| Frontend | `apps/web` (Next.js 16 + shadcn + TanStack Query) |
| oRPC contracts (frontend-importável) | `packages/contracts` |
| oRPC procedures | `packages/api` |
| Drizzle schema + drizzle-zod + queries | `packages/database` |

Banco: **Postgres** (Docker local em dev → Neon em prod, mesmo driver `drizzle-orm/node-postgres`).

## 5-Layer Data Flow (NEVER skip layers)

```
L1: packages/database/src/schema/*.ts        → Drizzle table definitions
L2: packages/database/src/schema/zod.ts       → drizzle-zod validators (auto-derived)
L3: packages/database/src/query/*.ts          → Pure functions: fn(db, input)
L4: packages/contracts/src/*.ts               → oRPC contracts (frontend-importable, zero server deps)
L5: packages/api/modules/*/procedures/*.ts    → publicProcedure.handler()
```

Frontend consome via `apps/web/modules/<feature>/{components, api.ts (TanStack hooks), hooks, lib}`.

## Setup

```bash
bun install
docker compose up -d                              # local Postgres
cp .env.example .env.local                        # ajuste DATABASE_URL se necessário
bun --filter @duopool/database db:migrate         # aplica migrations
bun --filter @duopool/database db:seed            # carrega 3 polls iniciais
bun dev                                           # apps/web em localhost:3000
```

## Comandos

```bash
bun dev                          # roda apps/web
bun turbo type-check             # type-check em todos os packages
bun turbo build                  # build de produção
bun turbo test                   # testes
```

## Live demo na palestra

Repo no estado `step-3-pre-vote` antes da palestra. Durante o demo, `/duo.exec` implementa a feature `polls.vote` atravessando 5 arquivos em 4 packages, seguindo o 5-Layer Flow:

1. L3 query — `castVote()` em `packages/database/src/query/polls.ts`
2. L4 contract — `pollsContract.vote` em `packages/contracts/src/polls.ts`
3. L5 procedure — `voteProc` em `packages/api/modules/polls/procedures/vote.ts`
4. Frontend api hook — `useVote()` em `apps/web/modules/polls/api.ts`
5. Frontend UI — handler em `apps/web/modules/polls/components/PollPage.tsx`

Invariante: 1 voto por device por poll (UNIQUE constraint atômica em `votes`).

## Licença

MIT.
