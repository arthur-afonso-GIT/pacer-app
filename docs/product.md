# Produto — Pacer

## Visão

Pacer é um aplicativo **mobile-first** de competições saudáveis em grupo. Pessoas entram em grupos, participam de desafios com regras e períodos claros, registram atividades e acompanham um placar auditável. O produto incentiva consistência e apoio social; não substitui orientação médica e não deve premiar comportamentos extremos.

## Objetivos e não objetivos

### Objetivos

- Permitir criar grupos duradouros e desafios independentes dentro deles.
- Tornar regras, período, pontuação e política de revisão compreensíveis antes da adesão.
- Registrar pontos de forma íntegra, explicável e reversível sem apagar histórico.
- Manter evidências privadas e expor ao grupo somente o necessário.
- Oferecer experiência rápida, acessível e em pt-BR no celular.

### Fora do escopo inicial

- Diagnóstico, prescrição ou integração clínica.
- Prêmios em dinheiro, apostas, marketplace e moderação pública em escala.
- Feed social global, mensagens diretas e desafios entre grupos.
- Detecção automática infalível de fraude ou integrações com wearables.

## Conceitos do produto

- **Grupo:** comunidade e fronteira de membros, papéis, privacidade e fuso horário.
- **Desafio:** competição pertencente a um grupo, com regras, janela, unidades, metas e revisão próprias. Um grupo pode ter vários desafios simultâneos ou históricos.
- **Registro de atividade:** declaração de uma ação do participante, opcionalmente acompanhada por evidência privada.
- **Revisão:** decisão configurável sobre um registro (`automática`, `administrador` ou `pares`).
- **Lançamento de pontos:** item imutável no ledger. Correções geram lançamentos compensatórios, nunca edição ou exclusão.

## Personas e necessidades

| Persona                | Necessidade principal                                             |
| ---------------------- | ----------------------------------------------------------------- |
| Participante           | Registrar uma atividade em poucos toques e entender sua pontuação |
| Administrador do grupo | Gerir membros, segurança e padrões do grupo                       |
| Organizador do desafio | Definir regras e resolver revisões sem manipular o histórico      |
| Revisor                | Ver somente o necessário para decidir com consistência            |

## Jornada principal

1. Pessoa cria conta, aceita termos e define nome de exibição.
2. Cria um grupo ou entra por convite.
3. Organizador cria um desafio em rascunho, com regras, período no fuso do grupo e política de revisão.
4. Participante adere ao desafio após visualizar regras congeladas.
5. Participante envia atividade; a evidência é privada e seu acesso é registrado.
6. O sistema autoriza, valida período/regras no servidor e aprova imediatamente ou cria revisão.
7. Na aprovação, o servidor acrescenta lançamento de pontos e atualiza o placar derivado.
8. Uma decisão corrigida gera reversão compensatória e, se aplicável, novo lançamento.

## Escopo por fases e critérios de aceite

### Fase 1 — Fundação e caminho feliz

1. Autenticação, perfil, grupos, convites e papéis.
2. Desafios em rascunho/publicados, adesão e período pelo fuso do grupo.
3. Registro manual, aprovação automática, ledger e placar.
4. Componentes-base, copy pt-BR centralizada e observabilidade mínima.

**Aceite:** fluxo criar grupo → publicar desafio → aderir → registrar → pontuar funciona em viewport móvel; autorização é validada no servidor/RLS; pontos publicados resultam de ledger imutável; testes cobrem fronteiras de período e isolamento entre grupos.

### Fase 2 — Confiança e moderação

1. Evidências privadas em storage.
2. Revisão por administrador e por pares, com prazos e trilha de auditoria.
3. Contestação e lançamentos compensatórios.
4. Notificações in-app.

**Aceite:** somente participante, revisores elegíveis e administradores autorizados acessam evidência; nenhuma correção altera lançamento anterior; decisões concorrentes são idempotentes; estados e prazos são legíveis em pt-BR.

### Fase 3 — Engajamento seguro

1. Recorrência, lembretes e resumo semanal.
2. Conquistas de consistência e acessibilidade avançada.
3. Limites configuráveis de pontuação e sinais de abuso.

**Aceite:** notificações respeitam consentimento/fuso; limites impedem pontuação abusiva; usuários podem silenciar estímulos; métricas não incentivam excesso.

### Fase 4 — Escala e integrações

1. Integrações opt-in com fontes de atividade.
2. Exportação/portabilidade e ferramentas operacionais.
3. Internacionalização além de pt-BR e otimização de escala.

**Aceite:** integrações são revogáveis e idempotentes; exportação contém dados do titular sem vazar terceiros; carga e recuperação cumprem SLOs definidos antes do lançamento.

## Métricas

- Ativação: membro que adere a um desafio e registra primeira atividade em 72 h.
- Consistência: participantes ativos em pelo menos 3 dias/semana.
- Confiança: taxa de reversões, contestações e decisões divergentes.
- Operação: latência de revisão, erros de autorização e falhas de upload.
- Guardrails: denúncias, desistências após notificações e registros acima de limites.

Não usar apenas pontos totais como métrica de sucesso.

## Premissas

- Convites são o meio padrão de entrada; descoberta pública fica desativada.
- O fuso IANA do grupo é obrigatório e define limites civis de todos os desafios.
- Regras ficam congeladas ao publicar; mudanças materiais exigem novo desafio.
- MVP é web responsiva/PWA, não aplicativo nativo.
- Menores de idade e recompensas financeiras não são suportados inicialmente.

## Decisões em aberto e padrões propostos

| Tema                  | Padrão até decisão                                       | Risco                                    |
| --------------------- | -------------------------------------------------------- | ---------------------------------------- |
| Revisão por pares     | 2 revisores elegíveis; maioria; empate vai ao admin      | baixa disponibilidade em grupos pequenos |
| Janela para contestar | 7 dias após decisão                                      | aumento de carga operacional             |
| Retenção de evidência | 90 dias após fim do desafio                              | privacidade versus investigação          |
| Entrada tardia        | Permitida, sem pontos retroativos                        | percepção de desvantagem                 |
| Exclusão de membro    | Revoga acesso; ledger histórico permanece pseudonimizado | requisitos legais de apagamento          |
| Empates no placar     | Mesma colocação; sem critério oculto                     | expectativa de desempate                 |
