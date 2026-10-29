# Produto e escopo

Visão e requisitos consolidados: [PROJECT_BRIEF.md](../PROJECT_BRIEF.md). Esta página registra a fatia de software desta entrega, sem substituir o mestre.

## Casca inicial

Uma janela Windows com barra nativa, navegação principal, identidade textual centralizada, tema escuro e páginas honestas sobre o estágio do produto. A navegação abre Visão geral, Finanças e Investimentos. A engrenagem abre Configurações com seção Integrações. Sobre esta versão consulta apenas metadados do aplicativo.

As páginas de Finanças/Investimentos são estados de preparação reutilizáveis; não são as telas financeiras finais. Não há saldos zero, rentabilidades, gráficos financeiros inventados ou botões sem ação. Após a revisão de Gabriel, a abertura promocional foi removida e os textos foram reduzidos a títulos, ações e estados úteis.

A logo original enviada por Gabriel foi aplicada no lugar do F e pode ser consultada em Configurações → Ver logo. Foi acordado manter a base visual e enxugar o conteúdo. Novas decisões de tela e comportamento serão discutidas antes da implementação.

## Critérios de aceitação desta pequena entrega

- Instalação com lockfile e comandos documentados.
- Build Angular e TypeScript desktop concluídos com versões compatíveis.
- Janela real abre o conteúdo compilado por protocolo local.
- Menu e atalhos internos abrem as páginas corretas; a recarga preserva a rota atual.
- Configurações contém Integrações, sem conexão real ou promessa de cobertura.
- Ponte restrita consulta a versão; interface não tem Node ou acesso irrestrito ao sistema.
- Diálogo PrimeNG abre e fecha, incluindo Escape.
- Layout utilizável em janela menor, sem rolagem horizontal indevida.
- Duas propostas de símbolo avaliáveis com FinDesk, em fundo escuro, claro e tamanho pequeno.
- Limites, decisões respondidas, verificações e próxima entrega registrados.

## Fora desta fatia

Banco SQLite, seed, migrações, dados financeiros, filtros sobre movimentações, faturas, simulador, preferências persistidas e integrações reais. Permanecem requisitos do roadmap, a executar em pequenas entregas. Instalador, distribuição e sincronização móvel também não fazem parte desta casca.
