# Roadmap por pequenas entregas

O roadmap integral está no [mestre](references/01-DOCUMENTO_MESTRE.md), seção 18. Os complementos alteram o ritmo, não eliminam os requisitos das etapas. Aprovação e execução reais ficam em [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Finanças — sequência vigente

A [especificação de Finanças](FINANCAS_SPEC.md), seção 18, define F00–F20 e prevalece sobre a distribuição antiga dessa área nas fases gerais abaixo. O [diagnóstico F00](FINANCAS_F00.md) contém a adaptação: F01a para rastreabilidade, catálogo fictício e levantamento; F01b para regras comuns/fixtures testadas; F01c para persistência mínima após decisões pertinentes, antes de F02/F03 dependerem de preferências salvas. Requisitos e verificações por ID estão em [financas/REQUISITOS.md](financas/REQUISITOS.md), e os dados propostos em [financas/CENARIOS.md](financas/CENARIOS.md). Estado/autorização da entrega ficam exclusivamente no PROJECT_STATUS.

Assinaturas mensais/anuais, compromissos, salário previsto, detecção assistida, cards dinâmicos, orçamento, alertas e disponível pertencem à versão local de Finanças. Não adiar esses itens com base nas fases gerais antigas. Integrações reais ficam em F20, após pesquisa e autorização específica. O plano não amplia o escopo de Investimentos nem inclui metas completas ou execução de pagamentos.

A F01b concretiza somente a base de domínio e os fatos fictícios prioritários, com cobertura delimitada no catálogo. A F01c foi subdividida em [PERSISTENCIA.md](financas/PERSISTENCIA.md): F01c.1 para avaliação/decisões; F01c.2 para armazenamento mínimo/testes; F01c.3 para acesso explícito na interface. D25–D27 registram as escolhas respondidas. A subdivisão mantém a persistência completa antes de as etapas seguintes dependerem dela; execução e autorização ficam no PROJECT_STATUS.

A F02 segue em pequenas fatias, conforme D30–D33 e [ESTRUTURA.md](financas/ESTRUTURA.md): F02a para cabeçalho, conta/moeda, cinco destinos e calendário; F02b proposta para regras/ciclos e período padrão em Configurações, após levantamento. O conteúdo funcional dos submenus mantém suas etapas próprias; criar seus destinos não conclui F03–F19.

D36–D39 antecipam a primeira fatia dos ciclos durante a revisão do cabeçalho, somente com datas salvas e regras respondidas em [PERIODOS.md](financas/PERIODOS.md). Restam configuração de fontes/recorrências e período padrão em Configurações, além das políticas de geração ainda abertas. Execução/aprovação ficam no PROJECT_STATUS.

## Etapa 0 — fundação e demonstração

F02b.2 concretiza a preferência em Configurações conforme D42/D43 e [PERIODO_PADRAO.md](financas/PERIODO_PADRAO.md), sem geração de datas ou configuração de fontes. A próxima rodada proposta fecha fontes/referências dos ciclos; não inicia os cards de F03 implicitamente.

| Entrega                          | Escopo e critério central                                                                       | Situação                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Revisão documental               | Fontes preservadas, requisitos consolidados e precedência definida                              | Aprovada e enviada                                     |
| Preparação do Git                | Remoto, histórico, exclusões, preservação das fontes e política de push                         | Aprovada e enviada                                     |
| Base desktop                     | Janela, navegação provisória, PrimeNG pontual, contrato IPC, decisões e propostas de identidade | Aprovada em 29/10/2026, com os ajustes e reorganização |
| Persistência da demonstração     | SQLite/worker, migrações, seed idempotente, arquivos demo/preferências separados                | Backend F01c.2; acesso pela interface em F01c.3        |
| Demonstração de uma área por vez | Totais coerentes, navegação, filtros e expansões com dados fictícios                            | Não iniciada; acordar prioridade e metodologia         |
| Cartão demonstrativo             | Faturas, parcelas, centavos, estornos e alternância de metodologias                             | Não iniciada                                           |
| Carteira demonstrativa           | BRL/USD, instituições, detalhes e movimentações                                                 | Não iniciada                                           |
| Simulador simples                | Hipóteses editáveis, gráfico conectado e cálculos acordados/testados                            | Não iniciada                                           |
| Revisão da etapa                 | Estados de falha/vazio/atualização, preservação local, acessibilidade e critérios do mestre     | Não iniciada                                           |

Essa subdivisão é uma proposta do Codex; não autoriza iniciar todos os itens. Avaliar antes do fim previsto do LTS do Angular 21 em junho/2027 uma atualização que preserve licença, manutenção e compatibilidade.

## Etapas seguintes

1. **MVP local utilizável:** cadastros reais locais, movimentações, cartão, investimentos, simulador validado e importação de formatos examinados.
2. **Integrações e histórico:** conectores pesquisados, sincronização não bloqueante ao abrir, conciliação e preservação das personalizações.
3. **Profundidade e personalização:** rentabilidade com metodologia acordada, separação de fluxos/mercado/câmbio, tema claro, painel e exportação/restauração.
4. **Planejamento avançado:** metas, aportes variáveis, premissas por classe, inflação/câmbio, alertas em uso e janelas destacáveis quando úteis.
5. **Acesso pelo iPhone:** definir dados, autenticação, sincronização, custos e acesso com computador desligado antes de escolher a solução.
