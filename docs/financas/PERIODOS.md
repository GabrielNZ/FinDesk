# Períodos salvos — primeira fatia dos ciclos

Decisões confirmadas D36–D39, em [DECISIONS.md](../DECISIONS.md). Antecipação autorizada da primeira fatia da F02b durante a revisão do cabeçalho da F02a; não conclui configuração de fontes/recorrências ou relatórios.

## Regras confirmadas

- **D53:** botão do modo já ativo alterna a expansão por clique ou teclado; setinha mantida. Trocar de modo começa recolhido. Sem tooltip que repete o nome; nomes acessíveis e motivos de indisponibilidade preservados. Essa regra substitui o recolhimento incondicional ao clicar novamente no modo, descrito na apresentação anterior.

- **Evolução F02b.3 — D44–D52:** [ajustes por conta](CICLOS_CONFIGURAVEIS.md) permitem dia mensal salarial e cartão de referência, com salvamento automático/aplicação imediata. Dia inexistente usa fim do mês sem perder dia-base; sem ajuste de dias úteis. Datas previstas confirmadas prevalecem. Gerar somente pelo ciclo atual na ativação e futuros, sob demanda, sem criar receitas ou preencher histórico. Isso amplia a restrição inicial de D37 para salário explicitamente configurado; cartão continua usando fechamentos salvos.

- **D41 substitui a apresentação de D40:** os três modos começam recolhidos; aba de 20 × 44 px expande horizontalmente, com seta acompanhando a extremidade direita. Aberta, seta e seletor são peças separadas por 8 px. Altura de 44 px preservada; nenhuma linha visível de datas, inclusive salário/cartão. Datas e seleção continuam no contexto e na descrição acessível. Escape recolhe e devolve foco.

- **D40:** no calendário, a seleção do mês começa recolhida atrás de uma pequena seta à direita do botão. Ao abrir, mostra somente mês/ano com navegação, em 44 px de altura. Não há linha visível de datas nesse modo; o contexto e a descrição acessível mantêm o intervalo completo. Recolher preserva o mês, e selecionar Calendário novamente inicia recolhido. Escape fecha a expansão e devolve foco à seta.

- Calendário é o padrão inicial, alterável em Configurações conforme D42/D43. Três botões mutuamente exclusivos em coluna ao lado do saldo; expansão à direita do botão ativo. Ações de importar/banco/moeda permanecem juntas no canto anterior. Em janela estreita, o período reacomoda abaixo para preservar o saldo e as ações.
- Salário: data prevista salva até a véspera da próxima data prevista salva. Recebimento antecipado/atrasado não muda a âncora.
- Cartão: dia seguinte ao fechamento anterior salvo até o próximo fechamento salvo, incluindo este dia. Vencimento não define esse intervalo e vínculos observados entre compra/parcela/fatura permanecem intocados.
- Sem regra salarial configurada, usar somente datas existentes. Com regra, aplicar D47–D52 acima. Fechamentos de cartão permanecem explícitos e não são gerados.
- O modo depende da conta selecionada. Todas as contas, conta sem datas/regra suficientes ou sem intervalo cobrindo a referência deixam o modo indisponível, com motivo acessível no hover/foco. Mais de um cartão exige a referência explícita configurada; referência ausente/removida não escolhe outro silenciosamente.
- Trocar para uma conta que não oferece o ciclo ativo volta ao calendário **sem aviso**, conforme a resposta de Gabriel em D38.
- Cada modo conserva o intervalo consultado enquanto continua válido; salvar ajustes recalcula o contexto conforme D51. O saldo continua na referência do snapshot. Navegação salarial configurada amplia futuros sob demanda; anterior sem datas confirmadas continua indisponível. Cartão usa intervalos salvos.
- Trocas de modo são temporárias. Não sobrescrever o padrão ao mudar conta/moeda. Configurações → Finanças permite salvar o padrão para a próxima abertura, preservando a consulta atual; conta incompatível abre no calendário sem aviso e mantém a preferência. Critérios em [PERIODO_PADRAO.md](PERIODO_PADRAO.md).

## Exemplo do conjunto fictício

Referência 29/10/2026, conta Nubank: calendário 01/10–31/10/2026; salário 05/10–04/11/2026; cartão 03/10–02/11/2026. Só há duas datas previstas de salário no conjunto base, portanto um intervalo salarial completo. Os fechamentos até abril permitem navegar pelos ciclos conhecidos; não constituem integração bancária.

## Fronteiras da implementação

`application/finance-periods.ts` monta intervalos sobre datas explícitas. `domain/civil-date.ts` fornece dia civil vizinho, sem horário/fuso ou política de dia útil. `FinanceContext` mantém o modo/intervalo temporários e aplica o retorno de D38; componentes apenas apresentam e acionam esse contexto. Não há SQL ou cálculo financeiro central nos templates.

Os submenus ainda são estruturas sem seus indicadores, extratos ou faturas funcionais. Esta fatia não calcula consumo por ciclo, disponível diário, pagamentos, orçamento ou alocação de compras no dia do fechamento; fatos já vinculados à fatura não são reclassificados.

## Pendências preservadas

Feriados/ajuste de dias úteis, múltiplas fontes salariais na mesma conta, geração de fechamentos e alocação de compras sem vínculo observado permanecem para seus escopos. Configuração mensal, mês curto e cartão de referência foram respondidos em D44–D52; não perguntar novamente. Previsões de receitas/obrigações e detecção continuam em F12/F13.
