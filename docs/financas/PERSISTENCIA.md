# Finanças — persistência local

Requisitos FIN-003/010/047 e cenário C30 em [REQUISITOS.md](REQUISITOS.md) e [CENARIOS.md](CENARIOS.md). A execução/autorização fica somente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md). Esta página descreve as decisões e os critérios das próximas fatias; não declara banco de aplicação já implementado.

## Decisões confirmadas na F01c

- **D23:** SQLite local, confirmado na F01a.
- **D25:** usar `node:sqlite`, incluído no Electron, com acesso em worker Node dedicado no lado privilegiado. A API é release candidate; revalidar a compatibilidade nas atualizações do runtime. Não alterar sandbox ou habilitar Node no renderer.
- **D26:** dados em `%LOCALAPPDATA%\FinDesk\data`, fora do repositório. A pasta de dados será criada somente pela implementação autorizada; esta avaliação não a criou nem a modificou. Os caches/perfil Chromium não foram realocados nesta rodada.
- **D27:** demonstração separada dos dados pessoais futuros. Restaurar dados de demonstração repõe somente os registros fictícios, preservando preferências/layout. Restaurar layout é outra ação, conforme o padrão de cards; não existe restauração pessoal implícita.

Respostas do proprietário e fontes técnicas em [DECISIONS.md](../DECISIONS.md) e [ADR 0002](../adr/0002-sqlite-local-proposto.md). Não repetir essas escolhas sem novas evidências.

## Avaliação reproduzível

Dentro de `FinDesk-Project/`, executar `npm run probe:sqlite`. O script inicia o Electron real sem janela, com perfil temporário exclusivo, e usa um worker `node:worker_threads`. Não é Web Worker da interface e não usa `nodeIntegrationInWorker`.

O worker cria tabelas de prova, sem esquema de aplicação ou dados pessoais, e verifica seis grupos:

1. Gravar e ler usando parâmetros, incluindo texto com sintaxe SQL tratado como dado.
2. Reverter uma transação após violação de unicidade, preservando os registros anteriores.
3. Recusar referência inexistente com chaves estrangeiras ativas.
4. Preservar inteiro seguro e ler BigInt maior sem arredondamento; leitura numérica fora do limite deve falhar. A futura camada de domínio continuará recusando valores fora do seu intervalo seguro.
5. Fechar/reabrir, preservar `user_version` e obter integridade `ok`.
6. Criar cópia consistente com a API `backup` e reabrir essa cópia somente para leitura.

Resultado observado em Windows: Electron 45.1.0, Node 24.22.1 tanto no principal quanto no worker; seis grupos aprovados. Perfil, banco e cópia são removidos pelo executor após validar que o caminho absoluto pertence ao diretório temporário exclusivo. Há limites de tempo; falha não redireciona a prova para uma pasta pessoal.

A primeira tentativa do executor ESM não concluiu a inicialização; o ponto de entrada foi ajustado para iniciar após `app.whenReady().then(...)`, sem aguardar esse evento no nível superior do módulo. A execução final passou. Não houve alteração no ponto de entrada do aplicativo.

Essa prova não valida ainda o esquema financeiro, seed, migrações da aplicação, restauração pelo produto, contrato IPC, tratamento de concorrência entre instâncias, durabilidade após queda abrupta ou instalador/ASAR. A cópia de prova também não constitui um sistema de backup do usuário.

## Fatias propostas para manter a entrega revisável

### F01c.1 — avaliação e decisões

Pesquisa oficial, prova isolada e D25–D27. É a rodada atual, sem persistência na execução normal da aplicação. A subdivisão não elimina os requisitos da F01c.

### F01c.2 — armazenamento mínimo e testes

Proposta do Codex, a revisar antes de implementar:

- Criar o serviço de armazenamento com worker dedicado e operações sequenciais. Somente o processo privilegiado escolhe diretórios; se a pasta do Windows estiver indisponível, informar erro e preservar arquivos existentes, sem fallback silencioso para o repositório.
- Usar arquivo de demonstração separado e um armazenamento de preferências independente da restauração dos fatos. Nomes de arquivos e organização interna são detalhes técnicos; não criar banco pessoal vazio sem necessidade.
- Introduzir esquema versionado/migrações transacionais. Banco com versão futura ou estrutura inválida deve produzir erro explícito; não apagar/recriar automaticamente. Migração não deve restaurar os dados de demonstração.
- Persistir os fatos aprovados da F01b, mantendo centavos inteiros/moeda, datas civis, origem/cobertura e vínculos. Seed apenas quando necessário e com marcador/versionamento; reabrir não duplica dados nem substitui alterações. Mudanças do conjunto fictício não justificam sobrescrever alterações sem restauração explícita.
- Salvar preferências financeiras tipadas e versionadas conforme os requisitos já aprovados. Iniciar com os campos cujo comportamento está definido, como modo de moeda e período padrão; mês calendário é o padrão inicial. Não salvar uma data histórica selecionada como se fosse preferência de abrir no período atual. Formatos de layout serão adicionados junto de F03.
- Definir contratos restritos para os futuros casos de uso. Renderer não envia SQL ou caminhos e não recebe objetos de banco. Validar remetente/frame/origem e argumentos também no lado privilegiado ao acrescentar IPC; não abrir transporte genérico.
- Disponibilizar operação interna explícita de restauração somente do ambiente demo, transacional, com preferências preservadas. A ação da interface será desenhada na fatia seguinte, sem criar controle falsamente ativo.
- Validar perfis temporários, reabertura, seed idempotente, migração/rollback, alteração persistida, versão futura recusada sem apagamento, preservação de preferências ao restaurar e falhas de acesso/escrita. Validar a execução no Electron, sem repetir testes visuais que não forem afetados.

Esses itens são critérios propostos de implementação, não escolhas de produto adicionais já respondidas. Validação/schemas e recuperação precisam ser avaliados com a implementação concreta; a prova de capacidade não substitui esses testes.

### F01c.3 — acesso explícito na interface

Propor com Gabriel a composição enxuta da seção de dados de demonstração em Configurações e a apresentação/confirmação da restauração. Explicar exatamente que dados fictícios serão repostos e que preferências/layout permanecem. Completar os critérios de uso e regressão da interface antes de avançar a F02. Não transformar esta proposta em tela já aprovada por uma decisão apenas técnica.

## Limites e decisões futuras

- Nenhuma conexão bancária, credencial ou dado financeiro real nesta avaliação. Política para dados reais, proteção de segredos, retenção e backup independente será tratada antes do uso correspondente.
- Posição/recolhimento da navbar não receberam requisito novo de persistência nesta rodada. Não ampliar o alcance das preferências sem discutir o comportamento.
- Não foi escolhido provedor de câmbio, importador, biblioteca ORM ou novo driver externo. A API incluída atende à prova atual; evidências futuras podem justificar reavaliar a escolha, com discussão.
- Política de múltiplas instâncias, formatos completos de layout e recuperação após corrupção não foram silenciosamente definidos. A implementação deve preservar dados e informar falha enquanto o comportamento dependente não estiver acordado.
