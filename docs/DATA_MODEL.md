# Modelo de dados

**Ainda não existe banco ou esquema financeiro implementado.** A casca não deve ser confundida com o MVP local.

## Ampliação de requisitos de Finanças

A [especificação de Finanças](FINANCAS_SPEC.md) exige ainda categorias/estabelecimentos e regras manuais, compromissos avulsos e séries recorrentes com ocorrências, assinaturas mensais/anuais e histórico, salário previsto confirmado, vínculos de pagamento/conciliação, cobertura temporal da fonte, sugestões confirmáveis, orçamentos/alertas e preferências de período/layout por área. São conceitos requeridos, sem esquema ou entidades de código adotados nesta F00.

Preservar a distinção entre origem e personalização, previsão e fato, cobrança no cartão e desembolso da fatura. F01a registra o [catálogo fictício](financas/CENARIOS.md) e a proposta abaixo, antes das fixtures executáveis. SQLite foi confirmado em D23 após comparação com MySQL; driver, local de armazenamento e separação/restauração continuam pendentes. Ver [ADR 0002](adr/0002-sqlite-local-proposto.md).

## Contrato existente

`FinDesk-Project/shared/desktop-api.ts` define uma operação sem argumentos, `getRuntimeInfo()`, que retorna `appVersion` e `platform`, ambos strings. É um DTO de ambiente, sem valores financeiros, identificadores pessoais, caminhos de arquivo ou credenciais. O preload expõe somente essa operação. O processo principal valida origem, frame, remetente e argumentos.

`FinDesk-Project/shared/product.ts` centraliza nome, descrição, etapa textual e referência ao símbolo escolhido. A decisão de identidade está registrada na documentação e no código; não há seletor de logo ou persistência de preferências nesta versão.

## Entidades futuras já exigidas pelas fontes

- Instituição, conta, moeda e movimentação com origem rastreável.
- Compra de cartão, parcelas vinculadas, fatura, fechamento/vencimento, pagamento integral e estorno vinculado.
- Ativo, classe, moeda, posição, avaliação com data e movimentos de compra/venda/aporte/retirada/rendimento/taxa/tributo conhecido.
- Condições específicas de CDB (indexador, taxa e vencimento), sem impor o modelo de cotas dos ETFs a todos os instrumentos.
- Cotação cambial com par, valor, data e natureza histórica/atual.
- Conexão futura com estados, tentativas, sucesso e informação de atualização efetiva quando disponível.
- Dados de origem e personalizações separáveis para preservar categorias/anotações durante atualizações.

Precisão monetária, quantidades fracionárias, datas civis, chaves de idempotência, migrações e retenção serão definidos junto dos casos de uso. Não usar `number` financeiro sem uma política explícita de precisão/limites; não converter desconhecido em zero.

Na próxima entrega de persistência, revisar o [ADR SQLite](adr/0002-sqlite-local-proposto.md), discutir os comportamentos de dados e registrar critérios antes de criar esquema e seed. Fixtures fictícias reproduzíveis serão versionadas; bancos pessoais não.

## Proposta técnica F01a — dinheiro, datas e contratos

Esta seção é proposta do Codex para a revisão da F01a, não código, esquema SQL ou biblioteca escolhida. Regras de negócio confirmadas ficam em DOMAIN_RULES; o detalhamento visual continua na especificação.

| Conceito           | Representação proposta                                                                                                                                                  | Validação/implicação                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quantia BRL/USD    | Inteiro em centavos e moeda explícita, sem usar reais/dólares fracionários como armazenamento.                                                                          | Number.isSafeInteger na entrada e nas somas/intermediários; rejeitar NaN, infinito, frações de centavo e ultrapassagem do intervalo seguro. Não usar toFixed como correção da aritmética.                               |
| Limite técnico     | Até ±9.007.199.254.740.991 unidades mínimas, reduzido por limites específicos de campos quando necessário.                                                              | É limite de representação, não limite de gasto nem suporte irrestrito de qualquer valor. Operações devem recusar excesso antes de perder precisão; leitura de inteiro maior do banco também deve falhar explicitamente. |
| Sinais             | Saldo pode ser negativo; delta de movimentação tem sinal na perspectiva da conta; total da compra/parcela/obrigação é magnitude não negativa, tipo define sua natureza. | Não guardar sinal e direção contraditórios nem transformar pagamento em nova compra. Estorno é fato tipado/vinculado, não edição destrutiva do original.                                                                |
| Ausência           | Valor ausente com motivo/estado explícito, separado de quantia conhecida igual a zero.                                                                                  | Não permitir que soma reduza desconhecido a zero; total informa sua cobertura/incompletude.                                                                                                                             |
| Taxas/câmbio       | Decimal textual ou razão exata, par, data, fonte e natureza fictícia/estimada; preservar o original.                                                                    | Não escolher biblioteca decimal nesta etapa. Multiplicação/divisão exige estratégia exata e arredondamento declarado; sem taxa não converter.                                                                           |
| Datas civis        | Texto validado YYYY-MM-DD, com aritmética de calendário sem conversão acidental para UTC.                                                                               | Validar mês/dia/ano bissexto; compra, lançamento, liquidação, competência, fechamento e vencimento são campos distintos. Data inválida não é normalizada silenciosamente.                                               |
| Instantes técnicos | Timestamp com offset/UTC para tentativa, sucesso, coleta e modificação; não substituir datas civis.                                                                     | Exibição no fuso declarado; fixtures usam relógio injetável/congelado.                                                                                                                                                  |
| Período            | Modo + início/fim + fonte da definição, visíveis.                                                                                                                       | Mês calendário tem primeiro/último dia; fronteiras de salário/fechamento/horário e dias úteis não são deduzidas dessa estrutura.                                                                                        |

O [ECMAScript define o maior inteiro seguro](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.max_safe_integer). A proposta usa sua restrição explicitamente; operações de taxa não ficam automaticamente seguras por os valores iniciais serem inteiros.

Para um gerador futuro de parcelas, propor quociente inteiro e distribuir os centavos restantes nas primeiras parcelas: 10.000 → 3.334/3.333/3.333. Cronograma observado na fonte prevalece sobre o gerado. Isso não define fechamento nem mês da primeira parcela. Para exibição de equivalentes/médias, propor arredondar para o centavo mais próximo, com empate afastando de zero, apenas na fronteira de exibição; preservar numerador/denominador para não transformar um equivalente em cobrança. Essas propostas serão concretizadas e testadas em F01b/F09 conforme o escopo, sem aplicar a quantidades/cotações de investimentos.

### Contrato conceitual dos primeiros cenários

- **Contexto fictício:** ID/versão do conjunto, data de referência/fuso, ambiente demonstração e variantes explícitas. Não é um perfil pessoal real.
- **Conta/saldo:** instituição/conta, moeda, saldo inicial/observado e data da observação. Saldo inicial não é receita do período.
- **Movimentação:** ID estável, conta, moeda/delta, tipo, descrição, categoria opcional, estabelecimento e datas pertinentes. Origem manual/arquivo/integração com ID externo quando existir; em fixtures, essas origens são simuladas.
- **Vínculos:** contraparte da transferência, compra original/parcela/fatura/pagamento/estorno, ocorrência prevista e associação ao fato. ID compartilhado descreve o evento econômico sem gerar outro débito de caixa.
- **Cobertura:** conta/fonte, intervalo conhecido, última tentativa/sucesso e estado. Não usar última tentativa como prova de dados atualizados, nem um intervalo como cobertura de todas as contas.
- **Personalização:** categoria/anotação/regra manual separada do dado de origem; atualização preserva override. Alterações têm alcance explícito.
- **Expectativa de cenário:** fatos e resultados invariantes separados dos cálculos condicionados a decisões abertas. Seed/banco não são o formato de transporte da interface.

Aceitação proposta para F01b: valores/datas validados, somas por moeda e limites explícitos, agenda observada de parcelas somando a compra, vínculos sem duplicação, fonte/cobertura e variantes determinísticas. Nenhum calendário bancário, disponibilidade diária, parser ou motor de recorrência será inventado para concluir essa base.
