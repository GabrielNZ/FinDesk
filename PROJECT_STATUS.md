# Estado do FinDesk

Atualizado em **29/10/2026** (America/Sao_Paulo).

## Situação atual

**Casca, F00 e reorganização aprovadas por Gabriel em 29/10/2026, com autorização explícita de commit e push.** A aplicação fica em `FinDesk-Project/`; documentação, anotações e contexto permanecem na raiz e em `docs/`. F01a continua proposta, ainda não iniciada; a aprovação atual cobre o trabalho existente e seu registro Git.

## Reorganização atual

- **Confirmado por Gabriel:** pasta `FinDesk-Project/` para todo o código e ferramentas; documentos e contexto fora dela. Decisão D22.
- **Movido:** `src/`, `desktop/`, `shared/`, `public/`, `scripts/`, `tests/`, package/lockfile, configurações Angular/TypeScript/ESLint/Playwright/Prettier/npm e dependências, caches, builds e resultados locais existentes. `.git`, regras Git e `.editorconfig` permanecem na raiz. Nenhum repositório ou pacote npm adicional criado.
- **Preservação:** os 50 arquivos de código, assets e configurações foram conferidos por hash imediatamente após a mudança. Sem alteração de comportamento; nenhuma reinstalação de dependências. Originais recebidos e documentação não foram movidos para dentro da aplicação.
- **Ajustes:** caminhos e comandos documentados, exclusões Git também para diretórios pessoais dentro da aplicação; formatação npm restrita à pasta da aplicação.
- **Validação na nova localização:** `npm run check` passou (tipos/templates, lint, formatação e quatro testes de segurança), assim como `npm run build:web` e o teste Playwright da casca no Electron (abertura, ponte, navegação, recarga, recolhimento, teclado e janela menor). Não foi repetida a suíte de gestos da navbar, cujo código não mudou. Links locais, exclusões Git e integridade da especificação conferidos; sem reinstalação ou início de F01a. Resultados reutilizados na preparação do commit, pois o código não mudou desde a validação.

## Finanças — continuidade incremental

- **Requisito confirmado:** seguir a [especificação integral de Finanças](docs/FINANCAS_SPEC.md), por pequenas entregas. Ela prevalece sobre sugestões antigas conflitantes dessa área; não muda a stack, a marca ou o comportamento vigente da navbar.
- **Concluído em F00:** [diagnóstico, matriz de lacunas e plano adaptado](docs/FINANCAS_F00.md). Existentes: base Angular/Electron, identidade, tokens, navegação e fronteira desktop. Parcial: acesso a Finanças, Configurações e infraestrutura de testes. Ausentes: dados/domínio financeiros, banco, cálculos, cinco submenus e demais fluxos F02–F20.
- **Documentação:** original recebido na raiz preservado; cópia integral em `docs/FINANCAS_SPEC.md` com SHA-256 idêntico. Brief, índice, roadmap, decisões, design, regras, modelo, testes e ADR receberam referências/ajustes de precedência. A rastreabilidade detalhada por IDs ainda pertence à F01a.
- **Verificações desta F00:** inspeção estática do código/documentos, comparação de hash da especificação, links locais dos documentos alterados e `git diff --check`. Sem novo build, teste funcional ou inspeção visual. Resultados anteriores da casca foram reutilizados; não constituem cobertura financeira.
- **Proposta do Codex — próxima entrega F01a:** IDs/rastreabilidade, catálogo de cenários fictícios e levantamento inicial. Pesquisar comparação SQLite/MySQL antes da decisão de armazenamento e discutir metodologia padrão de gastos antes dos cálculos dependentes. Sem instalar banco, criar telas ou fechar políticas por conta própria.
- **Dependências propostas:** F01b para regras comuns e fixtures executáveis após respostas pertinentes; F01c para persistência mínima após decisão conjunta, antes das preferências salvas de F02/F03. F02–F20 seguem a referência da especificação, com subdivisões quando necessário.
- **Pendências de pesquisa:** comparação de armazenamento/compatibilidade do driver, sem adoção de SQLite ou MySQL; demais pesquisas apenas nas etapas pertinentes. Nenhuma pesquisa nova de provedor nesta rodada.
- **Perguntas aguardando resposta:** nenhuma pergunta de produto nova nesta F00. Os temas da seção 16 serão levantados em pequenas rodadas com recomendações. F00 aprovada; F01a aguarda continuidade.
- **Autorização:** Gabriel aprovou explicitamente todas as mudanças atuais e pediu commit e push em 29/10/2026. Abrange casca, ajustes visuais/navbar, F00 e reorganização. Não iniciar F01–F20 durante esta tarefa de registro Git.

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

Detalhes e fontes em [docs/DECISIONS.md](docs/DECISIONS.md). Revisar a base antes do fim previsto do LTS do Angular 21 em junho/2027. SQLite continua padrão proposto, com ADR, sem driver ou banco implementado.

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

Não há teste de instalador, persistência, cálculos ou integrações, pois essas funções ainda não foram implementadas. As verificações de execução incluem o Windows deste ambiente; não representam validação de outras plataformas.

## Git e aprovação

- Remoto: `https://github.com/GabrielNZ/FinDesk.git`; branch `master`, rastreando `origin/master`.
- Revisão documental aprovada e enviada: `6db9362` — `docs(projeto): consolida requisitos e regras do FinDesk`.
- Preparação Git aprovada e enviada: `f6a250d` — `chore(git): configura exclusões e preservação dos documentos`.
- **Entrega atual aprovada:** casca desktop, ajustes de identidade/navegação, diagnóstico F00 e organização em `FinDesk-Project/`. Registro autorizado com a mensagem `feat(base): adiciona casca desktop e organiza projeto`; hash e envio devem ser conferidos no histórico e no remoto, sem manter um hash autorreferente neste arquivo.
- Política confirmada: **push após cada entrega aprovada**. Identidade Git existente preservada. Originais mantidos byte a byte no histórico após a configuração de atributos.

## Pendências e próxima entrega proposta

**Correção atual:** removidas a abertura promocional e as frases de efeito; textos objetivos nas áreas e Configurações; base visual mantida conforme a resposta de Gabriel; regras de colaboração/testes atualizadas. Foi feita uma única checagem conjunta de tipos/templates e uma conferência visual em 1380 e 960 px, sem corte horizontal. Não foram repetidas instalação, testes de segurança ou a suíte completa para essas mudanças de conteúdo.

**Aplicação da logo:** recuperado o PNG do anexo desta conversa, conferida sua transparência e preservada uma cópia com SHA-256 idêntico. O mesmo arquivo contém as versões branca e preta, antes invisíveis sobre o fundo do visualizador. SVGs de apresentação e ícones PNG/ICO foram gerados sem redesenho ou limpeza. Compilação de tipos/templates passou; a apresentação e o carregamento dos assets foram conferidos em uma única rodada visual. O ícone de uma janela já aberta pode exigir reabertura para refletir o novo arquivo.

**Ajuste atual:** removidos o bloco lateral “Meu espaço / Pessoal” e o texto “Meu espaço / FinDesk” do cabeçalho, conforme solicitado. Não tinham função implementada ou uso futuro acordado. Posteriormente, Gabriel solicitou retirar também a linha divisória horizontal do cabeçalho e o rótulo “Versão de apresentação”; permanece apenas o botão de informação com a mesma ação. Alteração restrita a HTML/CSS, revisada sem repetir a suíte.

**Tipografia confirmada e aplicada:** Gabriel escolheu a opção A: Bahnschrift nos títulos e Segoe UI Variable Text nos parágrafos e controles. Aplicação por tokens, com fallback local, sem downloads ou redistribuição; tamanhos e espaçamentos preservados. Feita uma conferência conjunta das fontes e do layout em 1380 e 960 px, sem corte horizontal; sem repetir a suíte por uma alteração apenas de estilo. Essa escolha não representa aprovação da entrega completa para commit/push.

**Aprovação atual:** Gabriel aprovou expressamente as mudanças existentes e autorizou commit/push. Substitui a pendência anterior de revisão do conjunto.

**Próximo passo vigente:** após concluir o registro Git aprovado, aguardar continuidade para F01a conforme o bloco acima. Não há nova funcionalidade em execução nesta tarefa.

**Espaçamento superior:** reduzidas a altura do cabeçalho e a margem interna superior do conteúdo após a remoção da linha divisória, conforme solicitado. Botão de informação preservado à direita. Ajuste apenas de CSS, revisado sem executar a suíte.

**Lateral recolhível:** botão abaixo de Configurações alterna entre menu expandido e apenas ícones, com transição curta e aumento da área principal. Mantém acessibilidade, dicas dos links, navegação e expansão por teclado. Estado restrito à execução atual, sem persistência de preferências. Tipos/templates e teste conjunto no Electron passaram: botão abaixo de Configurações, largura recolhida de 72 px, ganho de largura principal, navegação recolhida e expansão por Enter. Captura da lateral recolhida inspecionada; sem repetir testes isolados de segurança por esta mudança.

**Final da lateral:** removido o rodapé “Uso pessoal / PT-BR” e seu espaço reservado. Configurações e Recolher/Expandir menu passaram para o final da barra, com respiro inferior, nos dois estados. Alteração restrita a estrutura/estilo, revisada sem repetir a suíte.

**Reposicionamento da navbar — ajuste atual:** por solicitação de 29/10/2026, removidos o redimensionamento pela borda, seus controles/gestos e o texto “Soltar: posição”. Permanece a alça para encaixar à esquerda, direita, em cima ou embaixo, com prévia visual sem legenda e confirmação ao soltar. O botão de recolher/expandir e a adaptação horizontal permanecem. D20 substitui as partes correspondentes de D18/D19. Estado em memória, sem novas operações IPC ou banco. Verificação conjunta concluída: tipos/templates, lint e build web passaram; os cinco testes Playwright no Electron passaram, cobrindo encaixe nos quatro lados, prévia sem texto, recolhimento/expansão, cancelamento, alternativa por teclado, ausência de redimensionamento pela borda e navegação da casca.

**Proposta anterior de persistência — reorganizada pela F00:** a persistência local da demonstração/preferências passa à subetapa proposta F01c, após comparação SQLite/MySQL e decisões de dados. Migrações, seed idempotente e restauração explícita continuam requisitos; banco/driver não estão escolhidos.

Ainda não implementados: os fluxos da versão local de Finanças definidos em F01–F19, inclusive cards dinâmicos, compromissos, assinaturas, previsões, detecção, disponível, orçamento e alertas. Integrações reais permanecem separadas em F20. Carteira de investimentos, simulador, tema claro, backup/restauração elaborados e instalador seguem seus escopos próprios. Consultar [docs/ROADMAP.md](docs/ROADMAP.md) e [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Como conferir

Na raiz, execute `cd FinDesk-Project`. Nessa pasta, `npm ci` instala as dependências, `npm start` compila e abre a janela, `npm run dev` oferece recarga da interface e `npm run dev:web` abre somente o servidor da prévia em `http://127.0.0.1:4200`. Demais comandos e limites em [README.md](README.md).
