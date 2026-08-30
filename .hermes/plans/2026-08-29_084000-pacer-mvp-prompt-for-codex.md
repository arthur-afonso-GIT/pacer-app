# Contexto para Codex — App Pacer

Você está ajudando a implementar um app React + TypeScript mobile-first (Pacer) que usa Supabase.

## 1. O que está sendo construído

App de competição de hábitos saudáveis em grupos.

- Usuários competem em desafios dentro de grupos.
- Regras: perfis, grupos com proprietários/administradores/membros, desafios independentes com múltiplos hábitos e participantes, submissões com data/evidência, fluxo de revisão, pontos imutáveis, ranking por período.
- Regras de negócio críticas:
  - Um usuário não pode aprovar a própria submissão.
  - Política de revisão configurável por desafio: qualquer outro membro / admins / revisores selecionados.
  - Evidence é privada dentro do grupo.
  - Cada revisão salva revisor, decisão, pontos escolhidos, motivo e timestamp.
  - Aprovação gera ledger imutável de pontos.
  - Sempre derivar pontos a partir do ledger; nunca usar um score cacheado como fonte de verdade.
  - Reversões criam compensação ligada à original.
  - Usar o fuso horário do grupo para limite diário/semanal/mensal.

## 2. Stack técnica e regras de implementação

- React, TypeScript estrito, Vite.
- React Router, TanStack Query, Tailwind CSS, Radix primitivos (comportamento, não identidade visual), CVA, Storybook, Vitest/RTL.
- Supabase: PostgreSQL, Auth, Storage, Realtime, RLS, SQL migrations.
- Operações chamadas de cliente: apenas queries/insert/select onde o RLS e auth permitam.
- Operações seguras de pontos/revisão: RPCs protegidas apenas (`review_submission`, `cancel_submission`, `reverse_point_transaction`).
- Clientes nunca fazem insert/update/delete direto em `reviews`, `point_transactions`, `submission_status_history`, `audit_events`.
- Use Supabase Storage bucket `evidence` para upload de evidência; faça políticas fins-first (bucket + objeto).
- RLS é obrigatório; políticas são privilegios mínimos para o papel atual.
- Copy de usuário em pt-BR; código e docs em inglês.
- Componentes reutilizáveis:
  - Tokens semânticos (canvas/surface/elevated/text/accent/positive/warning/negative/ranking/streak/spacing/typography/radii/borders/elevation/motion/breakpoints).
  - Design system mínimo: Button, IconButton, Input, Textarea, Avatar, Badge, Surface, Dialog, BottomSheet, Tabs, Toast, Skeleton, EmptyState, ActivityCard, EvidenceViewer, PointBadge, MemberRankingRow, ActivityHeatmap, StreakIndicator, GroupHeader, ReviewQueueItem, PeriodSwitcher, ChallengeProgress, HabitComposer.
  - CVA/CLXA para variant, Radix para acesar/idiomática, focus visível, preferência de movimento reduzido respeitada.
  - Theme controlado para grupo: cor de acento secundário/ícone/score unit. Não coletar CSS arbitrário.

## 3. Onde ficam as coisas

- `src/app/*` → roteamento, shell, providers.
- `src/design-system/*` → tokens/components/stories.
- `src/features/*` → feature modules com APIs estreitas; cada feature tem queries/mutations/hooks/pages.
- `src/infrastructure/*` → Supabase client, env validation, storage queries.
- `src/shared/*` → tipos pontuais, i18n pt-BR, utils.
- `supabase/migrations/*` → schema + RLS + trusted RPCs.
- `docs/*` → produto/arquitetura/domínio/permissões/testing/considerações.

## 4. Como projetar feature dentro desse app

- Comece sempre pelo contrato: tipos publicos, querys, mutations, hooks opcionais.
- Evidence upload: separar segurança de bucket (storage.repos), inserção do metadata em `evidence`, limpeza se metadata falhar.
- Ranking: queries SQL/RPC no banco com fuso horário do grupo. Interface nunca calcular rankings localmente como fonte de verdade.
- Revisão: chamar RPC com `submission_id`, `decision`, `points` obrigatórios para approved, `reason` obrigatório.
- Evidência/API review: apenas membros ativos do grupo/review policy parser ou admins podem ver ou revisar.
- Onboarding + auth: rotas protegidas, perfil de usuário autenticado, cache de queries com TanStack Query e invalidação correta.
- Separe eagerly: Auth, Profiles, Groups, Invites, Challenges, Habits, Submissions, Reviews, Rankings, Statistics, Notifications.
- Coerção de datos locais para instantaneos do banco/periodo deve ser feita em PostgreSQL; cliente recebe `timestamptz` e payloads exatos.

## 5. O que você deve fazer na iteração

- Se for gerar código, gerar um arquivo/module com alto contraste, índice pequeito, tipos corretos, sem passo-ad-hoc propriedades expostas. Manter assíncrono se depender de dados assíncronos e tratado se UI assíncrona; código síncrono tratado se for lógica pura.
- Quando for revisar/feature, sempre reafirmar: Não acumular conversas no conteúdo das linhas, somente linhas de transmissão.
- Para banco: sempre tratar o RPC como gatilho da mutação; não deixar mutations híbridas cliente+server como se partes pudesem mudar pontos.
- Para Storage: devido cuidado com bucket `evidence`, política de upload, filename escapável unique, cleanup se falhar.
- Use sugestões razoáveis pelo default (timezone IANA, enums consistentes, conteúdo pt-BR alinhado ao copy e UI mobile-first) e documentar se a hipótese viola alguma política importantiiva.
- Não gerar UI genérica shadcn/styled-without-purpose; próximo de produto: responsividade, ícones, spacing, tipografia.

## 6. Tipos e contratos principais

Referência de tipos principais (pode oscilar; se houver dúvida, confirmar com `supabase/migrations/*` ou `database.types.ts`):

- `profile`, `group`, `group_member`, `challenge`, `challenge_member`, `challenge_habit`, `habit`, `submission`, `submission_evidence`/`evidence`, `review` (revisor + decision + points optional reason), `point_transaction` (award/reversal), `audit_event`.
- Política de review: `any_other_member` / `admins_only` / `selected_reviewers`.
- Status de revisão: `pending` / `approved` / `rejected` / `cancelled` / `disputed`.
- Indicador de ranking: `day` / `week` / `month` / `total`.

## 7. Cuidados recorrentes que você deve mencionar/evitar

- Confundir “desafio” e “grupo”: desafio pode ter múltiplos períodos e configurações; grupo é persistente. Separar.
- Tentar mutar pontos diretamente no cliente.
- Decrementar review como pontos sem motivo + pontos no mesmo transaction (válido para approved e sem points para outros).
- Tratar seed/faked/css inconsistente em tracks diferentes.
- Não deixar iniciantes em frontend frozen-by-default; manter estado mínimo e skeleton/loading/erro bufEstado.
- Políticas de storage confundir/mirar apenas política: objeto `evidence`, bucket privado.
- Sempre verificar timezone no cliente se necessitar exibindo idioma local; preferir dados SQL em períodos.

## 8. Como você pode testar/verificar rapidamente

- Comando típico: `npm run typecheck`, `npm run lint`, `npm run test`.
- Incluir em PR simples: mínimo 1 escê de trabalho, tipáveis sem estáticos desconectados, tipos públicos cobrindo API, tests unitários/componentes releventes, RLS nearby check.
- Quando houver link para feature nova: colocar pacote de rotas com lazy loading, labels, ativos linkáveis.

## 9. Como eu quero que você me responda

- Se eu peça feature/arquivo: ajudar com código conciso e guardar servir justo de api/hooks + tipo, sem bloat.
- Se eu perguntar política/arc: (a) porque isso é conflituoso, (b) proposta de separação renta.
- Se algo for confuso em banco/client-side: pedir/confirmar trade/verificação; sem inventar dados de ponto.
- Respostas concisas, em português ou inglês conforme eu usar; focar em riscos + próximos passos.
- Nunca repetir os dados. Se preciso mostrar resultado real, reproduzir síntese.
- Manter atenção: pontos derivados do ledger, evidence privada, auto-revisão bloqueada, mutations via RPC, fuso horário do grupo, evidência privada.

Use esse contexto durante toda geração/revisão no código/arquitetura deste app.
