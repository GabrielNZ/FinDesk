# Modelo de dados

**Ainda não existe banco ou esquema financeiro implementado.** A casca não deve ser confundida com o MVP local.

## Ampliação de requisitos de Finanças

A [especificação de Finanças](FINANCAS_SPEC.md) exige ainda categorias/estabelecimentos e regras manuais, compromissos avulsos e séries recorrentes com ocorrências, assinaturas mensais/anuais e histórico, salário previsto confirmado, vínculos de pagamento/conciliação, cobertura temporal da fonte, sugestões confirmáveis, orçamentos/alertas e preferências de período/layout por área. São conceitos requeridos, sem esquema ou entidades de código adotados nesta F00.

Preservar a distinção entre origem e personalização, previsão e fato, cobrança no cartão e desembolso da fatura. O catálogo fictício e a proposta de contratos serão levantados em F01a, antes das fixtures executáveis. SQLite/MySQL, driver, local de armazenamento e separação/restauração da demonstração dependem de comparação e decisão conjunta antes da persistência; o ADR não é adoção já concluída.

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
