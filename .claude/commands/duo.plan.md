---
description: "Fase 2 do workflow duo. Recebe briefing da triagem, mapeia critérios de aceite a passos, propõe wireframe se sem Figma. Agentes: Arquiteto (plano), Designer (wireframe)."
---

# /duo.plan — Planejamento de Implementação

> **Agentes nesta fase:**
> - **Agente Arquiteto** — desenha passos concretos, define gold-standard, mapeia critérios de aceite
> - **Agente Designer** — propõe wireframe HTML quando sem referência Figma (story/improvement)
>
> **Humano decide, agente executa.** IA gera plano completo + wireframe. Dev/Tech Lead aprova ou ajusta.
> **Agentes:** Arquiteto (plano), Designer (wireframe), QA (valida CA ↔ passos).
> **Modo equipe:** Tech Lead co-cria plano, Designer entrega Figma.

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

Se `.duo/plan.md` **já existe**: este plano foi gerado pelo CI ou por uma sessão anterior.
- Leia `.duo/plan.md` e `.duo/briefing.md`
- Exiba o plano existente
- Pergunte: "Plano existente para #N. Confirma para `/duo.tasks`? Ou ajustar algo?"
- **NÃO re-gere o plano** — use o que está na branch

Se `.duo/briefing.md` existe mas `.duo/plan.md` **não existe**: triage feita, plan pendente.
- Use o briefing local como input para gerar o plano

Se `.duo/` **não existe**: nenhum artefato do pipeline na branch.

### 0c. Resolução final do issue number

Prioridade (primeira que resolver):
1. **Argumento explícito:** `/duo.plan #42` → usar #42
2. **Branch atual:** `duo/13-...` → usar #13
3. **Conversa:** Procurar issue mencionada recentemente
4. **Nenhum:** Perguntar: "Informe o número da issue (#N) ou rode `/duo.triage` primeiro."

### 0d. Buscar dados da issue (se não veio de `.duo/`)

```bash
gh issue view $ISSUE_NUMBER --json title,body,labels,comments
```

Procure o comment com marcador `<!-- duo:briefing -->`. Parse o conteúdo entre os marcadores.

**Se briefing não encontrado (nem em `.duo/` nem em comment):** Avise e ofereça:
> "Issue #N não tem briefing de triagem. Rodar `/duo.triage #N` para triar, ou colar o briefing aqui?"

**Se briefing encontrado:** Extraia: tipo, área de impacto, regras de execução, restrições, estimativa, referência visual, precedentes.

### 0.5. Project Constraints Baseline

Carregue `CLAUDE.md` da raiz **antes de qualquer planejamento**. Em duo-pool ele é o único contrato de constraints — não há `product/constraints.md`.

Constraints imutáveis (extraídas do `CLAUDE.md`):

- **Anonymous app** — sem auth, sem tenants, sem RBAC, sem `organizationId`. Identidade do voter é apenas o cookie `dp_voter`.
- **Stack fixa** — Next.js 16, oRPC (sem Hono), Drizzle ORM, Tailwind v4, Bun.
- **5-Layer Data Flow obrigatória** — não pular camada.
- **`polls.vote` é o slot reservado pra demo ao vivo** — fora desse caso explícito, não preencher.

Se o plano conflitar com qualquer constraint, **pare e sinalize**.

### 1b. Consultar Knowledge Base

Antes de explorar o codebase, leia a knowledge base para decisões e erros de ciclos anteriores:

```bash
ls .claude/knowledge/decisions/ .claude/knowledge/errors/ 2>/dev/null
```

Para cada arquivo encontrado, leia o frontmatter e verifique se a `category` ou `issue` é relevante à demanda atual. Se relevante, leia o conteúdo completo.

**Como usar:**
- **Decisions** com status `active` → reutilizar a mesma abordagem se o contexto for similar
- **Errors** → evitar repetir o mesmo erro. Se a demanda atual toca a mesma área, adicionar ao plano como restrição/invariante
- **Assumptions** com status `confirmed` → tratar como fato. Se `pending`, validar com o dev

Registre no plano (seção "Contexto do Knowledge Base") quais entries consultadas influenciaram decisões.

### 1c. Research Phase (resolver unknowns ANTES de planejar)

Antes de gerar o plano, identifique **unknowns técnicos** — coisas que o briefing assume mas que precisam de verificação:

1. **Extrair unknowns** do briefing e da área de impacto:
   - Libs/APIs mencionadas que voce nunca usou neste repo
   - Padrões referenciados que não existem no CLAUDE.md
   - Integrações com serviços externos sem documentação local
   - Abordagens alternativas mencionadas sem decisão

2. **Para cada unknown**, resolver com pesquisa rápida:
   - **Se é sobre o codebase:** Glob/Grep para encontrar precedentes
   - **Se é sobre uma lib:** Ler docs via Context7 ou `agents/engineering/*`
   - **Se é uma decisão arquitetural:** Verificar `.claude/knowledge/decisions/` por precedentes

3. **Salvar findings** em `.duo/research.md` (se houve unknowns):
   ```markdown
   ## Research: [título]

   ### Unknown 1: [descrição]
   **Decisão:** [o que foi decidido]
   **Rationale:** [por que esta opção]
   **Alternativas descartadas:** [o que mais foi considerado]
   **Evidência:** [arquivo/doc que confirmou]
   ```

4. **Se ZERO unknowns:** pular e registrar "Nenhum unknown técnico — demanda usa padrões conhecidos do repo."

O plano gerado no Passo 2 deve referenciar os findings do research quando aplicável.

### 1d. Contexto do Repo

1. **CLAUDE.md** — Releia. Foco nas seções de arquitetura, padrões de código, e "NEVER DO" relevantes à área de impacto.

2. **Agentes em `.claude/agents/` (carregar conforme o tipo da feature)**:

   | Tipo de feature | Agente |
   |---|---|
   | Nova feature backend (L3+L4+L5) seguindo o 5-Layer Flow | `architect` para revisão da arquitetura proposta |
   | Mudança em schema, query, índice | `database-reviewer` para revisar pós-impl |
   | Endpoint público que recebe input do usuário | `security-reviewer` para revisar pós-impl |
   | Frontend novo (componente, hook, page) | revisar contra `CLAUDE.md` (Frontend Rules + Module Architecture) |

   Não há specialists de domínio (listing/form/figma/sdk) em duo-pool — o app tem um único feature module (`modules/polls/`) e segue convenções definidas em `CLAUDE.md`.

3. **Código-alvo** — Leia APENAS os arquivos que serão diretamente modificados (listados na área de impacto). Não explore o codebase em busca de padrões — o agente de domínio já os contém.

4. **Referência visual** — Se o briefing indica Figma, registre o link no plano. Se "sem referência visual", registre que Claude propõe UI baseado no design system.

---

## Passo 2: Gerar Plano

Produza um plano com a seguinte estrutura. Seja concreto — nomes de arquivo reais, não genéricos.

```markdown
# Plano: [título curto da demanda]

**Issue:** #[número]
**Tipo:** [debt | story | bug | improvement]
**Estimativa:** [P | M | G]
**Branch:** [tipo]/[issue-number]-[nome-curto]
**Referência no repo:** [caminho do módulo similar que serve de modelo]
**Referência visual:** [link Figma | "Design system — Claude propõe UI"]

## Objetivo
[Uma frase. O que muda no sistema quando isso estiver pronto.]

## Mapeamento de Critérios de Aceite → Passos
| Critério | Passo(s) |
|----------|----------|
| CA1: [critério] | Passo 2, 3 |
| CA2: [critério] | Passo 4 |
| CA3: [critério] | Passo 5 |

Todo critério de aceite do briefing DEVE ter pelo menos um passo correspondente. Se um critério não mapeia a nenhum passo, o plano está incompleto.

## Passos

### 1. [Nome do passo]
- **Arquivos:** [caminhos reais]
- **O que fazer:** [descrição concreta]
- **Padrão a seguir:** [referência ao CLAUDE.md ou ao módulo gold-standard]
- **Verificação:** [comando para confirmar que este passo está correto]

### 2. [Nome do passo]
...

## Invariantes
[Condições que devem ser verdadeiras após CADA passo — não só no final]
- [ ] `bun turbo type-check` passa
- [ ] `bun test` passa (ou bun test, conforme o repo)
- [ ] Nenhuma regra do CLAUDE.md violada
- [ ] [Invariantes específicas do tipo — ex: para debt, "mesma funcionalidade"]

## Riscos
[OBRIGATÓRIO: incluir errors do knowledge base relevantes à área de impacto]
[Cada error de .claude/knowledge/errors/ que toca esta área vira um risco com mitigação concreta]
- **[Risco do knowledge base]:** [Impacto] → **Mitigação:** [o que fazer diferente] → **Invariante:** [regra que o exec deve seguir]
- **[Risco novo identificado]:** [Impacto] → **Mitigação:** [O que fazer]
[Se knowledge base vazio para esta área: "Primeiro ciclo nesta área — nenhum risco histórico."]

## Fora de Escopo
[O que esta demanda NÃO faz — previne scope creep do agente]
```

### Regras do Plano por Tipo

**Se debt:**
- Passos devem ter verificação explícita de "antes/depois" (ex: `git diff --stat` ou contagem de linhas)
- Primeiro passo sempre: rodar testes existentes e salvar baseline
- Último passo sempre: rodar mesmos testes e comparar

**Se story:**
- Seguir a anatomia de módulo do repo (ex: se CLAUDE.md define `components/ + api.ts + hooks/ + lib/`, o plano deve criar nessa ordem)
- Incluir passo de teste para cada camada (unit, integration, e2e se aplicável)
- Incluir passo de RBAC/permissões se a feature tiver controle de acesso
- **Se sem Figma (Agente Designer):** incluir passo "Propor wireframe UI" ANTES da implementação de componentes:
  - Gerar wireframe em HTML/Tailwind usando componentes do design system (shadcn/ui)
  - Apresentar ao dev para aprovação: "Este é o layout proposto. Aprovar ou ajustar?"
  - O wireframe serve como referência visual para os passos de `[impl]` de componentes
  - Usar componentes documentados no CLAUDE.md — nunca inventar novos
- **Se com Figma:** referenciar o link no passo e instruir: "Seguir layout do Figma frame [link]"

**Se bug:**
- Primeiro passo OBRIGATÓRIO: escrever teste que reproduz o bug (RED)
- Segundo passo: correção mínima (GREEN)
- Terceiro passo: verificar que nada mais quebrou
- Plano nunca deve ter mais que 5 passos para um bug

**Se improvement:**
- Primeiro passo: ler e entender o fluxo existente (listar os arquivos e descrever o que cada um faz)
- Plano deve referenciar o código existente em cada passo, não criar estruturas paralelas
- Cada passo deve manter o fluxo existente funcional (nada quebra no meio)

---

## Passo 3: Garantir Branch de Trabalho

Se o Passo 0 detectou que já estamos na branch correta (`duo/<N>-*`), **pule** este passo.

Se não estiver em branch de trabalho:

```bash
base=$(git config --get init.defaultBranch || echo "main")
branch="duo/[issue-number]-[nome-curto]"  # ex: duo/42-audit-logs, duo/15-fix-dropdown

git checkout $base
git pull origin $base
git checkout -b $branch
```

Se a branch já existir remotamente (CI a criou), faça checkout:
```bash
git fetch origin $branch && git checkout $branch
```

Se a branch já existir localmente, pergunte: "Branch `[branch]` já existe. Usar ela ou criar nova?"

---

## Passo 4: Salvar Plano

Salve em `.duo/plan.md` na branch de trabalho (source of truth do pipeline):

```bash
mkdir -p .duo
# Escrever o plano em .duo/plan.md
```

Se `.duo/plan.md` **já existe** (gerado pelo CI ou sessão anterior): o Passo 0 já tratou isso — não sobrescreva sem perguntar.

---

## Passo 5: Checkpoint

Crie um checkpoint via WIP commit:

```bash
git add .duo/ && git commit -m "duo: plan for #[número]

Issue: #[número]
Phase: plan"
```

Se o working tree estiver limpo, apenas registre o SHA:

```bash
echo "$(date +%Y-%m-%d-%H:%M) | plan:[nome-curto] | issue:#[N] | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log
```

---

## Passo 6: Atualizar Board

```bash
# Adicionar label de fase
gh issue edit $ISSUE_NUMBER --add-label "duo:planned" --remove-label "duo:triaged"
```

---

## Output

Exiba o plano completo e pergunte:

> "Plano salvo em `.duo/plan.md` na branch `[branch]` e issue #[N] atualizada para `duo:planned`. Confirma para gerar as tarefas com `/duo.tasks #[N]`?"

Aceite variações:
- "sim" / "ok" / "bora" → Sugira rodar `/duo.tasks #[N]`
- "ajusta X" → Modifique o plano e re-exiba
- "não" → Pare

**NÃO** comece a implementar. O plano é um contrato — ele só vira código na fase de execução.

---

## Princípios

- **Concreto sobre abstrato** — nomes de arquivo reais, comandos reais, referências reais
- **CLAUDE.md é lei** — se o plano viola uma regra do CLAUDE.md, o plano está errado
- **Referência > invenção** — sempre buscar um módulo similar no repo antes de propor estrutura nova
- **Plano enxuto** — se o plano tem mais de 10 passos, a demanda deveria ter sido quebrada em duas
- **Invariantes são inegociáveis** — typecheck e testes passando após cada passo, não só no final
- **Issue é rastreável** — todo plano referencia a issue de origem, toda ação atualiza o board
