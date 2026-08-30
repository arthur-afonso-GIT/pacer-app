# Modelo de domínio

## Agregados e relações

```text
User 1─1 Profile
Group 1─* GroupMembership *─1 User
Group 1─* GroupInvite
Group 1─* Challenge 1─* ChallengeParticipation *─1 User
Challenge 1─* ActivitySubmission 1─0..* Review
ActivitySubmission 1─0..1 EvidenceObject
Challenge 1─* PointsLedgerEntry *─1 User
```

**Grupo e desafio são entidades separadas.** Membership dá acesso à comunidade; participation representa adesão explícita às regras de um desafio. Remover um membro impede novas ações e acessos, mas não apaga o histórico do desafio.

## Entidades propostas

| Entidade                   | Campos essenciais                                                                                            | Invariantes                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `profiles`                 | `user_id`, `display_name`, `locale`                                                                          | `user_id` vem do Auth; locale inicial `pt-BR`                |
| `groups`                   | `id`, `name`, `timezone`, `created_by`, `archived_at`                                                        | timezone IANA obrigatório                                    |
| `group_memberships`        | `group_id`, `user_id`, `role`, `status`, timestamps                                                          | único por grupo/usuário; ao menos um admin ativo             |
| `group_invites`            | `group_id`, `token_hash`, `role`, `expires_at`, `max_uses`                                                   | token bruto não é armazenado                                 |
| `challenges`               | `group_id`, `title`, `status`, `starts_at`, `ends_at`, `timezone_snapshot`, `review_policy`, `rules_version` | `[start,end)`; publicado não muda regras materiais           |
| `challenge_rules`          | `challenge_id`, `version`, `activity_type`, `unit`, `points_formula`, `limits`, `evidence_requirement`       | snapshot versionado e validado no servidor                   |
| `challenge_participations` | `challenge_id`, `user_id`, `joined_at`, `status`, `accepted_rules_version`                                   | membro ativo; um por desafio/usuário                         |
| `activity_submissions`     | `challenge_id`, `participant_id`, `occurred_at`, `quantity`, `status`, `client_request_id`                   | request id único por ator; participante não decide aprovação |
| `evidence_objects`         | `submission_id`, `storage_path`, `media_type`, `size`, `retention_until`                                     | caminho privado; um objeto pertencente à submission          |
| `reviews`                  | `submission_id`, `reviewer_id`, `decision`, `reason_code`, `created_at`                                      | revisor elegível; uma decisão por rodada/revisor             |
| `review_rounds`            | `submission_id`, `policy_snapshot`, `status`, `due_at`, `resolved_at`                                        | resolução única e transacional                               |
| `points_ledger`            | `challenge_id`, `participant_id`, `submission_id`, `amount`, `kind`, `reverses_entry_id`, `created_at`       | append-only; amount não zero; reversão oposta e única        |
| `audit_events`             | `group_id`, `actor_id`, `action`, `subject_type/id`, `metadata`, `created_at`                                | append-only; metadata não contém evidência                   |

IDs são UUID; timestamps técnicos são `timestamptz`. Quantidades e pontos usam `numeric`, não ponto flutuante. Fórmulas são estruturas declarativas/versionadas, não código executável fornecido por usuário.

## Estados

### Challenge

`draft → published → active → completed → archived`

- `draft → published`: valida e congela regras, fuso e período.
- `published → active` e `active → completed`: derivados do relógio ou por job idempotente; não alteram regras.
- Cancelamento é estado explícito com motivo, sem apagar dados.

### Submission

`pending_review → approved | rejected | withdrawn`

- Política `automatic` pode criar diretamente `approved`, sempre com decisão de sistema auditável.
- Participante pode retirar somente antes da decisão; retenção/auditoria permanecem conforme política.
- Contestação abre nova rodada, sem reescrever decisão anterior.

### Membership e participation

`invited → active → left | removed`; participation: `active → withdrawn | removed`. Estados finais revogam novas operações; dados históricos continuam referenciáveis conforme permissão.

## Políticas de revisão

- `automatic`: validações determinísticas e aprovação de sistema.
- `group_admin`: um admin/organizador elegível decide; não pode revisar a própria submission por padrão.
- `peer`: revisores são participantes ativos, excluindo autor e conflitos definidos; padrão de 2 revisores, maioria, empate/indisponibilidade escalado ao admin.

A política e elegibilidade são capturadas na rodada. Decisão final e lançamento ocorrem em uma transação com lock/constraint contra resolução duplicada.

## Ledger e ranking

Tipos iniciais: `award`, `reversal`, `adjustment` (ajuste manual desabilitado por padrão). `award` referencia uma submission aprovada. `reversal` referencia `reverses_entry_id`, possui mesmo participante/desafio e `amount = -original.amount`. Linhas não podem ser atualizadas/deletadas por papéis da aplicação.

Saldo por participante:

```sql
sum(points_ledger.amount) group by challenge_id, participant_id
```

Ranking usa saldo descendente; empates compartilham posição. Metadados derivados (nome/avatar) não entram no ledger. Reconciliação compara decisões aprovadas/revertidas ao agregado.

## Regras temporais

- `occurred_at` deve pertencer a `[starts_at, ends_at)` no `timezone_snapshot` e respeitar tolerância configurada para envio tardio.
- Padrão: envio até 24 h após a ocorrência, nunca após 24 h do fim; decisão pode ocorrer depois.
- Cliente envia instante e offset observado; servidor normaliza e rejeita valores futuros além de tolerância pequena.

## Exclusão e retenção

- Perfil excluído é pseudonimizado onde o histórico coletivo exige integridade.
- Evidência é removida no prazo configurado; registro, hash/metadados mínimos e auditoria podem permanecer conforme base legal.
- Exclusão em cascata é restrita para grupos/desafios publicados e qualquer entidade ligada ao ledger.

## Questões em aberto

- Permitir múltiplas evidências: padrão inicial é uma por submission.
- Fórmulas por faixa ou pontos fixos: suportar schema declarativo simples primeiro.
- Ajustes administrativos sem submission: desabilitados; se necessários, exigir motivo e dupla confirmação.
- Participante que sai aparecer no ranking: manter como “Participante removido” para preservar totais.
