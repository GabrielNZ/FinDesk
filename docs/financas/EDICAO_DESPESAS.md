# F06b — Edição local de despesas manuais

## Base e continuidade

Continuidade autorizada em 07/11/2026 após a apresentação/aprovação da F06a. Fontes: FIN-042 / especificação de Finanças §14.1, precisão/origem em §15 e decisões D109–D116. Estado, aprovação e verificações efetivas ficam somente em PROJECT_STATUS.

Primeira fatia proposta: editar uma despesa de caixa cadastrada manualmente no FinDesk, na demonstração atual. Não ampliar para fatos de arquivo/integração, outros tipos financeiros, compras/parcelas, recorrências, exclusão, alteração em lote ou dados reais. Referência fixa e limites de datas D116 continuam válidos; não repetir esse levantamento.

## Diagnóstico antes das escolhas

- O fato possui ID estável, origem, conta/data/valor/descrição e estabelecimento/categoria. Cadastros da F06a têm origem `manual` / `findesk-manual-demo` e recibo em `expense_requests`. A elegibilidade da edição precisa ser validada no lado privilegiado, não apenas pela presença de um lápis no renderer.
- Não existe comando de edição de fatos na ponte. `createExpense` só cria ou devolve o resultado de uma solicitação repetida; reutilizá-lo com outro payload é recusado e não pode ser usado para editar. Edição precisará de operação específica com contrato fechado, proteção contra estado obsoleto e repetição.
- Recibo de criação contém o comando original e o ID criado. Deve continuar intacto: repetir a solicitação original depois de editar não pode recriar o movimento nem desfazer a edição. Fonte/ID/primeira entrada também precisam ser preservados.
- Saldo é derivado dos movimentos na moeda da conta até snapshot.asOf. Trocar conta precisa retirar o débito da origem e aplicar no destino num único salvamento. O domínio exige moeda compatível com a conta; mover a magnitude de BRL para USD silenciosamente reinterpretaria dinheiro. A opção de troca está em levantamento antes da implementação dependente.
- Categoria efetiva pode vir de override individual, atribuição congelada de uma regra ou fonte. Editar um ID conhecido não é uma nova entrada e não deve disparar automaticamente as regras futuras. A forma de oferecer correção explícita da categoria está em levantamento.
- Painel completo, criação explícita de estabelecimento e confirmação de Salvar já têm composição na F06a. A edição pode reutilizá-los, mantendo identidade do estabelecimento separada da descrição. Não é necessário escolher biblioteca nova para isso.

Inspeção local desta rodada; sem implementação de edição, migração nova, seleção de dependências ou pesquisa de integrações futuras.

## Perguntas apresentadas — respondidas abaixo

1. **Acesso e composição:** lápis no cabeçalho, depois de etiquetas e antes do + de seleção (recomendação), ou ação somente nos detalhes expandidos? Proposta de painel direito “Editar despesa” com campos preenchidos, Salvar alterações/Cancelar e Seleção preservada ao fechar. Mostrar acesso apenas a despesas manuais elegíveis.
2. **Conta:** permitir troca entre contas da mesma moeda (recomendação) ou manter conta original fixa nesta fatia? Exemplo apresentado: R$ 20 do Nubank para a auxiliar devolve R$ 20 ao saldo do Nubank e desconta da auxiliar, mantendo um único movimento. Nomad em USD exigiria outro valor/moeda/conversão e não entra na troca recomendada.
3. **Categoria:** iniciar em Manter categoria atual e permitir escolha manual explícita, inclusive Sem categoria (recomendação), ou acrescentar também Usar regra atual? Trocar estabelecimento ou editar valor/data não reclassifica silenciosamente. A ação opcional aplicaria a categoria da regra vigente somente àquela despesa como escolha individual, preservada se a regra mudar depois.

As propostas divergentes foram substituídas pelas respostas abaixo, registradas antes da implementação dependente.

## Respostas confirmadas — D117–D119

Gabriel confirmou lápis no cabeçalho, troca entre contas da mesma moeda e Manter categoria atual com correção manual explícita. Nenhuma pergunta pendente desta fatia. Referência fixa D116 e demais decisões citadas continuam válidas.

## Critérios finais antes da implementação

1. Acesso por Cards/Lista/Agrupamento/Seleção, somente em despesas manuais elegíveis. Mesmo painel completo com campos preenchidos, contas da mesma moeda, referência/datas D116 e Salvar alterações explícito. Cancelar/Escape não grava e retorna o foco; Seleção preservada conforme D82.
2. Validar no backend elegibilidade por tipo/origem e recibo de criação. Preservar ID, origem, moeda e posição do registro; atualizar somente campos permitidos. Sem escrever fatos de arquivo/integração ou outros tipos. Troca de conta/valor recalcula saldos sem duplicar o movimento; validar limites financeiros nas contas afetadas.
3. Categoria inicial Manter categoria atual conserva override/atribuição/fonte. Escolha explícita grava override individual, inclusive null. Alteração de estabelecimento não dispara regra; não mudar definições, atribuições congeladas ou registro de primeira entrada.
4. Leitura específica do estado editável e comando fechado com versão esperada, recibo de repetição e transação. Detectar alteração concorrente de fato/categoria e recusar edição obsoleta. Falha mantém campos; recarregar estado atual somente por ação explícita, sem atualizar a versão esperada silenciosamente. Repetir pedido confirmado não aplica novamente; recibo original de criação permanece intacto.
5. Gravar fato, eventual estabelecimento novo, override e recibo de edição numa transação; rollback sem efeito parcial. Sucesso mantém consulta e oferece Ver lançamento. Restaurar demo inclui recibos de edição e preserva preferências/layout, sem restauração automática ou banco real.
6. Testar saldos por conta/moeda, datas, prioridade de categoria, identidade/origem estáveis, regras sem retroagir, versões obsoletas, repetição inclusive após reabertura, migração/rollback/restauração, contratos/IPC e interface ampla/estreita/teclado. Somente perfis temporários. Não commitar/enviar a fatia antes de apresentá-la e receber aprovação.

## Requisitos existentes a preservar

Datas civis após abertura da conta e até a referência fixa; valor positivo em centavos como magnitude de saída e moeda original. Origem e ID estáveis, classificação individual prioritária e regras antigas sem retroação automática. Sem inferência de estabelecimento pela descrição. Gravação atômica e falha sem efeito parcial, campos preservados para revisão/repetição e cancelamento sem escrita.

Reutilizar a direção D115 de consulta preservada e ação explícita Ver lançamento quando uma edição retirar o item da consulta, com Seleção regida por D82. Preferências/layout não fazem parte da alteração financeira. Testes de dinheiro, persistência/rollback, contratos e fluxo Electron somente em perfis temporários; nunca simular falhas nos bancos normais.

## Implementação e limites

Demo esquema 5 acrescenta recibos/revisões da edição, mantendo recibos originais de criação e atribuições de regra. Ponte com leitura/escrita específicas, contratos revalidados no principal/worker e token do estado esperado. Padrões oficiais de [isolamento/métodos específicos](https://www.electronjs.org/docs/latest/tutorial/context-isolation) e [validação de remetente IPC](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages), já consultados na F06a, foram reutilizados. Nenhuma biblioteca nova. Não confundir recibos/revisões internos com histórico navegável na interface; exclusão e fatos de outras origens seguem fora da fatia. Execução/aprovação somente em PROJECT_STATUS.
