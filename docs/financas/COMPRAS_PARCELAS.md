# F09a — Compras e parcelas da fatura

## Objetivo e autorização

Em 23/11/2026, Gabriel aprovou a F08a com “Aprovado! Bora pra proxima”, autorizando seu registro e a próxima pequena entrega proposta. Em 24/11/2026, confirmou tabela compacta e expansão na própria lista (D158/D159), encerrando as escolhas de apresentação desta rodada antes da implementação dependente. Aprovação, execução e verificações efetivas ficam exclusivamente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

Base: especificação de Finanças §9.1/9.3/9.4; FIN-014/028/029; cenários C04/C06/C07/C20; D24/D33/D46 e contexto da F08a. A composição por categoria D157 já pertence à entrega anterior. Estornos, evolução/comparações e demais análises continuam em fatias próprias da F09; cadastro/edição/importação de compras não estão incluídos nesta proposta de consulta.

## Decisões confirmadas já aplicáveis

- Compras/parcelas ficam abaixo da carteira e fatura. A consulta acompanha o cartão e a fatura selecionados e preserva o contexto global/referência de Configurações (D46).
- D24: valor da parcela por fatura é o padrão. Compra de R$ 1.200 em seis vezes contribui com R$ 200 nesta fatura; total contratado permanece distinguido nos detalhes. Pagamento da fatura não vira outro consumo.
- Expandir compra mostra suas parcelas ao longo das faturas. Preservar compra original, índice/quantidade, valores exatos e datas salvas; diferenciar agenda conhecida de cobrança futura confirmada.
- Datas civis e moedas originais preservadas. Conversão somente para apresentação, identificada conforme D33. Ausência não vira zero e valores incompatíveis não produzem subtotal parcial enganoso.
- Demonstração local com referência 29/10/2026, sem pagamentos, integração real ou geração de ciclos ausentes.

## Diagnóstico técnico local

Leitura de código e fixtures em 23/11/2026, sem operações nos bancos normais:

- `Purchase` já contém cartão, data da compra, total original, quantidade de parcelas, cobertura da agenda, categoria, estabelecimento, assinatura e origem. Não contém descrição livre da compra; não inventar um texto descritivo vindo da instituição.
- `InvoiceItem` informa compra, fatura, número e valor exato da parcela, com natureza observada. `Invoice` informa fechamento, vencimento e situação salva. O snapshot existente permite consulta sem novo IPC ou esquema.
- `validateFacts` verifica vínculos, moeda, número de parcela único por compra e limites da agenda. Cobertura completa exige todas as parcelas e soma exata; parcial admite lacunas. A tela precisa conservar essa distinção, não completar dados por inferência.
- O cartão 0000 tem novembro com Loja R$ 200,00 (1/6), Netflix R$ 49,90 (à vista) e Loja R$ 33,34 (1/3), somando R$ 283,24 conhecidos. Os dois itens Loja pertencem a compras distintas e não devem ser unidos por estabelecimento.
- Compra de R$ 1.200: seis parcelas observadas de R$ 200,00, de novembro/2026 a abril/2027. Compra de R$ 100,00: R$ 33,34 / R$ 33,33 / R$ 33,33 em novembro/dezembro/janeiro. Não é necessário um gerador ou nova distribuição de centavos para exibir essas agendas.
- O cartão 1111 tem compra própria de R$ 89,90 em novembro e fatura de dezembro sem itens conhecidos. Outubro do 0000 é pago, com três compras e vínculo de pagamento separado no caixa.
- `CategoryStore` compartilha nomes/ícones/cores e estabelecimentos. Classificações de despesas de conta não reclassificam compras de cartão; gestão de classificação dessas compras mantém escopo próprio.
- `cardInvoices` já seleciona faturas e subtotais por cartão/conta; `CardConsultation` guarda a consulta da execução, separada das preferências. A consulta de compras poderá reutilizar esses contratos sem alterar os fatos.
- O modelo atual não possui fatos de estorno de compra do cartão. A variante C08 é estorno de despesa da conta e não comprova esse suporte. Tratamento de estornos do crédito e sua alocação exigem fatia/levantamento próprios; esta consulta não deve fabricar ajustes para reconciliar totais.
- Não foi selecionada dependência nova ou integração externa. O diagnóstico desta rodada é local; não há pendência de compatibilidade externa para decidir a apresentação e a expansão.

## Alternativas apresentadas no levantamento

1. **Lista de compras:** tabela compacta em largura disponível abaixo da carteira/fatura, com data da compra, estabelecimento, categoria, parcela e valor nesta fatura alinhado à direita. Recomendada para comparação com menor altura. Alternativa apresentada: cards individuais na mesma área, com mais espaço por compra e maior comprimento da página. As duas opções acompanham o cartão/fatura consultados.
2. **Detalhes e agenda:** expandir na própria lista, uma compra por vez, com total contratado, origem e parcelas por mês/índice/valor/situação. Recomendada para manter o contexto visível. Alternativa: janela flutuante com as mesmas informações, que precisa ser fechada para retornar à lista. A expansão é temporária e não altera o valor ou a fatura.

Exemplo proposto para os detalhes: R$ 1.200 contratados, R$ 200 nesta fatura e cinco parcelas/R$ 1.000 em “Após esta fatura”. Esse rótulo identifica o recorte e não chama R$ 1.000 de dívida total, pois a parcela atual pode ainda estar em formação ou não paga. Em agenda parcial, mostrar somente o posterior conhecido e identificar a incompletude. Não inferir quitação pelo fim da agenda.

As duas opções recomendadas foram confirmadas em 24/11/2026. A metodologia padrão D24 permanece preservada.

## Respostas confirmadas e critérios de aceitação — D158/D159

Gabriel confirmou “Tabela compacta e expansão na lista (recomendado)” em 24/11/2026. As duas escolhas anteriores estão respondidas. Critérios registrados antes da implementação dependente:

1. Tabela abaixo da carteira/fatura, em largura disponível: data da compra, estabelecimento, categoria, parcela/quantidade ou À vista e valor nesta fatura alinhado à direita. Cada item mantém seu vínculo/ID; compras iguais no mesmo estabelecimento não se fundem. Sem descrição inventada. Colunas se adaptam na largura estreita sem corte horizontal da página.
2. Consulta somente leitura da conta/cartão/fatura selecionados. Primário é o valor do item desta fatura (D24), sem incluir o total contratado ou pagamento novamente. Categoria e estabelecimento usam os metadados compartilhados; moedas/conversão seguem D33, com originais identificados. Fatura sem itens não vira gasto zero; diferença para total confirmado é identificada sem ajuste inventado.
3. Uma compra expandida por vez, com botão acessível, Enter/espaço e Escape retornando ao acionador sem salto de rolagem. Detalhes: compra original/data/total/origem, valor nesta fatura, agenda ordenada pelo número da parcela, datas e situação salva das faturas, destaque da fatura consultada. Trocar conta/cartão/fatura recolhe a expansão; trocar moeda preserva a compra aberta.
4. “Após esta fatura” soma somente itens conhecidos da mesma compra vinculados a faturas com vencimento posterior ao consultado. Exemplo de novembro: compra R$ 1.200 em 6x tem cinco parcelas/R$ 1.000 após a atual. Esse recorte não é dívida total ou saldo a pagar. Fatura atual não paga permanece separada.
5. Agenda completa preserva soma/centavos e término informado pelos vínculos salvos. Agenda parcial mostra quantidade conhecida, lacunas e posterior conhecido; último vencimento conhecido não é término confirmado. Sem parcelas posteriores conhecidas não significa quitação. Zero conhecido, ausência e precisão indisponível permanecem distintos.
6. Dados inválidos, conta/cartão incompatíveis ou soma fora da precisão são recusados/identificados sem total parcial enganoso. Nenhuma alteração de fatos, preferências, layouts, schema, seed ou IPC. Estornos/rotativo/antecipação complexa, cadastro/edição de compras e demais análises mantêm entregas próprias.

## Implementação

**Revisão D160, solicitada em 24/11/2026, critérios registrados antes do ajuste:** diminuir a altura do painel da fatura por espaçamentos/padding menores entre os blocos. Preservar valor em destaque, datas, categorias, limites, navegação e áreas de interação. Painel usa altura natural, inclusive quando a carteira é mais alta; janela estreita/conversão/estados sem itens continuam sem corte. Tabela e detalhes de compras mantêm sua composição.

`application/invoice-purchases.ts` consulta os vínculos salvos, reutilizando a validação e o subtotal de `cardInvoices`. Mantém cada item da fatura, ordena compras por data decrescente e agendas por índice. O posterior conhecido usa vencimentos estritamente posteriores, inclusive quando uma compra tem mais de um item na fatura atual. Nenhuma mutação, novo esquema, IPC, fixture ou dependência.

`fd-invoice-purchases` ocupa a largura abaixo da carteira/fatura. Uma expansão temporária mostra total contratado, recorte atual/posterior, origem, término conhecido e agenda. Em largura estreita, categoria passa para baixo do estabelecimento. Fatura sem itens mostra ausência, não zero. Troca de conta/cartão/fatura recolhe; moeda mantém a compra aberta, com originais e cotação fictícia identificados. Escape retorna ao acionador com `preventScroll`; o navegador continua limitando a rolagem ao tamanho existente da página após recolher.

## Validação pertinente

Consulta pura por conta/cartão/fatura e compra, parcelas inteiras/exatas, fontes distintas, moedas, cobertura parcial, falta de dados, divergência entre itens/total confirmado e ausência de dupla contagem do pagamento. Interface Electron: composição escolhida, expansão/retorno, teclado, contexto e valores preservados, troca de faturas/cartões, futuras sem itens e janela estreita. Somente perfis temporários. Resultados efetivos registrados em PROJECT_STATUS.
