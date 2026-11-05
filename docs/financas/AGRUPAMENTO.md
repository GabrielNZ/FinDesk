# F05a — Agrupamento por categoria e estabelecimento

## Revisão solicitada — cards com extrato próprio

**D99/D100:** Limpar seleção preserva rolagem e foco. Extrato/Agrupamento aparece como switch de tamanho/tipografia preservados, com indicador deslizante e arrastável. Clique/teclado continuam, Escape cancela o gesto e movimento reduzido elimina a transição. A troca não altera os itens/blocos selecionados nem os filtros.

**Revisão D97/D98 confirmada:** expansão ocupa toda a área dos 70% à esquerda, com largura/altura disponíveis e outros cards temporariamente ocultos. Extrato curto deixa o restante vazio; extrato longo rola dentro do card. Recolher restaura a grade e seu tamanho salvo. Arrastar um agrupamento para a direita cria um bloco identificado com seus lançamentos, recolhível e removível por inteiro. Cada lançamento participa uma vez do total, mesmo já selecionado individualmente. Blocos e seleção continuam restritos à consulta (D82); não preencher automaticamente com novos movimentos ao mudar o contexto.

**Critérios D97/D98 antes da implementação:** arraste pelo cabeçalho/fundo comum do agrupamento com prévia e destino verde; clique sem arraste ainda abre/recolhe, e controles dos lançamentos mantêm seus próprios gestos. Ação por botão/teclado equivalente. Repetir o arraste atualiza o mesmo bloco sem duplicar IDs; remover um lançamento o retira da seleção e dos blocos; remover o bloco retira seus membros, preservando IDs ainda pertencentes a outro bloco. Limpar seleção remove blocos também. Expandir não salva dimensões temporárias; grade/restante da consulta retornam ao recolher. Validar arraste real/cancelamento, soma, remoção, contexto, altura vazia/rolagem e preservação dos dados em perfis temporários.

**Decisão confirmada D94:** Gabriel rejeitou a apresentação em árvore/pastas e pediu uma grade de cards com ícone, nome e total. Clicar expande os lançamentos do próprio agrupamento na mesma página; remover a ação que aplica filtro compartilhado e muda para a aba Extrato. Abertura/recolhimento não muda a consulta nem elimina itens da Seleção. A área manual da direita e a alternância Extrato/Agrupamento permanecem conforme decisões anteriores.

**Decisões confirmadas D95/D96:** um card aberto por vez, ocupando a largura da grade à esquerda e mantendo os outros cards visíveis. Abrir outro recolhe o anterior; recolher devolve o tamanho compacto. O conteúdo mostra diretamente o extrato, separado por títulos de estabelecimento com subtotal, sem segunda grade nem árvore.

**Critérios registrados antes da implementação:**

1. Grade responsiva com cards de ícone, nome, total e quantidade; ícones representativos das categorias, sem pastas. Tipos financeiros não classificados como despesa continuam em cards próprios.
2. Clique/Enter/espaço no cabeçalho abre/recolhe o próprio card. Só um aberto; expansão temporária na largura da grade, sem alterar tamanho salvo, consulta, aba ou seleção. Escape recolhe o card quando não houver foco de painel/filtro a encerrar.
3. Card de categoria aberto mostra seções de estabelecimento com subtotal e lançamentos diretamente disponíveis. Tipos sem estabelecimento mostram seus movimentos diretamente, sem hierarquia inventada.
4. Detalhes, seleção por botão/teclado e arraste dos lançamentos continuam; abrir outro card não retira itens selecionados. Conta/período/busca/filtros explícitos ainda aplicam D82.
5. Trocar para Extrato mostra a consulta completa dos filtros explícitos; nenhum filtro de grupo automático ou botão para removê-lo. Preservar Cards/Lista, soma/subtotais, foco e resize existentes. Testar o novo fluxo em perfis temporários e conferir layout amplo/estreito em conjunto.

**Perguntas aguardando resposta:** nenhuma nesta revisão. Sem dependência/API nova ou mudança financeira/persistência.

Essa revisão substitui a interação de filtro ao clicar descrita em D91–D93 e nos critérios anteriores abaixo. Os cálculos puros, IDs únicos, tipos financeiros, moedas e filtros explícitos do cabeçalho continuam válidos. Nenhuma aprovação de metodologia nova ou de cadastro/edição.

## Histórico da primeira versão — substituído nos pontos acima

## Levantamento iniciado em 04/11/2026

Autorização de continuidade recebida após aprovação da F04a. Rodadas respondidas: composição 70%/30%, todos os tipos, setinha para abrir/nome para filtrar, seleção direita manual e alternância Extrato/Agrupamento na esquerda. Sem perguntas pendentes desta fatia.

## Confirmado pelas fontes

- FIN-020/022/045 e especificação §8: Categoria → estabelecimento/serviço → lançamentos, com total/quantidade dos mesmos registros filtrados. Exemplos Transporte → Uber → corridas. Grupo selecionado filtra o extrato, com filtro visível e removível.
- Despesas Sem categoria continuam incluídas. Assinatura é atributo separado, sem criar outro gasto. Transferências próprias, pagamentos de fatura e aportes mantêm classificação própria.
- Cabeçalho e consulta de conta/moeda/período/busca mantidos. D82 continua aplicável: a seleção de análise perde itens que saem da consulta; limpar o filtro não os reseleciona automaticamente.
- D83: análises no topo, extrato/agrupamento no centro, gráficos abaixo; foco e organização salva conforme o padrão acordado. A área de seleção da F04a permanece disponível à direita.
- F04a segue com caixa, sem compras/parcelas do cartão. A F05a não introduz compras ao agrupamento sem levantamento das regras correspondentes.

## Diagnóstico do código

F04a fornece consulta/filtros puros, valores exatos e conversão de apresentação, seleção por ID e subtotais por tipo/moeda. Despesas já têm categoryId/merchantId; os demais tipos não possuem essa hierarquia. Rótulos conhecidos da demonstração são locais; ainda não há catálogo editável persistido de categorias/estabelecimentos. Agrupar pelo ID, sem fundir por aparência ou transformar origem/recorrência em categoria. Logos remotos não são necessários.

O layout salvo atual contém proporção/altura da Lista em `layout.finance-statement.v1`. O mesmo formato atende à consulta alternada; preservar esse ajuste e o layout do Geral, sem migração. Proporção inicial atualizada para 70/30 somente quando não há layout salvo.

## Decisões confirmadas na primeira rodada

- D89: 70% à esquerda para consulta e 30% à direita com seleção por arraste. Substitui a proposta de três áreas lado a lado; a referência inicial a extrato/soma na seleção foi esclarecida em D93.
- D90: incluir todos os movimentos, com categorias/estabelecimentos nas despesas e grupos próprios dos demais tipos. Sem categoria permanece incluído.
- D91/D92: setinha abre/recolhe; nome/total filtra a consulta à esquerda. A direita permanece com seleção manual, com poda D82 dos itens fora da consulta.
- D93: Extrato e Agrupamento são funções distintas, alternadas na área de 70%. Clicar no nome/total de um grupo abre o Extrato nessa área com o filtro aplicado. Cards/Lista continuam disponíveis no Extrato. A área de 30% é Seleção para análise, com seu total; não renomeá-la como extrato completo.

## Critérios de aceitação da interface

1. Alternância identificada Extrato/Agrupamento em 70% da área; seleção manual nos 30% restantes. Proporção padrão 70/30 quando não há preferência salva; respeitar tamanho já ajustado, mínimos laterais e adaptação estreita. O formato existente do layout comporta essa proporção/altura, sem migração ou nova gravação na leitura.
2. Todos os tipos, hierarquia factual, grupos com total assinado/quantidade, sem categoria/estabelecimento omitidos e sem duplicar IDs. Rótulos explícitos da demo em catálogo local; IDs desconhecidos permanecem identificáveis.
3. Setinha abre/recolhe sem filtrar ou adicionar à seleção. Nome/total abre o Extrato filtrado com indicação removível. Limpar filtro não restaura seleção descartada por D82. Filtros e seleção sobrevivem à alternância na execução.
4. Lançamentos individuais visíveis ao expandir o grupo conservam detalhes, arraste e seleção por teclado/botão. Um grupo não adiciona todos os seus itens à análise automaticamente.
5. Foco temporário da área de consulta ou da seleção preserva filtros/cabeçalho e layout salvo; Escape retorna. Redimensionamento fica indisponível no foco para não gravar uma dimensão temporária.
6. Preservar consulta, Cards/Lista, soma/subtotais, resize e namespace do Geral. Agrupamento/abertura/filtro/foco derivados da execução, sem escrita financeira ou novo IPC. Testes puros de grupos e fluxos Electron em perfis temporários, incluindo filtro por grupo, arraste, remoção, foco e janela estreita.

## Base técnica independente da interface

Preparar grupos puros sobre os mesmos registros de caixa já consultados, sem alterar fatos nem layout. Grupos identificados por tipo/IDs originais, sem unir estabelecimentos por nome ou movimentos por descrição/data/valor. Categoria → estabelecimento → registros para despesas; outros tipos agrupados pelo próprio tipo, sem atribuir categoria inexistente. Sem estabelecimento informado permanece visível em um grupo neutro.

Quantidade conta IDs únicos; totais usam os valores assinados e moedas da apresentação conforme D88, sem transformar fatura/aporte em consumo. Sem valor/cotação, o total da moeda afetada fica indisponível; BRL/USD originais separados. Grupos são derivados dos filtros recebidos; o clique aplica os critérios dos IDs de categoria/estabelecimento/tipo. Rótulos de estabelecimento podem vir de catálogo local conhecido; sem rótulo, preservar ID, sem inferir uma empresa pela descrição.

Critérios dessa base: cobrir os tipos existentes, hierarquia, total/quantidade, duas corridas parecidas preservadas, ausência de categoria/estabelecimento, IDs homônimos distintos, moedas e dados ausentes, sem mutar os registros de entrada. Testes puros sobre fixtures fictícias, sem banco ou dados pessoais.

## Proposta anterior substituída

- Três áreas lado a lado em espaço amplo: Extrato / Agrupamento / Seleção, com adaptação em janela estreita e foco temporário.

## Perguntas e pesquisa

Respostas recebidas para as escolhas acima; nenhuma pergunta pendente. Sem API/biblioteca nova selecionada. Cadastro/edição de categorias e gráficos/metodologia comparativa permanecem nas entregas correspondentes.

Respostas e critérios registrados antes da implementação dependente. Sem pendência de pesquisa externa nesta rodada: o diagnóstico usa código e requisitos locais. A proposta de continuidade é F05b — Categorias e regras manuais, após aprovação e levantamento do alcance das alterações.
