# Períodos salvos — primeira fatia dos ciclos

Decisões confirmadas D36–D39, em [DECISIONS.md](../DECISIONS.md). Antecipação autorizada da primeira fatia da F02b durante a revisão do cabeçalho da F02a; não conclui configuração de fontes/recorrências ou relatórios.

## Regras confirmadas

- **D41 substitui a apresentação de D40:** os três modos começam recolhidos; aba de 20 × 44 px expande horizontalmente, com seta acompanhando a extremidade direita. Aberta, seta e seletor são peças separadas por 8 px. Altura de 44 px preservada; nenhuma linha visível de datas, inclusive salário/cartão. Datas e seleção continuam no contexto e na descrição acessível. Escape recolhe e devolve foco.

- **D40:** no calendário, a seleção do mês começa recolhida atrás de uma pequena seta à direita do botão. Ao abrir, mostra somente mês/ano com navegação, em 44 px de altura. Não há linha visível de datas nesse modo; o contexto e a descrição acessível mantêm o intervalo completo. Recolher preserva o mês, e selecionar Calendário novamente inicia recolhido. Escape fecha a expansão e devolve foco à seta.

- Calendário é o modo inicial desta revisão. Três botões mutuamente exclusivos em coluna ao lado do saldo; expansão à direita do botão ativo. Ações de importar/banco/moeda permanecem juntas no canto anterior. Em janela estreita, o período reacomoda abaixo para preservar o saldo e as ações.
- Salário: data prevista salva até a véspera da próxima data prevista salva. Recebimento antecipado/atrasado não muda a âncora.
- Cartão: dia seguinte ao fechamento anterior salvo até o próximo fechamento salvo, incluindo este dia. Vencimento não define esse intervalo e vínculos observados entre compra/parcela/fatura permanecem intocados.
- Usar somente datas existentes na demonstração persistida. Não gerar mês ausente, regra de dia útil ou dia 29–31; datas observadas válidas, inclusive bissextas, são usadas como fornecidas.
- O modo depende da conta selecionada. Todas as contas, conta sem datas suficientes ou sem intervalo cobrindo a referência deixam o modo indisponível, com motivo acessível no hover/foco. Mais de um cartão exige uma referência ainda não configurada nesta fatia; não escolher um silenciosamente.
- Trocar para uma conta que não oferece o ciclo ativo volta ao calendário **sem aviso**, conforme a resposta de Gabriel em D38.
- Cada modo conserva o intervalo consultado na execução quando ele continua válido. O saldo continua na referência do snapshot. Navegação de ciclos usa apenas os intervalos salvos; não inventa anterior/seguinte.
- Trocas de modo são temporárias. Não sobrescrever o campo de período padrão salvo ao mudar conta/moeda; a seção de preferência em Configurações ainda não foi implementada. Reabrir inicia o calendário nesta revisão.

## Exemplo do conjunto fictício

Referência 29/10/2026, conta Nubank: calendário 01/10–31/10/2026; salário 05/10–04/11/2026; cartão 03/10–02/11/2026. Só há duas datas previstas de salário no conjunto base, portanto um intervalo salarial completo. Os fechamentos até abril permitem navegar pelos ciclos conhecidos; não constituem integração bancária.

## Fronteiras da implementação

`application/finance-periods.ts` monta intervalos sobre datas explícitas. `domain/civil-date.ts` fornece dia civil vizinho, sem horário/fuso ou política de dia útil. `FinanceContext` mantém o modo/intervalo temporários e aplica o retorno de D38; componentes apenas apresentam e acionam esse contexto. Não há SQL ou cálculo financeiro central nos templates.

Os submenus ainda são estruturas sem seus indicadores, extratos ou faturas funcionais. Esta fatia não calcula consumo por ciclo, disponível diário, pagamentos, orçamento ou alocação de compras no dia do fechamento; fatos já vinculados à fatura não são reclassificados.

## Pendências preservadas

Configurar fontes e recorrências, geração em meses curtos/dias úteis, escolher referência entre vários cartões, regra de alocação de compras sem vínculo observado e composição da preferência de período padrão em Configurações. As fronteiras dos intervalos exibidos e o retorno silencioso ao calendário já foram respondidos; não perguntar novamente sem novas evidências.
