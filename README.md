# FinDesk

Projeto pessoal de finanças e investimentos para Windows, previsto em Angular, Electron e TypeScript.

Esta entrega contém a **casca navegável do aplicativo**, com páginas de estrutura e tema escuro para avaliação. A logo original fornecida por Gabriel está aplicada e preservada em `FinDesk-Project/public/brand/logo-original.png`. Ainda não há dados financeiros, SQLite ou conexões bancárias. A barra da janela é a nativa do Windows.

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

- Navegue por Visão geral, Finanças e Investimentos. As duas últimas apresentam estados de preparação, sem dados fictícios ainda.
- Abra a engrenagem para ver Configurações → Integrações.
- Em Configurações, use **Ver logo** para consultar as versões branca e preta originais.
- O botão de informação abre **Sobre esta versão**, com ambiente e versão real via ponte Electron.

## Build e qualidade

```powershell
npm run build
npm run check
npm run test:desktop
```

O build da interface fica em `FinDesk-Project/dist/renderer/browser/`; o desktop compilado, em `FinDesk-Project/out/desktop/`. `check` reúne tipos, lint, formatação e testes de segurança. `test:desktop` compila e testa a janela real do Electron; os testes de navegação mostram a janela para conferir gestos e transições no Windows. Capturas/traces ficam em `FinDesk-Project/test-results/`, fora do Git. Não há teste de instalador ou persistência, pois essas funções não foram implementadas.

Formatação da aplicação: `npm run format` e `npm run format:check`. Esses comandos ficam limitados a `FinDesk-Project/`; a documentação externa e os originais recebidos permanecem fora da formatação automática.

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
- [Regras financeiras](docs/DOMAIN_RULES.md) e [modelo de dados](docs/DATA_MODEL.md).
- [Sistema visual e propostas](docs/DESIGN_SYSTEM.md), [integrações](docs/INTEGRATIONS.md) e [testes](docs/TESTING.md).
- [ADR da base desktop](docs/adr/0001-base-desktop.md) e [proposta SQLite](docs/adr/0002-sqlite-local-proposto.md).

Os originais estão preservados em `docs/references/`. Propostas, pesquisas pendentes e decisões confirmadas são identificadas separadamente. Código novo só será commitado e enviado após a aprovação da entrega, conforme a política registrada em `AGENTS.md`.
