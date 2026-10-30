# FinDesk — visão consolidada

Este arquivo resume os requisitos recebidos. As fontes integrais e sua precedência estão em [docs/REVIEW.md](docs/REVIEW.md). O estado efetivo do projeto está em [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Especificação vigente de Finanças

A [especificação de Finanças v1.0](docs/FINANCAS_SPEC.md), recebida em 29/10/2026, prevalece nas divergências dessa área. O [diagnóstico F00](docs/FINANCAS_F00.md) confronta os requisitos com o código local e propõe a continuidade. A versão local inclui os cinco submenus Geral / Movimentações / Cartão / Compromissos / Assinaturas, cards personalizáveis, previsões, detecção assistida, orçamento, alertas e disponível até o salário. A execução permanece incremental e inicialmente fictícia; integrações reais têm etapa própria. Esses requisitos não representam funções já implementadas.

SQLite/API/worker, LocalAppData e restauração demo preservando preferências/layout foram confirmados em D23/D25–D27. F01c.2 implementa armazenamento mínimo de fatos fictícios e preferências, com migração, seed idempotente e ponte restrita. F01c.3 apresenta o estado e a restauração em Configurações, entre Integrações e Identidade, com confirmação na própria seção (D28/D29). Plano e critérios em [persistência local](docs/financas/PERSISTENCIA.md). Parcelas por fatura são o padrão dos gastos (D24), mantendo a visão pelo total contratado.

Rastreabilidade e catálogo preparados em F01a: [requisitos por ID](docs/financas/REQUISITOS.md) e [cenários fictícios](docs/financas/CENARIOS.md). F01b concretiza domínio e fixtures; F01c.2 persiste a base fictícia. F02a acrescenta saldo, seletores, submenus e mês calendário, com última conta lembrada e câmbio fictício identificado (D30–D33). Critérios em [estrutura de Finanças](docs/financas/ESTRUTURA.md). Conteúdo dos submenus e ciclos ainda têm entregas próprias; não são funções concluídas.

## Produto e decisões confirmadas

Aplicativo desktop pessoal de finanças e investimentos de Gabriel, inicialmente para Windows. Interface e documentação em português brasileiro. Nome definido: **FinDesk**. Investimentos são o principal diferencial, com uma área financeira correta e útil como base.

Stack definida: Angular, Electron e TypeScript. Sem servidor separado necessário na primeira versão, sem autenticação própria no MVP e sem execução contínua com o aplicativo fechado. Prioridade a funcionamento local e ausência de custos recorrentes ou infraestrutura remota obrigatória.

A navegação principal contém **Visão geral**, **Finanças** e **Investimentos**. O simulador pertence a Investimentos. Uma engrenagem abre Configurações, que contém uma seção Integrações; os fluxos dessa seção com dados reais ainda precisam de levantamento.

Tema escuro primeiro, tokens semânticos e preparação para tema claro posterior. Uso pontual de PrimeNG, com composição visual própria, controles consistentes e recursos gratuitos. Gabriel confirmou **Angular 21 + PrimeNG 21 Community MIT** e **barra nativa do Windows**. Na revisão da casca, escolheu manter a base visual e enxugar o conteúdo, sem frases de efeito. A **logo original fornecida**, com moedas e seta ascendente, está preservada em `FinDesk-Project/public/brand/logo-original.png` e aplicada no lugar do F. Versões, histórico e justificativas em [docs/DECISIONS.md](docs/DECISIONS.md).

## Interações da interface

Direção de interação reforçada na revisão da F02a (D34/D35): saldo em card com carteira no canto, sem parágrafos redundantes de conta/data; conta/moeda em círculos com marcas/bandeiras, opções descendo sem painel e nomes revelados pela expansão lateral da opção no hover/foco. Aplicar composições próprias desde o protótipo, sem adiar essa direção para o fim. Contexto financeiro e persistência permanecem os já definidos.

D36–D39 confirmam saldo sem degradê, um pouco mais alto e com largura preservada; somente os períodos ficam em coluna ao lado, com expansão do intervalo à direita. Importar/banco/moeda permanecem juntos no canto anterior. Opção selecionada não se repete na lista. Modos de salário/cartão usam datas salvas da conta, sem geração; troca de conta incompatível retorna ao calendário sem aviso. Limites em [períodos salvos](docs/financas/PERIODOS.md); configuração de fontes/recorrências ainda pendente.

## Escolha de armazenamento

F02b.3 (D44–D52): ajustes expansíveis por conta em Configurações → Finanças, com grade de dias salariais e cartão de referência. Salvamento automático e aplicação imediata. Mês curto usa último dia; sem ajuste de dias úteis; datas confirmadas prevalecem. Geração somente pelo ciclo atual na ativação e futuros, sem criar receitas/valores ou preencher histórico ausente. Critérios em [CICLOS_CONFIGURAVEIS.md](docs/financas/CICLOS_CONFIGURAVEIS.md).

F02b.2 (D42/D43): Configurações → Finanças → Período padrão permite escolher Calendário, Salário ou Cartão com salvamento automático, aplicando somente na próxima abertura. Consulta atual permanece intacta; conta incompatível usa calendário sem aviso e mantém o padrão salvo. Critérios em [PERIODO_PADRAO.md](docs/financas/PERIODO_PADRAO.md). Fontes, recorrências e escolha entre vários cartões continuam pendentes.

SQLite passou de proposta nas fontes a escolha confirmada pelo proprietário na F01a. A comparação, a resposta e os limites estão no [ADR 0002](docs/adr/0002-sqlite-local-proposto.md). Isso não transforma banco, driver, esquema ou persistência em implementação concluída.

Arquitetura prevista: interface Angular para apresentação; aplicação para casos de uso; domínio independente de frameworks sempre que possível; infraestrutura para persistência, importação e integrações; operações privilegiadas no processo principal do Electron, com preload pequeno e tipado e IPC validado. Não colocar SQL, segredos ou cálculos financeiros centrais nos componentes.

## Primeiro conjunto de trabalho autorizado pelos documentos

O complemento de identidade limita o início a:

1. Inspeção do ambiente e instruções.
2. Documentação inicial e registro de decisões.
3. Estrutura Angular/Electron/TypeScript.
4. Inicialização mínima da aplicação.
5. Duas propostas simples de identidade, avaliáveis em fundo escuro e tamanho pequeno.

Esse conjunto substitui a interpretação de que toda a etapa 0 deve ser entregue de uma vez. A primeira rodada foi de revisão dos documentos; o estado atual está em `PROJECT_STATUS.md`. A identidade deve permanecer provisória e substituível enquanto a escolha estiver pendente.

As próximas pequenas entregas devem ser apresentadas, avaliadas e autorizadas individualmente. Não há aprovação automática do restante do roadmap.

## Requisitos da etapa 0 completa, a executar em pequenas entregas

- Base real Angular/Electron, TypeScript estrito, comandos reproduzíveis e verificações proporcionais.
- Persistência local básica com migrações, seed idempotente, demonstração separada de dados reais e restauração explícita. Preservação na reabertura; armazenamento local não equivale a backup.
- Três áreas navegáveis, tema escuro consistente, filtros e expansões funcionais e estados carregado, vazio, atualizando, falha e dados antigos preservados.
- Visão geral com resumo financeiro, patrimônio por moeda ou conversão fictícia identificada, faturas e carteira.
- Finanças com lista filtrável, categorias, faturas navegáveis e parcelas. Alternância explícita entre consumo contratado e parcelas mensais, com totais coerentes e sem duplicar o pagamento de fatura como consumo.
- Carteira demonstrativa com CDBs e ETFs, posições em BRL/USD, filtros por instituição, detalhes e movimentações fictícias. Instituições e ativos citados são referências, não carteira real verificada.
- Simulador com uma fatia funcional determinística e testada, controles e gráfico conectados, premissas fictícias editáveis e resultados claramente hipotéticos.
- Acessibilidade, foco visível, alternativas ao arraste, movimento reduzido, valores exatos acessíveis e adaptação a diferentes tamanhos de janela.

O conjunto fictício deve ser pequeno, coerente e reproduzível, cobrindo os casos listados no mestre, inclusive virada do ano, distribuição de centavos, estorno, transferência própria, pagamento integral, aporte, dividendo, resgate/venda, histórico incompleto e possível duplicidade. Nem todos exigem fluxo completo na etapa 0.

## Regras financeiras e metodologias

Dinheiro exige precisão e arredondamento controlados; quantidades fracionárias e cotações têm precisão própria. Preserve moeda e valores originais. Toda conversão informa cotação e data; BRL e USD não são somados diretamente. Datas civis não podem mudar de dia por conversão indevida de fuso.

Transferências entre contas próprias não são receita/despesa consolidada. Aporte não é rendimento; compra de ativo não é consumo; resgate/venda não é automaticamente rendimento. Pagamento de fatura não duplica compras contabilizadas. Parcelas preservam vínculo e soma total; valores observados e estimados são distintos. Estornos mantêm rastreabilidade.

Dados desconhecidos não viram zero, e histórico incompleto deve ser informado. Variação de saldo não equivale a rentabilidade. Cada indicador explicita sua composição, sem dupla contagem de posições. Metodologias ainda abertas precisam de discussão antes da implementação, inclusive no protótipo quando afetarem o entendimento dos valores.

## Evolução e limites

Após a etapa 0: MVP local utilizável; integrações/histórico; profundidade analítica e personalização; planejamento avançado; acesso pelo iPhone. A ordem pode ser ajustada por decisão registrada. Importação depende de arquivos examinados. Rentabilidade exige metodologia explícita. Simulações especificam aportes, taxas, inflação e resultado bruto/líquido conforme o escopo acordado.

Meu Pluggy é somente candidato citado, sem gratuidade, limites ou cobertura verificados. Não presumir suporte a Nubank ou Nomad. Integrações exigem pesquisa oficial e levantamento sobre autorização, dados, armazenamento, atualização, falhas, consentimento, desconexão e convivência com dados manuais/importados.

Não conectar contas reais nem implementar movimentação de dinheiro, ordens ou pagamentos nesta fase. Custos, serviços remotos obrigatórios, publicação/distribuição, envio de dados financeiros para IA e mudanças relevantes de arquitetura ou produto exigem discussão prévia.

## Organização documental

A aplicação fica em `FinDesk-Project/`, incluindo código, assets, testes, scripts, configurações npm/Angular/Electron e lockfile. Comandos npm são executados nessa pasta. Documentação, anotações e contexto permanecem na raiz e em `docs/`; o repositório Git continua único na raiz.

Pontos de entrada na raiz: `AGENTS.md`, `PROJECT_BRIEF.md`, `PROJECT_STATUS.md` e `README.md`. O detalhamento está em `docs/PRODUCT.md`, `DECISIONS.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `DOMAIN_RULES.md`, `DATA_MODEL.md`, `DESIGN_SYSTEM.md`, `INTEGRATIONS.md`, `TESTING.md` e `adr/`. A implementação e as pendências estão distinguidas nesses documentos; os requisitos originais permanecem preservados nas referências. Não duplicar o estado em `docs/STATUS.md`.
