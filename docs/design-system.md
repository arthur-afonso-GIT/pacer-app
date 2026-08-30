# Design system

## Princípios

1. **Mobile-first:** decisão primária em 360–430 px, com alvo mínimo de 44 × 44 px.
2. **Calmo, inclusivo e não punitivo:** enfatizar consistência, clareza e progresso; evitar vergonha, urgência artificial e culto ao ranking.
3. **Acessível por padrão:** WCAG 2.2 AA, teclado, leitor de tela, zoom a 200% e movimento reduzido.
4. **Confiança visível:** regras, período, revisão, privacidade e origem dos pontos ficam próximos da ação.
5. **Composição consistente:** tokens + Radix + CVA; páginas não inventam estilos locais.

## Fundação técnica

- Tailwind CSS consome tokens semânticos via CSS custom properties.
- Radix UI fornece comportamento acessível para Dialog, Select, Tabs, Toast etc.
- CVA define variantes tipadas; `clsx` + `tailwind-merge` compõem classes.
- Storybook é o catálogo e contrato visual; cada componente tem estados, viewport móvel e testes de acessibilidade.

## Tokens semânticos

Não usar cores literais em feature code. Tokens mínimos:

```text
color: bg.canvas, bg.surface, bg.muted, fg.default, fg.muted,
       border.default, action.primary, action.primary-hover,
       status.success, status.warning, status.danger, focus.ring
space: 1(4), 2(8), 3(12), 4(16), 6(24), 8(32)
radius: sm(8), md(12), lg(16), full
shadow: sm, md
type: body-sm, body, label, title-sm, title, display
```

Suportar tema claro primeiro e contraste verificável; tokens já devem permitir tema escuro sem alterar componentes. Cor nunca é o único indicador de estado.

## Componentes iniciais

- `Button`, `IconButton`, `Link`, `Input`, `Textarea`, `Select`, `Checkbox`.
- `Field` com label, ajuda e erro ligados por ARIA.
- `Card`, `Badge`, `Avatar`, `Tabs`, `Dialog/Sheet`, `Toast`.
- `AppHeader`, `BottomNavigation`, `Page`, `Section`.
- `ChallengeCard`, `RuleSummary`, `SubmissionStatus`, `PointsDelta`, `LeaderboardRow`, `EvidenceViewer`.
- `EmptyState`, `ErrorState`, `Skeleton` e `OfflineBanner`.

Variantes CVA devem representar intenção (`primary`, `danger`, `quiet`) e tamanho, não nomes de cor. Ações destrutivas exigem texto explícito e confirmação proporcional.

## Padrões de experiência

- Navegação móvel inferior com no máximo cinco destinos; desktop adapta para sidebar/header.
- Formulários preservam entrada após erro; validação inline e resumo para falhas múltiplas.
- Pontos exibem sinal e motivo; reversão aparece como evento separado, não como valor “corrigido” invisível.
- Upload mostra privacidade, limite, progresso, falha recuperável e opção de remover antes do envio.
- Evidência nunca aparece em thumbnail pública, push, analytics ou Storybook com dados reais.
- Loading inicial usa skeleton; mutação usa estado no controle; erro oferece retry idempotente.
- Datas mostram fuso do grupo quando houver risco de ambiguidade.

## Copy e localização

Todo texto de interface vive em módulo central (`src/copy/pt-BR.ts` ou catálogo i18n), com chaves por domínio. Componentes não contêm strings de produto, salvo texto técnico de desenvolvimento. Usar pt-BR simples, voz direta e respeitosa:

- Preferir “Registrar atividade” a “Submeter prova”.
- Preferir “Não foi possível salvar. Tente novamente.” a códigos técnicos.
- Não chamar usuário de trapaceiro; usar “Este registro precisa de revisão”.
- Pluralização, números e datas via `Intl` com locale e fuso explícitos.

## Acessibilidade e aceite

Cada componente interativo deve ter:

- nome acessível, foco visível, ordem lógica e operação por teclado;
- contraste AA e estados sem depender só de cor;
- suporte a texto ampliado, safe areas e `prefers-reduced-motion`;
- story de default, loading, vazio, erro, disabled e conteúdo longo quando aplicável;
- teste automatizado de interação/a11y e verificação manual em leitor de tela para fluxos críticos.

## Decisões em aberto

- Marca, paleta e tipografia: iniciar com fonte do sistema e paleta neutra/verde com contraste AA.
- Dark mode: arquitetura pronta, entrega após estabilizar tema claro.
- Gráficos: adiar; tabelas/listas acessíveis são padrão.
- Animações de celebração: sutis, opcionais e desativadas com movimento reduzido.
