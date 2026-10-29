# Revisão dos documentos do FinDesk

Revisão de **28/10/2026**, restrita aos requisitos fornecidos e ao estado encontrado no diretório. Não constitui validação de APIs, versões de bibliotecas, termos comerciais ou cálculos implementados.

**Atualização de índice em 29/10/2026:** esta revisão descreve o levantamento inicial. Logo e política de push foram posteriormente confirmadas em [DECISIONS.md](DECISIONS.md); não usar as pendências históricas abaixo como estado atual. A [especificação integral de Finanças v1.0](FINANCAS_SPEC.md), recebida como `FinDesk_Especificacao_Financas.md`, complementa as quatro fontes e prevalece nos conflitos dessa área. O original recebido permanece na raiz; a cópia em `docs/` foi conferida por SHA-256. O [diagnóstico F00](FINANCAS_F00.md) registra o confronto com o código; execução e autorizações ficam em PROJECT_STATUS.

## Fontes e ordem de leitura

1. [Documento mestre](references/01-DOCUMENTO_MESTRE.md): visão, stack, requisitos, limites, arquitetura proposta, roadmap e critérios de qualidade.
2. [Identidade, componentes e ritmo](references/02-IDENTIDADE_COMPONENTES_RITMO.md): FinDesk, identidade, PrimeNG, documentação na raiz e pequenas entregas.
3. [Git, commits e aprovação](references/03-GIT_COMMITS_APROVACAO.md): aprovação, verificação, commits locais e política de push.
4. [Levantamento conjunto e decisões importantes](references/04-LEVANTAMENTO_CONJUNTO.md): texto recebido no chat, com precedência para decisões relevantes de produto, integração e arquitetura.

Os três anexos foram copiados integralmente. O quarto arquivo transcreve o complemento textual do chat. A imagem do chat não é um arquivo de marca validado e não foi convertida em asset aprovado.

## Precedência e inconsistências resolvidas na consolidação

| Assunto           | Leitura resultante                                                                                                      | Fundamentação                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Escopo inicial    | Estrutura mínima, documentação e propostas de identidade; etapa 0 inteira será fracionada                               | Complemento de identidade, seções 8 e 9, limita a execução ampla do mestre        |
| Nome              | FinDesk; “Alça” é uma referência textual inconsistente                                                                  | Nome explícito na seção 1 do complemento de identidade; menção isolada na seção 3 |
| Estado do projeto | `PROJECT_STATUS.md` na raiz                                                                                             | Substituição explícita de `docs/STATUS.md` na seção 7 do complemento              |
| Autonomia         | Implementar decisões estabelecidas e detalhes rotineiros; levantar escolhas relevantes abertas                          | Complemento do chat, seções 1 a 4                                                 |
| Continuação       | Aprovar a entrega apresentada, commitar e seguir para a próxima proposta, após esclarecer decisões relevantes pendentes | Complemento Git, seções 2 e 3; complemento do chat, seção 6                       |
| Configurações     | Engrenagem acessível abre Configurações com seção Integrações                                                           | Complemento do chat, seção 5; os fluxos internos não estão aprovados              |
| Commit e push     | Aprovação da entrega autoriza commit local; push depende de política combinada e destino confirmado                     | Complemento Git, seções 7 e 9                                                     |

As fontes foram preservadas, inclusive seus trechos inconsistentes. As correções de interpretação estão nesta revisão e na consolidação, sem alterar silenciosamente os originais.

## Confirmado, proposto e ainda aberto

**Confirmado pelo proprietário:** Windows, Angular, Electron, TypeScript, ausência de servidor separado necessário inicialmente, início fictício, modo local, tema escuro primeiro, três áreas principais, simulador dentro de Investimentos, PrimeNG pontual e recursos gratuitos, FinDesk, pequenas entregas, colaboração nas decisões relevantes e política de commits após aprovação.

**Escolha padrão proposta nas fontes:** SQLite local, com justificativa em ADR. O mestre o coloca na tabela com o qualificativo “proposto” e autoriza adotá-lo como padrão; não se deve registrar que uma implementação ou biblioteca específica já está confirmada.

**Requisitos estabelecidos, com detalhamento ainda necessário:** precisão e preservação das moedas; duas visões de cartão sem dupla contagem; separação entre aportes e rendimentos; tratamento de histórico incompleto; restauração explícita da demonstração; projeções hipotéticas identificadas; preservação dos dados locais em falhas. A existência de um requisito não encerra todas as escolhas sobre seu comportamento.

**Ainda não aprovado:** logo definitivo, propostas visuais específicas, desenho detalhado de telas, fórmulas e composição final de indicadores ainda não documentadas, momento dos aportes no simulador, limites/valores iniciais de controles, fluxos de contas reais e política de push. Esses pontos devem ser discutidos quando afetarem a entrega correspondente; não precisam formar um questionário único agora.

## Pontos que merecem cuidado

1. **Identidade:** há uma referência anexada no chat e uma exigência de duas propostas. A leitura conciliável é usar a referência como orientação para as propostas, mantendo FinDesk e uma identidade provisória até escolha. A imagem recebida aparece escura, sem contraste suficiente para avaliar o desenho. Não é possível afirmar sua geometria ou produzir uma reprodução fiel a partir do que ficou visível. Antes de usar a referência como base fiel, será necessário visualizá-la adequadamente.
2. **SQLite e armazenamento:** a proposta local já existe; isso não define automaticamente biblioteca, esquema, política de retenção de dados reais ou local exato de segredos. Pesquisar os detalhes técnicos e discutir consequências relevantes antes de introduzi-las.
3. **Simulador e indicadores:** o mestre exige declarar metodologia, mas não determina todas as escolhas. Aporte no início/fim do período, tratamento de taxas e limites devem ser explicitados e acordados no escopo da entrega. “Simulador funcional” não autoriza decidir essas regras silenciosamente.
4. **Integrações:** Meu Pluggy é candidato, não provedor aprovado ou gratuidade verificada. Nubank e Nomad são referências de necessidades, não cobertura garantida. A tentativa de sincronização ao abrir e a preservação local já são direções estabelecidas; conciliação, renovação, desconexão e retenção ainda exigem detalhamento.
5. **Demonstração:** estados fictícios permitem discutir propostas, mas não tornam regras de produto aprovadas. Não misturar protótipo, dados reais e etapas do roadmap. Persistência e simulação completas da etapa 0 não precisam ser antecipadas à inicialização mínima.
6. **Git:** a primeira aprovação do trabalho apresentado autorizará seu commit. A leitura destes documentos não é uma aprovação de código que ainda não existe. A política de push não pode ser escolhida silenciosamente. Nunca inventar identidade de autor ou afirmar publicação remota de um commit apenas local.

## Pendências por momento de decisão

| Momento                           | O que falta                                                                   | Tratamento                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Preparação da base                | Versões compatíveis, ferramentas e detalhes seguros do Electron               | Pesquisa em documentação oficial antes da instalação/implementação                         |
| Preparação das propostas de marca | Referência visual legível, caso necessária para fidelidade ao símbolo anexado | Obter visualização adequada; não inventar detalhes da imagem                               |
| Escolha de identidade             | Avaliação de duas propostas em fundo escuro e tamanho pequeno                 | Escolha/ajuste de Gabriel antes de consolidar a marca                                      |
| Configuração inicial de Git       | Política de push; destino antes do primeiro envio                             | Oferecer as duas políticas previstas e registrar a escolha; verificar identidade existente |
| Entrega de tela relevante         | Comportamentos e critérios de aceitação ainda abertos                         | Levantamento breve, com recomendação e registro das respostas                              |
| Simulador/indicadores             | Metodologia e limites não definidos                                           | Discussão antes dos cálculos dependentes, com testes pertinentes                           |
| Integrações reais                 | Provedor, cobertura, custos, consentimento, dados, retenção e conflitos       | Pesquisa oficial primeiro; levantamento com Gabriel em rodadas pequenas                    |

Não foram feitas pesquisas externas nesta rodada porque o objeto foi a consistência das fontes, sem escolha de dependências ou confirmação de informações atuais de provedores. As pendências técnicas permanecem explicitamente sem verificação.

## Resultado e continuidade

O conjunto é coerente quando os complementos são aplicados por assunto. As divergências identificadas não exigem trocar stack, ampliar escopo ou repetir decisões já respondidas. A revisão foi registrada para que o histórico do chat não seja a única fonte de contexto.

O primeiro conjunto limitado já está autorizado nos documentos. Ao executá-lo, pesquisar versões oficiais, preparar a base mínima verificável e trabalhar com identidade substituível enquanto a marca aguarda escolha. A aprovação dessa entrega e as decisões necessárias para a próxima devem ser registradas segundo [AGENTS.md](../AGENTS.md).
