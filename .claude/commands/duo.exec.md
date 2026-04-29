---
description: "Fase 5 do workflow duo. Executa tarefas refinadas com delegação a agentes especializados e paralelismo de tarefas independentes."
---

# /duo.exec — Execução de Tarefas

> **Agente executa, humano supervisiona.** IA implementa todas as tarefas (TDD, paralelo). QA verifica cada tarefa contra CA.
> **Humano:** Dev resolve bloqueios e valida visualmente.
> **Modo equipe:** Múltiplos devs + múltiplos agentes em paralelo.

## Entrada

```text
$ARGUMENTS
```

---

## Passo 0: Resolução de Contexto (OBRIGATÓRIO)

Antes de qualquer ação, determine automaticamente a issue e o estado atual do pipeline.

### 0a. Detectar branch atual

```bash
BRANCH=$(git branch --show-current)
```

Se a branch segue o padrão `duo/<number>-*`, extraia o issue number:
```bash
ISSUE_NUMBER=$(echo "$BRANCH" | sed -n 's|^duo/\([0-9]*\)-.*|\1|p')
```

### 0b. Verificar `.duo/` na branch

```bash
ls .duo/ 2>/dev/null
```

Se `.duo/tasks.md` existe: verificar veredito do refine (ver 0e abaixo).

Se `.duo/tasks.md` **não existe**: "Tarefas não encontradas. Rode `/duo.blueprint #N` ou `/duo.tasks #N` primeiro."

### 0c. Resolução final do issue number

Prioridade (primeira que resolver):
1. **Argumento explícito:** `/duo.exec #42` → usar #42
2. **Branch atual:** `duo/13-...` → usar #13
3. **Conversa:** Procurar issue mencionada recentemente
4. **Nenhum:** Perguntar: "Informe o número da issue (#N)."

### 0.5. Product Constraints Baseline

Se `product/constraints.md` existe no repositório atual, leia-o **antes de executar qualquer tarefa**. Este arquivo contém constraints imutáveis definidos durante `/duo.shape`.

```bash
[ -f product/constraints.md ] && cat product/constraints.md
```

**Se exists:** carregue como baseline. Os campos "Imutáveis" são sagrados — não proponha alternativas, não questione, não mude código de forma que viole. Se uma tarefa conflitar com constraint, **pare e sinalize**. Os "Overrides" vs duo-admin defaults devem ser respeitados em toda implementação.

**Se não exists:** prossiga normalmente (repo sem shape upstream).

### 0e. Verificar Veredito do Refine (Quality Gate)

Leia o final de `.duo/tasks.md` e procure pelo marcador `<!-- duo:refine-verdict -->`.

- Se `VERDICT: APPROVED` ou `VERDICT: APPROVED_WITH_NOTES` → prosseguir
- Se `VERDICT: BLOCKED` → **PARAR**: "Refine bloqueou a execução. Rode `/duo.refine #N` para resolver os findings antes de executar."
- Se **nenhum marcador** encontrado → avisar: "Tarefas não foram refinadas. Recomendo `/duo.refine #N` antes de executar. Prosseguir sem refine?" (aceitar override do dev)

### 0d. Flag de resume

Se `--resume` presente nos argumentos ou se `.duo/tasks.md` já tem `[X]`:
- Retomar de onde parou (tarefas com `[X]` são puladas)

---

## Passo 1: Preparação

1. **Carregar** tarefas refinadas (output do `/duo.refine`)
2. **Carregar** CLAUDE.md — regras ativas durante toda execução
3. **Carregar** skills relevantes ao tipo (testing-strategy, frontend-patterns, etc.)
4. **Detectar agente de domínio** — leia `.duo/tasks.md` e detecte qual especialista carregar como contexto para tarefas `[impl]`:

   | Se as tarefas contêm | Agente de domínio |
   |---|---|
   | `DataTable`, `FilterSheet`, `ListingPage`, `listing`, `filter`, `useCreateTable` | `agents/engineering/listing-specialist.md` |
   | `CreateSheet`, `EditSheet`, `FormFields`, `useForm`, `mutateAsync` | `agents/engineering/form-specialist.md` |
   | `figma.com`, `Figma`, `design-to-code`, `theme.css` | `agents/engineering/figma-specialist.md` |
   | `api.ts`, `useQuery`, `useMutation`, `generated`, `SDK` | `agents/engineering/sdk-specialist.md` |
   | `[constants]`, `[logic]`, `[hook]`, `Legado:`, `temp/LEGACY-CODE` | `agents/engineering/legacy-analyst.md` |

   Se detectado: leia o arquivo com Read e injete seu conteúdo como contexto antes de executar tarefas `[impl]` do domínio. Para tarefas `[impl]` de componentes, sempre carregar `agents/engineering/frontend-architect.md` como referência de arquitetura. Para tarefas de normalização (tags `[constants]`, `[logic]`, `[hook]`, `[component]`, `[chart]`), carregar `agents/engineering/legacy-analyst.md` como referência de tradução.

5. **Detectar comandos de verificação** — leia `package.json` da raiz para determinar os comandos corretos:
   ```bash
   # Detectar automaticamente: pnpm/bun/npm, typecheck/type-check, test, lint
   # Usar o que está definido no scripts do package.json
   ```
5. **Consultar Knowledge Base (errors):**
   ```bash
   ls .claude/knowledge/errors/ 2>/dev/null
   ```
   Para cada error relevante à área de impacto das tarefas, leia e mantenha como contexto ativo. Isso evita repetir erros de ciclos anteriores.

6. **Logar assumptions:**
   Durante a execução, se a IA tomar uma decisão sem confirmação explícita do dev (ex: escolha de pattern, lib, abordagem), logar como assumption:

   ```bash
   cat > .claude/knowledge/assumptions/YYYY-MM-DD-descricao-curta.md << 'EOF'
   ---
   type: assumption
   status: pending
   category: [architecture|pattern|convention|edge-case]
   issue: N
   ---

   **Assumption:** [o que foi assumido]
   **Rationale:** [por que essa decisão foi tomada]
   **Impact:** [o que muda se estiver errado]
   **Evidence:** [arquivo/código que motivou]
   EOF
   ```

   **Regras:**
   - Só logar assumptions não-triviais (não logar "usei Tailwind" — isso é convenção do repo)
   - Logar quando: escolheu abordagem A em vez de B, assumiu comportamento de API, inferiu requisito não explícito
   - Status `pending` até o dev confirmar no PR review

7. **Checkpoint inicial:**
   ```bash
   echo "$(date +%Y-%m-%d-%H:%M) | exec-start:[nome] | issue:#[N] | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log
   ```
6. **Atualizar board:**
   ```bash
   gh issue edit $ISSUE_NUMBER --add-label "duo:in-dev" --remove-label "duo:planned"
   ```
7. **Confirmar** com o dev:
   > "[N] tarefas prontas. Executar? (sim / sim mas parar entre grupos / só o grupo 1)"

---

## Passo 2: Roteamento de Modelo por Tarefa

Cada tarefa é roteada para o contexto mais eficiente:

| Tag | Execução | Justificativa |
|-----|----------|---------------|
| `[config]` | Agent com `model: "haiku"` | Boilerplate: schemas, exports, configs. Baixa complexidade. |
| `[doc]` | Agent com `model: "haiku"` | Types, re-exports. Mecânico. |
| `[test]` | Sessão principal (Sonnet/Opus) | Precisa entender padrões de teste do repo. |
| `[impl]` | Sessão principal (Sonnet/Opus) | Implementação seguindo gold-standard. Core do trabalho. |
| `[refactor]` | Sessão principal (Sonnet/Opus) | Precisa entender contexto para não quebrar comportamento. |

**Escalação para Opus via Agent:** Se uma tarefa `[impl]` falha na 2ª tentativa, delegue para um Agent com `model: "opus"` e instrução: "Esta tarefa exige raciocínio profundo sobre [contexto]."

---

## Passo 3: Execução Tarefa por Tarefa

### 3a. Detectar Resume

Se `--resume` ou se o arquivo de tarefas já tem `[X]`:
- Pule tarefas marcadas `- [X]`
- Comece da primeira `- [ ]` pendente
- Anuncie: "Retomando de T00X. [N] tarefas pendentes."

### 3b. Detectar Tarefas Paralelas

Antes de executar, identifique blocos de tarefas `[P]` adjacentes:

```
- [ ] T004 [P] [test] Escrever teste para Y → ...
- [ ] T005 [P] [test] Escrever teste para Z → ...
```

Tarefas `[P]` adjacentes podem ser executadas em paralelo via Agent com `run_in_background: true` e `isolation: "worktree"`.

### 3c. Executar (sequencial)

Para cada tarefa na sequência:

**Anunciar:**
```
── T003 [test] Escrever teste para FilterSheet ──────────────────
   Arquivo: modules/audit/components/__tests__/FilterSheet.test.tsx
   Referência: modules/admin/users/__tests__/UsersListView.test.tsx
```

**Ler Contexto:**
- Arquivo gold-standard referenciado na tarefa
- Arquivos criados/modificados por tarefas anteriores (estado atual)
- Skills relevantes (ex: `testing-strategy` para `[test]`, `frontend-patterns` para `[impl]`)

**Implementar:**
- Padrão do gold-standard
- Regras do CLAUDE.md
- Skills carregadas
- Restrições do tipo (debt/story/bug/improvement)

**Verificar:**
Rodar o comando de verificação definido na tarefa:

```bash
# Exemplo para [test] — deve FALHAR (RED)
bun test modules/audit/components/__tests__/FilterSheet.test.tsx
```

**Se verificação passa:** marcar `[X]` e seguir para próxima tarefa.

**Se verificação falha (e não era esperado):**
1. Analisar erro
2. Tentar fix (máximo 2 tentativas na sessão principal)
3. Se falhar na 2ª tentativa → escalar para Agent com `model: "opus"`
4. Se Opus também falhar → PARAR e reportar:

```
⚠ T003 falhou após 3 tentativas (2 Sonnet + 1 Opus).
Erro: [mensagem]
Arquivo: [caminho]
Sugestão: [o que o dev pode verificar]

Continuar com próxima tarefa ou parar?
```

### 3d. Executar (paralelo — tarefas [P])

Para blocos de tarefas `[P]` adjacentes:

```
Executar T004 e T005 em paralelo:
- Agent 1 (worktree isolado): T004
- Agent 2 (worktree isolado): T005

Aguardar ambos. Merge resultados.
```

Usar Agent com `isolation: "worktree"` e `run_in_background: true`.

### 3e. Marcar Progresso

Atualizar o arquivo de tarefas substituindo `- [ ]` por `- [X]`:

```markdown
- [X] T003 [test] Escrever teste para FilterSheet → `modules/audit/...`
```

---

## Passo 4: Invariantes Entre Grupos

Após completar cada grupo (setup, implementação, finalização), rodar invariantes usando os comandos detectados no Passo 1:

```bash
# Usar os comandos do package.json detectados
pnpm typecheck   # ou o equivalente
pnpm test        # suite relevante, não tudo
pnpm lint        # se disponível
```

**Se invariante falha:**
1. Identificar qual tarefa causou a quebra
2. Fix cirúrgico (não refazer a tarefa inteira)
3. Re-rodar invariantes
4. Se não resolver em 2 tentativas → PARAR e reportar

**Deliverable Check (entre grupos):**

Após invariantes passarem, validar que o grupo entregou tudo que o plano prometeu:

1. Ler `.duo/plan.md` — seção de passos correspondente ao grupo completado
2. Para cada arquivo listado no passo:
   - Se "criar" → verificar que o arquivo existe (`ls path/to/file`)
   - Se "editar" → verificar que o arquivo foi modificado (`git diff --name-only | grep file`)
3. Se algum deliverable está faltando → listar e implementar antes de prosseguir
4. Registrar no relatório: "Deliverables: [N]/[N] entregues"

Isso previne o problema de "compila e roda mas omitiu metade dos entregáveis."

**Checkpoint entre grupos (WIP commit):**

```bash
git add -A && git commit -m "WIP: duo-checkpoint exec-group:[nome-grupo]

Issue: #[número]
Phase: exec
Tasks completed: T001-T005"
```

**Session Hygiene (IMPORTANTE):**

Context rot degrada a qualidade do output. Após cada checkpoint entre grupos:
1. Verificar uso do context window
2. Se **>50% do context** está utilizado → sugerir ao dev: "Context >50%. Recomendo limpar e rodar `/duo.exec #[N] --resume` para continuar com contexto limpo."
3. **Regra de ouro:** máximo 1 grupo de implementação (setup + impl ou impl + finalização) por sessão. Limpar contexto entre grupos grandes.
4. Ao retomar com `--resume`, sempre recarregar `.duo/plan.md` e `.duo/tasks.md` — nunca confiar no histórico da conversa.

---

## Passo 5: Review Automático por Agent

Após o grupo de **implementação** (todas as `[test]` + `[impl]`), invocar o `code-reviewer` agent:

```
Delegue ao agente code-reviewer:
- Escopo: apenas arquivos criados/modificados nesta execução
- Tools permitidas: Read, Grep, Glob (somente leitura)
- Verificar:
  1. Padrões do CLAUDE.md respeitados
  2. Sem console.log, sem any, sem imports proibidos
  3. Testes cobrem happy path + edge cases identificados no refine
  4. Código segue o gold-standard referenciado
- Output: lista de issues (CRITICAL / HIGH / MEDIUM)
```

**Se CRITICAL > 0:** PARAR. Mostrar issues ao dev.
**Se HIGH > 0:** Tentar fix automático (1 tentativa). Se falhar, reportar.
**Se apenas MEDIUM:** Continuar. Listar no relatório final.

---

## Passo 6: Relatório de Execução

Após todas as tarefas ou ao parar:

```markdown
## Relatório de Execução

**Issue:** #[número]
**Plano:** `.duo/plan.md`
**Status:** [COMPLETO | PARADO em T00X]

### Progresso
- Total: [N] tarefas
- Completas: [N] ✓
- Falharam: [N] ✗
- Pendentes: [N]
- Paralelas executadas: [N] (via Agent worktree)

### Arquivos Modificados
- `caminho/arquivo.tsx` — [criado | modificado]
- ...

### Invariantes
- typecheck: PASS ✓
- test: PASS ✓ ([N] tests, [N] passing)
- lint: PASS ✓

### Review (code-reviewer)
- CRITICAL: 0
- HIGH: 0
- MEDIUM: [N] — [resumo]

### Execução por Tipo
- Tarefas config/doc (Agent Haiku): [N]
- Tarefas test/impl/refactor (sessão principal): [N]
- Escalações para Opus: [N]
```

---

## Handoff

Após relatório:

- Se COMPLETO: "Execução finalizada. Rodar `/duo.review #[N]` para review final?"
- Se PARADO: "Execução parou em T00X. Corrigir e rodar `/duo.exec #[N] --resume` para continuar?"

---

## Princípios

- **Modelo certo para a tarefa** — Haiku para boilerplate, sessão principal para core, Opus como escalação
- **Falhar rápido** — 3 tentativas máximo por tarefa (2 + 1 Opus), não ficar em loop
- **Progresso visível** — marcar `[X]` e WIP commits a cada grupo
- **Review integrado** — code-reviewer roda automaticamente, não como fase separada manual
- **Recuperável** — WIP commits permitem voltar, `--resume` permite continuar de onde parou
- **Paralelismo real** — tarefas `[P]` rodam em worktrees isolados via Agent
- **Board atualizado** — issue recebe label `duo:in-dev` no início
