# Estado do FinDesk

Atualizado em **29/10/2026** (America/Sao_Paulo).

## Situação atual

**F01c.3 aprovada; F02 autorizada para levantamento.** “Vamos para a próxima” aprova a seção de demonstração apresentada, autoriza seu commit/push e o início da próxima pequena entrega. Configurações apresenta a disponibilidade do armazenamento e a restauração explícita dos dados fictícios conforme D28/D29. Escolhas abertas da F02 serão discutidas antes da implementação dependente.

## F01c.3 — última entrega aprovada

- **Confirmado:** seção compacta Dados de demonstração entre Integrações e Identidade; confirmação na própria seção com Cancelar/Restaurar e o aviso de preservação de preferências/layout. Sem modal adicional. D27 continua definindo que somente fatos fictícios são repostos.
- **Implementado:** [componente](FinDesk-Project/src/app/features/settings/demo-data-settings.component.ts) e estado local da seção via ponte existente, sem alteração do backend. Estados de verificação, disponível, restauração, falha e prévia sem ponte. Botão indisponível quando não há armazenamento acessível; erro sanitizado e Verificar novamente, sem disparar restauração implícita.
- **Interação:** foco inicial em Cancelar; Cancelar/Escape preservam os fatos e devolvem foco à ação. Progresso bloqueia nova restauração/cliques repetidos. Sucesso anuncia retorno e devolve foco; falha oferece nova verificação. Saída da página não tenta focar componente destruído. Não há recarga global do layout.
- **Verificação:** tipos/templates, lint, formatação e build web passaram; quatro cenários Electron aprovados nesta rodada (três novos da seção + casca). Cobertos cancelamento/clique/Escape, foco, operação única, preferências preservadas, falha de escrita sem detalhes SQL/caminho, verificação sem reposição automática, versão futura sem apagamento e janela sem ponte. Conferência visual ampla/compacta, sem corte horizontal; fonte do botão confirmada como Segoe UI Variable Text em prévia.
- **Isolamento:** testes em perfis/bancos temporários fictícios; nenhuma restauração foi executada pelo agente no banco normal aberto por Gabriel. Os 30 testes Node anteriores continuam válidos; não foram repetidos por mudança só da interface. Backend/IPC/dependências/lockfile preservados.
- **Como conferir:** Configurações → Dados de demonstração. A versão em desenvolvimento aberta usa recarga da interface. Ação só repõe a demonstração após confirmar; preferências/layout permanecem. Fluxos financeiros ainda não aparecem nas telas.
- **Perguntas aguardando resposta:** nenhuma desta seção; as duas escolhas foram respondidas. Motor, worker, diretório e alcance da restauração já confirmados em D23/D25–D29; não repetir perguntas.
- **Próxima entrega proposta — F02:** iniciar a estrutura de Finanças com cabeçalho/saldo e cinco submenus, preservando o contexto. Levantar conta inicial e políticas dos ciclos/fechamento/dias úteis antes das partes dependentes. Mês calendário e moeda Original continuam os padrões já registrados; não transformar sugestões em regras aprovadas.
- **Autorização:** F01c.3 aprovada por “vamos para a próxima”, após sua apresentação. Commit/push autorizados e F02 iniciada pelo levantamento; regras de ciclos e composição da tela não ficam aprovadas implicitamente.

## F01c.2 — histórico da entrega aprovada

- **Implementado:** [serviço/worker/store](FinDesk-Project/desktop/storage/store.ts) e [contratos da ponte](FinDesk-Project/shared/storage-api.ts), com demo.sqlite e preferences.sqlite em `%LOCALAPPDATA%\FinDesk\data`. Apenas fatos fictícios, sem criar banco pessoal. Inicialização assíncrona em relação à janela; encerramento fecha o serviço/worker.
- **Esquema:** v1 com identidade/marcador, agregado financeiro JSON canônico e preferências tipadas. Estrutura, precisão, datas e vínculos verificados na leitura. Migração transacional; versão futura, arquivo desconhecido, corrupção ou snapshot removido não provocam recriação/seed automático. Racional em DATA_MODEL; ainda não são tabelas por entidade.
- **Persistência:** alterações e preferências sobrevivem à reabertura; seed não substitui dados existentes. Restaurar só substitui o agregado demo numa transação. Preferências e outros arquivos preservados. Namespace de layout em teste é sentinela, não implementação dos cards de F03.
- **Preferências iniciais:** moeda Original/BRL/USD e modo calendário/salário/cartão, versão 1; padrões Original/calendário. Nenhuma regra de ciclo, seleção histórica inicial ou preferência de navbar inferida.
- **Segurança:** cinco operações específicas de storage, sem SQL/caminho/escrita genérica de fatos no renderer. Validação de remetente/frame/origem/argumentos no principal e mensagens no worker; confirmação literal para restaurar; falhas sem caminhos/SQL. Outra janela com a mesma URL é recusada.
- **Verificações:** tipos/templates, lint, formatação, build web/desktop passaram. Passaram 30 testes Node (18 domínio + quatro segurança + oito persistência) e três Playwright no Electron (casca + dois storage). Cobertura: reabertura, seed, migração/rollback, falha de escrita, estrutura inválida, versão futura, isolamento e contratos. Ajuste na identificação de tabelas internas SQLite validado com teste focado; não repetidos os gestos da navbar, cujo código não mudou.
- **Isolamento:** testes apenas em perfis temporários validados; não gravaram nos bancos normais de LocalAppData. Nenhuma dependência adicionada; lockfile preservado. test:persistence reproduz backend; npm test inclui os 30 testes Node.
- **Limites:** telas ainda não consomem dados/preferências e não há botão visual de restauração. Falha inicial mantém a casca acessível e informa erro pela API; apresentação será concluída em F01c.3. Sem integração, importação, backup independente, recuperação de corrupção, mudança de múltiplas instâncias ou validação de instalador/ASAR.
- **Perguntas aguardando resposta:** nenhuma para concluir este backend. Composição da seção de dados/estado/confirmação será levantada na próxima fatia. D25–D27 continuam confirmadas.
- **Próxima entrega proposta — F01c.3:** definir com Gabriel uma seção enxuta em Configurações, apresentação de disponibilidade/falhas e confirmação explícita da restauração preservando preferências. Implementar a composição acordada e validar o fluxo real antes de F02.
- **Autorização:** “vamos para a próxima”, após a apresentação, aprova F01c.2, autoriza commit/push e inicia F01c.3 pelo levantamento visual/comportamental. A composição ainda aberta será discutida antes da implementação dependente.

## F01c.1 — histórico da entrega aprovada

- **Concluído:** pesquisa oficial, [prova reproduzível](FinDesk-Project/scripts/probe-sqlite.mjs), três respostas registradas em DECISIONS/ADR e [plano de persistência](docs/financas/PERSISTENCIA.md). A F01c foi subdividida para separar esta avaliação, a implementação mínima (F01c.2) e o acesso explícito na interface (F01c.3), mantendo o escopo completo antes de F02 depender de dados/preferências salvos.
- **Confirmado:** node:sqlite em worker Node privilegiado, fora da thread principal; `%LOCALAPPDATA%\FinDesk\data`; restauração somente dos fatos fictícios, preservando preferências/layout. Não repetir essas perguntas sem novas evidências.
- **Verificação:** prova no Electron 45.1.0 real, sem janela, com Node 24.22.1 no principal e no worker. Seis grupos passaram: parâmetros, rollback, referências, inteiros/BigInt, reabertura/versão/integridade e cópia consistente. Perfil/bancos temporários com destino validado e limpeza automática; nenhum banco pessoal ou caminho definitivo foi modificado. Lint/formatação passaram; links e diff conferidos.
- **Ajuste da prova:** a primeira inicialização ESM excedeu o tempo; o executor foi corrigido para iniciar pelo callback de app.whenReady. A prova final passou, sem mudança no ponto de entrada do aplicativo. Nenhuma dependência foi instalada; lockfile preservado.
- **Limites:** avaliação de capacidade não é persistência integrada. Não há esquema financeiro, migrações/seed da aplicação, nova API IPC, restauração do produto ou instalador validados nesta rodada. Os 22 testes Node anteriores continuam válidos para o domínio/segurança, cujo código não mudou; não foram repetidos. Sem build web/Playwright ou integração real.
- **Perguntas aguardando resposta:** nenhuma nesta rodada; as três foram respondidas. Composição do acesso à restauração, formatos completos de preferências/layout e comportamentos ainda não definidos serão discutidos na fatia pertinente. Diretório/motor/worker e preservação de preferências já estão confirmados.
- **Próxima entrega proposta — F01c.2:** armazenamento mínimo no worker, bancos de demonstração/preferências separados da restauração, esquema/migrações versionados, seed idempotente e operação interna explícita de restauração. Testar reabertura, alterações preservadas, falhas/rollback e isolamento em perfis fictícios. Critérios detalhados no plano; a seção de Configurações fica para F01c.3 com composição discutida antes de implementar.
- **Autorização:** “vamos para a próxima” aprova F01c.1 e autoriza commit/push e o início da F01c.2 proposta. Dados pessoais, conexão real e distribuição não estão no escopo. F01c.3 continua como entrega separada.

## F01b — histórico da entrega aprovada

- **Implementado:** [domínio puro](FinDesk-Project/domain/finance.ts), dinheiro em centavos seguros por moeda, somas/subtrações controladas, subtotal conhecido com ausência explícita, divisão/conversão de apresentação com razão exata, datas civis/calendário/intervalos e relógio fixo.
- **Fatos e fixtures:** [demo.ts](FinDesk-Project/fixtures/financas/demo.ts), conjunto base C02–C07/C10 e variantes C09/C18; origens/cobertura fictícias, contas BRL/USD, caixa separado de compras/parcelas/faturas/previsões, agendas observadas atravessando ano, mensal/anual e recebimento salarial antecipado/atrasado. Sem dados pessoais ou seed de banco.
- **Consistência:** IDs/moedas/sinais e vínculos validados, contrapartidas de transferência, pagamento integral recíproco, agenda somando a compra e identificação explícita das parcelas observadas. Saldo usa abertura + caixa até data fornecida; itens de cartão/previsão não criam débito. Subtotal de fatura em formação não é apresentado como total final. Pagamento pode partir de outra conta própria na mesma moeda.
- **Verificação:** tipos/templates, lint, formatação e 22 testes Node aprovados (18 domínio + quatro segurança). Testes de domínio incluem quatro fusos, meses curtos/bissextos, centavos, excesso de precisão, ausência, moeda, cronograma observado, previsão versus fato e identidades/vínculos inválidos. Rodada final de domínio repetida somente após acrescentar a identificação obrigatória de parcela observada. Sem repetir Playwright/build web, pois interface/ponte não mudaram.
- **Limites:** não há tela financeira consumindo fixtures, banco, nova API IPC, importação/conciliação, gerador de ciclo/parcelamento, fórmula diária, estorno/rotativo/parcial ou motor de previsão/detecção. A rejeição de ID de origem repetido verifica o conjunto interno; não implementa reimportação idempotente. Cobertura de cada cenário está delimitada no catálogo.
- **Dependências:** nenhuma biblioteca adicionada, versões/lockfile preservados. `npm run test:domain` executa somente domínio; `npm test` inclui segurança; `npm run check` inclui os novos arquivos nas verificações.
- **Perguntas aguardando resposta:** nenhuma necessária para concluir F01b. Datas de ciclos, parâmetros de indicadores, séries/associações e detalhes da persistência continuam abertos para suas entregas.
- **Próxima entrega proposta — F01c:** levantamento de persistência da demonstração/preferências, avaliação controlada do driver/API SQLite e proposta de localização, separação dos ambientes, restauração e migrações. Trazer alternativas técnicas verificadas e discutir os comportamentos de dados antes da implementação dependente; não avançar automaticamente a F02.
- **Autorização:** F01b aprovada por “vamos para a próxima”; commit/push autorizados e F01c iniciada pelo levantamento proposto. A autorização não define sozinha diretórios, restauração, retenção ou arquitetura do acesso ao banco.

## F01a — histórico da entrega aprovada

- **Concluído:** [52 requisitos com IDs, fonte, aceitação e etapas](docs/financas/REQUISITOS.md), [catálogo de 31 cenários fictícios](docs/financas/CENARIOS.md), comparação pesquisada de armazenamento e [proposta de representação/contratos](docs/DATA_MODEL.md). Fatos, previsões, resultados invariantes e políticas pendentes estão separados. As fixtures executáveis ficam para F01b.
- **Respostas confirmadas:** SQLite local; gastos por parcelas de cada fatura por padrão, mantendo a visão do total contratado na data da compra. Pagamento de fatura continua sem duplicar consumo. D23/D24 registram as perguntas, respostas e limites; não perguntar novamente sem novas evidências.
- **Pesquisa técnica concluída nesta fatia:** [ADR 0002](docs/adr/0002-sqlite-local-proposto.md) compara SQLite e MySQL com fontes oficiais sobre execução local, instalação/manutenção, backup e compatibilidade. Sondagem local: Electron 45.1.0, Node embarcado 24.22.1, ABI 150, DatabaseSync disponível em node:sqlite. O módulo foi carregado sem abrir banco; driver continua em avaliação, sem garantia de persistência/empacotamento.
- **Propostas técnicas para revisão:** centavos inteiros com verificação de segurança das operações; datas civis separadas de instantes; distribuição de sobra nas primeiras parcelas geradas, preservando agenda observada; arredondamento explícito de exibição e taxa representada com precisão própria. Não são novas fórmulas financeiras já implementadas.
- **Validação documental:** integridade das fontes, IDs/referências e links locais, aritmética do diário/parcelas/conversão fictícia e diff. Sem novo build, testes de interface ou suíte financeira, pois o código não mudou. A sondagem de runtime não é teste de banco.
- **Pendências de pesquisa:** driver/execução e diretórios da persistência em F01c; origem/licença das logos e bibliotecas de cards nas etapas pertinentes. Sem pesquisa ou conexão de provedor bancário nesta rodada.
- **Perguntas aguardando resposta:** nenhuma nesta primeira rodada; as duas perguntas foram respondidas. Permanecem para as etapas correspondentes as políticas de ciclos/fechamento/dias úteis, disponível diário, protegido, parâmetros de médias/detecção/alertas, séries/pagamentos e inativação/reativação. O catálogo identifica os resultados condicionais.
- **Próxima entrega proposta — F01b:** tipos/regras comuns de dinheiro e datas, fixtures executáveis dos fatos-base e testes pertinentes (moeda/precisão, vínculos, transferências/faturas sem duplicação, parcelas observadas e relógio determinístico). Usar os cenários prioritários ao final do catálogo; não construir os motores/telas/indicadores ainda dependentes das políticas abertas. Persistência continua separada em F01c.
- **Autorização:** “vamos para a próxima” aprova F01a, autoriza seu commit/push e o início de F01b conforme o escopo acima. As propostas técnicas de representação apresentadas na F01a serão concretizadas nessa base, preservando os limites documentados. F01c não foi autorizada automaticamente.

## Reorganização atual

- **Confirmado por Gabriel:** pasta `FinDesk-Project/` para todo o código e ferramentas; documentos e contexto fora dela. Decisão D22.
- **Movido:** `src/`, `desktop/`, `shared/`, `public/`, `scripts/`, `tests/`, package/lockfile, configurações Angular/TypeScript/ESLint/Playwright/Prettier/npm e dependências, caches, builds e resultados locais existentes. `.git`, regras Git e `.editorconfig` permanecem na raiz. Nenhum repositório ou pacote npm adicional criado.
- **Preservação:** os 50 arquivos de código, assets e configurações foram conferidos por hash imediatamente após a mudança. Sem alteração de comportamento; nenhuma reinstalação de dependências. Originais recebidos e documentação não foram movidos para dentro da aplicação.
- **Ajustes:** caminhos e comandos documentados, exclusões Git também para diretórios pessoais dentro da aplicação; formatação npm restrita à pasta da aplicação.
- **Validação na nova localização:** `npm run check` passou (tipos/templates, lint, formatação e quatro testes de segurança), assim como `npm run build:web` e o teste Playwright da casca no Electron (abertura, ponte, navegação, recarga, recolhimento, teclado e janela menor). Não foi repetida a suíte de gestos da navbar, cujo código não mudou. Links locais, exclusões Git e integridade da especificação conferidos; sem reinstalação ou início de F01a. Resultados reutilizados na preparação do commit, pois o código não mudou desde a validação.

## Finanças — continuidade incremental

- **Requisito confirmado:** seguir a [especificação integral de Finanças](docs/FINANCAS_SPEC.md), por pequenas entregas. Ela prevalece sobre sugestões antigas conflitantes dessa área; não muda a stack, a marca ou o comportamento vigente da navbar.
- **Concluído em F00:** [diagnóstico, matriz de lacunas e plano adaptado](docs/FINANCAS_F00.md), aprovado no commit `6920552`. Existentes: base Angular/Electron, identidade, tokens, navegação e fronteira desktop. Parcial: acesso a Finanças, Configurações e infraestrutura de testes. Ausentes: dados/domínio financeiros, banco, cálculos, cinco submenus e demais fluxos F02–F20. F01a não muda essa condição do software.
- **Documentação:** original recebido na raiz preservado; cópia integral em `docs/FINANCAS_SPEC.md` com SHA-256 idêntico. Brief, índice, roadmap, decisões, design, regras, modelo, testes e ADR receberam referências/ajustes de precedência. A rastreabilidade detalhada por IDs ainda pertence à F01a.
- **Verificações desta F00:** inspeção estática do código/documentos, comparação de hash da especificação, links locais dos documentos alterados e `git diff --check`. Sem novo build, teste funcional ou inspeção visual. Resultados anteriores da casca foram reutilizados; não constituem cobertura financeira.
- **F01a autorizada:** entrega documental e respostas descritas no bloco atual acima; sem instalar banco ou criar telas.
- **Dependências propostas:** F01b para regras comuns e fixtures executáveis após respostas pertinentes; F01c para persistência mínima após decisão conjunta, antes das preferências salvas de F02/F03. F02–F20 seguem a referência da especificação, com subdivisões quando necessário.
- **Pesquisa de armazenamento:** comparação e escolha concluídas na F01a; driver e detalhes de persistência continuam pendentes. Integração real permanece para F20.
- **Levantamento:** demais temas da seção 16 serão discutidos em pequenas rodadas antes da implementação dependente; não bloqueiam fatos/cálculos comuns independentes.
- **Histórico de autorização:** casca/F00/reorganização em `6920552`; F01a em `4694ef9`; F01b em `34af7ad`; F01c.1 em `8abad2a`; F01c.2 em `0bc8b33`, todas aprovadas/enviadas. F01c.3 é a entrega atual; próxima proposta F02.

## Entrega atual

- Angular 21.2.25, PrimeNG 21.1.10 Community MIT, TypeScript 5.9.3 e Electron 45.1.0, com versões exatas e lockfile.
- Janela Windows com barra nativa, tema escuro e navegação Visão geral / Finanças / Investimentos.
- Configurações por engrenagem, com seção Integrações em estado de preparação.
- Página de abertura e estados de preparação, sem dados financeiros inventados ou saldos zero apresentados como reais.
- Diálogo PrimeNG de versão, ponte pequena e tipada, sandbox, contexto isolado e protocolo local restrito.
- Logo original com moedas e seta ascendente aplicada ao menu, favicon e arquivos de ícone. O PNG original em `FinDesk-Project/public/brand/logo-original.png` foi preservado sem alteração; contém as versões branca e preta, enquadradas para apresentação sem redesenho. Os estudos anteriores foram preservados apenas como histórico.
- Documentação de produto, decisões, arquitetura, regras, modelo, design, integrações, roadmap, testes e ADRs.

## Decisões confirmadas nesta entrega

1. **Angular 21 + PrimeNG 21 Community MIT**, após pesquisa de compatibilidade e licença e apresentação de alternativas. A versão 22 de PrimeNG exige chave/renovação na modalidade gratuita; não foi adotada.
2. **Barra nativa do Windows** inicialmente.
3. **Correção de identidade:** a logo original fornecida prevalece e agora está aplicada. O registro anterior de B como marca definitiva foi corrigido.
4. **Manter a base visual e enxugar o conteúdo**, resposta explícita na revisão; sem adensar ou redesenhar o layout nesta rodada.
5. **Participação antes de decisões relevantes de design/desenvolvimento** e **verificações agrupadas por conjunto de mudanças**, sem testes repetitivos de cada ajuste simples.

Detalhes em [docs/DECISIONS.md](docs/DECISIONS.md). Revisar a base antes do fim previsto do LTS do Angular 21 em junho/2027. SQLite/worker integrados à demonstração em F01c.2, testados em perfis fictícios. Dados reais/distribuição continuam fora desta entrega.

## Verificações da base anterior à limpeza de conteúdo

- Build de produção Angular e desktop concluído.
- TypeScript estrito, templates Angular, lint e formatação verificados.
- Quatro testes de segurança passaram: origens IPC, origem de desenvolvimento, contenção do protocolo local e CSP.
- Teste Playwright no Electron real passou: versão pela ponte, ausência de Node no renderer, sandbox no Windows, navegação, recarga, foco por teclado, Integrações, SVGs, diálogo/Escape e janela menor sem corte horizontal.
- Capturas inspecionadas em janela ampla e compacta, além dos estudos de identidade. Artefatos em `FinDesk-Project/test-results/`, ignorados pelo Git.
- Modo de desenvolvimento verificado com ponte, diálogo e ausência de erros capturados; prévia no Edge verificada sem ponte e com identificação correta de ambiente.
- Fechamento normal da janela em desenvolvimento encerrou o processo do launcher e seu servidor Angular.
- npm não apontou vulnerabilidades nas dependências instaladas. Links locais da documentação verificados.
- `npm ci` reinstalou as dependências pelo lockfile com sucesso; depois passaram `npm run check` e `npm run test:desktop`, já com a marca aplicada.
- Abertura normal, sem o modo oculto de teste, mostrou a janela; o Electron reconheceu o ícone ICO gerado.

Esses resultados são históricos da casca. A F01b adicionou os testes de domínio descritos no bloco atual. Ainda não há teste de instalador, persistência, indicadores nas telas ou integrações. As verificações incluem o Windows deste ambiente; não representam validação de outras plataformas.

## Git e aprovação

- Remoto: `https://github.com/GabrielNZ/FinDesk.git`; branch `master`, rastreando `origin/master`.
- Revisão documental aprovada e enviada: `6db9362` — `docs(projeto): consolida requisitos e regras do FinDesk`.
- Preparação Git aprovada e enviada: `f6a250d` — `chore(git): configura exclusões e preservação dos documentos`.
- Casca/F00/reorganização aprovadas e enviadas: `6920552` — `feat(base): adiciona casca desktop e organiza projeto`.
- F01a aprovada/enviada: `4694ef9` — `docs(financas): consolida requisitos e cenários da F01a`.
- F01b aprovada/enviada: `34af7ad` — `feat(financas): adiciona domínio e fixtures da F01b`.
- F01c.1 aprovada/enviada: `8abad2a` — `chore(persistencia): valida SQLite no Electron e registra decisões`.
- **Último commit enviado antes desta entrega:** `0bc8b33` — `feat(persistencia): salva demonstração e preferências no SQLite`. F01c.3 aprovada para commit/push nesta rodada.
- Política confirmada: **push após cada entrega aprovada**. Identidade Git existente preservada. Originais mantidos byte a byte no histórico após a configuração de atributos.

## Pendências e próxima entrega proposta

**Correção atual:** removidas a abertura promocional e as frases de efeito; textos objetivos nas áreas e Configurações; base visual mantida conforme a resposta de Gabriel; regras de colaboração/testes atualizadas. Foi feita uma única checagem conjunta de tipos/templates e uma conferência visual em 1380 e 960 px, sem corte horizontal. Não foram repetidas instalação, testes de segurança ou a suíte completa para essas mudanças de conteúdo.

**Aplicação da logo:** recuperado o PNG do anexo desta conversa, conferida sua transparência e preservada uma cópia com SHA-256 idêntico. O mesmo arquivo contém as versões branca e preta, antes invisíveis sobre o fundo do visualizador. SVGs de apresentação e ícones PNG/ICO foram gerados sem redesenho ou limpeza. Compilação de tipos/templates passou; a apresentação e o carregamento dos assets foram conferidos em uma única rodada visual. O ícone de uma janela já aberta pode exigir reabertura para refletir o novo arquivo.

**Ajuste atual:** removidos o bloco lateral “Meu espaço / Pessoal” e o texto “Meu espaço / FinDesk” do cabeçalho, conforme solicitado. Não tinham função implementada ou uso futuro acordado. Posteriormente, Gabriel solicitou retirar também a linha divisória horizontal do cabeçalho e o rótulo “Versão de apresentação”; permanece apenas o botão de informação com a mesma ação. Alteração restrita a HTML/CSS, revisada sem repetir a suíte.

**Tipografia confirmada e aplicada:** Gabriel escolheu a opção A: Bahnschrift nos títulos e Segoe UI Variable Text nos parágrafos e controles. Aplicação por tokens, com fallback local, sem downloads ou redistribuição; tamanhos e espaçamentos preservados. Feita uma conferência conjunta das fontes e do layout em 1380 e 960 px, sem corte horizontal; sem repetir a suíte por uma alteração apenas de estilo. Essa escolha não representa aprovação da entrega completa para commit/push.

**Aprovação atual:** Gabriel aprovou expressamente as mudanças existentes e autorizou commit/push. Substitui a pendência anterior de revisão do conjunto.

**Próximo passo vigente:** revisar F01c.3 e, mediante continuidade, registrar a entrega e iniciar F02 pelo levantamento dos requisitos abertos. Não executar F02–F20 automaticamente.

**Espaçamento superior:** reduzidas a altura do cabeçalho e a margem interna superior do conteúdo após a remoção da linha divisória, conforme solicitado. Botão de informação preservado à direita. Ajuste apenas de CSS, revisado sem executar a suíte.

**Lateral recolhível:** botão abaixo de Configurações alterna entre menu expandido e apenas ícones, com transição curta e aumento da área principal. Mantém acessibilidade, dicas dos links, navegação e expansão por teclado. Estado restrito à execução atual, sem persistência de preferências. Tipos/templates e teste conjunto no Electron passaram: botão abaixo de Configurações, largura recolhida de 72 px, ganho de largura principal, navegação recolhida e expansão por Enter. Captura da lateral recolhida inspecionada; sem repetir testes isolados de segurança por esta mudança.

**Final da lateral:** removido o rodapé “Uso pessoal / PT-BR” e seu espaço reservado. Configurações e Recolher/Expandir menu passaram para o final da barra, com respiro inferior, nos dois estados. Alteração restrita a estrutura/estilo, revisada sem repetir a suíte.

**Reposicionamento da navbar — ajuste atual:** por solicitação de 29/10/2026, removidos o redimensionamento pela borda, seus controles/gestos e o texto “Soltar: posição”. Permanece a alça para encaixar à esquerda, direita, em cima ou embaixo, com prévia visual sem legenda e confirmação ao soltar. O botão de recolher/expandir e a adaptação horizontal permanecem. D20 substitui as partes correspondentes de D18/D19. Estado em memória, sem novas operações IPC ou banco. Verificação conjunta concluída: tipos/templates, lint e build web passaram; os cinco testes Playwright no Electron passaram, cobrindo encaixe nos quatro lados, prévia sem texto, recolhimento/expansão, cancelamento, alternativa por teclado, ausência de redimensionamento pela borda e navegação da casca.

**Persistência — sequência atual:** motor SQLite confirmado em F01a; API/worker, diretório e preservação de preferências na restauração confirmados em F01c.1. F01c.2 implementa esquema, migrações, seed e restauração; F01c.3 acrescenta a interface conforme D28/D29. A aprovação atual está registrada no início deste arquivo.

Ainda não implementados: os fluxos da versão local de Finanças definidos em F01–F19, inclusive cards dinâmicos, compromissos, assinaturas, previsões, detecção, disponível, orçamento e alertas. Integrações reais permanecem separadas em F20. Carteira de investimentos, simulador, tema claro, backup/restauração elaborados e instalador seguem seus escopos próprios. Consultar [docs/ROADMAP.md](docs/ROADMAP.md) e [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Como conferir

Na raiz, execute `cd FinDesk-Project`. Nessa pasta, `npm ci` instala as dependências, `npm start` compila e abre a janela, `npm run dev` oferece recarga da interface e `npm run dev:web` abre somente o servidor da prévia em `http://127.0.0.1:4200`. Demais comandos e limites em [README.md](README.md).
