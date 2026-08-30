# Estratégia de testes

## Objetivos

Priorizar invariantes que sustentam confiança: isolamento entre grupos, autorização servidor, período correto no fuso, revisão determinística, idempotência e ledger imutável. Pirâmide: muitos testes unitários/SQL, integração suficiente e poucos E2E críticos.

## Ferramentas propostas

- **Vitest:** domínio, utilitários e componentes.
- **Testing Library + user-event:** comportamento acessível da UI.
- **MSW:** contratos de rede, erros, latência e retries.
- **Storybook:** estados, viewports e regressão visual/a11y.
- **Playwright:** jornadas mobile e desktop essenciais.
- **pgTAP ou harness SQL local do Supabase:** constraints, RLS, RPCs e concorrência.
- **Supabase CLI:** banco local reproduzível e migrations aplicadas do zero.

## Camadas

### Unitário

Testar fórmulas declarativas, transições de estado, elegibilidade de revisão, formatação pt-BR e conversões de período. Usar relógio injetável, factories tipadas e tabelas de casos. Não mockar funções puras desnecessariamente.

### Componentes e Storybook

Cobrir default, vazio, loading, erro, offline, disabled, conteúdo longo e permissões. Consultar por role/label, não classe CSS. Executar axe e interação por teclado; snapshots DOM amplos são evitados.

### Integração cliente/API

Com MSW ou Supabase local, verificar chaves/cache do TanStack Query, optimistic update somente onde reversível, invalidation escopada, retries idempotentes e mensagens centralizadas em pt-BR. Simular 401/403/409/422/429/5xx, upload interrompido e reconexão.

### Banco, RLS e funções

Cada migration deve subir em banco vazio. Testar com JWTs de usuários distintos:

- membro versus não membro e outro grupo;
- membro removido/convite expirado;
- autor, revisor atribuído/não atribuído e conflito de interesse;
- chamadas diretas que ignoram a UI;
- duplicação por mesma `idempotency_key`;
- duas decisões simultâneas;
- tentativa de `UPDATE/DELETE` no ledger;
- reversão única, oposta e no mesmo escopo;
- storage upload/download fora do escopo.

### E2E

Viewport primário 390 × 844; executar smoke desktop também. Jornadas:

1. Criar grupo, convidar e aderir.
2. Criar/publicar desafio e aceitar regras.
3. Registrar atividade e aparecer no placar.
4. Enviar evidência, revisar e contestar.
5. Reverter pontos preservando histórico.
6. Confirmar que usuário de outro grupo não acessa URL/API direta.

Dados são criados via API/factory controlada; pelo menos um teste usa UI completa. Testes não dependem de ordem e limpam seu tenant.

## Casos temporais mínimos

- Instante exatamente no início (aceito) e no fim (negado) de `[start,end)`.
- Meia-noite no fuso do grupo versus fuso do dispositivo.
- Horário inexistente/duplicado em transição de DST.
- Mudança do fuso do grupo após publicação não altera desafio.
- Envio tardio dentro e fora da tolerância; relógio do cliente adulterado.

## Qualidade e CI

Em cada PR:

1. install com lockfile;
2. lint e typecheck;
3. unit/component tests com cobertura;
4. migrations + testes SQL/RLS em Supabase local;
5. build de produção;
6. Storybook build e a11y;
7. Playwright smoke.

Antes de release: suíte E2E completa, teste de restauração/exportação, carga nos endpoints de placar/submission e revisão manual de a11y/privacidade. Não mascarar falhas flaky: quarentena exige owner, issue e prazo.

## Critérios de aceite por fase

### Fase 1

- Caminho feliz E2E em mobile.
- 100% das policies críticas com teste positivo/negativo.
- Ledger bloqueia alteração/exclusão e retry não duplica pontos.
- Casos de período/fuso mínimos aprovados.

### Fase 2

- Matriz de evidência/revisão exercitada diretamente na API/storage.
- Corridas de revisão e contestação não duplicam decisão/reversão.
- Testes demonstram ausência de URLs privadas em logs/cache público.

### Fase 3

- Limites e notificações testados com relógio controlado e preferências opt-out.
- Testes de acessibilidade dos fluxos críticos e orçamento de desempenho definidos.

### Fase 4

- Contract tests e replay/idempotência por integração.
- Teste de carga atende SLO; restore e exportação são ensaiados.
- Locales adicionais não introduzem strings inline ou quebra de layout.

## Dados, ambientes e observabilidade

- Nunca usar evidência real/PII em fixtures, screenshots ou Storybook.
- Seeds determinísticos incluem dois grupos isolados, papéis e desafios em estados diferentes.
- Staging tem chaves/buckets separados e mesma configuração de RLS da produção.
- E2E registra correlation IDs; artefatos falhos são retidos com sanitização.
- Cobertura é sinal, não meta isolada: padrão inicial de 80% em domínio; 100% para fórmulas, ledger e autorização em SQL.

## Riscos e mitigação

| Risco                            | Mitigação                                                     |
| -------------------------------- | ------------------------------------------------------------- |
| Testes verdes com RLS desativada | assert explícito de RLS e chamada como JWT real               |
| Flakiness por relógio/realtime   | relógio injetado, polling controlado e Realtime não essencial |
| E2E lento                        | poucos fluxos críticos; regras em unit/SQL paralelizáveis     |
| Mocks divergentes do backend     | tipos gerados, contract tests e Supabase local em CI          |
| Vazamento em artefatos           | dados sintéticos e sanitização de logs/screenshots            |

## Decisões em aberto

- Provedor de regressão visual: iniciar com Storybook test-runner local; escolher serviço após CI.
- Browsers suportados: últimas duas versões de Chromium/Safari/Firefox; validar conforme analytics.
- Device farm nativo: fora do MVP enquanto entrega for PWA.
