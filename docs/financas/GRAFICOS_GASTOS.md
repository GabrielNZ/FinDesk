# F07b — Gráficos por categoria e evolução dos gastos

## Objetivo e autorização

Em 11/11/2026, Gabriel pediu “Vamos para o proximo”, aprovando os ajustes pendentes D140–D143 e autorizando o levantamento da próxima entrega proposta. Em seguida confirmou D144–D146, autorizando a implementação dos gráficos inferiores de Movimentações. A aprovação final da entrega permanece registrada exclusivamente no PROJECT_STATUS.

Base: especificação de Finanças §8.1/8.4, FIN-020/023/024 e composição preservada em D83. Os gráficos ficam abaixo do Extrato/Agrupamento e da Seleção; análises superiores e consulta central permanecem. O padrão de barras horizontais de Categorias em §7.3 é referência para a proposta nesta área, não autorização para concluir os cards do Geral nesta fatia.

## Decisões confirmadas já aplicáveis

- Conta, moeda, período, busca e filtros já formam o contexto de Movimentações. Respeitar categorias efetivas, incluindo Sem categoria, e preservar os valores originais.
- D127: comparações encerradas usam intervalos completos; em andamento, dias equivalentes limitados pelo menor intervalo. Mostrar recorte e cobertura; ausência não vira zero. D128 mantém três anteriores como requisito do habitual.
- D33: conversão somente para apresentação, com cotação fictícia identificada. Não somar moedas originais diferentes.
- Cards preservam o padrão estabelecido de arraste, redimensionamento, foco temporário, teclado e layout salvo. Não substituir os layouts existentes nem alterar a Seleção incidentalmente.
- Dados fictícios, referência fixa e base de setembro/outubro existentes. Não há autorização nova para ampliar o histórico fictício ou conectar dados reais.

## Diagnóstico técnico local anterior à implementação

- `application/expense-analysis.ts` já agrega despesas ativas por categoria efetiva e moeda, verifica cobertura e gera séries diárias acumuladas. `expense-analysis-periods.ts` centraliza intervalos comparáveis. Reutilizar a metodologia e extrair funções comuns quando necessário, mantendo cálculos fora dos componentes Angular.
- `Statement.analysisQuery` já reúne o snapshot classificado e a consulta compartilhada. Cadastro, edição, classificação, exclusão e recuperação atualizam essa base. Os gráficos poderão derivar dela sem gravar fatos ou reaplicar regras de chegada.
- `ExpenseStatementModal` e `expenseStatementPreview` já consultam lançamentos em janela flutuante preservando o fundo. A investigação de uma data exigirá adaptar a consulta de leitura para aceitar todas as categorias daquele dia, caso essa opção seja escolhida; não presumir que o contrato atual já atende.
- `CardArea` e seu parser aceitam somente Geral e Análises, com conjuntos fechados de IDs. Os gráficos inferiores exigirão uma área própria e operações restritas de persistência, com validação privilegiada e testes de isolamento. Não acrescentar seus IDs ao layout salvo das análises superiores.
- SVG próprio já atende linhas e interação dos minigráficos. Não foi identificada necessidade de dependência nova; barras e evolução podem seguir essa base. Nenhuma biblioteca/API externa foi selecionada e nenhuma pesquisa de compatibilidade externa é necessária neste levantamento local.

## Propostas apresentadas pelo Codex (histórico, respondidas em D144–D146)

Primeira fatia somente com Despesas da conta, seguindo o alcance da F07a. Categorias apresenta composição do período atual observado, em barras decrescentes com nome/ícone/cor, valor e participação; Evolução permite explorar a distribuição no tempo. Transferências próprias, aportes e pagamentos de fatura conservam seus tipos e não entram como consumo. Cartão/parcelas mantêm sua etapa própria.

Recomendação de composição: dois cards lado a lado, com mais largura para Evolução, reorganizados verticalmente quando a janela exigir. Organização independente dos cards superiores e do Geral. Alturas, legibilidade e estados vazios serão conferidos na implementação após as respostas.

Recomendação de leitura temporal: gasto por dia inicialmente, com alternância explícita para acumulado e comparação com anterior quando houver cobertura. Gasto diário de R$ 30 no dia 5 e R$ 20 no dia 10 gera duas colunas; acumulado alcança R$ 30 e R$ 50 nessas datas. A alternância muda a leitura, não os fatos. Aplicar D127 à comparação e identificar datas/recorte. A forma de exibir a referência deve acompanhar a leitura escolhida.

Recomendação de investigação: abrir extrato flutuante por categoria ou data, preservando consulta, Seleção e rolagem do fundo. A alternativa por filtro modifica a consulta principal e poda a Seleção conforme D82. Não implementar ambos os comportamentos silenciosamente.

## Respostas e critérios de aceitação — D144–D146

Gabriel confirmou as três recomendações em 11/11/2026. A implementação dependente está autorizada. Os critérios abaixo foram registrados antes do código:

1. Dois cards em Movimentações, abaixo de consulta/Seleção: Categorias com 5/12 e Evolução com 7/12 da largura inicial, altura inicial de 384 px e organização responsiva. Quando não houver largura para dois cards de pelo menos 360 px, cada um ocupa a largura disponível, sem alterar dimensões salvas. Mesmos gestos/teclado dos cards existentes e namespace `layout.finance-charts.v1`; preservar Geral, análises superiores e tamanho da consulta. Restauração demo preserva o novo layout. Foco temporário recolhe visualmente o restante de Movimentações, mantendo suas instâncias/estado e o cabeçalho de Finanças; Escape devolve composição e rolagem anteriores.
2. Somente despesas ativas da consulta, mesma classificação efetiva e política de precisão/moedas da F07a. Categorias usa o período atual observado inteiro, barras decrescentes, valor/participação e Sem categoria. Participação por moeda, arredondada a uma casa; total zero não gera porcentagem. Ausência de cobertura não gera total parcial ou zeros inventados.
3. Evolução inicia em Por dia, com alternância Acumulado durante a execução; reabrir inicia em diário conforme a escolha “ao abrir”. Colunas diárias atual/anterior lado a lado e linhas acumuladas na mesma escala monetária. Dias sem despesa dentro de cobertura têm zero observado; dias ausentes ou além do fim do intervalo não recebem zeros. Atual verde, anterior vermelho com rótulos textuais. Datas/intervalos e recortes explícitos; referência ausente identificada. Períodos encerrados preservam diferentes durações completas; em andamento segue D127.
4. Ponteiro e teclado consultam dia/valores. Clicar em coluna/data atual ou anterior abre o extrato daquela data civil; em acumulado, investigar o dia apontado (o rótulo da ação deixa isso explícito), sem confundir acumulado com total diário. Categoria abre todas as suas despesas no intervalo observado. Modal mantém foco contido e retorna ao acionador; Fechar/Escape preservam fundo/Seleção.
5. Dados futuros, vazios, cobertura insuficiente, conversão/precisão indisponível e referências ausentes têm estados explícitos. Não ampliar seed/histórico ou alterar esquema financeiro. Mudanças existentes de cadastro/edição/classificação/exclusão/recuperação recalculam os gráficos.
6. Novo IPC apenas para ler/salvar o layout fechado desta área; validar remetente, aridade e payload no principal e payload também no worker. Conteúdo incompatível não é sobrescrito; falha mantém os ajustes da execução com aviso/repetição.

**Refinamento D147, solicitado em 22/11/2026:** marcar na escala horizontal todo dia que tenha despesa no período atual ou anterior, tanto em Por dia quanto em Acumulado; manter início/meio/fim como referências. Concentrar os intervalos de datas uma vez abaixo do seletor de leitura, sem datas repetidas depois de Atual e Anterior na consulta do dia. A ação ainda identifica sua data exata para tecnologia assistiva e o extrato correspondente.

**Revisão D148, solicitada em 22/11/2026:** retirar a linha de intervalos abaixo do seletor e usar cinza uniforme nos números do eixo, inclusive onde houve despesa. Os intervalos continuam usados no cálculo e a data exata é indicada no extrato aberto e no nome acessível da ação do dia.

Revisão oficial de segurança feita em 11/11/2026: manter uma operação explícita por mensagem no preload isolado e validar o remetente conforme [Electron — Security](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages) e [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation#security-considerations). Não há dependência nova.

## Primeira rodada respondida (histórico)

Enviadas e respondidas em 11/11/2026, todas com a primeira opção:

1. Composição: lado a lado com Evolução mais larga (recomendado), larguras iguais ou ambos em largura completa, um abaixo do outro?
2. Evolução: gasto por dia inicialmente com alternância para acumulado (recomendado), acumulado inicialmente com alternância para diário ou somente diário nesta entrega? A proposta inclui anterior respeitando a cobertura já definida.
3. Clique em categoria/data: extrato flutuante preservando o fundo (recomendado) ou filtro removível na consulta principal, com a consequência sobre a Seleção?

Nenhuma pergunta aguardando resposta nesta rodada. O modo diário inicial e a alternância durante a execução seguem D145; não foi acrescentada preferência persistente de leitura.

## Implementação

`application/expense-reports.ts` calcula composição, participação, diário e acumulado sem escrita. Usa `planExpensePeriods`, cobertura por moeda e consulta do modal, agora com categoria nula para investigar todas as despesas do dia. `expenseReportPlot` reutiliza a geometria pura da F07a; SVG próprio, sem dependência nova. No diário a escala acompanha o maior gasto diário; no acumulado, o maior acumulado. Intervalos encerrados de durações diferentes conservam o fim de cada série.

`ExpenseCharts` mantém modo/dia consultado na execução e emite pedidos de investigação isolados. Colunas individuais identificam a série da data civil; no acumulado o clique escolhe a linha mais próxima, e os botões Atual/Anterior permitem a escolha explícita. Setas, Home/End e Enter consultam/abrem o dia atual; Shift + Enter abre o anterior. Escape sai do foco temporário, com o estado da consulta central preservado.

Layout v3 fechado com área `finance-charts`, IDs Categorias/Evolução e chave própria em preferences.sqlite. Somente ler/salvar esse layout atravessa a nova ponte; esquema demo 6/preferências 3 mantidos. Gravação atômica, recusa de conteúdo incompatível sem sobrescrita e aviso/repetição para falha de escrita. Fatos e demais namespaces permanecem separados.

## Escopo de validação

Testes puros de totais/participação, distribuição diária/acumulada, equivalência temporal, cobertura, precisão e moedas; testes de persistência/IPC para o novo namespace; fluxos Electron com ponteiro/teclado, investigação, filtros e Seleção preservados, atualização após mudanças e reabertura/layout. Somente perfis temporários. Resultados efetivos e limitações ficam exclusivamente em PROJECT_STATUS.
