# Estado do FinDesk

Atualizado em **29/10/2026** (America/Sao_Paulo).

## Situação atual

**F01b aprovada; F01c autorizada para levantamento e avaliação técnica.** Gabriel autorizou a próxima entrega em 29/10/2026. Registrar primeiro F01b com commit/push; depois pesquisar e avaliar persistência SQLite, discutindo os comportamentos de dados antes da implementação dependente. Aplicação em `FinDesk-Project/`; documentação/contexto fora dela.

## F01b — entrega atual

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
- **Histórico de autorização:** casca/F00/reorganização em `6920552`; F01a aprovada e enviada em `4694ef9`; F01b autorizada e implementada para revisão. Próxima proposta: F01c, começando pelo levantamento.

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

Detalhes e fontes em [docs/DECISIONS.md](docs/DECISIONS.md). Revisar a base antes do fim previsto do LTS do Angular 21 em junho/2027. SQLite está confirmado (D23), com ADR, sem driver selecionado ou banco implementado.

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
- **Última entrega aprovada e enviada:** `4694ef9` — `docs(financas): consolida requisitos e cenários da F01a`. F01b é a entrega atual, ainda sem commit/push.
- Política confirmada: **push após cada entrega aprovada**. Identidade Git existente preservada. Originais mantidos byte a byte no histórico após a configuração de atributos.

## Pendências e próxima entrega proposta

**Correção atual:** removidas a abertura promocional e as frases de efeito; textos objetivos nas áreas e Configurações; base visual mantida conforme a resposta de Gabriel; regras de colaboração/testes atualizadas. Foi feita uma única checagem conjunta de tipos/templates e uma conferência visual em 1380 e 960 px, sem corte horizontal. Não foram repetidas instalação, testes de segurança ou a suíte completa para essas mudanças de conteúdo.

**Aplicação da logo:** recuperado o PNG do anexo desta conversa, conferida sua transparência e preservada uma cópia com SHA-256 idêntico. O mesmo arquivo contém as versões branca e preta, antes invisíveis sobre o fundo do visualizador. SVGs de apresentação e ícones PNG/ICO foram gerados sem redesenho ou limpeza. Compilação de tipos/templates passou; a apresentação e o carregamento dos assets foram conferidos em uma única rodada visual. O ícone de uma janela já aberta pode exigir reabertura para refletir o novo arquivo.

**Ajuste atual:** removidos o bloco lateral “Meu espaço / Pessoal” e o texto “Meu espaço / FinDesk” do cabeçalho, conforme solicitado. Não tinham função implementada ou uso futuro acordado. Posteriormente, Gabriel solicitou retirar também a linha divisória horizontal do cabeçalho e o rótulo “Versão de apresentação”; permanece apenas o botão de informação com a mesma ação. Alteração restrita a HTML/CSS, revisada sem repetir a suíte.

**Tipografia confirmada e aplicada:** Gabriel escolheu a opção A: Bahnschrift nos títulos e Segoe UI Variable Text nos parágrafos e controles. Aplicação por tokens, com fallback local, sem downloads ou redistribuição; tamanhos e espaçamentos preservados. Feita uma conferência conjunta das fontes e do layout em 1380 e 960 px, sem corte horizontal; sem repetir a suíte por uma alteração apenas de estilo. Essa escolha não representa aprovação da entrega completa para commit/push.

**Aprovação atual:** Gabriel aprovou expressamente as mudanças existentes e autorizou commit/push. Substitui a pendência anterior de revisão do conjunto.

**Próximo passo vigente:** revisar F01b e, mediante continuidade, registrar a entrega conforme a política Git e iniciar o levantamento da F01c conforme o bloco atual. Não implementar persistência nem F02–F20 automaticamente.

**Espaçamento superior:** reduzidas a altura do cabeçalho e a margem interna superior do conteúdo após a remoção da linha divisória, conforme solicitado. Botão de informação preservado à direita. Ajuste apenas de CSS, revisado sem executar a suíte.

**Lateral recolhível:** botão abaixo de Configurações alterna entre menu expandido e apenas ícones, com transição curta e aumento da área principal. Mantém acessibilidade, dicas dos links, navegação e expansão por teclado. Estado restrito à execução atual, sem persistência de preferências. Tipos/templates e teste conjunto no Electron passaram: botão abaixo de Configurações, largura recolhida de 72 px, ganho de largura principal, navegação recolhida e expansão por Enter. Captura da lateral recolhida inspecionada; sem repetir testes isolados de segurança por esta mudança.

**Final da lateral:** removido o rodapé “Uso pessoal / PT-BR” e seu espaço reservado. Configurações e Recolher/Expandir menu passaram para o final da barra, com respiro inferior, nos dois estados. Alteração restrita a estrutura/estilo, revisada sem repetir a suíte.

**Reposicionamento da navbar — ajuste atual:** por solicitação de 29/10/2026, removidos o redimensionamento pela borda, seus controles/gestos e o texto “Soltar: posição”. Permanece a alça para encaixar à esquerda, direita, em cima ou embaixo, com prévia visual sem legenda e confirmação ao soltar. O botão de recolher/expandir e a adaptação horizontal permanecem. D20 substitui as partes correspondentes de D18/D19. Estado em memória, sem novas operações IPC ou banco. Verificação conjunta concluída: tipos/templates, lint e build web passaram; os cinco testes Playwright no Electron passaram, cobrindo encaixe nos quatro lados, prévia sem texto, recolhimento/expansão, cancelamento, alternativa por teclado, ausência de redimensionamento pela borda e navegação da casca.

**Persistência — reorganizada pela F00:** a demonstração/preferências ficam para F01c. Comparação e decisão do motor SQLite concluídas em F01a; driver, diretórios e comportamento de separação/restauração ainda pendentes. Migrações, seed idempotente e restauração explícita continuam requisitos.

Ainda não implementados: os fluxos da versão local de Finanças definidos em F01–F19, inclusive cards dinâmicos, compromissos, assinaturas, previsões, detecção, disponível, orçamento e alertas. Integrações reais permanecem separadas em F20. Carteira de investimentos, simulador, tema claro, backup/restauração elaborados e instalador seguem seus escopos próprios. Consultar [docs/ROADMAP.md](docs/ROADMAP.md) e [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Como conferir

Na raiz, execute `cd FinDesk-Project`. Nessa pasta, `npm ci` instala as dependências, `npm start` compila e abre a janela, `npm run dev` oferece recarga da interface e `npm run dev:web` abre somente o servidor da prévia em `http://127.0.0.1:4200`. Demais comandos e limites em [README.md](README.md).
