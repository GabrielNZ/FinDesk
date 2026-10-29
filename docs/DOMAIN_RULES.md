# Regras financeiras

As regras originais estão no [mestre](references/01-DOCUMENTO_MESTRE.md), especialmente seções 10 a 14 e 16. Esta casca ainda não implementa cálculos financeiros.

Para Finanças, a [especificação vigente](FINANCAS_SPEC.md) detalha e prevalece sobre sugestões antigas conflitantes. Confirmados: saldo atual distinto de resultado; salário previsto fora do caixa até receber; disponível conceitual = saldo de hoje − obrigações não pagas no horizonte − protegido; assinatura anual com equivalente mensal separado do desembolso integral; obrigação de cartão descontada uma única vez; vencidos preservados e ausência de cobrança condicionada à cobertura.

As seções 6, 7, 8 e 11–16 mantêm pendentes o método padrão de gasto, fronteiras dos ciclos, dias/atraso salarial, protegido global/por conta, conciliação manual, critérios de detecção, comparação histórica e inativação manual. Três dias, 80%/100% e médias de três cobranças/períodos são propostas numéricas, conforme a ressalva da seção 21. Não implementar esses parâmetros como decisões confirmadas. [F00](FINANCAS_F00.md) organiza quando levantar cada grupo; a rastreabilidade detalhada fica proposta para F01a.

- **Precisão:** dinheiro com centavos inteiros ou decimais controlados; quantidades e preços com precisão própria; arredondamento explícito nas fronteiras. A representação exata será escolhida na entrega de domínio.
- **Datas:** distinguir compra, lançamento, liquidação, competência, fechamento, vencimento e sincronização. Datas civis não mudam de dia por fuso.
- **Transferências:** contas próprias não geram receita ou despesa consolidada. Custos são separados.
- **Cartão:** consumo contratado e parcelas mensais são visões distintas, com alternância explícita. Pagamento de fatura não duplica consumo. Parcelas somam a compra e preservam o vínculo; distinguir observadas de estimadas. Estorno mantém rastreabilidade.
- **Investimentos:** aporte não é rendimento; compra não é consumo; venda/resgate não é automaticamente rendimento. Identificar juros/dividendos e evitar duplicação no reinvestimento.
- **Moedas:** preservar valores originais. Conversões identificam cotação, data e natureza atual/histórica. Não somar BRL e USD diretamente; sem cotação, mostrar por moeda ou indisponibilidade.
- **Histórico e patrimônio:** ausente não vira zero. Identificar cobertura e data. Não inventar operações para fechar totais nem contar carteira duas vezes. Indicadores explicitam contas, posições e obrigações incluídas.
- **Rentabilidade:** variação de saldo não basta; metodologia e fluxos precisam ser definidos. História incompleta exige limitação clara.
- **Simulações:** cenários hipotéticos, com aporte no momento declarado, taxas efetivas corretamente convertidas, taxa zero, limites, valores nominais/reais e resultado bruto/líquido explícitos. Não incluir impostos sem modelo acordado nem alterar posições reais.
- **Conciliação:** preferir identificadores externos; possíveis coincidências ambíguas precisam de revisão. Preservar personalizações e não apagar histórico por omissão de uma resposta.

Metodologias e limites ainda abertos serão apresentados ao proprietário antes dos cálculos dependentes. Não há fórmulas aprovadas por implementação nesta entrega.
