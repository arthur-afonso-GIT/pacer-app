# Permissões e privacidade

## Princípios

- Negar por padrão e conceder pelo menor privilégio.
- Toda autorização é aplicada no servidor (RLS, RPC ou Edge Function); esconder UI não autoriza.
- Escopo é sempre derivado da associação atual ao grupo e, quando necessário, da participação no desafio.
- `service_role` é exclusiva de backend confiável e nunca distribuída ao cliente.
- Evidência é privada, com acesso temporário, finalidade definida e auditável.

## Papéis

- **Visitante:** não autenticado.
- **Usuário:** autenticado, ainda sem vínculo com o grupo.
- **Membro:** associação ativa ao grupo.
- **Participante:** membro com adesão ativa ao desafio.
- **Organizador:** membro designado para administrar um desafio específico.
- **Admin do grupo:** administra grupo, membros e desafios.
- **Revisor:** participante/admin elegível para uma rodada específica; é uma capacidade contextual, não papel global.
- **Sistema:** funções autenticadas de backend para jobs, integrações e decisões automáticas.

## Matriz de permissões

Legenda: **P** próprio, **G** no grupo, **D** no desafio sob gestão, **R** somente rodada atribuída, **—** negado. Todas as células pressupõem entidade ativa e políticas adicionais aplicáveis.

| Recurso/ação                                   | Visitante | Usuário |                   Membro |   Participante | Organizador | Admin grupo |         Revisor |                  Sistema |
| ---------------------------------------------- | --------: | ------: | -----------------------: | -------------: | ----------: | ----------: | --------------: | -----------------------: |
| Ler/editar perfil próprio                      |         — |       P |                        P |              P |           P |           P |               P |         suporte restrito |
| Criar grupo                                    |         — |     sim |                      sim |            sim |         sim |         sim |             sim |                        — |
| Ler grupo e lista mínima de membros            |         — |       — |                        G |              G |           G |           G |               G |                      job |
| Atualizar configurações do grupo               |         — |       — |                        — |              — |           — |           G |               — |           job autorizado |
| Convidar/remover membro                        |         — |       — |                        — |              — |           — |           G |               — |           job autorizado |
| Alterar papel de membro                        |         — |       — |                        — |              — |           — |          G* |               — |                        — |
| Criar desafio em rascunho                      |         — |       — |                        — |              — |           G |           G |               — |                        — |
| Ler desafio publicado                          |         — |       — |                        G |              G |           G |           G |               G |                      job |
| Ler/editar rascunho                            |         — |       — |                        — |              — |           D |           G |               — |                        — |
| Publicar/cancelar desafio                      |         — |       — |                        — |              — |           D |           G |               — |           job autorizado |
| Aderir/sair do desafio                         |         — |       — |                  próprio |              P |           P |           P |               P |                        — |
| Criar submission                               |         — |       — |                        — |              P |           P |           P |               P |    integração autorizada |
| Ler submission sem evidência                   |         — |       — | resumo conforme política |          P/G** |           D |           G |               R |                      job |
| Editar/retirar submission pendente             |         — |       — |                        — |              P |           P |           P |               P |                        — |
| Ver evidência                                  |         — |       — |                        — |              P |         D** |         G** |               R | processamento autorizado |
| Emitir decisão de revisão                      |         — |       — |                        — |              — |         D** |         G** |               R |      política automática |
| Contestar decisão                              |         — |       — |                        — |              P |           P |           P |               P |                        — |
| Ler placar                                     |         — |       — |                        G |              G |           G |           G |               G |                      job |
| Criar/alterar lançamento de pontos diretamente |         — |       — |                        — |              — |           — |           — |               — | somente RPC transacional |
| Solicitar reversão                             |         — |       — |                        — |              — |         D** |           G |             R** |            reconciliação |
| Ler auditoria                                  |         — |       — |                        — | próprio evento |  D limitado |           G | decisão própria |                      job |
| Arquivar grupo                                 |         — |       — |                        — |              — |           — |           G |               — |                        — |

\* Não pode remover/rebaixar o último admin ativo nem promover acima de seu próprio privilégio sem regra explícita.  
\** Somente quando política, atribuição e conflito de interesse permitirem. Organizador/admin não vê evidência por conveniência; precisa atuar como revisor/moderador elegível. Resumos para membros nunca incluem objeto, URL ou notas privadas.

## Regras RLS/policies essenciais

- `groups`: `SELECT` via membership ativa; `UPDATE` para admin ativo.
- `group_memberships`: membro lê campos públicos mínimos do próprio grupo; dados sensíveis e mutações são restritos a RPC admin.
- `challenges`: publicado é legível por membro; rascunho por organizador/admin.
- `submissions`: autor lê a própria; revisor lê as atribuídas; outros recebem apenas view sanitizada quando o produto exigir atividade social.
- `reviews`: autor vê resultado final, não votos pendentes/identidade de pares; revisor vê sua atribuição; admin vê conforme finalidade.
- `points_ledger`: membro lê lançamentos sanitizados do desafio; nenhum papel cliente faz `INSERT/UPDATE/DELETE`; RPC `SECURITY DEFINER` validada insere.
- `audit_events`: append por funções controladas; leitura escopada, sem policy ampla.
- Storage: objeto em caminho derivado de UUID; upload exige submission própria e intent válido; download requer avaliação dinâmica de ownership/atribuição.

Funções `SECURITY DEFINER` fixam `search_path`, validam `auth.uid()`, escopo e parâmetros, e têm `EXECUTE` revogado de `public` antes de grants específicos.

## Evidência e dados pessoais

- Bucket privado; não usar URL pública. Signed URL curta (padrão: 5 min), não persistida no banco/cache/analytics.
- Validar tipo real, tamanho (padrão: 10 MB), extensão e ownership; remover EXIF quando tecnicamente possível e realizar varredura de malware.
- Não expor evidência em leaderboard, feed, notificações, logs ou suporte sem fluxo autorizado.
- Registrar ator, finalidade, submission e timestamp para acessos privilegiados; não registrar URL assinada.
- Padrão de retenção: 90 dias após fim do desafio ou conclusão de contestação, o que ocorrer por último; job de exclusão auditável.
- Exportação do titular não inclui evidência/notas privadas de terceiros. Exclusão respeita LGPD e preserva integridade coletiva por pseudonimização quando necessário.

## Abuso e operações

- Rate limits para convite, upload, submission, decisão e signed URL.
- Convites armazenam hash, expiram, possuem limite de uso e podem ser revogados.
- Suspeita de abuso não concede acesso irrestrito: usar fluxo de moderação com motivo e auditoria.
- Suporte humano não recebe acesso padrão ao conteúdo; elevação temporária deve ser aprovada e registrada.

## Testes obrigatórios

Para cada policy, testar caso positivo e negativo: outro usuário, outro grupo, membro removido, participação encerrada, autor tentando revisar a si mesmo, revisor não atribuído, admin fora do escopo, token expirado e concorrência. Testar APIs diretamente, não apenas pela UI.

## Questões em aberto

- Identidade de revisores para o autor: padrão é ocultar em revisão por pares.
- Admin poder acessar evidência em contestação: permitir somente ao assumir caso com motivo auditado.
- Moderador global: não existe no MVP; desenhar acesso break-glass antes de operação em escala.
- Visibilidade do histórico individual: padrão é somente totais e lançamentos sanitizados para membros.
