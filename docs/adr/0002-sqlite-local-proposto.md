# ADR 0002 — SQLite local

**Decisão confirmada por Gabriel em F01a, 29/10/2026 (D23): SQLite local. Ainda não implementado.** Caminho deste ADR mantido para preservar os links históricos.

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

Um driver nativo externo continua como alternativa a pesquisar se necessário. O [Electron documenta a ABI específica e a reconstrução desses módulos](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules); não instalar biblioteca ou ferramenta de rebuild por precaução. Nenhum driver foi selecionado ou adicionado nesta entrega.

## Limites e aceitação antes de F01c

- Confirmar localização dos arquivos, separação demonstração/pessoal e alcance das preferências; migrações versionadas e seed idempotente, sem apagar ao abrir.
- Propor restauração explícita que afete somente o ambiente escolhido. Dados locais não substituem backup independente.
- Avaliar driver/API na execução real do Electron, transações/rollback, precisão/inteiros, parâmetros SQL e validação das novas operações IPC.
- Testar reabertura, migração e preservação em falha, com perfis/bancos fictícios; empacotamento ainda não validado.
- Angular não executa SQL, não recebe caminhos arbitrários ou credenciais. Banco e operações de arquivo ficam no lado privilegiado.
