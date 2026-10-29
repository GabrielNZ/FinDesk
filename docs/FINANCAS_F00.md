# Finanças — F00: diagnóstico e plano local

Diagnóstico de 29/10/2026. Requisitos: [FINANCAS_SPEC.md](FINANCAS_SPEC.md), versão 1.0, lida integralmente. Este arquivo registra evidências e a adaptação do plano; o estado e a autorização ficam exclusivamente em [PROJECT_STATUS.md](../PROJECT_STATUS.md).

Nota de localização: após F00, Gabriel solicitou agrupar a aplicação em `FinDesk-Project/`. Os caminhos de código abaixo foram atualizados para essa organização; o diagnóstico funcional e a proposta de F01a permanecem os mesmos.

## Objetivo e alcance

Identificar o que pode ser preservado, as lacunas e as decisões que antecedem a implementação de Finanças. F00 altera somente documentação. Não instala dependências, escolhe banco, cria fixtures, modifica telas ou implementa F01–F20.

O documento recebido na raiz foi preservado. `docs/FINANCAS_SPEC.md` é sua cópia integral e passa a ser a referência de requisitos de Finanças; o arquivo da raiz fica como original recebido. Não manter duas versões editáveis da especificação. Esclarecimentos posteriores entram em DECISIONS e nos documentos correspondentes, sem reescrever a fonte para ocultar divergências.

## Evidências no código

| Parte                         | Estado                                 | Evidência e consequência                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base desktop                  | Existente                              | `FinDesk-Project/package.json`, `FinDesk-Project/desktop/main.ts`, `FinDesk-Project/src/app/app.config.ts`: Angular 21, PrimeNG 21 MIT e Electron, janela nativa e rotas por hash. Preservar a stack; sem atualização nesta etapa.                                                                                           |
| Identidade e tipografia       | Existente                              | `FinDesk-Project/public/brand/`, `FinDesk-Project/shared/product.ts`, `FinDesk-Project/src/styles.scss`: PNG original, apresentações para fundo claro/escuro, Bahnschrift e Segoe UI Variable Text. Preservar marca e tokens. Tema claro funcional ainda ausente.                                                            |
| Navegação principal           | Existente                              | `FinDesk-Project/src/app/app.html`, `FinDesk-Project/src/app/layout/`: três áreas, Configurações, recolhimento e encaixe nas quatro bordas. Sem ajuste pela borda e sem legenda de encaixe, conforme D20. Estado apenas em memória.                                                                                          |
| Fronteira desktop             | Existente                              | `FinDesk-Project/desktop/main.ts`, `FinDesk-Project/desktop/preload.ts`, `FinDesk-Project/desktop/security.ts`, `FinDesk-Project/shared/desktop-api.ts`: isolamento, sandbox, CSP e IPC validado. Única operação pública: `getRuntimeInfo()`. Novos casos de uso exigirão contratos específicos, preservando esta fronteira. |
| Página de Finanças            | Parcial: acesso e estado de preparação | `FinDesk-Project/src/app/app.routes.ts` carrega `PlannedAreaPage`; há título e descrição, sem cabeçalho financeiro, saldo, seletores, períodos ou cinco submenus. A página provisória é compartilhada com Investimentos; a evolução de Finanças não deve alterar silenciosamente a outra área.                               |
| Configurações                 | Parcial                                | `settings.page.ts`: engrenagem e seção Integrações existem, sem conexão. Configurações → Finanças e preferência de período ainda ausentes.                                                                                                                                                                                   |
| Estados e acessibilidade      | Parcial                                | Casca tem foco, nomes acessíveis, alternativa ao arraste, movimento reduzido e preparação/erro da versão. Não existem estados financeiros carregando/erro/desatualizado/incompleto por conta.                                                                                                                                |
| Cards dinâmicos e gráficos    | Ausente                                | Os painéis atuais são composição estática. O arraste da navbar não implementa organização, redimensionamento, foco ou persistência dos cards.                                                                                                                                                                                |
| Dados, domínio e persistência | Ausente                                | Sem driver SQLite/MySQL em `FinDesk-Project/package.json`, banco de aplicação, esquema, migrações, seed, repositórios ou domínio financeiro em `FinDesk-Project/src/`, `FinDesk-Project/desktop/` e `FinDesk-Project/shared/`. Não há armazenamento financeiro no navegador.                                                 |
| Funcionalidades financeiras   | Ausente                                | Sem extrato, agrupamento/categorias, compras/parcelas/faturas, compromissos, assinaturas, previsões, detecção, disponível, orçamento, alertas, importação ou integração bancária. Textos sobre essas funções não são implementação.                                                                                          |
| Testes                        | Parcial                                | Quatro casos de segurança em `FinDesk-Project/tests/security.test.mjs`; um teste da casca e quatro de navegação nos dois arquivos Playwright. Não cobrem regras financeiras, banco, importação ou personalização de cards.                                                                                                   |

## Matriz das etapas

As definições completas e os critérios continuam na seção 18 da especificação. “Ausente” descreve software, não falta de requisito.

| Etapa | Situação encontrada                           | Aproveitamento e lacuna central                                                                                                                        |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F00   | Diagnóstico realizado nesta rodada            | Leitura integral, inspeção local, conflitos e proposta de sequência registrados.                                                                       |
| F01   | Parcial em documentação; fixtures ausentes    | Regras gerais e ADR existem. Faltam IDs de requisitos, catálogo/arquivos fictícios, regras comuns implementadas e decisões de cálculo.                 |
| F02   | Parcial somente pelo acesso a Finanças        | Criar cabeçalho e submenus próprios, contexto compartilhado, períodos e preferências.                                                                  |
| F03   | Ausente                                       | Criar padrão reutilizável de cards com persistência e alternativas ao arraste; não reutilizar diretamente o controlador da navbar como motor de cards. |
| F04   | Ausente                                       | Extrato e detalhes, origem, busca/filtros, cobertura e estados.                                                                                        |
| F05   | Ausente                                       | Agrupamento ligado ao extrato e categorias com fallback e prevalência manual.                                                                          |
| F06   | Ausente                                       | Cadastros/edição contextuais, alcance de alterações e persistência.                                                                                    |
| F07   | Ausente                                       | Comparações com metodologia confirmada, gráficos e investigação por filtro.                                                                            |
| F08   | Ausente                                       | Carteira visual, seleção de cartão/fatura e limites independentes do saldo.                                                                            |
| F09   | Ausente                                       | Compras, parcelas, estornos e análises sem dupla contagem.                                                                                             |
| F10   | Ausente                                       | Compromissos, lista/calendário, modos, horizonte local e pendências anteriores.                                                                        |
| F11   | Ausente                                       | Assinaturas mensais/anuais, histórico, equivalente mensal e ações locais.                                                                              |
| F12   | Ausente                                       | Previsões de salário/contas/assinaturas e ocorrências conciliáveis.                                                                                    |
| F13   | Ausente                                       | Detecção local com confirmação e associação sem duplicação.                                                                                            |
| F14   | Ausente                                       | Ausência de cobrança condicionada à cobertura e pendências preservadas.                                                                                |
| F15   | Ausente                                       | Disponível até o salário, protegido, composição, referência diária e déficit.                                                                          |
| F16   | Ausente                                       | Orçamentos e alertas; parâmetros numéricos ainda sujeitos a confirmação.                                                                               |
| F17   | Ausente                                       | Montar os cinco blocos do Geral a partir das funções já validadas.                                                                                     |
| F18   | Ausente                                       | Importação com formatos examinados, prévia e deduplicação.                                                                                             |
| F19   | Parcial somente como infraestrutura de testes | Ampliar os testes existentes para a versão local e revisar aparência, dados e persistência.                                                            |
| F20   | Ausente                                       | Configurações contém só o espaço de Integrações; cobertura, custos e fluxos continuam sem pesquisa conclusiva ou autorização de conexão.               |

## Conflitos e precedência

1. **Escopo e ordem:** ROADMAP anterior distribuía parte da personalização e dos alertas em fases posteriores. Para Finanças, a nova especificação inclui cards dinâmicos, assinaturas mensais/anuais, compromissos, detecção, salário previsto, orçamento e disponível nesta versão local, por entregas. Integrações reais continuam separadas. Não antecipar Investimentos ou metas completas.
2. **Banco:** o mestre e o ADR autorizavam avaliar SQLite como padrão proposto. A nova especificação pede comparação com MySQL e decisão conjunta. O código confirma que nenhum dos dois foi adotado; não existe migração a executar. A escolha, o driver e a forma de armazenar dados permanecem pendentes. A comparação técnica deve anteceder a pergunta sobre a adoção.
3. **Navbar versus cards:** D20 retirou o redimensionamento da navbar. Isso não elimina o redimensionamento dos cards exigido na nova especificação. São componentes e gestos distintos.
4. **Cabeçalho:** retirar os rótulos decorativos e a linha da casca não impede criar o cabeçalho financeiro útil, com saldo e filtros. Preservar o botão Sobre e a identidade atual.
5. **Números não confirmados:** as menções a três cobranças/períodos, alertas em três dias e 80%/100% nas tabelas e no checklist não anulam as ressalvas das seções 13 e 21. São propostas até confirmação; não codificar como regras aprovadas.
6. **Regras versus exemplos:** a fórmula conceitual do disponível e os cinco blocos do Geral estão confirmados; as políticas de dias, atraso, cobertura, filtros e contabilização do cartão continuam abertas. Exemplos de valores não são dados de Gabriel.
7. **Documentação histórica:** REVIEW descreve a revisão inicial de 28/10. Referências antigas à marca ou ao push não substituem D06/D10/D20 e a especificação vigente. Manter o histórico identificado.

## Próxima entrega proposta: F01a

**Objetivo:** definir uma base verificável de requisitos e cenários antes de construir a tela ou os cálculos.

**Escopo proposto do Codex, aguardando autorização:**

- Atribuir IDs aos requisitos da especificação, relacionando-os às etapas e critérios, sem copiar toda a especificação para cada documento.
- Preparar o catálogo do conjunto fictício: contas BRL/USD, transferências próprias, pagamentos de fatura, parcelas e estorno, Sem categoria, mensal/anual, datas salariais antecipadas/atrasadas, meses curtos, cobertura incompleta, obrigação vencida e referência zero. Diferenciar fatos fictícios de resultados que dependem de metodologia ainda aberta.
- Levantar a primeira rodada de decisões: metodologia padrão de gastos e caminho da persistência. Para banco, pesquisar fontes oficiais e trazer comparação SQLite/MySQL aplicada ao Electron, incluindo instalação local, compatibilidade, manutenção e backup; só então pedir uma escolha. Não escolher driver antecipadamente.
- Definir a representação proposta de dinheiro/datas e o contrato dos primeiros cenários para discussão, com precisão, moeda, origem, cobertura e vínculos explícitos.

**Aceitação da F01a:** rastreabilidade dos requisitos, catálogo cobrindo os cenários da seção 20, propostas separadas das respostas confirmadas e próxima subetapa identificada. Sem telas novas, banco instalado, integração real ou fórmulas finais ainda pendentes.

**Subdivisão recomendada da F01:**

- **F01a:** rastreabilidade, catálogo e levantamento acima.
- **F01b:** após respostas pertinentes, regras comuns e fixtures executáveis com testes de precisão, datas e consistência. Regras de indicadores não decididas permanecem fora dos resultados esperados definitivos.
- **F01c:** persistência mínima da demonstração/preferências, após decisão de armazenamento e levantamento de separação/restauração. Validar reabertura, migrações, seed idempotente e proteção contra exclusão implícita antes de F02/F03 dependerem de preferências salvas.

Essa subdivisão é proposta de dependências, não aprovação para executar F01 inteira. F02–F20 mantêm sua ordem de referência; subdivisões adicionais serão apresentadas conforme o tamanho e as perguntas de cada entrega.

## Pendências por momento

| Momento         | Decisão ou pesquisa necessária                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01a/F01b       | Método padrão de gastos e efeitos no resumo; representação de dinheiro e datas; pesquisa comparativa de armazenamento.                                                                        |
| Antes de F01c   | Banco/driver, localização e separação da demonstração, restauração explícita, migrações e alcance das preferências.                                                                           |
| F02             | Fronteiras dos ciclos, dias 29–31, dias úteis, ausência de salário/cartão e seleção de múltiplas moedas/contas.                                                                               |
| F03             | Proposta de composição/controles, limites dos cards e comportamento em pouco espaço; pesquisar a implementação antes de nova dependência.                                                     |
| F06/F10/F12/F13 | Ocorrência versus série, marcação manual, associação e tolerâncias de detecção.                                                                                                               |
| F07             | Referência histórica, períodos desiguais e média com histórico parcial.                                                                                                                       |
| F11/F14         | Prazo de um mês, assinaturas manuais e reativação.                                                                                                                                            |
| F15/F16/F17     | Contagem diária, dia do salário/atraso, vencidos e faturas fora do horizonte, protegido por conta/global, horizonte dos compromissos e orçamento em ciclos. Confirmar parâmetros dos alertas. |
| F18/F20         | Arquivos efetivamente examinados e pesquisa de cobertura/custos/consentimento dos provedores; sem conexão nesta fase.                                                                         |

Não há pergunta nova aguardando resposta nesta F00: as perguntas serão apresentadas com recomendações verificadas na entrega pertinente. A autorização pendente é avançar para a F01a proposta.

## Validação e limites desta rodada

Inspeção estática de rotas, páginas, layout, tema, contratos desktop, segurança, dependências, testes e documentos. Estado Git conferido: branch `master`, remoto confirmado e base de aplicação ainda sem commit de aprovação. F00 não autoriza incluir todo o trabalho anterior em um commit documental.

Os resultados anteriores de tipos/templates, lint, build web e cinco testes Electron continuam registrados no estado do projeto; `.last-run.json` indica sucesso. Não foram reexecutados nem tratados como testes financeiros. Não houve nova inspeção visual, build, instalação, teste funcional ou pesquisa de provedores nesta rodada documental. Conferências desta F00: integridade da cópia da especificação, links locais dos documentos alterados e `git diff --check`.
