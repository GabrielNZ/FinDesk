# Decisões do FinDesk

Estado em 29/10/2026. Fontes originais e precedência: [REVIEW.md](REVIEW.md). Estado da execução: [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Decisões confirmadas pelo proprietário

| ID  | Decisão                                                                    | Origem e consequência                                                                                                                     |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Windows, Angular, Electron e TypeScript                                    | Mestre; domínio separado e sem servidor HTTP de aplicação obrigatório                                                                     |
| D02 | FinDesk, português brasileiro e tema escuro primeiro                       | Mestre e complemento de identidade; logo original como referência; F provisório                                                           |
| D03 | Visão geral, Finanças e Investimentos; simulador em Investimentos          | Mestre; Configurações é acesso secundário por engrenagem                                                                                  |
| D04 | Configurações contém Integrações                                           | Complemento de levantamento; fluxos reais ainda abertos                                                                                   |
| D05 | Dados fictícios antes de dados reais; desenvolvimento em pequenas entregas | Complementos; esta entrega contém a casca, sem dados financeiros                                                                          |
| D06 | Push após cada entrega aprovada para `GabrielNZ/FinDesk`                   | Resposta explícita em 28/10/2026; não reenviar trabalho ainda não aprovado                                                                |
| D07 | Angular 21 + PrimeNG 21 Community MIT                                      | Resposta explícita nesta entrega; manter versões exatas e avaliar atualização antes do fim do LTS do Angular 21, previsto para junho/2027 |
| D08 | Barra nativa do Windows inicialmente                                       | Resposta explícita nesta entrega; sem barra personalizada e sem IPC de controles de janela                                                |

**D09 — registro anterior, substituído por D10:** Gabriel escolheu B entre os estudos apresentados e o Codex o aplicou ao menu e aos ícones. A correção posterior esclareceu que isso não substitui a logo original já fornecida.

**D10 — logo original, aplicada:** a imagem reenviada por Gabriel contém moedas e seta ascendente nas versões branca e preta. O PNG foi recuperado do anexo desta conversa, preservado sem alteração em `FinDesk-Project/public/brand/logo-original.png` e aplicado no lugar do F. Os SVGs enquadram as versões originais; não são redesenho ou vetorização. Não propor outra marca por dificuldade de visualizar um anexo.

**D11 — participação e objetividade:** discutir decisões de design e desenvolvimento antes da implementação dependente. Perguntas sobre bibliotecas não bastam para definir uma tela. Sem slogans ou texto promocional; títulos, ações e estados devem ser objetivos.

**D12 — ajuste da casca:** Gabriel escolheu manter menu, cores e espaçamento da base atual e enxugar o conteúdo, incluindo remover a abertura promocional. Não adensar nem redesenhar a interface nesta correção.

**D13 — frequência dos testes:** agrupar verificações de pequenas mudanças, conforme risco, sem rodar a suíte a cada ajuste trivial. Cálculos, mecânicas relevantes, persistência e segurança continuam exigindo testes pertinentes. Ver [TESTING.md](TESTING.md).

**D14 — remover identificadores redundantes:** Gabriel solicitou retirar o bloco lateral “Meu espaço / Pessoal” e o texto “Meu espaço / FinDesk” do cabeçalho. Eram elementos decorativos, sem seletor de espaços, navegação ou funcionalidade futura acordada. O cabeçalho mantém somente o estado da versão e o botão Sobre.

**D15 — tipografia A, confirmada:** Gabriel escolheu Bahnschrift nos títulos e Segoe UI Variable Text no corpo após comparação A/B/C. Aplicar por tokens, preservando tamanhos, espaçamentos e ícones; usar fontes já instaladas, sem download ou redistribuição. Fallback para as fontes Segoe UI disponíveis no sistema.

**D16 — cabeçalho sem divisão:** remover a borda horizontal inferior e o rótulo “Versão de apresentação”, preservando o botão de informação e sua ação. Substitui a indicação de versão visível registrada em D14.

**D17 — lateral recolhível:** Gabriel solicitou botão abaixo de Configurações que desliza a lateral entre expandida e apenas ícones, ampliando o espaço principal. Implementação usa estado de apresentação, transição de 200 ms, largura recolhida de 72 px, nomes acessíveis e botão de retorno no mesmo local. O estado acompanha a navegação nesta execução; não há persistência de preferência nesta entrega. Em prévias inicialmente estreitas, inicia recolhida e o botão continua disponível.

**D18 — redimensionamento e encaixe nas quatro bordas:** Gabriel confirmou separar os gestos: borda interna redimensiona; alça próxima da logo move a navegação. O encaixe mostra prévia e só muda a posição ao soltar junto à esquerda, direita, topo ou base da janela. Em cima/embaixo, a disposição fica horizontal. Soltar no centro ou cancelar com Escape mantém a posição anterior. A alça também abre um menu de posições, como alternativa ao arraste.

**D19 — recolhimento automático e restauração:** Gabriel confirmou passar automaticamente para ícones ao estreitar. O botão restaura o tamanho expandido anterior ao gesto que recolheu, com largura e altura guardadas separadamente durante a execução. A orientação da seta acompanha a borda atual. Não foi solicitada persistência entre execuções.

**D20 — simplificação confirmada em 29/10/2026, substitui partes de D18/D19:** remover o redimensionamento manual pela borda e o texto “Soltar: posição”. Manter apenas a mudança entre as quatro bordas pela alça, a prévia visual sem legenda e o botão de recolher/expandir. Foram removidos também o separador ajustável, seus gestos/atalhos e o recolhimento por arraste. O menu de posições continua como alternativa ao mouse.

Implementação vigente: captura de ponteiro mantém o arraste da alça; a barra ocupa a borda e o conteúdo rola na área restante, sem sobreposição. Tamanhos são definidos pelo layout, orientação e estado do botão, sem ajuste manual.

**D21 — especificação incremental de Finanças, recebida em 29/10/2026:** [FINANCAS_SPEC.md](FINANCAS_SPEC.md) passa a reger os requisitos dessa área e prevalece sobre sugestões antigas conflitantes. Gabriel autorizou iniciar somente F00 nesta rodada: diagnóstico e próxima proposta, preservando o código correto. O escopo local inclui os cinco submenus, cards dinâmicos, compromissos, assinaturas mensais/anuais, previsões, detecção, disponível, orçamentos e alertas; não equivale à autorização de implementar tudo. Banco continua pendente, com comparação SQLite/MySQL antes da escolha; nenhuma migração necessária no estado atual. D20 permanece aplicável à navbar. Parâmetros ressalvados na especificação continuam propostas.

**D22 — organização do repositório, solicitada em 29/10/2026:** agrupar todo o código da aplicação e suas ferramentas em `FinDesk-Project/`; manter documentos, anotações e contexto fora dela, na raiz e em `docs/`. Git continua na raiz, sem repositório aninhado ou pacote npm de redirecionamento. Código, assets, testes e configurações mantêm suas relações internas. Comandos npm passam a ser executados dentro da aplicação. Reorganização anterior à F01a, sem autorização de avanço funcional.

**D23 — SQLite local confirmado na F01a, 29/10/2026:** após comparação pesquisada SQLite/MySQL, Gabriel escolheu “SQLite local (recomendado)”. Confirma o motor para o uso local; driver, local dos arquivos, separação/restauração, backup e credenciais não foram decididos nessa pergunta. Comparação e sondagem do runtime no [ADR 0002](adr/0002-sqlite-local-proposto.md). Nenhum banco foi criado ou biblioteca instalada.

**D24 — método padrão dos gastos confirmado na F01a, 29/10/2026:** Gabriel escolheu “Parcelas por fatura (recomendado)” para resumo e relatórios. Compra de 1.200 em 6x aparece como 200 em cada fatura; total contratado de 1.200 na data da compra permanece como outra visão. Pagamento da fatura não vira outro gasto. Não define sozinho alocação em ciclos salariais, estornos por período ou fluxo de caixa; detalhar nas entregas dependentes.

**D25 — acesso ao SQLite e worker, confirmado na F01c em 29/10/2026:** após prova no Electron real e explicação de que a API é release candidate, Gabriel escolheu “API incluída + worker dedicado (recomendado)”. Usar node:sqlite no lado privilegiado, fora da thread principal. Não habilitar Node/Web Workers privilegiados no renderer. Prova e limites no ADR 0002; revalidar em atualizações do runtime, sem driver externo instalado.

**D26 — diretório de dados, confirmado na F01c:** Gabriel escolheu “LocalAppData\\FinDesk\\data (recomendado)”, isto é, `%LOCALAPPDATA%\FinDesk\data`, fora do repositório. Não usar a pasta Roaming padrão do Electron para esses bancos por decisão unilateral. Esta avaliação criou apenas bancos temporários; o caminho escolhido ainda não foi utilizado pela aplicação.

**D27 — restauração, confirmado na F01c:** Gabriel escolheu “Restaurar dados e manter preferências/layout (recomendado)”. Demonstração separada dos dados pessoais futuros; restaurar repõe somente os fatos fictícios. Preferências/layout permanecem; restaurar layout é ação distinta. A composição da seção em Configurações foi posteriormente confirmada em D28/D29.

**D28 — seção de dados, confirmada na F01c.3:** Gabriel escolheu “Entre Integrações e Identidade (recomendado)”. Configurações recebe a seção compacta Dados de demonstração, com disponibilidade do armazenamento e ação Restaurar dados. Falha é apresentada e a restauração fica indisponível.

**D29 — confirmação inline, confirmada na F01c.3:** Gabriel escolheu “Confirmação na própria seção (recomendado)”. Texto proposto aceito: “Repor os dados fictícios? Preferências e layout serão mantidos.” Ações Cancelar e Restaurar, sem modal adicional. D27 continua definindo o alcance da operação; não há nova escolha de exclusão de dados pessoais.

**D30 — composição da F02a, confirmada:** Gabriel escolheu composição compacta: saldo à esquerda, importação/conta/moeda à direita, submenus e período abaixo; reorganizar controles em janela estreita.

**D31 — conta inicial, confirmada:** Gabriel escolheu lembrar a última conta, com Nubank de demonstração na primeira abertura. Preservar a seleção entre submenus e nas próximas aberturas; não salvar o mês histórico como preferência.

**D32 — entrega incremental da F02, confirmada:** começar pelo calendário e contexto compartilhado; ciclos de salário/cartão ficam indisponíveis com indicação breve nessa primeira fatia. D37/D38 posteriormente autorizam a primeira implementação com datas salvas e definem seu comportamento, sem encerrar configuração/recorrências.

**D33 — câmbio da demonstração, confirmado:** usar a cotação fictícia do cenário v1, 1 USD = 5 BRL em 29/10/2026, claramente identificada. Oferecer Original/BRL/USD e Todas as contas, com total convertido somente em moeda comum. Não há provedor real escolhido. Critérios em [financas/ESTRUTURA.md](financas/ESTRUTURA.md).

**D34 — revisão do saldo e seletores, solicitada por Gabriel:** retirar os textos visíveis “Saldo em conta · …” e “Saldo na referência fictícia de …”; apresentar o saldo em card, com ícone de carteira no canto. Banco/conta e moeda passam a botões circulares com marca/bandeira. Demonstração permanece identificada no título e a cotação fictícia continua explícita quando há conversão; contexto/data podem permanecer nos nomes acessíveis, sem repetir parágrafos.

**D35 — opções soltas com expansão, confirmada por Gabriel:** ao abrir, círculos descem deslizando, sem caixa/fundo do seletor. Não é roda/carrossel e a “rolagem” descreve o movimento de expansão. Ao passar o mouse, cada círculo se alonga lateralmente e revela o nome dentro do próprio botão de pontas bem arredondadas; o foco por teclado oferece o mesmo acesso. Sem tooltip separado para substituir essa interação. Preservar seleção/persistência e os estados já aprovados. Novos controles financeiros devem partir dessa direção, sem adiar a interação própria para o fim do protótipo.

**D36 — revisão seguinte do cabeçalho, solicitada por Gabriel:** saldo com fundo uniforme, sem degradê, e altura um pouco maior. Conta/moeda não repetem a opção selecionada na lista; gatilho fechado mantém somente hover, opções abertas continuam expandindo lateralmente. Período passa a três botões quadrados com cantos arredondados, calendário/cofre com moeda/cartão, mutuamente exclusivos e calendário inicial. A disposição foi esclarecida e substituída por D39; colocar ações no título e intervalo abaixo dos botões foi interpretação rejeitada do Codex, não decisão de Gabriel.

**D37 — primeira ligação dos ciclos, confirmada por Gabriel:** usar somente datas fictícias já salvas, sem gerar ausentes. Salário segue a data prevista até a véspera da próxima (regra já confirmada). Cartão vai do dia seguinte ao fechamento anterior até o próximo fechamento, incluindo este dia; vínculos observados de compras/faturas preservados. Modos dependem da conta selecionada; Todas as contas ou falta de datas necessárias tornam o modo indisponível, com motivo no hover/foco. Configuração de recorrência, dias úteis e meses curtos gerados permanece para etapa própria.

**D38 — troca de conta sem ciclo, confirmada por Gabriel:** “Troca para o calendário sem avisar, pois se não está disponível não tem o que fazer”. Se a nova conta não suporta o modo salário/cartão ativo, voltar automaticamente ao calendário, sem aviso. Isso substitui a recomendação do Codex de manter o modo indisponível e não deve ser novamente tratado como pergunta em aberto.

**D39 — posição dos grupos, esclarecida por Gabriel:** somente calendário/salário/cartão ficam em coluna ao lado do card de saldo; a expansão do intervalo fica à direita do botão ativo. Ações de importar/banco/moeda permanecem juntas, lado a lado, no canto anterior; não vão para a linha do título. Preservar posição e largura do saldo, com o aumento discreto de altura e fundo uniforme pedidos em D36. A referência a duas colunas foi esclarecida, não aprovada. Em janela estreita, reacomodar o período sem esmagar saldo/intervalo ou mover as ações para o título.

**D40 — calendário recolhível, solicitado por Gabriel:** retirar a linha de datas do calendário, deixando mês/ano e navegação alinhados à altura do botão (44 px). Selecionar Calendário não abre imediatamente o seletor: aparece um pequeno retângulo com seta à direita, que expande/recolhe a seleção do mês. Recolher preserva o mês/contexto, sem alterar fatos ou preferências. Outros modos mantêm os intervalos salvos já acordados; não ampliar essa alteração sem solicitação. As datas do calendário continuam disponíveis na descrição acessível, sem linha visível.

**D41 — expansão dos três períodos, revisão solicitada por Gabriel:** aba menor somente na largura (20 px), mantendo 44 px de altura tanto fechada quanto aberta. A seta acompanha a extremidade direita durante a expansão/retração e, aberta, fica em botão separado do seletor por 8 px. Calendário, salário e cartão iniciam recolhidos e compartilham o comportamento; nenhum mostra a linha de datas. Intervalos completos permanecem no contexto e na descrição acessível. Escape recolhe com retorno de foco, sem alterar o período. Ícone salarial passa a cofrinho recebendo moeda. Remover a linha divisória entre submenus e conteúdo, preservando a indicação do submenu ativo. Sem alteração financeira ou dos demais grupos do cabeçalho.

## Escolhas de implementação dentro da arquitetura estabelecida

Não são novas decisões de produto nem uma troca de stack. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md) e [ADR 0001](adr/0001-base-desktop.md).

- Um repositório e um pacote npm privado, sem monorepo de pacotes ou backend HTTP local de aplicação.
- Componentes Angular standalone, detecção OnPush e signals para o pequeno estado de apresentação; sem biblioteca adicional de estado global.
- Rotas carregadas sob demanda e localização por hash para recarregar páginas do build local.
- Contratos `shared/desktop-api.ts` e `shared/storage-api.ts`: versão e operações específicas de armazenamento, sem IPC/SQL/caminhos genéricos. Revalidação no principal e worker; dados demo/preferências em arquivos separados.
- Electron isolado e com sandbox; conteúdo de produção por protocolo local restrito, sem `file://` como origem da interface.
- Tokens semânticos e preset da versão MIT de PrimeUIX para PrimeNG pontual. Fontes do sistema, sem downloads de fontes, analytics ou telemetria do app.
- npm e lockfile; TypeScript estrito, ESLint, Prettier, testes de segurança e teste de navegação no Electron.
- F01b concretiza a representação apresentada na F01a em `FinDesk-Project/domain/`, sem frameworks/I/O: centavos seguros e razões BigInt para apresentação, datas civis e fatos/vínculos observados. Fixtures de demonstração ficam em `fixtures/financas/`, fora de banco e interface. Contratos de compra/parcela/previsão são distintos de movimento de caixa. Não é implementação de relatório ou ciclo bancário.

## Propostas do Codex

- SQLite/API/worker e diretório confirmados em D23/D25/D26. F01c.2 implementa o armazenamento mínimo. Escolha técnica: agregado financeiro v1 em JSON canônico validado dentro de SQLite, separado das preferências; evita antecipar tabelas por entidade e mantém a transação dos vínculos. Normalização futura exige migração versionada. Detalhes em DATA_MODEL e ADR 0002.
- A base visual será mantida com conteúdo enxuto, conforme D12. Os estudos A/B são históricos; a logo original agora está aplicada conforme D10. Ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- F02a concretiza contexto/cabeçalho; D34–D39 revisam a interação e autorizam a primeira fatia de ciclos sobre datas salvas. Próxima proposta: configuração de fontes/recorrências e preferência de período, discutindo as pendências restantes em PERIODOS. As regras já respondidas não voltam ao estado de pergunta em aberto.

## Pesquisas realizadas e manutenção

As versões estão fixadas em [package.json](../FinDesk-Project/package.json) e [package-lock.json](../FinDesk-Project/package-lock.json). Compatibilidade foi conferida na documentação oficial e nos `peerDependencies` publicados, seguida de instalação e build locais. Node.js instalado: 24.21.0; TypeScript: 5.9.3; Angular: 21.2.25; CLI/build: 21.2.29; PrimeNG: 21.1.10; PrimeUIX Themes: 2.0.3; Electron: 45.1.0.

Na pesquisa, PrimeNG 22.1.4 trouxe licença PrimeUI com chave e renovação anual da modalidade gratuita. A versão 21.1.10 Community preserva MIT, e foi a opção escolhida por Gabriel após apresentação das alternativas. Não há assinatura ou chave de licença criada pelo projeto. Atualizar o major de PrimeNG exige nova análise de licença e compatibilidade.

Fontes consultadas em 28/10/2026:

- [Compatibilidade Angular/Node/TypeScript](https://angular.dev/reference/versions).
- [Suporte e LTS do Angular](https://angular.dev/reference/releases).
- [Licença oficial PrimeNG 21.1.10](https://raw.githubusercontent.com/primefaces/primeng/21.1.10/LICENSE.md).
- [Pacote publicado PrimeNG 22.1.4, cujo LICENSE.md foi inspecionado](https://registry.npmjs.org/primeng/-/primeng-22.1.4.tgz).
- [Segurança do Electron](https://www.electronjs.org/docs/latest/tutorial/security) e [política de suporte](https://www.electronjs.org/docs/latest/tutorial/electron-timelines).
- [IPC e preload](https://www.electronjs.org/docs/latest/tutorial/ipc).
- [Barras de janela](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar).

## Perguntas aguardando resposta e pesquisas futuras

Angular/PrimeNG e barra nativa continuam confirmados em D07/D08. A limpeza de conteúdo foi acordada em D12, e a logo original foi aplicada conforme D10. Em 29/10/2026, Gabriel aprovou explicitamente o conjunto atual (casca, ajustes, F00 e reorganização) e autorizou commit e push. F01a não foi iniciada por essa tarefa de registro Git.

**Tipografia respondida:** a opção A foi confirmada e aplicada conforme D15. A comparação A/B/C permanece apenas como artefato de avaliação fora do app, com valores fictícios identificados.

**Respondidas na F01a:** banco SQLite (D23) e método padrão dos gastos por fatura (D24). Não repetir essas perguntas sem novas evidências.

**Respondidas na F01c:** API incluída com worker (D25), diretório LocalAppData (D26) e restauração de dados demo preservando preferências/layout (D27). Não repetir essas escolhas sem novas evidências.

Continuam para as entregas correspondentes: formatos adicionais de dados/layout, regras de ciclos, parâmetros de detecção/variáveis/alertas, metodologias restantes de indicadores/simulador, arquivos de importação, cobertura/termos de integrações e empacotamento. Armazenamento mínimo, restauração e contexto calendário foram concretizados nas fatias F01c/F02a, com alcance delimitado. Não há aprovação implícita das escolhas futuras. Precisão/datas da F01b aprovadas ao autorizar a próxima entrega.
