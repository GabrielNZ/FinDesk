# FinDesk

Projeto pessoal de finanças e investimentos para Windows, previsto em Angular, Electron e TypeScript.

Esta entrega contém a **casca navegável do aplicativo**, com tema escuro, logo original e barra nativa do Windows. Finanças tem saldo fictício, seletores de conta/moeda, cinco submenus e períodos sobre calendário ou ciclos salvos. Há persistência local e Configurações → Dados de demonstração com restauração explícita. Conteúdo dos submenus e configuração das recorrências ainda serão desenvolvidos. Nenhuma instituição está conectada.

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

- Em Finanças, alterne contas/moedas e meses. O saldo mantém a referência fictícia de 29/10/2026; a cotação de conversão é fictícia e identificada. Todas as contas + Original mostra moedas separadas.
- Conta/moeda são os círculos com marca/bandeira ao lado de importar. Clique para abrir as opções; hover/foco alonga a opção e revela seu nome. Setas/Home/End navegam, Enter seleciona e Escape fecha. O saldo aparece no card à esquerda.
- Ao lado do saldo, os três botões em coluna alternam calendário, salário e cartão. Nos três modos, a pequena seta acompanha a expansão e fica separada do seletor aberto, sem linha de datas; recolher preserva a seleção. Salário/cartão usam datas salvas da conta selecionada, sem geração. Todas as contas ou falta de datas deixam esses modos indisponíveis; trocar para uma conta sem o ciclo ativo volta ao calendário sem aviso.
- Configurações → Finanças → Período padrão: Calendário, Salário ou Cartão, com salvamento automático. Aplica na próxima abertura, sem alterar a consulta atual. Se a conta não oferece o ciclo, abre no calendário e conserva o padrão salvo.
- Configurações → Finanças → Ciclos por conta: abra uma conta para escolher dia salarial na grade 1–31 e cartão de referência. Salva e aplica imediatamente; mês curto usa o último dia e datas confirmadas prevalecem. Geração cobre o ciclo atual e futuros, sem criar receitas. Somente datas confirmadas retira a regra mensal. Cartão continua dependendo dos fechamentos salvos.
- Troque entre Geral, Movimentações, Cartão, Compromissos e Assinaturas: contexto preservado, conteúdo ainda pendente. Ao reabrir, conta/moeda são lembradas e o período atual segue o padrão salvo, sem recuperar consultas históricas. Importação e configuração de recorrências continuam pendentes. O saldo mantém fundo uniforme e a largura anterior; só a altura foi aumentada discretamente.
- Investimentos permanece em preparação. Reabra o aplicativo após esta atualização para carregar o contrato de preferências v2 e sua migração; a recarga da interface em desenvolvimento não reinicia o worker.
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

Na execução normal, o armazenamento usa `%LOCALAPPDATA%\FinDesk\data\demo.sqlite` e `preferences.sqlite`. O seed só inicializa base nova; reabrir preserva alterações. Em Configurações → Dados de demonstração, Restaurar dados pede confirmação na própria seção e repõe apenas fatos fictícios, preservando preferências/layout. Não há banco pessoal criado nem backup independente implementado.

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
