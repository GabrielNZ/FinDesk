# F05b.1 — Catálogo de categorias e classificação individual

## Decisões confirmadas antes da implementação

Gabriel confirmou D101/D102 em 05/11/2026: criar/renomear categorias, escolher ícone/cor e reclassificar uma despesa por vez, com gravação local e atualização imediata. Botão Categorias no Agrupamento abre a gestão à direita; nos detalhes da despesa, clicar na categoria permite escolher/criar. A área de Seleção fica temporariamente substituída, com seus itens preservados ao fechar.

Base: FIN-045 e especificação §14.3. Sem categoria é fallback neutro, permanece nos totais e pode ser escolhido explicitamente. Alterações manuais preservam valores, datas, origem, IDs e outros campos do lançamento. Renomear categoria atualiza os seus rótulos, sem criar outra identidade. Transferências, aportes e pagamentos de fatura não se transformam em consumo por categorização.

## Critérios de aceitação

1. Catálogo inicial compatível com os quatro IDs já presentes na demonstração; categorias criadas recebem ID estável. Nome obrigatório e sem duplicidade normalizada; ícone e cor escolhidos localmente, sem downloads. Sem categoria não é categoria editável.
2. Criação/edição com confirmação de Salvar; cancelar/fechar não grava. Opções de ícones e cores em grade. Seleção individual grava apenas a classificação daquele ID; opção Sem categoria. Sem mudança silenciosa de outros lançamentos do estabelecimento.
3. Reabrir preserva catálogo/classificações. Fatos originais ficam separados das personalizações. Atualizar catálogo/atribuição somente após confirmação de sucesso; falha preserva consulta e permite repetir.
4. Extrato, busca/filtros e Agrupamento usam a classificação/nome atual. Soma e IDs selecionados preservados, exceto poda já definida em D82 se o item sair de um filtro explícito. Painel não apaga a Seleção nem grava layout temporário. Cliques/teclado não iniciam arraste.
5. Banco/worker/preload atuais, contratos fechados, remetente validado, SQL parametrizado e migração versionada. Testes de parser/casos de uso, persistência/migração/worker e fluxo Electron em perfis temporários; nunca simular falhas nos bancos normais.

Ao reclassificar um movimento selecionado em bloco, ele deixa o bloco da categoria antiga e continua selecionado individualmente. Renomear preserva o bloco e atualiza o rótulo; a soma segue por IDs únicos. Criar uma categoria pelos detalhes não classifica silenciosamente: ela aparece na escolha para aplicar ao lançamento.

## Restauração confirmada — D103

Gabriel confirmou repor também catálogo/classificações da demonstração, mantendo preferências/layout, com confirmação explícita. Dados de origem e personalizações da demo são repostos na mesma transação. Nenhuma pergunta pendente nesta rodada.

## Limites

Só despesas efetivas já consultadas nesta etapa; compras/parcelas e categorias de receitas não são introduzidas. Sem exclusão de categoria, edição financeira, regras futuras, reclassificação em massa ou sugestões automáticas. Essas funcionalidades mantêm levantamento próprio.

## Pesquisa técnica

Revalidados os padrões oficiais de [isolamento e ponte restrita](https://www.electronjs.org/docs/latest/tutorial/context-isolation) e [validação de remetente IPC](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages) em 05/11/2026. Manter um método por operação; não expor IPC genérico, SQL ou caminhos ao renderer. Nenhuma biblioteca nova necessária.
