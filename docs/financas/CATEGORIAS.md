# Categorias — F05b.1, F05b.2 e F05b.3

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

## Limites da F05b.1

Só despesas efetivas já consultadas nesta etapa; compras/parcelas e categorias de receitas não são introduzidas. Sem exclusão de categoria, edição financeira, regras futuras, reclassificação em massa ou sugestões automáticas. Essas funcionalidades mantêm levantamento próprio.

## Pesquisa técnica

Revalidados os padrões oficiais de [isolamento e ponte restrita](https://www.electronjs.org/docs/latest/tutorial/context-isolation) e [validação de remetente IPC](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages) em 05/11/2026. Manter um método por operação; não expor IPC genérico, SQL ou caminhos ao renderer. Nenhuma biblioteca nova necessária.

## F05b.2 — Reclassificação por estabelecimento com prévia

Continuidade solicitada em 07/11/2026. As decisões D101–D104 da F05b.1 permanecem válidas. O levantamento inicial abaixo antecede as respostas D105/D106 e os critérios registrados antes da implementação, ao final desta seção. Estado de execução somente em PROJECT_STATUS.

### Diagnóstico técnico

Despesas de caixa têm `merchantId` opcional. Identidades distintas não são unidas por nome, descrição, valor ou data; ausência de estabelecimento não pode significar todos os registros sem estabelecimento. Classificações manuais ficam em `CategoryState.classifications`, separadas da categoria original, incluindo null explícito para Sem categoria. A ponte atual classifica somente um movimento por operação. A futura aplicação em lote precisa ser validada e gravada integralmente no lado privilegiado, preservando os fatos originais; repetir chamadas individuais não garante essa unidade.

### Proposta de composição e comportamento

Nos detalhes de uma despesa com estabelecimento conhecido, acrescentar Reclassificar estabelecimento. Reutilizar o painel à direita, preservando a Seleção enquanto ele estiver aberto. Escolher categoria de destino, apresentar os lançamentos afetados, quantidade e total separado por moeda e confirmar por Aplicar a N despesas. Cancelar/fechar não grava. A classificação individual existente mantém seu fluxo.

Esta fatia trata apenas de despesas de caixa existentes. Compras/parcelas, regras para futuros lançamentos, sugestões automáticas e alterações de valores/datas continuam separadas. Não modifica metodologias de consumo, fatos de origem ou layout salvo.

### Perguntas apresentadas no levantamento — respondidas abaixo

1. **Alcance:** somente despesas do estabelecimento na consulta atual (conta/período/busca/tipo/categoria), todo o histórico da conta da despesa escolhida ou todo o histórico de todas as contas? Recomendação do Codex: consulta atual, com alcance explícito na prévia.
2. **Classificações manuais existentes:** preservar por padrão com opção explícita de incluir na prévia ou substituir também em toda aplicação? Recomendação do Codex: preservar por padrão, inclusive a escolha manual Sem categoria; mostrar os itens preservados e permitir inclusão explícita.

Exemplo do alcance: abrir uma despesa Uber em outubro pode atingir apenas os registros que passam pelos filtros atuais ou também meses/contas fora da tela, conforme a resposta. Exemplo de preservação: uma corrida já classificada manualmente como Trabalho permanece nessa categoria ao colocar as demais em Transporte, salvo inclusão explícita.

### Respostas confirmadas — D105/D106, 07/11/2026

- **D105:** somente a consulta atual, respeitando conta, período, busca, tipo e categoria. Despesas do mesmo estabelecimento fora desses filtros permanecem intactas.
- **D106:** preservar classificações manuais por padrão, incluindo Sem categoria, com opção explícita de incluí-las na prévia.

### Critérios de aceitação registrados antes da implementação

**Revisão de acesso — D107:** Gabriel pediu substituir o texto dentro dos detalhes por ícone entre expansão e +, sem alterar a lógica da F05b.2. Esta revisão substitui a localização inicial proposta acima; o painel, alcance D105 e preservação D106 continuam iguais.

1. Após D107, ícone de etiquetas no cabeçalho de despesas com estabelecimento informado, entre expansão e seleção; na Seleção, junto da remoção. Acesso também na Lista e no Agrupamento, sem expandir detalhes. Painel contextual à direita com categoria de destino explícita, alcance visível, lançamentos/datas/contas/categoria atual e estado de cada item. Sem categoria disponível como destino. Seleção retorna ao fechar; não salvar dimensões temporárias.
2. Prévia reflete todos os filtros atuais e identidade do estabelecimento; não fundir estabelecimentos por aparência nem reunir ausências. Mostrar manuais preservadas, itens já na categoria e quantidade/total original por moeda somente dos que serão alterados. Incluir manuais atualiza a prévia; nunca grava por escolher categoria ou marcar essa opção.
3. Aplicar a N despesas é confirmação explícita; sem alterações aplicáveis, ação indisponível. Cancelar/Escape não grava; operação em andamento bloqueia repetição. Contexto/catálogo alterado recalcula a prévia; o lado privilegiado rejeita uma prévia obsoleta em vez de aplicar um conjunto diferente silenciosamente.
4. Gravação em lote numa única transação, validada no principal e worker, sem SQL/caminhos/fatos genéricos. Recalcular consulta e validar estabelecimento/categoria/preservação com os dados salvos. Falha reverte o lote inteiro, mantém escolhas para revisão/repetição e não simula sucesso. Sem dependência ou migração nova necessária para o contrato de personalizações existente.
5. Preservar fatos, IDs, valores, moedas, layouts e preferências. Atualizar extrato/agrupamento/categorias após sucesso; seleção aplica D82 e a regra já existente de reclassificação de membros de blocos. Classificações produzidas pelo lote passam a ser manuais, preservadas por padrão em outra aplicação.
6. Verificar filtros combinados, manuais/nulas, registros parecidos e limites da ponte, reabertura/rollback e estados obsoletos. Fluxos Electron e inspeção ampla/estreita apenas em perfis temporários. Evidências inalteradas reutilizadas.

Revalidados em 07/11/2026 os mesmos padrões oficiais de isolamento e remetente IPC referenciados acima. Estado de execução somente em PROJECT_STATUS.

## F05b.3 — Regras para futuros lançamentos do estabelecimento

Continuidade autorizada em 07/11/2026 após aprovação da F05b.2. Base: FIN-045 / especificação §14.3. O levantamento histórico abaixo antecede as respostas D108–D112 e os critérios registrados antes da implementação ao final desta seção; não há pergunta pendente desta fatia.

### Base existente e limites

Reclassificação individual e lote sobre a consulta atual estão implementados. D105/D106 continuam regendo o lote; não definem automaticamente o alcance de uma regra futura. Identidades distintas de estabelecimentos continuam distintas; ausência de estabelecimento não pode agrupar todas as despesas sem identificação. Valores, datas, origem e categorias originais devem ser preservados, e uma escolha individual do usuário deve continuar prevalecendo, inclusive Sem categoria.

Não existe cadastro/importador/conector de novas despesas. Esses fluxos têm suas etapas próprias. Nesta fatia, a aplicação a novos registros deve ser comprovada com cenários fictícios e perfis temporários, sem introduzir um transporte genérico de fatos ou alterar os bancos normais para demonstrar a regra.

O contrato atual não contém data de entrada no aplicativo, regras ou atribuições automáticas com origem própria. O mecanismo precisa distinguir a categoria da fonte, a aplicação de regra e o override individual. Simplesmente tratar uma regra automática como override manual ou recalcular o histórico inteiro ao abrir não preservaria essa distinção. Detalhes de persistência/migração dependem das respostas, mantendo arquitetura SQLite/worker já estabelecida e sem biblioteca nova presumida.

### Primeira rodada — perguntas respondidas abaixo

1. **Alcance:** mesma conta da despesa usada para criar a regra ou todas as contas? Recomendação: conta da despesa. Exemplo: Uber → Transporte criada no Nubank não afeta outra conta sem regra correspondente.
2. **Categoria recebida da fonte:** a regra explícita do usuário prevalece sobre a categoria original, mantendo-a preservada, ou aplica somente a registros que venham sem categoria? Recomendação: regra prevalece sobre a fonte, mantendo sempre a prioridade da classificação individual.
3. **Significado de futuro:** novos registros que entrarem no aplicativo depois de salvar, mesmo com data antiga, ou somente novos registros cuja data da despesa seja a partir da criação da regra? Recomendação: corte pela entrada no aplicativo. Exemplo: extrato de setembro importado depois da criação seria elegível; registros de setembro já existentes não seriam alterados por salvar uma regra futura.

### Composição e gestão propostas, ainda para confirmação

Reutilizar o ícone de etiquetas D107 e separar no painel a aplicação aos lançamentos existentes da configuração da regra futura. Salvar regra é uma ação explícita; escolher categoria não grava. Propor gestão junto do catálogo, mostrando estabelecimento, conta/alcance, destino e estado. Proposta para edição/pausa: afetar os próximos registros, preservando categorias já aplicadas; reativação e alteração de alcance/prioridade devem ter efeito explicado antes de salvar. Esses comportamentos precisam ser fechados com Gabriel antes da parte dependente.

Regras por identidade, prioridade manual, preservação de origem, restauração explícita e testes em perfis temporários continuam requisitos; não introduzir sugestão automática, importação real ou edição financeira para completar esta fatia.

### Primeira rodada respondida — D108–D110

Gabriel respondeu em 07/11/2026:

- **Todas as contas**, por identidade do estabelecimento, sem usar os filtros temporários da consulta como alcance da regra.
- **Regra estabelecida prevalece sobre a fonte**; quando não houver classificação/regra no sistema, usar a categoria recebida da fonte. Preservar o dado original e a prioridade das escolhas individuais. Distinguir ausência de override de uma escolha manual explícita Sem categoria.
- **Futuro significa entrada no aplicativo após salvar**, inclusive registro antigo importado/cadastrado depois. Despesas já existentes não mudam apenas por criar uma regra.

Essas respostas substituem as propostas divergentes da primeira rodada; não repetir o levantamento de conta/alcance ou usar a data civil como corte da regra.

### Segunda rodada — perguntas respondidas abaixo

1. **Criação e gestão na interface:** mesmo ícone de etiquetas com opções Lançamentos atuais / Próximos lançamentos; a primeira conserva a prévia F05b.2 e a segunda escolhe categoria e salva regra. Gestão na área Categorias do Agrupamento, com Regras listando estabelecimento → categoria e Editar/Pausar/Ativar. Alternativa apresentada: concentrar criação e gestão somente em Categorias.
2. **Efeito da edição, pausa e reativação:** proposta de preservar categorias já aplicadas, afetando apenas registros que entrarem depois da ação. Exemplo: mudar Uber de Transporte para Trabalho mantém as corridas anteriores; pausar deixa os próximos registros usarem a categoria da fonte. Alterar antigos continua sendo aplicação em lote com prévia. Alternativa apresentada: revisar também registros anteriores nessas ações.

As duas perguntas foram enviadas antes da implementação dependente. As respostas e os critérios finais estão registrados abaixo.

### Segunda rodada respondida e critérios antes da implementação — D111/D112

Gabriel confirmou a organização proposta e mudanças somente para próximos registros, preservando atribuições antigas. Nenhuma pergunta pendente desta fatia. Critérios:

1. Painel de etiquetas mantém Lançamentos atuais por padrão e acrescenta Próximos lançamentos. Salvar regra exige ação explícita e aplica a todas as contas por identidade de estabelecimento. Gestão em Categorias → Regras com destino/estado, edição e Pausar/Ativar; teclado, Escape, foco e Seleção preservados. Sem transporte genérico de fatos ou importação/cadastro falsamente ativo.
2. Uma regra por estabelecimento, com revisão para detectar edição obsoleta. Classificação individual explícita, inclusive null, prevalece sobre atribuição automática; a atribuição prevalece sobre a categoria da fonte. A fonte original permanece intacta. Sem regra/atribuição/override, aproveitar categoria da fonte ou Sem categoria.
3. Registrar a primeira entrada de IDs e a categoria aplicada pela revisão vigente da regra. Data civil não define novidade. Registros já conhecidos e reentrada do mesmo ID não são reclassificados por criar/editar/pausar/reativar; novas contas e datas antigas recebidas depois são elegíveis. Atribuições antigas não são recalculadas com a regra atual nem tratadas como escolhas individuais.
4. Persistir regras e atribuições separadas do catálogo/overrides existentes, com migração transacional que marca os IDs já existentes como conhecidos, preservando bytes dos fatos/categorias/preferências/layout. Falha ou versão futura não provoca recriação. Entrada interna de snapshot valida e grava fatos/registro de entrada/atribuições numa transação; nenhum método público de gravação arbitrária de fatos é adicionado.
5. Restauração explícita da demonstração repõe também as regras/atribuições fictícias, como parte das personalizações de categorias D103, mantendo preferências/layout. A confirmação informa esse alcance. Testes e simulações somente em perfis temporários; banco normal não é usado para validar novas chegadas.
6. Testar prioridade, todas as contas/moedas, datas antigas, reentrada/idempotência, alterações de fonte, edição/pausa/reativação sem retroagir, migração/rollback/reabertura, contratos fechados e remetente IPC. Fluxos Electron verificam salvar/editar/pausar/ativar, falha/repetição, consulta/Seleção preservadas e layout amplo/estreito. Limitação de entrada de dados permanece explícita na entrega.
