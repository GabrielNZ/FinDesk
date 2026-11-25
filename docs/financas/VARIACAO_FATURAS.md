# F09c — Variação entre faturas

## Objetivo e autorização

Gabriel aprovou a F02c/F09b até D166 e autorizou a próxima pequena entrega em 24/11/2026. Esta fatia propõe mostrar a diferença monetária e percentual da fatura selecionada em relação a uma referência do mesmo cartão (§9.4/FIN-030). Aprovação, execução e verificações efetivas ficam exclusivamente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

Gabriel confirmou as duas escolhas em 24/11/2026: primeira alternativa para a metodologia (valores conhecidos com identificação Parcial) e **Imagem 1** para a posição (Evolução das faturas). Respostas recebidas antes da implementação dependente; nenhuma pergunta desta rodada permanece aberta. Usar as caixinhas de pergunta assíncronas nas próximas rodadas, conforme preferência expressa.

## Base confirmada aplicável

- D24: itens/parcelas por fatura, sem somar compra contratada e pagamento como consumos adicionais.
- D162/D163: consulta da fatura compartilhada entre painel, evolução e compras, sem rolar a página ou alterar o período global.
- D164–D166: cards organizáveis, tamanhos/posições próprios salvos e proporções padrão aprovadas. Não adicionar ou reordenar cards por consequência de um indicador.
- Total confirmado, valor conhecido e ausência continuam distintos. Fatura em formação/futura não comprova redução definitiva ou cobrança confirmada.
- D33: moeda original preservada e conversão somente para apresentação. Ausência/precisão indisponível não viram zero.

## Diagnóstico técnico local — 24/11/2026

Leitura de documentos, código e fixtures; sem escrita nos bancos normais:

- `cardInvoices` fornece vínculo de cartão/conta, estado, vencimento/fechamento, total confirmado e subtotal conhecido seguro. `invoiceEvolution` já prioriza `confirmedTotal ?? knownSubtotal`; os mesmos fatos permitem a comparação, sem nova fonte, IPC, schema, seed ou dependência.
- A consulta da execução já guarda a fatura selecionada; mudar a seleção pode atualizar o indicador junto do gráfico. Não é necessário salvar mais uma preferência para a referência imediatamente anterior proposta.
- Há sete faturas salvas no cartão 0000. Outubro/2026 é pago, com R$ 260,00 confirmados e sem fatura anterior disponível. Novembro está em formação, com R$ 283,24 conhecidos. Dezembro/janeiro têm R$ 233,33 conhecidos; fevereiro/março/abril, R$ 200,00 conhecidos. A referência fictícia continua em 29/10/2026.
- Comparação nominal proposta: novembro versus outubro dá +R$ 23,24 / +8,9%; dezembro versus novembro dá −R$ 49,91 / −17,6%. Ambos seriam provisórios, porque há valor conhecido ainda não confirmado. Janeiro versus dezembro dá R$ 0,00, também provisório; igualdade dos itens conhecidos não comprova estabilidade do valor final.
- Cartão 1111: novembro tem R$ 89,90 conhecidos e nenhum anterior; dezembro não tem itens/total confirmado. Os dois casos precisam de estado indisponível adequado, não percentual zero inventado.
- Não há dois totais confirmados consecutivos na demonstração atual. A alternativa de comparar somente confirmadas mostraria indisponibilidade nesses exemplos; não acrescentar histórico fictício por conta própria para preencher o indicador.
- `expense-analysis.ts` já usa inteiros/BigInt para diferença percentual, uma casa e ausência de percentual com base zero. Essa aritmética é reutilizável como padrão de precisão; a metodologia de comparar períodos de caixa não define automaticamente a regra das faturas.
- Faturas distintas podem ter o mesmo mês e até datas coincidentes. Não agregar por mês ou usar desempate por ID como evidência de qual é a anterior. Se a referência não for inequívoca, identificar a ambiguidade, em vez de inventar um vínculo temporal.
- Cabe uma linha compacta junto ao resumo do card Evolução. O gráfico já cresce/encolhe com o card; a comparação não precisa alterar o tamanho/posição salvos ou acrescentar outro card. A alternativa na Fatura consome mais espaço no painel recém-compactado.

## Decisões confirmadas — D167/D168

1. **Referência e dados provisórios:** comparar a fatura selecionada com a imediatamente anterior do mesmo cartão, por vencimento, usando a base já exibida (confirmado quando informado; senão conhecido). Quando qualquer lado ainda não tiver total confirmado, marcar a comparação como Parcial, com apresentação neutra e referência explícita; não chamar uma diferença negativa de economia definitiva. Novembro contra outubro: +R$ 23,24 / +8,9% Parcial. A alternativa de somente confirmadas não foi escolhida.
2. **Local:** linha compacta no card Evolução das faturas, abaixo do resumo selecionado e antes da legenda, por exemplo “+R$ 23,24 · +8,9%”, com referência “vs out. de 2026 · Parcial”. A seleção pelo gráfico/setas continua sincronizada e sem rolagem. Preservar altura e personalizações; o gráfico usa o espaço restante. A alternativa na Fatura não foi escolhida.

As prévias foram geradas independentemente a partir de uma captura da aplicação em perfil temporário, sem editar o aplicativo. Ordem exibida: Imagem 1 em Evolução (`exec-305c3c99-395f-4540-84f6-aee7042146ba.png`, escolhida); Imagem 2 em Fatura (`exec-e3a34198-fb7a-4b53-b7e3-a9c3f4888a38.png`). Arquivos em `C:/Users/gabri/.codex/generated_images/01a20a7a-a96e-75d2-916d-8aed72c6a546/`. São estudos visuais, não evidência de funcionalidade já implementada.

## Critérios de aceitação antes da implementação

Diferença = selecionada − referência. Percentual = diferença / referência × 100, com uma casa para apresentação e intermediários exatos. Referência original zero mantém a diferença monetária, mas o percentual fica Sem base percentual; ausência é diferente de zero. Calcular com a moeda original comum do cartão e converter a diferença uma única vez para apresentação, preservando originais/cotação; percentual não deriva de valores convertidos já arredondados. Identificar mês/ano reais da referência e manter vencimento exato acessível, sem dizer “mês anterior” por engano em lacunas. Sem anterior, valor ausente, referência ambígua ou precisão/conversão indisponível ficam explícitos. Não usar ID ou fechamento como desempate financeiro de vencimentos coincidentes.

## Escopo delimitado

Comparação nominal entre duas faturas. Não projetar o valor final de uma fatura aberta, anualizar gastos, aplicar equivalência de dias, atribuir causas por categoria/estabelecimento ou misturar contratado com recorrência prevista. Essas análises, estornos e cadastro/edição de compras mantêm suas fatias próprias. Não alterar dados, layouts salvos ou períodos para produzir a comparação.

## Implementação e validação

**Revisão D169 — critérios anteriores ao código:** Gabriel mostrou a dica fixa no canto esquerdo e pediu que acompanhasse a barra consultada, acima dela. Usar o centro horizontal e topo reais da barra (ou marcador de ausência/zero), com contenção nas bordas do card. Recalcular no hover/foco, alteração de conteúdo/moeda, resize e rolagem horizontal interna. Preservar Escape e teclado; nenhuma alteração dos valores, seleção, dimensões salvas ou contexto global. Implementação e verificações serão registradas no estado único.

`application/invoice-variation.ts` mantém a consulta pura por conta/cartão/fatura, com vínculo temporal inequívoco, subtração monetária segura e percentual por BigInt. A apresentação em `invoice-evolution` acompanha a seleção existente, mostra referência/Parcial, original quando convertido e indisponibilidades específicas. A linha pode quebrar conforme a largura; o gráfico absorve o espaço mantendo o tamanho salvo do card. Vencimento exato da referência disponível na dica nativa e no texto acessível.

Cinco testes Node cobrem método, sinal/arredondamento, zero versus ausência, meses/anos/lacunas, faturas coincidentes, precisão e moeda/conversão, além das regressões existentes. Fluxo Electron da evolução ampliado para a F09c, com comparação/estados, seleção sincronizada, sem rolagem e alturas iguais; fluxo de organização reutilizado para arraste/resize/foco/teclado/reabertura/restauração. Todas as verificações usam perfis temporários. Evidências efetivas e situação de revisão exclusivamente no PROJECT_STATUS; comparação visual em [design-qa.md](../../design-qa.md).
