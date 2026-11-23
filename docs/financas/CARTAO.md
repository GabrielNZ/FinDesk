# F08a — Estrutura do cartão e navegação por faturas

## Objetivo e autorização

Continuidade autorizada por Gabriel em 23/11/2026, após a aprovação da F07b. Esta fatia inicia a carteira visual e a consulta de faturas no submenu Cartão. As três recomendações foram confirmadas explicitamente em D149–D151, com critérios registrados antes da implementação dependente. Aprovação, verificações e situação Git ficam exclusivamente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

Base: especificação de Finanças §9.1–9.2 e §9.4; D24, D33, D37–D38 e D46. Compras detalhadas, expansão de parcelas e análises completas mantêm a etapa F09; esta proposta não as declara implementadas.

## Decisões confirmadas já aplicáveis

- Carteira à esquerda, cartões parcialmente sobrepostos e seleção por clique ou arrasto para destaque, com alternativa de teclado. Um único cartão começa selecionado. A inspiração Apple Wallet não exige reprodução rígida.
- Fatura e informações do cartão selecionado à direita; limites total, utilizado e disponível discretos com barra de utilização. Crédito não é saldo bancário; limite não deriva do valor da fatura.
- Priorizar próxima fatura a pagar; após quitada, destacar a aberta. Permitir consulta das anteriores e futuras, distinguindo paga, fechada, em formação e futura.
- Consultar outro cartão não modifica o cartão de referência da conta nem o período global configurado (D46). Conta sem cartão mostra estado vazio, sem selecionar o de outra instituição silenciosamente.
- Preservar moedas originais, conversões identificadas e precisão. Informação ausente não vira zero; valor conhecido de uma fatura em formação não é cobrança final. Pagamento da fatura não duplica consumo.
- Apenas demonstração local, sem conexão bancária ou execução de pagamentos.

## Diagnóstico técnico local

Leitura do código/fixtures em 23/11/2026; sem alteração dos bancos normais:

- `domain/finance-facts.ts` já define Card, Invoice, Purchase e InvoiceItem. Card tem conta, final, três limites e fonte; não informa se é virtual. Não inventar essa característica na interface. Datas de fechamento/vencimento e estados das faturas já são salvos.
- `fixtures/financas/demo.ts` contém um cartão Nubank da conta `demo-a`, final 0000, limites total R$ 3.000,00, utilizado R$ 1.800,00 e disponível R$ 1.200,00, fonte manual fictícia. Não criar número completo de cartão.
- Referência fixa da demonstração: 29/10/2026. Outubro: paga, R$ 260,00 confirmados, fechamento 02/10 e vencimento 10/10. Novembro: em formação, fechamento 02/11 e vencimento 10/11, subtotal conhecido R$ 283,24 e total confirmado ausente. Há faturas futuras salvas até abril/2027; não gerar fechamentos ausentes.
- `domain/finance.ts` oferece `invoiceKnownSubtotal`, com validação dos vínculos e soma exata. A consulta pode reutilizá-la sem criar fatos, compras ou débitos de conta. O snapshot existente já transporta cartões/faturas/itens; consulta não exige novo IPC.
- `finance-subpage` ainda apresenta o estado pendente do Cartão. A futura composição pode consumir o contexto financeiro existente e manter a separação entre aplicação, domínio e interface; sem SQL nos componentes.
- Atualização idempotente de fixtures já tem precedente em `comparison-history.ts` e na inicialização transacional do store. Acrescentar segundo cartão exige uma atualização própria versionada, se autorizado, com proteção de IDs, rollback e preservação de personalizações; não basta mudar o seed inicial.
- Não foi selecionada dependência nova ou integração externa. O diagnóstico desta rodada é local; não há compatibilidade de biblioteca/provedor pendente para decidir essas três opções.

## Propostas do Codex — histórico respondido em D149–D151

1. **Navegação:** mês selecionado com setas e faixa curta de meses próximos acima do valor à direita. Alternativa: apenas mês/setas para menor densidade. Exemplo proposto: abrir novembro porque outubro já está pago; consultar outubro mantém o contexto global do cabeçalho. A forma de navegação aguarda resposta.
2. **Carteira demonstrativa:** acrescentar segundo cartão inteiramente fictício à mesma conta Nubank, com final e faturas próprios, por atualização versionada que preserve cadastros, categorias, saldos e layouts. Permite avaliar sobreposição e seleção sem mudar a conta. Alternativa: manter somente o atual. A ampliação ainda não está autorizada.
3. **Hierarquia da fatura em formação:** destacar R$ 283,24 como Valor conhecido, acompanhado de Em formação, fechamento e vencimento. Alternativa: estado em destaque e valor conhecido secundário. Não apresentar esse subtotal como valor final.

As três primeiras opções foram recomendadas. Nenhuma foi presumida como decisão confirmada. Os critérios finais de composição e os efeitos de uma eventual atualização fictícia serão registrados após as respostas, antes do código dependente.

## Validação prevista

Consulta pura: seleção por conta/cartão, prioridade/ordenação de faturas, limites e valores conhecidos/confirmados, ausência e moedas. Interface Electron: carteira e teclado, navegação entre faturas, conta sem cartão, contexto global preservado e janela estreita. Se houver ampliação fictícia: atualização idempotente/atômica, colisões/rollback e preservação dos dados existentes. Todos os testes de persistência/falha somente em perfis temporários.

## Respostas confirmadas e critérios de aceitação — D149–D151

Gabriel respondeu “Confirmo as três recomendações” em 23/11/2026. As propostas anteriores passam a decisões confirmadas. Critérios registrados antes da implementação:

1. **D149 — composição e navegação:** carteira sobreposta à esquerda e fatura à direita. Mês com setas e faixa curta dos meses salvos próximos, identificados pelo vencimento, incluindo ano na descrição acessível. Abrir pela próxima fechada não paga; se não houver, pela aberta; depois futura ou última paga. Não criar faturas ausentes. Consultar cartão/fatura não altera conta, período global nem referência das Configurações. Seleção de cartão por clique, arrasto curto para destaque e teclado; Escape cancela o gesto. Janela estreita empilha carteira e fatura. Gestos da carteira não reorganizam cards de outras áreas.
2. **D150 — segundo cartão fictício:** acrescentar cartão final 1111 na conta demo-a, com limites de fonte manual fictícia, compra própria de R$ 89,90 e faturas salvas próprias, sem novos movimentos de caixa. Atualização seed v2→v3 idempotente/atômica, após v1→v2 quando necessário, com colisões recusadas sem sobrescrita. Preservar todos os fatos anteriores, saldos, despesas manuais ativas/excluídas, recibos, categorias, regras, estabelecimentos, preferências e layouts. Nova instalação e restauração explícita usam a base ampliada; não requer restauração para atualizar. Esquemas SQLite demo 6/preferências 3 e referência fixa 29/10/2026 preservados.
3. **D151 — valores e estados:** novembro do cartão 0000 mostra R$ 283,24 em destaque com Valor conhecido e Em formação. Outubro mostra R$ 260,00 como valor confirmado e Paga. Fechamento/vencimento explícitos. Futura não vira cobrança confirmada; sem itens e sem total confirmado mostrar valor indisponível, não zero. Limites discretos abaixo do valor, com fonte, sem subtrair fatura para derivá-los. Conversão de apresentação segue D33 e conserva os originais.
4. Preservar contexto ao trocar submenu; estado de consulta do cartão é da execução, sem novo layout/IPC. Se a conta selecionada não tem cartão, apresentar estado vazio; Todas as contas permite consultar os cartões disponíveis sem somá-los ou misturar faturas. Dados inválidos/precisão indisponível não produzem total parcial enganoso. Compras detalhadas, gráficos e expansão de parcelas permanecem para F09.

## Implementação

**Resposta D157 e critérios registrados antes da parte dependente, 23/11/2026:** Gabriel escolheu “Barra única; trecho cresce em altura e mostra dica (recomendado)”. Entre valor/datas e limites, apresentar Categorias da fatura em uma barra proporcional de itens conhecidos, ordenados pelo maior subtotal. Usar apenas as parcelas/itens vinculados à fatura e cartão consultados (D24); fonte/classificação das compras preservadas. Categoria ausente participa como Sem categoria; metadado do catálogo desconhecido fica identificado, sem inventar nomes/cores. Tooltip contínuo com ícone, nome, valor e participação arredondada uma vez a uma casa; originais/cotação preservados na conversão. Hover/foco aumenta a altura do segmento sem alterar largura ou deslocar o painel. Teclado e Escape, movimento reduzido e adaptação estreita mantidos. Fatura sem itens, total zero, precisão indisponível e falha de catálogo têm estados explícitos, sem barra parcial enganosa. Se total confirmado difere dos itens, identificar a base conhecida sem preencher diferença com categoria inventada. Nada é gravado; compras detalhadas, estornos e demais análises continuam na F09.

**Revisão D156, solicitada em 23/11/2026, critérios anteriores ao ajuste:** remover apenas a faixa de meses próximos; manter mês/setas da fatura e preservar D46. Valor da fatura mais alto no painel e maior, com estado/rotulagem preservados. A composição por categoria ficará entre o valor e os limites. D24 mantém parcelas/itens da fatura selecionada como base, sem somar o total contratado ou pagamento novamente. Foram propostas expansão vertical com dica ou alargamento temporário do trecho; Gabriel confirmou a primeira opção em D157 antes de construir o gráfico.

**Revisão D155, solicitada em 23/11/2026, critérios anteriores ao ajuste:** marcador circular de 10 px centralizado na barra, acompanhando o ponto consultado e adotando exatamente a cor do trecho preenchido/restante. Mesmas cores compartilhadas entre barra e marcador, sem clareamento adicional no hover. Preservar posição contínua, troca de valores, teclado e Escape da D154.

**Revisão D154, solicitada em 23/11/2026, critérios anteriores ao ajuste:** mostrador único acompanha a posição horizontal do mouse pela barra; ao atravessar a divisão, troca de Utilizado para Disponível e vice-versa sem desaparecer ou saltar para uma âncora de outro segmento. Guia acompanha o ponto consultado; dica contida nas extremidades, sem cobrir o total. Teclado ancora a consulta no trecho focado e Escape continua ocultando a dica. Sem alteração de valores, fonte, conversão, faturas ou persistência.

**Revisão D152/D153, solicitada em 23/11/2026, critérios anteriores ao ajuste:** total na ponta direita da barra, utilizado/disponível em dica nas partes preenchida/restante, sem grade fixa dos três valores. Foco oferece os valores exatos e Escape oculta a dica. Na conversão, cada dica mantém o original respectivo; total original e cotação ficam identificados abaixo. Cartão não selecionado fica com aproximadamente 58 px expostos em repouso (antes 92 px) e sobe 24 px no hover/foco, sem trocar a seleção. Transição curta, desativada com movimento reduzido; arraste mantém a posição visual ao começar. Preservar dados, origem dos limites, conversão, navegação e contexto.

`application/card-invoices.ts` consulta cartões por conta e ordena faturas salvas, distinguindo subtotal conhecido, quantidade de itens e total confirmado. Soma exata, sem pagamento da fatura no consumo, sem preenchimento de datas ausentes e sem somar cartões/moedas. Conversão para apresentação preserva originais e recusa cotação ausente/futura/incompatível ou precisão excedida.

`fixtures/financas/card-wallet.ts` acrescenta cartão final 1111, compra de R$ 89,90 e faturas de novembro/dezembro, mantendo o estabelecimento Loja existente e sem novos movimentos de caixa. A atualização v2→v3 ocorre na transação de inicialização, após a atualização anterior quando necessária. IDs reservados em conflito recusam a inicialização sem sobrescrever. Restauração explícita usa a base ampliada. Sem novo esquema SQL ou IPC; contratos de snapshot passam a reconhecer seedVersion 3.

`CardPage` usa o contexto compartilhado e guarda somente a consulta da execução em `CardConsultation`, separada das preferências. Carteira com clique/arrasto e setas/Home/End, cancelamento por Escape/perda de captura/foco, cursor de arraste apenas durante movimento, transição respeitando movimento reduzido. Faturas usam mês/setas; D156 remove a faixa próxima anteriormente prevista em D149. Limites discretos e originais identificados na conversão. Janela estreita empilha carteira/fatura.

`InvoiceCategories` apresenta a composição somente de leitura produzida por `cardInvoices`: agrega itens por categoria da compra, mantém moedas e centavos, ordena os subtotais e calcula participação na base original conhecida. Fonte de caixa/classificação individual de Movimentações não reclassifica compras de cartão. Não cria categoria para diferença entre itens e total confirmado, nem apresenta subtotal parcial em falha de precisão. Cada subtotal convertido arredonda uma vez para apresentação, com original na dica; não soma esses arredondamentos como novo total. Catálogo compartilhado fornece metadados. Destaque em altura sem alterar largura e dica contínua têm alternativas por teclado, Escape e movimento reduzido; interação não grava dados.

O cartão de referência não é escolhido automaticamente pela carteira. Com dois cartões e referência ausente, o comportamento existente D46 mantém Entre fechamentos indisponível até escolher a referência nas Configurações. Preferências salvas não são alteradas para contornar essa regra. Sem metadado de cartão virtual nos fatos, não é exibida essa característica. Compras/parcelas detalhadas e análises aguardam F09.
