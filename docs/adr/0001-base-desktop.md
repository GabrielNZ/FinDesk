# ADR 0001 — Base Angular/Electron em um único projeto

**Status:** concretização da arquitetura estabelecida, implementada na casca e aguardando revisão da entrega. Escolhas de versão e barra de janela foram confirmadas por Gabriel em 28/10/2026.

## Contexto

Aplicativo pessoal para Windows, sem servidor separado necessário, com Angular, Electron e TypeScript definidos. O proprietário conhece Angular e quer separação de responsabilidades sem camadas ou ferramentas desnecessárias.

## Decisão de implementação

Manter um pacote npm privado e separar `FinDesk-Project/src/` (Angular), `FinDesk-Project/desktop/` (processos privilegiados) e `FinDesk-Project/shared/` (contratos puros). Componentes standalone e signals bastam para o estado da casca. Rotas são carregadas sob demanda e usam hash no protocolo local seguro. Não adicionar Nx, NestJS, backend HTTP, NgRx ou abstrações de repositório sem um caso de uso que as exija.

Usar Angular 21.2.25, PrimeNG 21.1.10 Community MIT, tema PrimeUIX 2.0.3 e TypeScript 5.9.3, com Node 24.21.0 verificado no ambiente. Manter Electron estável suportado 45.1.0 e barra nativa, conforme a escolha do proprietário. O lockfile fixa dependências transitivas.

O renderer é isolado e com sandbox; a ponte expõe uma operação de versão. SQL e segredos não entram na interface. A documentação técnica de referência está em [DECISIONS.md](../DECISIONS.md).

## Consequências

- Setup e leitura do código proporcionais ao projeto, sem custo ou serviços remotos obrigatórios em execução.
- Interface pode ser avaliada separadamente no navegador, sem fingir disponibilidade de APIs desktop.
- O build Angular e o build desktop são distintos, mas geridos pelos mesmos comandos npm.
- Não há persistência nem modelo financeiro nesta fatia. Suas fronteiras estão documentadas, sem implementações antecipadas.
- Angular 21 está em LTS, com fim previsto em junho/2027. Planejar a revisão de versão antes desse prazo; não atualizar PrimeNG automaticamente para major com outra licença.
