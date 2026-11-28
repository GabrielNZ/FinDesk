# F09f — Estornos de compras do cartão

Levantamento em **28/11/2026**. Continuidade autorizada por Gabriel ao aprovar a F09e. Este documento distingue propostas de decisões; não autoriza presumir respostas.

## Objetivo e fontes

Rastrear estorno observado de compra do cartão, mantendo compra original, origem e fatura em que o crédito aparece. FINANCAS_SPEC §9.3 inclui estornos básicos; COMPRAS_PARCELAS registra que o modelo atual ainda não os representa. CENARIOS/C08 descreve devolução em caixa de uma despesa: não comprova nem define crédito de cartão. Não aplicar sua entrada de caixa a uma fatura.

## Diagnóstico técnico concluído

- FinanceFacts não tem fatos de estorno. InvoiceItem representa parcela positiva, com número único e agenda validada contra o total contratado. Inserir parcela negativa ou alterar a compra destruiria essas invariantes.
- O agregado persistido usa formatVersion 1, seed v3 e parser de chaves estritas. Uma ampliação precisa de leitura compatível/versionada, atualização atômica e idempotência, preservando dados anteriores, classificações, preferências e layouts. Nunca resetar a demo para migrar.
- cardInvoices, composição por categorias/estabelecimentos, compras, evolução, variação e futuro usam os itens positivos. Será necessário distinguir compras brutas, créditos e líquido conhecido; barras proporcionais atuais não representam valores negativos.
- Os relatórios atuais de Despesas consultam movimentos efetivos da conta. Crédito somente na fatura não pode ser inserido como receita ou despesa de caixa. A visão de gastos por fatura deve usar os fatos vinculados sem duplicar o pagamento.
- Limites têm fonte própria. Não inferir alteração de utilizado/disponível a partir do crédito.
- Precisão, datas, moeda original e ausência distinta de zero continuam obrigatórias. Conversão apenas na apresentação, uma vez por agregado; total confirmado permanece informação da fonte.

## Decisões confirmadas — D176/D177

1. **Metodologia confirmada:** crédito ligado à compra original, alocado somente na fatura em que foi registrado, com data e origem. Preservar faturas anteriores e parcelas futuras; cancelamento de parcelas exige fato/regra próprios. Não gerar entrada de dinheiro em conta nem recalcular limites por inferência.
2. **Exemplo confirmado:** crédito fictício observado de R$ 50 em novembro, datado de 28/10/2026, ligado à compra Loja de R$ 1.200 em seis parcelas. Compras R$ 283,24, estornos R$ 50 e líquido conhecido R$ 233,24. Futuro posterior a novembro continua R$ 1.066,66. Atualização versionada/idempotente, preservando fatos anteriores, preferências e layout.

As duas escolhas foram respondidas nas caixinhas antes da implementação independente. A segunda rodada também foi respondida antes da interface/integração. Nenhuma pergunta continua pendente; as caixinhas foram mantidas abertas durante a espera, conforme a preferência de Gabriel.

## Composição confirmada — D178/D179

1. Confirmado: líquido grande na Fatura, linha compacta de compras brutas/estornos quando existirem; estorno como linha negativa identificada na tabela, expansão com data/origem/compra original, filtro de estabelecimento incluindo seus créditos e subtotal líquido. Barra de composição mostra compras brutas explicitamente, sem misturar negativos nas proporções. Preservar painel compacto, animação e rolagem na página.
2. Confirmado: evolução/variação/futuro usam líquido registrado (total confirmado prioritário onde já aplicável); créditos excedentes permanecem negativos, com barras abaixo de zero e sem transferência presumida. Variação percentual somente contra base positiva; diferença monetária continua. Novembro R$ 233,24 versus outubro R$ 260: −R$ 26,76/−10,3%, parcial.

## Critérios técnicos independentes da composição

Critérios técnicos a concretizar conforme a metodologia: IDs/origens e vínculo de compra/cartão/fatura válidos; moeda e data coerentes; duplicação recusada; limites de valor e comportamento de múltiplos créditos explícitos; leitura legada, reabertura, idempotência e rollback em perfis temporários. Preservar expansão suave, teclado, movimento reduzido, arraste/resize e rolagem na página. Sem formulário de cadastro/importação ou integração real presumidos nesta entrega.

O contrato básico representa devolução de principal: magnitude positiva, soma dos estornos por compra até seu valor original, vínculo ao mesmo cartão, data não anterior à compra e origem externa única por cartão/fonte. Excedente de principal, juros e correções não são classificados como estorno básico. A leitura pode resultar em crédito líquido maior que as compras daquela fatura sem violar o limite da compra original; não cancela parcelas por inferência.

## Estado

Domínio independente implementado sob D176: fato CardRefund separado e leitura exata de bruto/crédito/líquido; fato legado sem coleção continua válido. Persistência sob D177: agregado formato 2/seed 4, parser estrito aceitando legado formato 1/seeds 1–3 e atualização atômica/idempotente; sem mudança de schema SQLite, IPC ou preferências. Exemplo adicionado somente pelo fluxo versionado, preservando compra, agenda, caixa e demais tabelas.

Interface e leituras integradas sob D178/D179: líquido na Fatura/tabela/evolução/variação/futuro, composição bruta explícita, linha negativa com data/origem/vínculo e agenda preservada. Filtro de estabelecimento inclui créditos; detalhes continuam suaves com altura natural/rolagem na página. Evolução usa eixo assinado quando necessário; futuro conserva barras horizontais na base positiva e usa colunas com zero central quando há crédito negativo. Total confirmado preserva autoridade, inclusive crédito em fatura não paga; liquidação de crédito exige tratamento próprio. Percentual apenas contra referência positiva. Chaves visuais distinguem as coleções de compras e estornos, sem mudar IDs da fonte.

Passaram **220 testes Node** da suíte, incluindo cinco novos de domínio, seis de aplicação e três de persistência/worker. Nove testes Electron em oito fluxos passaram nas rodadas pertinentes: estornos (dois cenários), futuro, carteira, evolução, organização, estabelecimentos, compras e animação. Builds domínio/desktop/web, tipos/templates/ferramentas e lint/formatação pertinentes passaram. Capturas ampla/estreita, detalhe original e gráficos de crédito negativo inspecionados. Rodadas corrigiram expectativas antigas de valores/contagens e a captura estreita passou a esperar a largura após resize; nenhuma mudança nos tamanhos salvos. Todos os testes/falhas em perfis temporários. App normal reiniciado pelo fechamento normal para carregar a atualização autorizada, sem restauração/teste de falhas. Entrega aguarda aprovação, sem commit/push novo.
