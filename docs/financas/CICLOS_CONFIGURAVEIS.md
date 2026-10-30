# F02b.3 — Fontes e referências dos ciclos

## Decisões confirmadas

- D44: ajustes por conta em Configurações → Finanças, abertos ao clicar na conta.
- D45: referência salarial por conta de recebimento e dia fixo mensal; recebimento efetivo é outro fato.
- D46: cartão de referência por conta, independente do cartão consultado no submenu.
- D37/D38 continuam definindo as fronteiras dos intervalos e o retorno silencioso ao calendário por conta incompatível. D42/D43 continuam definindo o período padrão na próxima abertura. Não repetir essas perguntas.

## Políticas confirmadas — segunda rodada

1. D47: dia 29–31 inexistente no mês usa o último dia disponível sem alterar o dia-base dos meses seguintes.
2. D48: fins de semana e feriados mantêm o dia civil, sem ajuste automático ou calendário externo.
3. D49: data prevista já confirmada prevalece no mês correspondente; gerar apenas onde faltar data, sem apagar ou substituir os fatos.

As três respostas foram recebidas e registradas; não repetir o levantamento.

## Composição e aplicação confirmadas — terceira rodada

- D50: grade de dias 1–31 e botões com finais dos cartões, com salvamento automático. Gabriel escolheu essa opção em lugar do botão Salvar ajustes proposto.
- D51: aplicação imediata após salvar com sucesso. Preferência do modo padrão continua com aplicação na próxima abertura (D43).
- D52: gerar a partir do ciclo atual e futuros, mantendo anteriores somente onde houver datas confirmadas. Não gerar receitas ou valores.

## Diagnóstico técnico

`SalaryExpectation` tem conta, data prevista e valor, mas não tem cadastro de fonte recorrente. `CashMovement` mantém data efetiva e vínculo opcional com salário. Não inferir o dia-base a partir do recebimento efetivo.

`Card` pertence a uma conta e `Invoice` traz cartão, fechamento e vencimento explícitos. O catálogo atual usa automaticamente o único cartão; com vários, fica indisponível. A nova referência deve ser validada contra os cartões da própria conta, sem recorrer a cartão de outra conta nem inventar fechamentos.

Preferências locais possuem leitura/fila compartilhada e contratos validados no processo privilegiado. A entrega evolui ao esquema/contrato v3, com migração transacional e referências por conta: dia, referência de ativação e cartão. Configurações não executa SQL. Conta/moeda/período, outros namespaces e fatos são preservados; testes somente em perfis temporários. A restauração demo preserva os ajustes, e referência removida fica indisponível, sem selecionar outro cartão.

## Limites desta entrega

Configurar as referências necessárias aos intervalos. Não gerar receitas, valores salariais, movimentos de caixa, faturas ou parcelas; não recalcular saldos ou reclassificar compras. Previsão de obrigações e detecção continuam em F12/F13. A configuração não autoriza integração real ou serviço de feriados.

## Critérios já estabelecidos

- Contas e cartões apresentados correspondem aos registros disponíveis; ausências e referências removidas não viram escolhas silenciosas.
- Ajustes mantidos após reabertura e sem perda das preferências existentes.
- Geração salarial segue D47–D52. Recebimento antecipado/atrasado não move a âncora prevista. Mais de uma data salarial distinta confirmada no mesmo mês bloqueia a geração com estado de ambiguidade; não escolher uma origem arbitrariamente.
- Seções por conta operáveis por teclado e sem encher o cabeçalho de controles.
- Testar regras de data, limites, migração/preservação, reabertura, falhas e seleção de cartão em perfis fictícios temporários quando a implementação estiver pronta.

## Resultado verificável

Configurações → Finanças → Ciclos por conta: abrir conta, selecionar dia ou cartão. Seleção só muda para o novo valor após confirmação da gravação; em falha, valor anterior permanece e a ação pode ser repetida. Ajustes salariais recalculam o catálogo imediatamente; modo indisponível retorna ao calendário sem aviso. Seleções de modo padrão seguem separadamente D43.

Validação efetiva e aprovação estão somente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md). Conteúdo das telas de extrato/faturas/cards permanece fora desta entrega.

Sem perguntas pendentes para este escopo. A regra guarda a referência de ativação para que reabrir não amplie retroativamente a geração. A navegação futura amplia os intervalos sob demanda, dentro dos limites de datas civis suportados. Banco de fatos permanece intacto.
