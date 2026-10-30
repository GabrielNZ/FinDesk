# ADR 0002 — SQLite local

**Decisões confirmadas: D23 — SQLite local; D25 — API incluída em worker; D26/D27 — localização e restauração.** F01c.2 integra persistência da demonstração/preferências à execução normal. Caminho do ADR mantido para preservar links históricos.

## Contexto e histórico

SQLite era proposta no mestre e na F00. A especificação de Finanças pediu comparação com MySQL antes da escolha. Após apresentar os efeitos práticos, Gabriel respondeu “SQLite local (recomendado)”. Isso confirma o motor, sem escolher driver, diretório, restauração ou proteção de credenciais.

O FinDesk é pessoal, local e inicialmente Windows, com dados disponíveis ao reabrir. Recomendação do Codex: SQLite se ajusta melhor a esse cenário. Essa avaliação de adequação é uma conclusão técnica, não uma alegação de que MySQL precisa de nuvem ou seria incapaz de armazenar esses dados.

## Comparação pesquisada

| Aspecto               | SQLite                                                                                                      | MySQL local                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Execução              | Motor incorporado, sem processo de servidor de banco separado.                                              | Processo servidor próprio, mesmo instalado no mesmo computador; não exige nuvem.                                                 |
| Instalação/manutenção | Integrar o acesso no aplicativo e gerenciar arquivos/migrações.                                             | Instalar/configurar o servidor, usuários/acesso e seu ciclo de execução; serviço Windows é uma opção, não obrigação.             |
| Concorrência          | Vários leitores, uma escrita por vez; transações curtas e fila de trabalho são adequadas ao uso individual. | Arquitetura cliente/servidor favorece acessos concorrentes centralizados. Esse benefício ainda não é uma necessidade do produto. |
| Dados                 | Arquivos locais controlados pelo aplicativo.                                                                | Diretório de dados controlado pelo servidor.                                                                                     |
| Backup                | API de backup ou outra operação consistente; cópia descuidada do banco aberto não é um plano de backup.     | Ferramentas como mysqldump e procedimento de restauração; também exige backup independente.                                      |
| Futuro móvel          | Não fornece sozinho sincronização/autenticação/acesso remoto.                                               | Também não resolve sozinho esses fluxos; não expor o banco diretamente ao telefone.                                              |

Fontes oficiais consultadas em 29/10/2026: [uso adequado do SQLite](https://www.sqlite.org/whentouse.html), [SQLite em domínio público](https://www.sqlite.org/copyright.html), [backup consistente do SQLite](https://www.sqlite.org/backup.html), [instalação do MySQL no Windows](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html), [serviço Windows](https://dev.mysql.com/doc/refman/8.4/en/windows-start-service.html) e [mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html). Nenhum servidor foi instalado, nenhum preço de hospedagem foi presumido e nenhuma licença de driver foi escolhida.

## Compatibilidade observada e driver pendente

Sondagem local do executável Electron instalado, sem abrir banco: **Electron 45.1.0, Node embarcado 24.22.1, ABI 150**. `require('node:sqlite').DatabaseSync` retornou tipo `function`. O Node de desenvolvimento é outro ambiente; sua versão não é prova de compatibilidade no aplicativo.

O [documento oficial da versão Node 24.22.1](https://raw.githubusercontent.com/nodejs/node/v24.22.1/doc/api/sqlite.md) classifica `node:sqlite` como release candidate e descreve DatabaseSync como síncrono. É candidato a avaliar, sem dependência externa adicional; disponibilidade do módulo não comprova leitura/gravação persistente, transações, desempenho ou distribuição. Não criar operações longas que congelem a interface; a execução privilegiada e eventual worker serão discutidos na F01c se exigirem mudança estrutural.

Na F01c.1, Gabriel confirmou a API incluída com worker dedicado após a prova abaixo. Um driver nativo externo não foi necessário. O [Electron documenta a ABI específica e a reconstrução desses módulos](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules); não instalar biblioteca ou ferramenta de rebuild por precaução.

## Avaliação F01c.1 e decisão do acesso

`npm run probe:sqlite` inicia Electron 45.1.0 de verdade, com perfil temporário e sem `ELECTRON_RUN_AS_NODE`. Worker Node dedicado usa o Node embarcado 24.22.1. Passaram escrita/leitura parametrizadas, rollback, chaves estrangeiras, inteiros/BigInt, reabertura/versão/integridade e cópia consistente via backup. A limpeza tem verificação do destino; nenhum banco pessoal ou perfil normal é usado. O script não participa da inicialização normal.

**Escolha confirmada D25:** node:sqlite no worker. A execução síncrona fica fora da thread principal, sem habilitar Node na interface ou mudar sandbox. A prova não é benchmark nem validação de distribuição; a condição release candidate permanece registrada e requer revalidação nas atualizações do Electron.

Alternativas examinadas: executar a API síncrona na thread principal seria mais simples, mas pode bloquear o aplicativo; usar [better-sqlite3](https://github.com/WiseLibs/better-sqlite3/blob/master/README.md) exigiria uma dependência externa nativa e avaliação/rebuild da ABI. Compatibilidade desse pacote com este Electron não foi testada; não foi instalado nem aprovado. A recomendação pelo módulo incluído decorre do cenário e da prova, não de uma alegação de superioridade geral.

Fontes adicionais: [Node worker_threads](https://nodejs.org/api/worker_threads.html), [orientação de desempenho do Electron](https://www.electronjs.org/docs/latest/tutorial/performance), [transações SQLite](https://www.sqlite.org/lang_transaction.html) e [caminhos de dados do Electron](https://www.electronjs.org/docs/latest/api/app#appgetpathname). A documentação de Web Workers do renderer não é o mecanismo escolhido.

**D26/D27 confirmadas:** `%LOCALAPPDATA%\FinDesk\data`; demonstração em arquivo separado dos dados pessoais futuros; restauração repõe fatos fictícios preservando preferências/layout, com ação de layout distinta. Critérios e subdivisão proposta da implementação em [PERSISTENCIA.md](../financas/PERSISTENCIA.md).

## Critérios restantes de implementação

F01c.2 concretiza estes critérios no backend, conforme [modelo v1](../DATA_MODEL.md) e [plano](../financas/PERSISTENCIA.md). Acesso pela interface permanece para F01c.3. Testes de aplicação no Electron não substituem a futura validação de distribuição/ASAR ou recuperação após queda abrupta.

- Aplicar a localização D26 e a separação/restauração D27; definir formatos das preferências pertinentes, migrações versionadas e seed idempotente, sem apagar ao abrir.
- Implementar restauração explícita somente da demonstração, preservando preferências/layout; propor sua composição na interface. Dados locais não substituem backup independente.
- Avaliar driver/API na execução real do Electron, transações/rollback, precisão/inteiros, parâmetros SQL e validação das novas operações IPC.
- Testar reabertura, migração e preservação em falha, com perfis/bancos fictícios; empacotamento ainda não validado.
- Angular não executa SQL, não recebe caminhos arbitrários ou credenciais. Banco e operações de arquivo ficam no lado privilegiado.
