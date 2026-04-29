---
description: "Fase 4 do workflow duo. Valida tarefas contra o plano, detecta ambiguidades, identifica edge cases usando skills aprendidas, e faz perguntas bloqueantes antes da execução."
---

# /duo.refine — Refino e Validação Pré-Execução

> **Agentes nesta fase:**
> - **Agente QA** — valida cobertura de critérios de aceite, detecta edge cases, consulta skills aprendidas
> - **Agente Arquiteto** — valida consistência técnica e dependências entre tarefas
>
> **Agente executa, humano supervisiona.** QA valida cobertura de CA, Arquiteto valida consistência.
> **Humano:** Dev/Tech Lead responde perguntas bloqueantes (max 3).

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

Se `.duo/plan.md` e `.duo/tasks.md` existem: artefatos prontos para refino.

Se `.duo/tasks.md` **não existe**: "Tarefas não encontradas. Rode `/duo.tasks #N` primeiro."

Se `.duo/plan.md` **não existe**: "Plano não encontrado. Rode `/duo.plan #N` primeiro."

### 0c. Resolução final do issue number

Prioridade (primeira que resolver):
1. **Argumento explícito:** `/duo.refine #42` → usar #42
2. **Branch atual:** `duo/13-...` → usar #13
3. **Conversa:** Procurar issue mencionada recentemente
4. **Nenhum:** Perguntar: "Informe o número da issue (#N)."

---

## Passo 1: Carregar Artefatos

Leia e mantenha em contexto:
1. **Plano** (`.duo/plan.md`) — objetivo, passos, invariantes, restrições, fora de escopo
2. **Tarefas** (`.duo/tasks.md`) — lista completa com verificações
3. **CLAUDE.md** — regras do repo
4. **Código-alvo** — leia os arquivos que as tarefas vão modificar/criar
5. **Skills aprendidas** — leia `.claude/skills/learned/` por edge cases e padrões de demandas similares ao tipo e área de impacto atual

---

## Passo 2: Consultar Knowledge Base + Aprendizados

### 2a. Knowledge Base (decisions, errors, assumptions)

Leia `.claude/knowledge/` por entries relevantes:

```bash
ls .claude/knowledge/decisions/ .claude/knowledge/errors/ .claude/knowledge/assumptions/ 2>/dev/null
```

Para cada arquivo, leia o frontmatter e verifique relevância pela `category` e `issue`.

**Ação por tipo:**
- **Errors** relevantes → verificar se as tarefas atuais evitam o mesmo erro. Se não, adicionar tarefa ou invariante.
- **Decisions** relevantes → verificar se as tarefas seguem a decisão. Se conflitam, levantar como pergunta bloqueante.
- **Assumptions `pending`** → incluir na lista de perguntas bloqueantes se impactam as tarefas.
- **Assumptions `confirmed`** → tratar como fato, não re-questionar.

### 2b. Skills Aprendidas

Busque em `.claude/skills/learned/` por skills relevantes à demanda atual:

```
Critérios de relevância:
- Tipo igual (implementation, error-resolution, edge-case, rule-reinforcement)
- Área de impacto similar (mesmo módulo, mesma camada)
- Contexto aplicável (mesmo tipo de componente, mesmo padrão)
```

Para cada skill relevante encontrada, verifique se o edge case ou padrão já está coberto nas tarefas. Se não estiver, adicione como tarefa na Fase 5.

Exemplo: se encontrar `2026-03-20-edge-case-tooltip-needs-button-wrapper.md` e a demanda atual tem tooltips, verifique se as tarefas cobrem acessibilidade de tooltip.

---

## Passo 3: Validação de Cobertura de Critérios de Aceite

O Agente QA verifica que **todo critério de aceite** do briefing (definidos pelo autor + complementados pelo QA) tem cobertura nas tarefas.

### 3a. Carregar Critérios

Extraia os critérios de aceite do briefing (comment `<!-- duo:briefing -->` na issue) ou do plano.

### 3b. Matriz de Cobertura

| Critério | Tarefa(s) | Status |
|----------|-----------|--------|
| CA1: [critério] | T002, T003 | ✓ Coberto |
| CA2: [critério] | T005 | ✓ Coberto |
| CA3: [critério] | — | ✗ SEM COBERTURA |
| CA4: [critério] | T004 (parcial) | ⚠ Parcial |

### 3c. Ação por Status

- **✓ Coberto** — ok, seguir
- **⚠ Parcial** — adicionar tarefas complementares na Fase 7
- **✗ SEM COBERTURA** → **BLOQUEANTE** — critério de aceite sem nenhuma tarefa correspondente. Adicionar tarefas `[test]` + `[impl]` obrigatoriamente na Fase 7

**Se algum critério está SEM COBERTURA, o refine NÃO pode aprovar as tarefas sem correção.**

---

## Passo 4: Validação Cruzada Técnica (Agente Arquiteto)

Verifique consistência entre plano e tarefas. Reporte apenas problemas concretos.

### 4a. Cobertura

Para cada passo do plano, confirme que existe pelo menos uma tarefa correspondente.

```
Passo do plano sem tarefa → BLOQUEANTE
Tarefa sem passo no plano → flag como scope creep (remover ou justificar)
```

### 4b. Consistência

- Tarefa referencia arquivo que não existe e não será criado por tarefa anterior → BLOQUEANTE
- Tarefa `[impl]` sem `[test]` correspondente antes → BLOQUEANTE
- Verificação de tarefa usa comando que não existe no repo (ex: `bun test` num repo que usa `pnpm test`) → BLOQUEANTE
- Tarefa contradiz "NEVER DO" do CLAUDE.md → BLOQUEANTE
- Tarefa contradiz "Fora de Escopo" do plano → BLOQUEANTE

### 4c. Dependências

- Tarefa A importa de arquivo criado por tarefa B, mas A vem antes de B → BLOQUEANTE
- Tarefa marcada `[P]` (paralela) mas depende de output de tarefa adjacente → corrigir sequência

---

## Passo 5: Detecção de Edge Cases (Agente QA)

Para cada tarefa `[impl]`, analise o código-alvo e o contexto da demanda. Identifique cenários não cobertos:

### Checklist de edge cases por contexto

**Se envolve UI/componentes:**
- Estado vazio (lista sem itens, dados não carregados)
- Estado de loading (skeleton, spinner)
- Estado de erro (API falha, timeout)
- Responsividade (mobile, tablet — se o repo tem breakpoints definidos)
- Acessibilidade (keyboard nav, aria labels — se o repo exige)
- Permissões (componente visível mas ação bloqueada por RBAC)

**Se envolve formulários:**
- Validação de campos obrigatórios
- Mensagens de erro por campo vs genéricas
- Submit com dados inválidos
- Submit duplo (double-click)
- Estado do botão durante submissão (disabled + loading text)
- Reset após sucesso

**Se envolve listagem/tabela:**
- Paginação (primeira página, última, página vazia)
- Ordenação (asc/desc, campo default)
- Filtros (aplicar, limpar, combinar múltiplos)
- Busca (debounce, query vazia, sem resultados)

**Se envolve API/dados:**
- Response vazio vs null vs undefined
- Erro de rede vs erro de negócio
- Dados parciais (campos opcionais ausentes)
- Concorrência (dado alterado por outro usuário)

**Se envolve migração/refactor:**
- Backward compatibility (consumers do componente antigo)
- Imports quebrados em outros módulos
- Testes existentes que dependem da API antiga

### Output de edge cases

Para cada edge case encontrado, classifique:

| Edge Case | Coberto? | Tarefa | Ação | Fonte |
|-----------|----------|--------|------|-------|
| Lista vazia | Não | T005 | Adicionar teste + handling | Checklist |
| Erro de API | Sim (T003) | — | Ok | — |
| Double submit | Não | T008 | Adicionar isPending check | Skill aprendida: `2026-03-20-tooltip-accessibility` |

A coluna **Fonte** indica se o edge case veio do checklist padrão ou de uma skill aprendida.

---

## Passo 6: Perguntas Bloqueantes (máximo 3)

Revise os problemas encontrados nos passos 3 e 4. Separe:

**Resolvível pelo agente** (não precisa perguntar):
- Edge case com padrão óbvio no repo → adicionar tarefa automaticamente
- Dependência de ordem → reordenar tarefas automaticamente
- Comando de verificação errado → corrigir automaticamente
- Edge case de skill aprendida → adicionar tarefa automaticamente

**Precisa de decisão do dev** (perguntar):
- Ambiguidade de comportamento que o CLAUDE.md não define
- Edge case onde existem duas abordagens válidas
- Scope creep potencial (tarefa que surgiu mas não estava no plano)

Formato:

```markdown
## Refino: 2 questões bloqueantes

**Q1: Comportamento quando filtro retorna zero resultados**
O plano não especifica e o CLAUDE.md não define um padrão.
  A) Mostrar empty state com ilustração (como `modules/admin/users/`)
  B) Mostrar mensagem inline na tabela (como `modules/admin/roles/`)
  Recomendado: A — é o padrão mais recente no repo

**Q2: Migrar consumers do componente antigo nesta demanda?**
3 arquivos importam o dropdown legado. Isso está como "Fora de Escopo" no plano.
  A) Manter fora de escopo — consumers migram em demanda separada
  B) Incluir migração dos 3 consumers (adiciona ~3 tarefas)
  Recomendado: A — respeitar o escopo do plano
```

Se ZERO questões bloqueantes: "Nenhuma ambiguidade. Tarefas validadas e prontas."

---

## Passo 7: Aplicar Correções

Após respostas do dev (ou se não houve perguntas):

1. **Corrigir** problemas de consistência e dependência automaticamente
2. **Adicionar** tarefas para critérios de aceite sem cobertura (com `[test]` + `[impl]`)
3. **Adicionar** tarefas de edge case que faltavam (com `[test]` + `[impl]`)
4. **Remover** tarefas que são scope creep confirmado
5. **Reordenar** se dependências mudaram
6. **Atualizar** o arquivo de tarefas (`.duo/tasks.md`)

---

## Passo 8: Consistency Check (Cross-Artifact)

Antes de emitir o veredito, valide consistência entre **todos** os artefatos do pipeline:

### 8a. Briefing ↔ Plano

| Verificação | Severidade |
|-------------|-----------|
| Todo item da "Área de Impacto" do briefing tem passo no plano | HIGH se ausente |
| Tipo do briefing (debt/story/bug/improvement) bate com o plano | CRITICAL se diverge |
| Estimativa (P/M/G) é compatível com o número de tarefas | MEDIUM se incompatível |

### 8b. Plano ↔ Tarefas

| Verificação | Severidade |
|-------------|-----------|
| Todo passo do plano tem pelo menos uma tarefa | HIGH se ausente |
| Tarefa sem passo correspondente no plano = scope creep | MEDIUM |
| "Fora de Escopo" do plano não tem tarefa correspondente | CRITICAL se violado |

### 8b-grounding. Grounding Check (plano ↔ filesystem)

Verificar que o plano referencia artefatos **reais** do codebase, nao hallucinations:

| Verificação | Como checar | Severidade |
|-------------|------------|-----------|
| Todo arquivo listado para "editar" existe | `ls path/to/file` | CRITICAL se nao existe |
| Todo diretório pai de arquivo "criar" existe | `ls -d path/to/dir/` | HIGH se nao existe |
| Interfaces/types referenciados existem | `grep -r "export.*InterfaceName"` | HIGH se nao encontrado |
| Imports planejados resolvem | Verificar que o modulo/pacote existe | MEDIUM se suspeito |
| Comandos de verificacao funcionam | `pnpm typecheck --help` etc | MEDIUM se invalido |

Se um arquivo para "editar" nao existe, o plano esta hallucinating — CRITICAL, nao pode executar.

### 8c. Tarefas ↔ CLAUDE.md

| Verificação | Severidade |
|-------------|-----------|
| Nenhuma tarefa viola regras "NEVER DO" | CRITICAL |
| Padrões obrigatórios do CLAUDE.md cobertos (ex: middleware chain, tenant isolation) | HIGH |
| Comandos de verificação usam os scripts do `package.json` corretos | MEDIUM |

### 8d. Findings Table

```markdown
| # | Categoria | Severidade | Localização | Descrição | Ação |
|---|-----------|-----------|-------------|-----------|------|
| F001 | Cobertura | HIGH | Passo 3 ↔ Tasks | Passo "RBAC" sem tarefa | Adicionar T012 [impl] |
| F002 | Scope creep | MEDIUM | T009 | Tarefa sem passo no plano | Remover |
```

---

## Output

### Veredito

Baseado nos findings, emita **um** veredito:

| Veredito | Condição | Ação |
|----------|----------|------|
| **APPROVED** | Zero CRITICAL, zero HIGH não resolvidos | Pode executar `/duo.exec` |
| **APPROVED_WITH_NOTES** | Zero CRITICAL, 1+ HIGH resolvidos automaticamente, 1+ MEDIUM pendentes | Pode executar, listar MEDIUM no relatório |
| **BLOCKED** | 1+ CRITICAL não resolvido, ou HIGH que precisa de decisão do dev | NÃO pode executar até resolver |

O veredito é salvo no final de `.duo/tasks.md`:

```markdown
<!-- duo:refine-verdict -->
VERDICT: [APPROVED|APPROVED_WITH_NOTES|BLOCKED]
FINDINGS: [N] total ([N] CRITICAL, [N] HIGH, [N] MEDIUM)
DATE: [YYYY-MM-DD]
<!-- /duo:refine-verdict -->
```

### Relatório

```markdown
## Resultado do Refino

**Issue:** #[número]
**Plano:** `.duo/plan.md`
**Veredito:** [APPROVED | APPROVED_WITH_NOTES | BLOCKED]

### Cobertura de Critérios de Aceite
- Critérios totais: [N]
- Cobertos: [N] ✓
- Parciais: [N] ⚠ → [N] tarefas adicionadas
- Sem cobertura: [N] ✗ → [N] tarefas adicionadas

### Consistency Check (Cross-Artifact)
- Briefing ↔ Plano: [N] findings
- Plano ↔ Tarefas: [N] findings
- Tarefas ↔ CLAUDE.md: [N] findings
- **Total: [N] findings** ([N] CRITICAL, [N] HIGH, [N] MEDIUM)

[Se findings > 0, incluir Findings Table]

### Validação Cruzada Técnica
- Cobertura de passos: [N]/[N] passos cobertos ✓
- Consistência: [N] issues → [N] corrigidos
- Dependências: [N] reordenações aplicadas

### Skills Aprendidas Consultadas
- [N] skills relevantes encontradas
- [N] edge cases incorporados de sessões anteriores
- Skills aplicadas: [listar nomes]

### Edge Cases
- [N] identificados → [N] já cobertos, [N] adicionados como tarefas

### Tarefas Atualizadas
- Antes: [N] tarefas
- Depois: [N] tarefas ([+N] edge cases, [-N] scope creep)

### Alterações Aplicadas
- T003 e T004 reordenados (dependência de import)
- T010 [test] adicionado: empty state para FilterSheet
- T011 [impl] adicionado: empty state handling
- T009 removido: fora de escopo (confirmado Q2)
```

Após o output, baseado no veredito:

- **APPROVED:** "Tarefas refinadas e aprovadas. Rodar `/duo.exec #[N]` para implementar?"
- **APPROVED_WITH_NOTES:** "Tarefas refinadas com [N] notas MEDIUM. Rodar `/duo.exec #[N]`? As notas ficam registradas no relatório."
- **BLOCKED:** "Refine BLOQUEADO — [N] findings CRITICAL/HIGH pendentes. Resolver antes de executar."

---

## Princípios

- **Edge cases são tarefas, não comentários** — se identificou um edge case, vira `[test]` + `[impl]`
- **Perguntar só o inresolvível** — se o repo tem um padrão, siga-o sem perguntar
- **Máximo 3 perguntas** — se tem mais de 3 ambiguidades, o plano precisa ser refeito
- **Correções automáticas são transparentes** — mostre o que mudou, não peça permissão para fixes óbvios
- **CLAUDE.md resolve a maioria** — se a resposta está nas regras do repo, não é ambiguidade
- **Aprendizado fecha o loop** — skills de sessões anteriores previnem edge cases recorrentes
- **Veredito é formal** — APPROVED/BLOCKED não é sugestão, é gate. BLOCKED impede execução
