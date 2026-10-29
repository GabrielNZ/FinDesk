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

## Escolhas de implementação dentro da arquitetura estabelecida

Não são novas decisões de produto nem uma troca de stack. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md) e [ADR 0001](adr/0001-base-desktop.md).

- Um repositório e um pacote npm privado, sem monorepo de pacotes ou backend HTTP local de aplicação.
- Componentes Angular standalone, detecção OnPush e signals para o pequeno estado de apresentação; sem biblioteca adicional de estado global.
- Rotas carregadas sob demanda e localização por hash para recarregar páginas do build local.
- Contrato `FinDesk-Project/shared/desktop-api.ts`; uma operação de leitura de versão, sem IPC genérico ou acesso a arquivos.
- Electron isolado e com sandbox; conteúdo de produção por protocolo local restrito, sem `file://` como origem da interface.
- Tokens semânticos e preset da versão MIT de PrimeUIX para PrimeNG pontual. Fontes do sistema, sem downloads de fontes, analytics ou telemetria do app.
- npm e lockfile; TypeScript estrito, ESLint, Prettier, testes de segurança e teste de navegação no Electron.

## Propostas do Codex

- SQLite está confirmado em D23; driver, esquema e persistência continuam sem implementação. As alternativas e a pesquisa estão no [ADR 0002](adr/0002-sqlite-local-proposto.md).
- A base visual será mantida com conteúdo enxuto, conforme D12. Os estudos A/B são históricos; a logo original agora está aplicada conforme D10. Ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- Próxima pequena entrega sugerida após a revisão da F01a: F01b, regras comuns de dinheiro/datas e fixtures executáveis dos cenários independentes das políticas ainda abertas. Representações técnicas propostas em [DATA_MODEL.md](DATA_MODEL.md); F01c permanece separada para persistência.

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

Continuam para as entregas correspondentes: biblioteca e esquema, localização/separação/restauração/preferências, regras de ciclos, parâmetros de detecção/variáveis/alertas, metodologias restantes de indicadores/simulador, arquivos de importação, cobertura/termos de integrações e empacotamento. Não há aprovação implícita dessas escolhas. A proposta técnica de precisão/datas está documentada para revisão na F01a; não é requisito de produto inferido de uma resposta sobre o banco.
