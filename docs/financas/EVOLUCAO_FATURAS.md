# F09b — Evolução mensal das faturas

## Objetivo e autorização

Gabriel aprovou a F09a e autorizou a continuidade em 24/11/2026. Esta fatia propõe consultar a evolução das faturas do cartão selecionado e abrir as compras de uma fatura pelo gráfico, conforme §9.4/FIN-030. Aprovação, execução e verificações efetivas ficam exclusivamente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

Composição e comportamento ao selecionar um mês foram respondidos por Gabriel em 24/11/2026 (D162/D163), nos critérios abaixo. As recomendações históricas não escolhidas não são decisões confirmadas. A redução de altura do painel da fatura (D160) permanece preservada.

## Base confirmada aplicável

- Carteira e fatura usam uma consulta própria da execução. Consultar outro mês/cartão preserva período global, conta e referência das Configurações (D46/D149).
- O mês da fatura segue seu vencimento salvo. Selecionar uma barra mensal abre as compras correspondentes; uma compra expande sua agenda (§9.4, F09a/D158/D159).
- D24: parcela por fatura, sem somar compra contratada e pagamento como consumos adicionais.
- Preservar distinção entre total confirmado, valor conhecido, estado aberto/fechado/pago/futuro e ausência. Um valor menor em uma fatura em formação não comprova redução definitiva de gastos.
- Moedas/originais e conversão somente para apresentação seguem D33. Ausência ou excesso de precisão não viram zero ou subtotal parcial.
- Não gerar parcelas, faturas, recorrências ou dados reais para preencher o gráfico.

## Diagnóstico técnico local — 24/11/2026

Pesquisa restrita ao código, fixtures e documentos do projeto, sem escrever nos bancos normais:

- `cardInvoices` já retorna faturas por cartão/conta, ordenadas pelo vencimento, com total confirmado, subtotal conhecido seguro, quantidade de itens e categorias. A base de valor do painel é `confirmedTotal ?? knownSubtotal`; o gráfico pode compartilhar essa leitura.
- `CardConsultation.selectInvoice` já muda a consulta da execução. Painel e tabela acompanham o ID, e a expansão da compra se recolhe. Não é necessário novo IPC, schema, seed ou preferência para essa navegação.
- Cartão 0000: sete faturas salvas, de outubro/2026 a abril/2027. Outubro: R$ 260,00 confirmados, pago. Novembro: R$ 283,24 conhecidos, em formação. Dezembro/janeiro: R$ 233,33 conhecidos cada. Fevereiro/março/abril: R$ 200,00 conhecidos cada, futuros. A referência fictícia continua em 29/10/2026.
- Cartão 1111: novembro com R$ 89,90 conhecidos e dezembro sem itens/total confirmado. A ausência deve continuar visível e consultável, sem desenhar uma despesa zero.
- A atualização de setembro da F07a amplia movimentações de caixa; não acrescenta uma fatura de setembro. Não usar esses gastos de caixa como histórico de crédito.
- O modelo aceita faturas distintas no mesmo mês, sem regra de unicidade por mês. A projeção deve preservar IDs/datas e acesso a cada fatura, sem unir seus valores silenciosamente.
- O padrão atual de gráficos usa Angular e recursos nativos HTML/SVG. É possível seguir a mesma base sem dependência nova; não há pesquisa externa de compatibilidade pendente para decidir a composição proposta.
- No levantamento, foram avaliadas rolagem até a tabela e atualização mantendo a posição. A segunda foi confirmada em D163; gráfico e resumo local deixam explícita a nova seleção mesmo com o painel fora da vista.

## Alternativas apresentadas no levantamento

1. **Composição:** gráfico baixo de colunas em largura disponível abaixo da tabela de compras. Preserva a prioridade da fatura/compra atual e não aumenta o painel compactado. Alternativas apresentadas: colunas entre a carteira/fatura e a tabela, oferecendo a escolha do mês antes da lista; ou linha abaixo da tabela. A especificação cita barras mensais; linha só substituirá essa direção se Gabriel a escolher.
2. **Interação:** selecionar uma coluna atualiza a fatura e a tabela e leva a tela até o início das compras, para mostrar os lançamentos escolhidos. Alternativa: atualizar os mesmos conteúdos e manter a rolagem no gráfico, favorecendo a consulta consecutiva de vários meses. Nenhuma opção muda o período global.

Direção visual proposta junto da primeira pergunta: confirmado com preenchimento; valores de fatura em formação/futura com contorno ou hachura e identificação explícita na dica/legenda. Exemplo: R$ 260,00 confirmados em outubro versus R$ 283,24 conhecidos em novembro. Mês sem valor mostra ausência, não uma coluna zero. Hover/foco informa mês, vencimento, valor/base e situação; seleção por teclado também deve ser possível.

## Respostas confirmadas e critérios de aceitação — D162/D163

Gabriel escolheu o espaço à direita da fatura na janela ampla, com passagem automática para baixo quando faltar largura. Depois confirmou atualizar os dados sem rolar a página. Critérios registrados antes da implementação dependente:

1. Grade usa a largura disponível. Na janela ampla, carteira, fatura e evolução ficam em três colunas, com o gráfico à direita; na intermediária, carteira/fatura continuam lado a lado e o gráfico passa para a próxima linha, antes das compras; na estreita, os três empilham. A mudança depende do espaço real da área de conteúdo, inclusive com posições diferentes da navbar. Painel da fatura preserva D160; o gráfico não impõe altura à fatura.
2. Colunas por fatura, ordenadas pelo vencimento salvo, com mês/ano, escala monetária e seleção explícita. Meses sem fatura são lacunas, sem criar fatos. Mais de uma fatura no mês mantém colunas/IDs distintos e suas datas, sem soma implícita. Mostrar as faturas disponíveis; excesso usa rolagem horizontal somente dentro do gráfico.
3. Mesma base do painel: total confirmado quando informado; senão subtotal conhecido. Confirmado preenchido; conhecido com hachura e legenda. Estado pago/fechado/em formação/futuro aparece na consulta da coluna. Sem itens/total é ausência, não zero; zero observado/confirmado permanece identificável. Valores inseguros ou conversão indisponível não geram barra enganosa. Totais originais/conversão seguem D33; não misturar cartões/moedas ou incluir pagamentos novamente.
4. Hover/foco revela mês/ano, vencimento, valor, base e situação. Teclado por setas/Home/End, Enter/espaço seleciona e Escape fecha a dica. Selecionar uma coluna muda a mesma consulta da fatura e compras, recolhe a compra expandida e mantém o foco no gráfico, sem rolagem automática. Preservar período, conta, referência, layouts e fatos. A altura mínima da área das compras deve conservar espaço suficiente para não provocar salto por redução de conteúdo na troca pelo gráfico; ampliar quando necessário, sem salvar esse espaço como preferência.
5. Trocar cartão/conta usa somente seu histórico; sem cartão/sem faturas não fabrica série. A seleção da execução é compartilhada com as setas da fatura. Sem novo IPC, schema, seed ou dependência. Movimento reduzido e janela estreita preservados.

## Escopo delimitado

Esta fatia é a evolução por fatura e sua navegação. Variação monetária/percentual, análises por estabelecimento, futuro contratado versus recorrência prevista e estornos continuam em fatias próprias da F09; não foram implementados nem considerados metodologias encerradas.

A composição inicial não acrescentou personalização. D164 passou a exigir organização dos cards, concretizada abaixo com namespace separado. Não criar um novo seletor global. A F02c permanece uma entrega separada, sem aprovação presumida pela resposta de design da F09b.

## Implementação

**Revisão D166, critérios anteriores ao ajuste:** usar como novo padrão as proporções que Gabriel mostrou e já salvou na interface. Leitura somente da chave de layout: carteira 3,2 colunas, fatura 3,676, evolução 5,146 com `align: 1`, prioridade da evolução e início de linha das compras; alturas de 400 px mantidas. Novos perfis/Restaurar layout passam a usar esse padrão; não normalizar ou sobrescrever layouts personalizados. Alinhar conteúdo da segunda coluna de datas à direita, mantendo Fechamento à esquerda e Vencimento na ponta direita da mesma linha.

**Revisão D164/D165 — critérios anteriores ao código, 24/11/2026:** Gabriel pediu os mesmos gestos de organização do Geral/Movimentações para fatura, evolução e compras. Integrar a área inteira ao CardBoard existente, incluindo o agrupamento da carteira para liberar posições sem um espaço fixo intocável. Padrão preserva carteira/fatura/evolução na primeira linha ampla e compras na seguinte; fatura/evolução com 400 px iniciais iguais. Arraste pelo corpo comum, controles internos preservados; canto grosso contínuo, troca/inserção/posição livre, assistência de altura, teclado, foco temporário e restauração em dois cliques seguem D55–D76. Namespace `finance-invoices` em preferences.sqlite com contratos restritos e validação no processo privilegiado; restauração demo preserva essa personalização. Layouts anteriores de outras áreas não mudam. Conteúdo maior que o tamanho escolhido rola dentro do card; o gráfico cresce com o espaço disponível. Trocar fatura continua atualizando sem rolar a página. Retirar as frases solicitadas, juntar estado ao valor e preservar avisos de ausência/erro e valores originais.

`application/invoice-evolution.ts` reutiliza as leituras validadas de `cardInvoices`. Prioriza o total confirmado sobre o conhecido; converte uma vez por fatura e preserva originais. Geometria usa inteiros/BigInt antes da apresentação, com escala segura inclusive nos extremos. Cada fatura mantém seu ID; lacunas contínuas viram um indicador com intervalo/quantidade, sem alocar milhares de meses ausentes ou gerar fatos.

`fd-invoice-evolution` compartilha a consulta do painel/tabela. Dica por hover/foco com Escape, navegação por setas/Home/End e seleção por Enter/espaço. Confirmado sólido, conhecido hachurado e ausência por traço. Resumo explicita o mês selecionado; cotação fictícia e originais preservados. Dicas usam separadamente hover e foco, para não desaparecer ao atualizar a fatura com o botão ainda focado.

A composição inicial retirou o limite de 1120 px e usou consultas de contêiner para passar a evolução para baixo. D164 substituiu a grade fixa pelo `CardBoard` já utilizado no Geral/Movimentações. O padrão tem carteira/fatura/evolução na primeira linha ampla e compras em largura completa na próxima; fatura e evolução com 400 px de altura. O mecanismo resolve larguras menores sem gravar quebras responsivas como preferência. Arraste, troca/inserção, posição horizontal livre, resize contínuo pelo canto, assistência de altura, foco temporário e teclado são compartilhados; a mesma instância do conteúdo permanece durante a organização.

Namespace `finance-invoices`, formato de layout v3, chave `layout.finance-invoices.v1` em preferences.sqlite. Reabertura e restauração demo preservam a personalização; Restaurar layout usa dois cliques e repõe só essa área. Novo par de operações restritas na ponte, com validação de remetente/argumentos no main e contrato fechado no worker/store, seguindo o padrão existente e a [documentação oficial de segurança do Electron](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages). Sem novo schema, seed, dependência ou mudança dos fatos financeiros. Versões futuras/conteúdo incompatível recusam sobrescrita; falha de gravação preserva bytes anteriores.

Dimensões escolhidas independem da quantidade de compras: expansão rola dentro do card, removendo a reserva temporária de altura da composição inicial. Selecionar uma fatura continua sem rolar a página. O gráfico aproveita o aumento de altura e mantém os valores. D165 retirou os rótulos Valor conhecido/Valor confirmado e a explicação repetida; o estado fica junto à identificação do cartão. Erros/ausência e originais permanecem explícitos.

## Validação pertinente

Consulta pura: vínculo de conta/cartão/fatura, ordem/datas/ano, prioridade confirmado/conhecido, fatura sem itens versus zero confirmado, precisão, moedas, lacunas e faturas distintas no mesmo mês; nenhum consumo duplicado. Interface Electron em perfil temporário: composição escolhida, dica/foco/teclado, seleção sincronizada com painel/tabela, recolhimento da compra, rolagem conforme resposta, contexto preservado, cartão sem histórico suficiente e janela estreita. Resultados efetivos em PROJECT_STATUS; reutilizar evidências ainda válidas e não executar suítes por documentação.
