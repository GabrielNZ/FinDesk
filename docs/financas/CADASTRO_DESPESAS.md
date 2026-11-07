# F06a — Cadastro local de despesas

## Base confirmada

Continuidade autorizada em 07/11/2026 após aprovação da F05b.3. Fontes: FIN-042 / especificação de Finanças §14.1 (cadastro contextual em painel direito), FIN-045 / §14.3 (categorias e prioridade manual), §15 (origem e precisão), D108–D112 (regras futuras) e direção vigente de demonstração fictícia separada dos dados reais futuros. Aprovação e execução ficam somente em PROJECT_STATUS.

O primeiro cadastro proposto é de despesas de caixa já realizadas nas contas da demonstração. Não introduzir compras/parcelas de cartão, pagamento de fatura como consumo, compromissos futuros, receitas, transferências ou edição/exclusão de fatos sem o levantamento próprio. Origem manual visível, valores e moeda originais preservados. Categorias e regras da F05b continuam válidas; escolha individual explícita prevalece sobre regra, inclusive Sem categoria. Não repetir essas decisões.

## Diagnóstico antes das escolhas

- `CashMovement` já distingue despesa de receita, transferência, pagamento de fatura e aporte; despesas aceitam categoria e estabelecimento opcionais. Conta tem moeda no saldo de abertura; a moeda escolhida para apresentação não é a moeda do novo fato.
- A ponte atual não grava fatos arbitrários. `DemoStore.saveDemo` é interno e registra primeira entrada de IDs/atribuições de regra junto dos fatos numa transação. O cadastro precisará de uma operação pública específica e contrato fechado, com ID/origem produzidos no lado privilegiado, validação do fato e proteção contra repetição da mesma solicitação. Não expor o agregado inteiro como formulário/IPC de escrita.
- Nomes de estabelecimentos vêm de `DEMO_MERCHANT_LABELS`, fixo em código; fatos/regras guardam IDs. Permitir novos nomes requer persistir identidades e rótulos, sem inferir associação pela descrição ou unir nomes parecidos silenciosamente. O alcance dessa criação está em pergunta antes da implementação dependente.
- Saldo atual usa a referência `snapshot.asOf`, não o período consultado. A fixture normal está em 29/10/2026, com abertura das contas em 30/09/2026. Despesa anterior/igual à abertura ou posterior à referência não pode ser simplesmente incluída como um débito atual e receber mensagem enganosa de atualização do saldo. Política de datas/default/referência ainda precisa ser fechada, preservando dados fictícios e sem avançar relógio/cobertura silenciosamente.
- Filtros e Seleção são estado da consulta. Um cadastro pode ficar fora deles; comportamento após salvar precisa ser escolhido antes de mudar a consulta automaticamente.

Não foi escolhida dependência nova nem alterada a arquitetura SQLite/worker. A inspeção desta rodada é local; não representa pesquisa ou implementação de importação, integrações ou ambiente de dados reais.

## Primeira rodada apresentada — respondida abaixo

### Composição e acesso

Proposta: botão “+ Nova despesa” nos controles de Movimentações, disponível em Extrato/Agrupamento. Painel à direita ocupa temporariamente a Seleção e devolve seus itens ao fechar. Valor/data no topo, conta/descrição/estabelecimento/categoria abaixo e Salvar/Cancelar ao final. Escolha enviada: todos os campos no mesmo painel (recomendação) ou duas etapas, separando valor/data/conta dos detalhes. Manter composição própria e controles acessíveis; escolha de categoria não cria uma regra futura silenciosamente.

### Estabelecimentos

Escolha enviada: selecionar existentes e criar novos explicitamente (recomendação) ou selecionar somente os existentes nesta fatia. Campo opcional; escolher Uber reutiliza identidade/regra. “Uber” apenas na descrição não faz associação automática. Um novo nome, como Padaria da esquina, depende de ação explícita de criação e identidade estável.

### Resultado fora da consulta

Escolha enviada: manter filtros e oferecer Ver lançamento (recomendação) ou mudar a consulta automaticamente ao salvar. Exemplo: consulta em Casa e nova despesa de Transporte. Na proposta recomendada, informar que foi salva fora dos filtros; ajustar a consulta somente por Ver lançamento. A nova consulta pode podar a Seleção conforme D82, consequência apresentada na pergunta.

## Primeira rodada respondida — D113–D115

Gabriel confirmou as três recomendações em 07/11/2026:

- **D113:** todos os campos no mesmo painel, com acesso por “+ Nova despesa” em Extrato/Agrupamento e Seleção preservada ao fechar.
- **D114:** selecionar estabelecimentos existentes e cadastrar novos explicitamente. Descrição não gera associação automática; campo opcional e identidade reutilizada ao selecionar um existente.
- **D115:** manter consulta ao salvar e oferecer Ver lançamento quando o registro ficar fora dos filtros, com ajuste somente por essa ação e consequências D82.

Essas respostas substituem as alternativas divergentes acima. Não repetir o levantamento dessas três escolhas.

## Segunda rodada — pergunta respondida abaixo

**Datas e referência da demonstração:** proposta recomendada é manter `snapshot.asOf` fixo, iniciar a data do cadastro nessa referência e aceitar somente despesas posteriores à abertura da conta e até a referência, inclusive. Nas contas/fixture atuais, intervalo 01/10–29/10/2026; informar “Referência da demonstração: 29/10/2026”. Exemplo apresentado: R$ 20 em 20/10 aparece no extrato e reduz o saldo em R$ 20.

Alternativa apresentada: fazer a demonstração acompanhar a data real do computador, permitindo despesa realizada hoje e mudando também a referência do saldo/ciclos e do mês inicial ao reabrir. Extratos fictícios continuariam restritos ao histórico existente; avançar a referência não cria dados nem comprova cobertura posterior. A pergunta foi enviada antes da implementação dependente; a resposta D116 abaixo substitui a alternativa divergente.

Conta/moeda preservam o contrato vigente: valor digitado na moeda original da conta, independentemente da moeda de apresentação. Valor de despesa informado como magnitude positiva e persistido como saída, com centavos inteiros; zero/ausência não se confundem. D109–D112 continuam definindo a prioridade de categoria individual/regra/fonte e novidade por entrada, sem corte pela data civil.

## Segunda rodada respondida — D116

Gabriel confirmou manter a referência fixa da demonstração. Formulário inicia em snapshot.asOf; intervalo permitido depois da abertura da conta e até essa referência. Nenhuma pergunta pendente desta fatia; implementação autorizada.

## Critérios finais antes da implementação

Painel completo com confirmação explícita; cancelar não cria uma despesa. Identidade do estabelecimento separada da descrição; consulta/Seleção preservadas conforme D113–D115. Origem manual visível e dados fictícios no ambiente atual. Persistência/IPC específicos e atômicos, sem SQL/fatos/caminhos genéricos, precisão por centavos e prioridade das escolhas individuais conforme regras existentes. Testes financeiros, de persistência e Electron devem usar somente perfis temporários.

1. Valor positivo obrigatório em centavos, data civil válida dentro de D116, conta existente e descrição obrigatória. Moeda da conta explícita. Sem categoria e ausência de estabelecimento permitidas; categoria automática usa regra ativa, escolha individual explícita prevalece inclusive null. Não criar regra silenciosamente.
2. Seleção de estabelecimentos com busca, nomes persistidos e ação explícita de criação. Novo nome é preparado no formulário e confirmado junto da despesa ao salvar; cancelar não deixa estabelecimento órfão. Nomes normalizados duplicados exigem selecionar o existente, sem fusão automática.
3. Confirmação de Salvar grava fato manual, eventual estabelecimento, override, atribuição de regra e recibo de solicitação numa transação. Repetir a mesma solicitação não duplica; reutilizar a chave com outros dados é recusado. ID/origem no lado privilegiado. Falha mantém campos; cancelar/Escape não grava. Campos/fechar bloqueados durante gravação.
4. Sucesso atualiza snapshot/categorias/regras/nomes e saldo sem restaurar filtros ou preferências. Painel mostra confirmação e ação de novo cadastro; Ver lançamento ajusta conta/período/filtros somente por ação explícita. Seleção continua por D82. Layout temporário não é salvo.
5. Migração versionada preserva fatos e personalizações existentes. Restauração explícita repõe também despesas manuais, novos estabelecimentos e recibos da demonstração, preservando preferências/layout e informando o alcance. Não criar ambiente real ou API genérica de escrita.
6. Testar precisão, limites de datas/moedas, identidade, categoria/regra/manual, idempotência, migração/reabertura/rollback, contratos e remetente IPC. Fluxos Electron verificam cadastro, fora de filtro/Ver lançamento, Seleção, falha/repetição, teclado e janela estreita em perfis temporários. Não testar falhas/restauração no perfil normal.

## Segurança e limites técnicos

Revalidados em 07/11/2026 os padrões oficiais de [isolamento e métodos específicos na ponte](https://www.electronjs.org/docs/latest/tutorial/context-isolation) e [validação do remetente IPC](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages). Mantidos sandbox/renderer isolado, frame principal e contrato revalidado no worker. Sem dependência nova, API de escrita genérica, importação ou ambiente de dados reais. Estado/verificações efetivas somente em PROJECT_STATUS.
