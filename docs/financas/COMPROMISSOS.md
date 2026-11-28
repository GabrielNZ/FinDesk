# F10a — Estrutura de Compromissos

## Revisão D182 — solicitada em 28/11/2026

Calendário maior à esquerda, card de informações à direita com a hierarquia da Fatura. Sem tabela/linhas como apresentação principal; pendências anteriores em pequenos cards. Direção solicitada diretamente, substituindo a composição de D180. Padrão proposto dentro dessa direção: calendário 8 colunas/detalhe 4, mesma capacidade de arraste/resize/foco e quebra vertical sem gravar a apresentação estreita. Preservar ajustes já salvos; o novo padrão vale sem layout e ao restaurar explicitamente.

**D183/D184 confirmadas nas caixinhas antes das partes dependentes:** um card grande com setas/posição para múltiplos itens do dia; sem seleção pede um dia, pendências abrem no mesmo painel sem alterar período. Enriquecer o exemplo fictício Energia com destinatário explícito “Energia — demonstração”, Casa, frequência mensal e nove pagamentos históricos anteriores à abertura do histórico de caixa, mais o pagamento de outubro existente. Último registro anterior em julho de R$ 110 versus outubro R$ 120: +R$ 10/+9,1%, datas explícitas, dez pagamentos registrados, sem presumir parcela, gerar meses ou debitar caixa. Lacunas permanecem ausentes. Comparação somente na mesma série explicitamente vinculada/moeda e contra base positiva para percentual; dados sem referência permanecem indisponíveis. Nenhuma pergunta desta rodada continua pendente.

Diagnóstico do início da revisão: CommitmentOccurrence ainda não guardava destinatário, categoria, frequência, série ou histórico. Energia tem pagamento observado mov-energia com merchantId/categoria, mas isso não comprova histórico/frequência. Dados do pagamento podem fornecer detalhes conhecidos; outras contas não devem receber destino/classificação inferidos apenas pelo nome. Faturas já têm referência por cartão para variação, preservando critérios D179 e base parcial; não atribuir uma categoria única a uma fatura com várias categorias. Histórico e pagamentos novos não devem ser presumidos para satisfazer o exemplo.

### Implementação da revisão

Calendário 8 colunas à esquerda e informações 4 à direita, padrão de 7,5 unidades de altura; tamanhos já salvos preservados. O antigo ID commitment-agenda continua como identidade do card de informações, evitando apagar layouts. Sem seleção, orientar a escolher dia/pendência; dia sem item tem estado próprio. Selecionar pendência mantém o período e informa esse recorte. Setas/posição navegam um item por vez, com teclado, foco nos extremos e Escape retornando ao calendário/controle visível. Modos Detalhes/Calendário/Lado a lado usam a preferência existente; clicar dia/pendência no modo somente calendário abre o painel lado a lado. Subtotal do intervalo e pendências anteriores seguem separados; todos os detalhes usam altura natural/rolagem na página, sem tabela.

Novo agregado formato 4/seed 6 lê as versões anteriores e acrescenta somente série/recibos autorizados e vínculos nas ocorrências, em transação idempotente. Movimento de energia, demais fatos, saldo inicial, categorias/regras e layouts/preferências permanecem intactos. PriorHistory limita-se a registros observados anteriores à abertura da conta; não equivale a uma sequência completa nem gera obrigações. Lacunas de agosto/setembro preservadas. Frequência mensal é metadado explícito, sem motor de geração. Categorias do pagamento respeitam classificações manuais existentes; fatura pode exibir múltiplas categorias. Sem fonte, campos ficam não informados e a comparação indisponível.

Passaram 242 testes Node (seis novos nesta revisão), incluindo histórico/contagem/mesma série/moeda/ausência/ambiguidade e migração/preservação/rollback. Contrato de datas observadas anteriores à referência foi reforçado e os dois testes pertinentes passaram novamente. Builds desktop/domínio/web, tipos/templates/ferramentas, lint e formatação pertinentes atendidos. Quatro fluxos Electron pertinentes passaram nas rodadas da revisão: dois novos de cards/detalhes e os de transições/layout de Cartão; captura ampla/estreita inspecionada. Corrigidos foco ao desabilitar setas nos extremos e acessibilidade do contêiner com Escape. Testes/falhas somente em perfis temporários. Nenhuma aprovação/commit/push novo; F10b continua não iniciada.

Levantamento em **28/11/2026** após aprovação da F09f. Estado e execução efetivos em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

## Fontes e decisões existentes

FINANCAS_SPEC §10 e FIN-031–FIN-034: contas recorrentes/avulsas, lista/calendário, foco/lado a lado, filtros A vencer/Vencidos/Pagos e detalhes expansíveis. Período local confirmado: Seguir Finanças por padrão ou Próximos 30 dias (hoje mais 29), preferência salva sem mudar outros submenus. Pendências anteriores têm grupo, quantidade e total próprios, fora do total do intervalo. Usar Vencido — pagamento não identificado sem alegar inadimplência comprovada.

C16: conta de R$ 75 vencida em 28/09 permanece nas pendências anteriores ao trocar outubro/novembro/30 dias. C29 mantém marcação/associação manual e alcance de série para discussão antes de implementar. O card Próximos compromissos do Geral (§7.5) tem horizonte próprio ainda aberto; não o vincular a esta etapa por inferência.

Padrões globais confirmados: cards organizáveis/redimensionáveis, foco temporário, restauração explícita, teclado/movimento reduzido, contexto preservado e gestos internos distintos do arraste. D172/D173 orientam expansão suave com rolagem na página, sem gravar a altura temporária.

## Diagnóstico técnico

- Submenu Compromissos ainda mostra o estado pendente em finance-subpage.ts. O Geral conserva o protótipo independente Próximos compromissos.
- FinanceFacts contém movimentos, faturas, parcelas e assinaturas mínimas; não há ocorrências de contas ou séries. SubscriptionFact não tem vínculo direto de conta/cartão: próxima data e valor não bastam para criar obrigação consolidada corretamente.
- Existe movimento mov-energia, despesa de R$ 120 em 15/10/2026 na conta demo-a; o vínculo explícito de uma ocorrência observacional pode referenciá-lo sem criar novo débito. Não inferir pagamentos por coincidência de descrição/data/valor.
- Faturas têm vencimento, estado, total confirmado/pagamento integral e líquido registrado (F09f). Uma fatura deve entrar uma única vez, sem parcelas e assinaturas do cartão repetidas como obrigações. Crédito não é conta a pagar; ausência não é zero, e conhecido não é cobrança final confirmada.
- FinanceContext fornece conta/moeda e intervalo civil. Compromissos pode consultar o intervalo sem alterá-lo. A referência fictícia é snapshot.asOf=29/10/2026, distinta da data atual do computador.
- Motor de cards, altura natural e exclusão de controles internos já existem. Será necessário namespace próprio de layout/preferências e contratos restritos, preservando os namespaces atuais. Nenhuma dependência nova selecionada ou necessária para o calendário simples.

## Decisões confirmadas — D180/D181

1. **Composição confirmada:** dois cards, Agenda mais larga à esquerda e Calendário à direita; modo inicial lado a lado. Agenda compacta, detalhes que descem e grupo separado de Pendências anteriores; selecionar dia recorta itens do intervalo e oferece Todos os dias. Modos Lista/Calendário/Lado a lado com controle discreto; ambos os cards organizáveis/foco/resize, com calendário abaixo em janela estreita e detalhes crescendo pela página.
2. **Escopo confirmado:** contas fictícias finitas e faturas registradas. Acrescentar avulsa R$ 75 em 28/09 sem pagamento identificado; energia R$ 120 em 15/10 vinculada ao pagamento existente; aluguel R$ 900 em 05/11; avulsa R$ 150 em 08/11, conta Nubank. Sem gerar recorrências ou mudar saldo. Faturas sem total confirmado usam líquido conhecido identificado como parcial; negativo identificado como crédito, fora de contas a pagar e sem transporte automático.

Respostas recebidas nas caixinhas antes da implementação dependente. Cadastro, marcar pago, geração de séries/assinaturas e consolidação do Geral ficam fora da entrega. Detalhes operacionais dentro da composição: filtro Todos inicial, alternativas A vencer/Vencidos/Pagos, pendências anteriores independentes da seleção de dia; controles locais preservam o cabeçalho global. Modo de apresentação e período salvos separadamente do layout; foco de um card é temporário e não altera essa preferência.

## Critérios independentes confirmados

Consulta de período sem I/O: Seguir Finanças conserva o intervalo fornecido; Próximos 30 dias usa a referência explícita e 29 dias civis seguintes, inclusivos, sem horário/fuso ou relógio do computador. Validar fronteiras de mês/ano, ano bissexto e limite de datas; intervalo ausente permanece ausente. Não gravar preferência por consultar, mudar o cabeçalho ou criar fatos/recorrências.

## Critérios de aceitação e invariantes

Ocorrências com IDs/origem, conta/moeda, data, quantia conhecida ou ausência explícita e vínculo de pagamento observado. Histórico/caixa e demais tabelas preservados por atualização versionada/atômica/idempotente, sem reset. Pagamento não identificado não vira pagamento presumido; nenhuma execução financeira. Separar itens do intervalo e pendências vencidas anteriores, incluindo ao filtrar data, sem somar o grupo anterior ao intervalo. Subtotais identificam valores parciais/ausentes; moeda original preservada e conversão uma vez por agregado. Seleção de dia/detalhe não altera consulta global ou rola a página. Verificar persistência/layout isolados, teclado, janela estreita, movimento reduzido, crescimento natural e reabertura somente em perfis temporários.

## Estado

Implementação sob D180/D181: ocorrências explícitas e consulta consolidada com uma linha por fatura; crédito separado dos subtotais de obrigações. Totais do recorte incluem os registros selecionados, inclusive pagos no filtro Todos, e são chamados Subtotal conhecido, não saldo a pagar. Pendências anteriores independem de filtro de situação/dia e não entram no subtotal do intervalo. Filtro Todos inicial; data/detalhe temporários, moeda preserva o detalhe. Modo e período salvos separadamente dos layouts existentes.

Agregado formato 3/seed 5 exige commitments e aceita legados formato 1/seeds 1–3 e formato 2/seed 4. Acrescenta somente as quatro ocorrências autorizadas em uma transação; não muda movimentos, compras, faturas ou auxiliares. Reabertura idempotente; restauração explícita repõe as ocorrências e preserva preferências/layouts. Schemas SQLite continuam demo 6/preferências 3. Vínculo de pagamento exige despesa observada da mesma conta/moeda e valor integral; um movimento não paga duas ocorrências. Associação manual/parcial/de outra conta exige regras próprias em próximas entregas.

Preferências v1 em commitments.v1 e layout CardLayout v3 em layout.finance-commitments.v1. Quatro endpoints restritos com validação no main/worker/store; SQL/caminhos/conteúdo extra recusados. Consulta sem preferência não grava defaults. Conteúdo futuro/corrompido preservado e salvamento recusado; falha de escrita conserva dados anteriores. Modo Lista/Calendário usa apresentação de foco sem mudar posições/tamanhos salvos; foco temporário continua separado da preferência. Cards começam 8/4 colunas e mínimo visual 360 px, ficando em largura completa em janela estreita, sem salvar esse rearranjo.

Passaram **236 testes Node**, incluindo 16 novos (três de período, nove de aplicação/calendário/layout e quatro de persistência/worker), mais builds desktop/domínio/web, tipos/templates/ferramentas e lint pertinentes. **15 testes Electron** passaram: dois da F10a, 11 do mecanismo de cards, transições entre submenus e layout de Cartão. Verificados: período local, pendências separadas, seleção/retorno de dias, teclados do calendário/modos, moeda, subtotal parcial, contexto/fatos preservados, arraste/resize/mesma instância, detalhe suave nos dois sentidos, movimento reduzido, erro de salvamento/repetição e reabertura. Capturas ampla/estreita inspecionadas; mínimo visual de 360 px da nova área garante largura completa quando empilha, sem alterar layouts salvos. Lint final do foco recebeu ajuste de formatação sem mudança de comportamento.

Todos os testes/falhas em perfis temporários; sem conexão real ou teste de falha no perfil normal. Aplicativo normal fechado normalmente e reiniciado para carregar a atualização autorizada. Nenhuma pergunta desta rodada permanece pendente. Entrega aguarda aprovação, sem commit/push novo; próxima proposta F10b — Cadastro de compromisso avulso.
