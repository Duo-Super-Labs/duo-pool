---
description: "Fase 3 do workflow duo. Recebe o plano e gera uma lista de tarefas executáveis com arquivos, ordem de dependência e verificação por passo."
---

# /duo.tasks — Geração de Tarefas

> **Agente executa, humano supervisiona.** IA gera, ordena e valida todas as tarefas. QA verifica cobertura de CA.
> **Humano:** Dev/Tech Lead revisa granularidade e aprova.

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

Se `.duo/tasks.md` **já existe**: tarefas já foram geradas (CI ou sessão anterior).
- Leia `.duo/tasks.md`
- Exiba as tarefas existentes
- Pergunte: "Tarefas existentes para #N. Confirma para `/duo.refine`? Ou ajustar algo?"
- **NÃO re-gere as tarefas** — use o que está na branch

Se `.duo/plan.md` existe mas `.duo/tasks.md` **não existe**: plano feito, tarefas pendentes.
- Use o plano local como input para gerar as tarefas

Se `.duo/plan.md` **não existe**: "Plano não encontrado. Rode `/duo.plan #N` primeiro."

### 0c. Resolução final do issue number

Prioridade (primeira que resolver):
1. **Argumento explícito:** `/duo.tasks #42` → usar #42
2. **Branch atual:** `duo/13-...` → usar #13
3. **Conversa:** Procurar issue mencionada recentemente
4. **Nenhum:** Perguntar: "Informe o número da issue (#N)."

---

## Passo 1: Carregar Plano + Agente de Domínio

### 1a. Ler plano

Do arquivo `.duo/plan.md`, extraia:
- **Issue** (#número)
- **Tipo** (debt | story | bug | improvement)
- **Passos** com arquivos-alvo e verificações
- **Invariantes**
- **Referência no repo** (gold-standard)
- **Referência visual** (Figma link ou "design system")
- **Restrições** e "Fora de Escopo"

### 1b. Carregar agente de domínio (OBRIGATÓRIO — evita exploração desnecessária do codebase)

Em duo-pool não há specialists de domínio. As convenções vivem em `CLAUDE.md` e ADRs em `.claude/knowledge/decisions/`.

Para gerar tarefas, leia:
- `CLAUDE.md` — 5-Layer Data Flow, Frontend Rules, Module Architecture, NEVER DO list
- ADRs relevantes em `.claude/knowledge/decisions/` (especialmente ADR-001 e ADR-003 pra qualquer mudança em polls)
- Agentes em `.claude/agents/` quando o tipo da tarefa casar (`tdd-guide`, `bug-fixer`, `database-reviewer`, `security-reviewer`)

Glob/Grep apenas para:
- Confirmar se um arquivo específico já existe antes de criar
- Resolver o caminho exato de um arquivo que será modificado

---

## Passo 2: Gerar Tarefas

Para cada passo do plano, gere tarefas atômicas. Cada tarefa = uma alteração em um ou poucos arquivos que pode ser verificada isoladamente.

### Formato obrigatório

```markdown
- [ ] T001 [tipo] Descrição concreta → `caminho/do/arquivo.tsx`
  - Verificação: `comando que confirma que a tarefa está correta`
```

Onde `[tipo]` é:

| Tag | Significado | Quando usar |
|-----|-------------|-------------|
| `[test]` | Escrever/modificar teste | Sempre ANTES da implementação correspondente |
| `[impl]` | Implementar código | Após o teste existir |
| `[refactor]` | Alterar sem mudar comportamento | Debt, cleanup pós-implementação |
| `[config]` | Schema, migration, configuração | Setup inicial |
| `[doc]` | Documentação, types, exports | Finalização |

### Regras de geração

**Ordem obrigatória:**
1. `[config]` — setup, schemas, migrations (se houver)
2. `[test]` — testes para a primeira unidade de trabalho
3. `[impl]` — implementação que faz os testes passarem
4. Repetir 2-3 para cada unidade
5. `[refactor]` — limpeza (se necessário)
6. `[doc]` — exports, types, documentação

**Agrupamento por User Story (para stories G — grandes):**

Se a demanda é tipo `story` com estimativa **G** e tem múltiplos critérios de aceite independentes, agrupar por user story em vez de por tipo. Cada story vira uma fase:

```markdown
## Phase 1: Setup (shared)
- [ ] T001 [config] ...

## Phase 2: [US1] Listagem de usuários
- [ ] T002 [test] ...
- [ ] T003 [impl] ...

## Phase 3: [US2] Criação de usuário
- [ ] T004 [test] ...
- [ ] T005 [impl] ...

## Phase 4: Polish
- [ ] T006 [refactor] ...
- [ ] T007 [doc] ...
```

**Benefício:** permite entregar MVP = Phase 1 + Phase 2, sem precisar de tudo pronto.
**Quando usar:** stories G com 2+ user stories/CAs independentes. Para P e M, manter agrupamento por tipo.

**Granularidade:**
- Uma tarefa = um arquivo ou uma alteração lógica coesa
- Se a tarefa precisa de mais de 100 linhas de diff, quebre em duas
- Cada tarefa deve ter verificação executável (comando real, não "conferir visualmente")

**Dependências e Paralelismo:**
- Tarefas são sequenciais por padrão (T001 antes de T002)
- Marque `[P]` se a tarefa é genuinamente independente (arquivos diferentes, sem import cruzado)
- Tarefas `[P]` adjacentes podem ser executadas em paralelo pelo `/duo.exec` via Agent com `run_in_background: true` em worktrees isoladas
- Exemplo: `- [ ] T004 [P] [test] Escrever teste para Y → ...` e `- [ ] T005 [P] [test] Escrever teste para Z → ...` rodam juntas

**Referência:**
- Para cada `[impl]`, referencie o arquivo gold-standard do repo: "Seguir padrão de `[caminho]`"

---

## Passo 3: Validação das Tarefas

Antes de apresentar, verifique:

- [ ] Toda `[impl]` tem uma `[test]` correspondente antes dela
- [ ] Toda tarefa tem caminho de arquivo real (não genérico)
- [ ] Toda tarefa tem verificação executável
- [ ] A sequência respeita dependências de import
- [ ] Nenhuma tarefa viola "NEVER DO" ou "Fora de Escopo" do plano
- [ ] Total de tarefas é razoável para o tipo:

| Tipo | Recomendado | Limite (warning) |
|------|-------------|------------------|
| **bug** | 3-4 | > 6 → "Considere quebrar em sub-issues" |
| **debt** | 5-8 | > 10 → "Considere quebrar em sub-issues" |
| **improvement** | 6-10 | > 12 → "Considere quebrar em sub-issues" |
| **story** | 8-12 | > 15 → "Considere quebrar em sub-issues" |

Se exceder o limite, **avise** mas permita override: "X tarefas para um [tipo]. Recomendo quebrar em sub-issues. Prosseguir assim mesmo?"

---

## Passo 4: Salvar Tarefas

Salve em `.duo/tasks.md` na branch de trabalho:

```markdown
# Tarefas: [título da demanda]

**Issue:** #[número]
**Plano:** `.duo/plan.md`
**Tipo:** [tipo]
**Total:** [N] tarefas
**Breakdown:** [N] test + [N] impl + [N] config + [N] refactor + [N] doc

## Setup
- [ ] T001 [config] Descrição → `caminho/arquivo`
  - Verificação: `comando`

## Implementação
- [ ] T002 [test] Escrever teste para X → `caminho/__tests__/X.test.tsx`
  - Verificação: `bun test caminho/__tests__/X.test.tsx` (deve FALHAR — RED)
  - Referência: `modules/admin/users/__tests__/UsersListView.test.tsx`
- [ ] T003 [impl] Implementar X seguindo padrão de `ref/GoldStandard.tsx` → `caminho/X.tsx`
  - Verificação: `bun test caminho/__tests__/X.test.tsx` (deve PASSAR — GREEN)
- [ ] T004 [P] [test] Escrever teste para Y → `caminho/__tests__/Y.test.tsx`
  - Verificação: `bun test caminho/__tests__/Y.test.tsx` (deve FALHAR)
- [ ] T005 [P] [impl] Implementar Y → `caminho/Y.tsx`
  - Verificação: `bun test caminho/__tests__/Y.test.tsx` (deve PASSAR)

## Finalização
- [ ] T006 [doc] Exportar componentes no index → `caminho/index.ts`
  - Verificação: `bun turbo type-check`
- [ ] T007 [refactor] Limpar imports não utilizados → arquivos modificados
  - Verificação: `bun turbo lint`

## Invariantes (rodar após cada grupo)
- `bun turbo type-check`
- `bun test` (ou scope específico)
- `bun turbo lint`
```

---

## Handoff

Após apresentar as tarefas:

> "Tarefas salvas em `.duo/tasks.md` na branch `[branch]`. Rodar `/duo.refine #[N]` para validar edge cases antes de executar?"

Aceite variações:
- "sim" → Sugira o comando exato
- "pular refine" → Sugira `/duo.exec #[N]` diretamente (com warning: "Refine detecta edge cases. Recomendo rodar.")
- "ajusta T003" → Modifique a tarefa e re-exiba
- "não" → Pare

**NÃO** execute nenhuma tarefa. Tarefas são um contrato — execução é a próxima fase.

---

## Princípios

- **TDD inegociável** — `[test]` sempre antes de `[impl]` correspondente
- **Arquivo real** — nenhuma tarefa sem caminho concreto
- **Verificação real** — nenhuma tarefa sem comando executável
- **Gold-standard** — toda implementação referencia um padrão existente no repo
- **Limites como guia** — avisar quando exceder, não bloquear
- **Paralelismo explícito** — `[P]` marca tarefas que o exec pode rodar em paralelo via Agent
