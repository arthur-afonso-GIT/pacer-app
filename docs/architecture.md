# Arquitetura

## Diretrizes

- **Cliente não é fronteira de confiança:** autorização, regras, período e pontuação são verificadas no servidor.
- **Ledger como fonte de verdade:** placares são projeções reconstruíveis.
- **Privacidade por padrão:** evidência usa bucket privado e URLs assinadas curtas.
- **Domínios separados:** grupo define comunidade/fuso; desafio define competição/regras.
- **Mobile-first e falhas explícitas:** mutações idempotentes, estados de rede e retries seguros.

## Stack proposta

- React + TypeScript + Vite.
- React Router para rotas; TanStack Query para estado remoto/cache.
- Tailwind CSS, Radix UI e CVA para componentes; Storybook para catálogo e testes visuais.
- React Hook Form + Zod para formulários e validação de UX (sem substituir validação servidor).
- Supabase: Auth, Postgres, Row Level Security, Storage, Realtime opcional e Edge Functions/RPCs.
- Vitest + Testing Library + MSW; Playwright para E2E; pgTAP/testes SQL para RLS e funções.

## Visão de componentes

```text
Browser/PWA
  ├─ UI (Radix + Tailwind + CVA)
  ├─ Features (groups, challenges, submissions, reviews, leaderboard)
  ├─ TanStack Query + typed Supabase client
  └─ copy pt-BR centralizada
           │ TLS + JWT
Supabase
  ├─ Auth
  ├─ Postgres + RLS
  │   ├─ tabelas transacionais
  │   ├─ RPCs transacionais/idempotentes
  │   └─ views/projeções de placar
  ├─ Storage privado de evidências + policies
  └─ Edge Functions (notificações, jobs e integrações)
```

## Organização sugerida do cliente

```text
src/
  app/              # providers, router, query client
  components/       # primitives compartilhados
  features/<domain>/# UI, hooks, schemas e queries por domínio
  lib/               # supabase, datas, erros, telemetria
  copy/pt-BR.ts      # mensagens e labels centralizados
  styles/            # tokens e Tailwind
  test/              # factories, MSW e helpers
```

Feature code não acessa tabelas livremente: usa funções de query/mutation tipadas. Chaves do TanStack Query incluem escopo (`groupId`, `challengeId`, filtros). Mutações invalidam projeções específicas, nunca todo o cache. Não persistir evidências, signed URLs ou dados sensíveis no cache offline.

## Fluxos críticos

### Publicar desafio

1. Cliente chama RPC `publish_challenge(challenge_id, idempotency_key)`.
2. Transação valida papel, estado, fuso, janela e regras.
3. Servidor grava snapshot imutável das regras e evento de auditoria.
4. A resposta tipada atualiza detalhe/listas no cache.

### Registrar atividade e pontuar

1. Cliente solicita caminho de upload autorizado e envia evidência ao bucket privado, quando exigida.
2. Chama RPC `submit_activity(...)` com chave idempotente.
3. Servidor valida membership, adesão, regra, timestamp no fuso do grupo e ownership do objeto.
4. Cria submission; se autoaprovação, cria review decision e lançamento no ledger na mesma transação.
5. Placar é agregado de lançamentos válidos. Repetir a mutação retorna o mesmo resultado.

### Corrigir pontuação

Nunca executar `UPDATE` ou `DELETE` em lançamento. RPC autorizada acrescenta item com `reverses_entry_id` e valor oposto; uma nova decisão pode acrescentar o valor correto. Restrições garantem que uma entrada seja revertida no máximo uma vez e no mesmo desafio/participante.

## Segurança e dados

- RLS habilitada em todas as tabelas expostas; negar por padrão.
- Operações privilegiadas somente por RPC/Edge Function com checagem explícita; service role nunca chega ao cliente.
- Claims JWT são identidade, não fonte única de papel: papel atual vem da associação no banco.
- Storage usa caminho não enumerável e policy vinculada a `submission_id`; signed URL com duração curta.
- Auditoria append-only para publicação, decisões, papéis, acesso administrativo e reversões.
- Constraints, índices e transações protegem invariantes; UI não é controle de segurança.
- Coletar mínimo de PII, definir retenção e atender exportação/exclusão conforme LGPD.

## Tempo e períodos

Armazenar instantes em `timestamptz` UTC e fuso IANA em `groups.timezone`. Datas locais de desafio são convertidas no servidor segundo esse fuso. O intervalo padrão é semiaberto `[starts_at, ends_at)`. Mudança futura de fuso afeta apenas desafios ainda em rascunho; desafios publicados preservam `timezone_snapshot`. Testar horário de verão e meia-noite.

## Consistência, desempenho e operação

- `points_ledger` é append-only; uma view/materialized projection fornece ranking.
- Começar com view SQL e índices por `(challenge_id, participant_id, created_at)`; materializar somente com medição.
- Subscriptions Realtime são melhoria de frescor, nunca requisito de correção; refetch periódico/foco é fallback.
- Todas as mutações críticas recebem `idempotency_key` única por ator/operação.
- Logs estruturados incluem request/correlation ID, ator, operação e resultado, sem conteúdo de evidência.
- Backups, PITR, alertas de autorização, taxa de erro e latência devem ser validados antes de produção.

## Riscos e mitigação

| Risco                                  | Mitigação                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Bypass de autorização via API direta   | RLS + RPCs + testes negativos por papel/tenant                            |
| Dupla pontuação por retry/concorrência | idempotency key, unique constraints e transação                           |
| Vazamento de evidência                 | bucket privado, signed URL curta, auditoria e retenção                    |
| Placar divergente                      | ledger fonte de verdade, job de reconciliação e projeção reconstruível    |
| Erros em período/fuso                  | IANA + snapshot + intervalo semiaberto + testes DST                       |
| Complexidade prematura                 | monólito modular no Supabase; extrair serviços apenas por limites medidos |
| Dependência de fornecedor              | migrations SQL versionadas, adapters no cliente e exportação testada      |

## Decisões em aberto

- View em tempo real versus projeção materializada: iniciar com view/indexação.
- Edge Functions versus RPC para revisão: usar RPC para transação de banco; Function apenas para efeitos externos.
- PWA offline: permitir leitura cacheada não sensível; não enfileirar upload/evidência no MVP.
- SLOs: propor 99,9% mensal e p95 < 500 ms para leituras comuns, sujeitos a teste de carga.
