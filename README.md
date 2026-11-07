# FinDesk

Projeto pessoal de finanças e investimentos para Windows, previsto em Angular, Electron e TypeScript.

O aplicativo tem tema escuro, logo original e barra nativa do Windows. Finanças oferece saldo fictício, seletores de conta/moeda, calendário e ciclos configuráveis por conta. O Geral apresenta cards de protótipo organizáveis; Movimentações alterna extrato de caixa em cards/lista e grade de agrupamentos com extrato próprio na expansão, com busca/filtros e seleção manual por arraste à direita para detalhes e totais. Categorias podem ser criadas/renomeadas com ícone/cor; despesas têm classificação individual salva, preservando os dados de origem. Há persistência local e restauração explícita da demonstração em Configurações, incluindo categorias/classificações/regras e mantendo preferências/layout. Reclassificação por estabelecimento oferece prévia na consulta atual e preserva manuais por padrão, com inclusão explícita. Regras para próximos lançamentos podem ser salvas e gerenciadas; cadastro manual de despesas já está disponível na demonstração, com referência fixa; importação mantém sua etapa própria. Compras do cartão, análises e os demais conteúdos financeiros continuam nas etapas correspondentes. Nenhuma instituição está conectada.

## Instalar e executar

O código e as ferramentas da aplicação ficam em `FinDesk-Project/`. A documentação e o contexto permanecem fora dela:

```text
FinDesk/
├── FinDesk-Project/  # src, desktop, shared, public, scripts, tests e configurações
├── docs/
├── AGENTS.md
├── PROJECT_BRIEF.md
├── PROJECT_STATUS.md
├── FinDesk_Especificacao_Financas.md
└── README.md
```

Requisitos: Windows 10/11, Node.js 24.15 ou superior da linha 24 e npm 11. Ambiente verificado: Node 24.21.0. Não é necessário instalar Angular CLI globalmente.

```powershell
cd FinDesk-Project
npm ci
npm start
```

Execute os demais comandos npm abaixo dentro de `FinDesk-Project/`. Não há `package.json` na raiz nem um segundo repositório Git.

`npm start` compila e abre o aplicativo desktop. A primeira execução pode baixar o binário do Electron e precisa de internet para esse download; o build desta casca não usa APIs externas em execução. Não há instalador nesta entrega.

Para desenvolver com recarga da interface:

```powershell
npm run dev
```

O script inicia o Angular em `127.0.0.1:4200` e abre o Electron. Fechar a janela encerra o servidor iniciado pelo script; Ctrl+C encerra a sessão. Mudanças no processo principal ou preload exigem reiniciar o comando. `npm run dev:web` oferece somente uma prévia no navegador, sem ponte desktop.

## Conferir a entrega

- **F06a — Cadastro local de despesas:** em Movimentações, clique em Nova despesa no Extrato ou Agrupamento. Informe valor/data/conta/descrição; estabelecimento e categoria são opcionais. Você pode escolher um existente ou preparar um novo nome com Criar estabelecimento, confirmado junto da despesa. A categoria usa a regra do estabelecimento, salvo escolha individual explícita. Salvar mantém os filtros; Ver lançamento ajusta a consulta. A demonstração inicia em 29/10/2026 e aceita datas após a abertura da conta e até essa referência. Cancelar/Escape não grava. Restauração demo repõe também despesas manuais e novos nomes; preferências/layout permanecem.
- **F05b.3 — Regras para futuros lançamentos:** no ícone de etiquetas da despesa, escolha Próximos lançamentos, categoria e Salvar regra. A regra vale para todas as contas; registros já existentes permanecem como estão. Em Agrupamento → Categorias → Regras, use Editar/Pausar/Ativar. Alterações afetam somente registros que entrarem depois. O cadastro manual da F06a já alimenta as regras; importação mantém sua etapa própria. Reinicie o Electron para carregar as novas operações da ponte.

- **F05b.2 — Reclassificação por estabelecimento com prévia:** em Movimentações, clique no ícone de etiquetas entre a seta de expansão e o + da despesa (Reclassificar estabelecimento). Escolha a categoria à direita e confira os itens da consulta atual. Classificações manuais ficam preservadas, salvo ao marcar Incluir classificações manuais. Apenas Aplicar grava o lote; Cancelar/Escape preservam as categorias. Sem regra automática para lançamentos futuros. Reinicie o Electron após atualizar para carregar a nova operação da ponte.
- Restaurar layout fica junto dos submenus no Geral. Ao redimensionar a altura perto da altura do vizinho, uma guia discreta ajuda a alinhar; continue arrastando para sair do encaixe. A navbar reconhece a borda pretendida mais cedo, sem exigir chegar tão perto.
- Na própria linha, arraste o card para o espaço livre à esquerda, ao centro ou à direita; a posição é salva. Alt + setas laterais também ajusta. Trazer outro card de baixo mantém a reorganização e o empurrão existentes.
- Sobrepor um card a outro propõe troca de lugar entre os dois. Continue além da borda do destino para inserir e empurrar os demais; voltar para cima dele retorna à troca. Borda contínua indica troca; tracejada, inserção.
- Durante o arraste, navbar e destino válido ficam com borda verde. Cards podem passar por toda a janela; ao mover para antes/depois de um vizinho, ele abre espaço antes de você soltar. Soltar fora da área válida ou Escape restaura a disposição anterior sem salvar.
- Arraste o fundo da navbar para outra borda; links, Configurações e recolher mantêm suas ações. Sem três pontos. Clique direito no fundo ou Enter/espaço com foco no painel abre posições. Cards/navbar mostram a mão de arraste somente enquanto estão sendo movidos.
- Em Finanças, alterne contas/moedas e meses. O saldo mantém a referência fictícia de 29/10/2026; a cotação de conversão é fictícia e identificada. Todas as contas + Original mostra moedas separadas.
- Conta/moeda são os círculos com marca/bandeira ao lado de importar. Clique para abrir as opções; hover/foco alonga a opção e revela seu nome. Setas/Home/End navegam, Enter seleciona e Escape fecha. O saldo aparece no card à esquerda.
- Ao lado do saldo, os três botões em coluna alternam calendário, salário e cartão. Nos três modos, a pequena seta acompanha a expansão e fica separada do seletor aberto, sem linha de datas; recolher preserva a seleção. Salário/cartão usam datas salvas da conta selecionada, sem geração. Todas as contas ou falta de datas deixam esses modos indisponíveis; trocar para uma conta sem o ciclo ativo volta ao calendário sem aviso.
- Configurações → Finanças → Período padrão: Calendário, Salário ou Cartão, com salvamento automático. Aplica na próxima abertura, sem alterar a consulta atual. Se a conta não oferece o ciclo, abre no calendário e conserva o padrão salvo.
- Configurações → Finanças → Ciclos por conta: abra uma conta para escolher dia salarial na grade 1–31 e cartão de referência. Salva e aplica imediatamente; mês curto usa o último dia e datas confirmadas prevalecem. Geração cobre o ciclo atual e futuros, sem criar receitas. Somente datas confirmadas retira a regra mensal. Cartão continua dependendo dos fechamentos salvos.
- **F03a — Geral:** cards Categorias, Evolução e Próximos compromissos em protótipo. Pressione e arraste pelo corpo do card; controles internos preservam seu uso. O canto grosso inferior direito ajusta o tamanho continuamente, comprimindo o vizinho antes de mudar de linha. Duplo clique amplia/retorna; Escape também retorna. Pelo teclado: setas movem, Shift + setas redimensionam e Enter/espaço amplia/retorna. Layout salva ao terminar cada ajuste. Restaurar layout muda para “Restaurar layout?”; clique novamente para confirmar, ou Escape/clique fora para cancelar. Dados/filtros são preservados. Alturas padrão de Categorias/Evolução: 344 px, sem sobrescrever ajustes salvos. Gráficos e listas desses cards ainda não estão implementados.
- Troque entre Geral, Movimentações, Cartão, Compromissos e Assinaturas: contexto preservado, conteúdo ainda pendente. Ao reabrir, conta/moeda são lembradas e o período atual segue o padrão salvo, sem recuperar consultas históricas. Importação e configuração de recorrências continuam pendentes. O saldo mantém fundo uniforme e a largura anterior; só a altura foi aumentada discretamente.
- Investimentos permanece em preparação. Reabra o aplicativo após esta atualização para carregar a ponte de layout; a recarga da interface em desenvolvimento não reinicia o worker. Preferências financeiras continuam v3; layout tem contrato próprio.
- Abra a engrenagem para ver Configurações → Integrações.
- Em Configurações, use **Ver logo** para consultar as versões branca e preta originais.
- O botão de informação abre **Sobre esta versão**, com ambiente e versão real via ponte Electron.

## Build e qualidade

```powershell
npm run build
npm run check
npm run test:desktop
```

O build da interface fica em `FinDesk-Project/dist/renderer/browser/`; o desktop compilado, em `FinDesk-Project/out/desktop/`. `check` reúne tipos, lint, formatação e testes Node de segurança/domínio/persistência. `test:desktop` compila e testa o Electron real; os testes de navegação mostram a janela para conferir gestos/transições no Windows. Capturas/traces ficam em `FinDesk-Project/test-results/`, fora do Git. Ainda não há instalador validado.

Formatação da aplicação: `npm run format` e `npm run format:check`. Esses comandos ficam limitados a `FinDesk-Project/`; a documentação externa e os originais recebidos permanecem fora da formatação automática.

`npm run test:domain` compila domínio/fixtures/aplicação e executa os testes do domínio financeiro sem abrir a interface. `npm test` inclui também segurança, aplicação e persistência; `npm run check` verifica tipos, lint, formatação e esses testes. O conteúdo funcional dos submenus financeiros ainda está pendente.

Na execução normal, o armazenamento usa `%LOCALAPPDATA%\FinDesk\data\demo.sqlite` e `preferences.sqlite`. O seed só inicializa base nova; reabrir preserva alterações. Em Configurações → Dados de demonstração, Restaurar dados pede confirmação na própria seção e repõe fatos e personalizações fictícias de categorias/regras, preservando preferências/layout. Não há banco pessoal criado nem backup independente implementado.

`npm run test:persistence` verifica o backend em diretórios temporários. `npm test` inclui esses testes; Playwright acrescenta testes da ponte/reabertura no Electron real. Os testes usam perfis exclusivos e não gravam nos bancos normais de LocalAppData. Não executar manualmente bancos reais para testar recuperação.

`npm run probe:sqlite` avalia a API SQLite incluída no Electron usando um worker e bancos temporários fictícios. É uma ferramenta isolada, não parte da inicialização normal nem um teste de persistência já integrada. [Decisões e plano da F01c](docs/financas/PERSISTENCIA.md).

As verificações são agrupadas conforme o risco da mudança; não é necessário repetir todos esses comandos para ajustes simples. A frequência está definida em [docs/TESTING.md](docs/TESTING.md).

## Documentação

Leia nesta ordem:

1. [Visão consolidada e limites](PROJECT_BRIEF.md).
2. [Estado real e continuidade](PROJECT_STATUS.md).
3. [Instruções operacionais](AGENTS.md).
4. [Revisão, precedência e fontes originais](docs/REVIEW.md).

- [Decisões e versões](docs/DECISIONS.md) e [arquitetura](docs/ARCHITECTURE.md).
- [Escopo desta entrega](docs/PRODUCT.md) e [roadmap](docs/ROADMAP.md).
- [Especificação integral de Finanças](docs/FINANCAS_SPEC.md) e [diagnóstico local F00 / próxima entrega proposta](docs/FINANCAS_F00.md).
- [Requisitos de Finanças por ID](docs/financas/REQUISITOS.md) e [catálogo fictício da F01a](docs/financas/CENARIOS.md).
- [Persistência local: decisões, avaliação e próximas fatias](docs/financas/PERSISTENCIA.md).
- [Regras financeiras](docs/DOMAIN_RULES.md) e [modelo de dados](docs/DATA_MODEL.md).
- [Sistema visual e propostas](docs/DESIGN_SYSTEM.md), [integrações](docs/INTEGRATIONS.md) e [testes](docs/TESTING.md).
- [ADR da base desktop](docs/adr/0001-base-desktop.md) e [decisão SQLite / comparação com MySQL](docs/adr/0002-sqlite-local-proposto.md).

Os originais estão preservados em `docs/references/`. Propostas, pesquisas pendentes e decisões confirmadas são identificadas separadamente. Código novo só será commitado e enviado após a aprovação da entrega, conforme a política registrada em `AGENTS.md`.
