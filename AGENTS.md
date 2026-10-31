# Instruções de trabalho — FinDesk

## Contexto e leitura

O código, assets, testes, scripts, dependências e configurações da aplicação ficam em `FinDesk-Project/`. Execute os comandos npm dentro dessa pasta. A raiz mantém este arquivo, `PROJECT_BRIEF.md`, `PROJECT_STATUS.md`, `README.md`, anotações, especificações recebidas, `docs/` e a configuração Git do único repositório. Não criar outro repositório nem duplicar os arquivos de contexto dentro da aplicação.

Use português brasileiro na interface, documentação e comunicação. Trate Gabriel por “você”.

Antes de trabalhar, leia `PROJECT_BRIEF.md`, `PROJECT_STATUS.md` e as instruções aplicáveis à tarefa. A revisão e o índice das fontes estão em `docs/REVIEW.md`. Os documentos originais ficam em `docs/references/` e não devem ser reescritos para esconder divergências.

A ordem de leitura das fontes é: documento mestre → complemento de identidade, componentes e ritmo → complemento de Git → complemento de levantamento conjunto. A precedência é por assunto: cada complemento substitui explicitamente as regras anteriores conflitantes do seu âmbito. O último complemento prevalece nas decisões relevantes de produto, integração e arquitetura.

## Colaboração e escopo

- Execute autonomamente tarefas internas de um escopo estabelecido: organização interna, ajustes pequenos, correções, validações, testes pertinentes, refatorações locais sem mudança de comportamento e documentação.
- Antes de implementar funcionalidade relevante, leia decisões existentes, apresente o objetivo compreendido e identifique escolhas abertas. Pesquise limitações técnicas antes de pedir decisões ao proprietário. Recomende uma abordagem e explique consequências.
- Inclua Gabriel nas decisões de design e desenvolvimento antes de construir a parte dependente. Para telas, discuta composição, densidade, prioridade das informações e interações; ofereça alternativas concretas em pequenas rodadas. Perguntar só sobre bibliotecas e detalhes da janela não substitui essa participação. Detalhes rotineiros dentro da direção acordada continuam autônomos.
- Use textos objetivos no aplicativo e na comunicação. Sem slogans, frases de efeito, abertura promocional ou explicações repetidas. Texto deve orientar uma ação, identificar informação ou explicar um estado necessário.
- Priorize composições e interações próprias já no protótipo; não adie essa direção para o fim usando inputs genéricos como padrão. Em Finanças, conta/moeda usam círculos que descem sem painel e se alongam para revelar nomes no hover/foco (D34/D35); saldo em card com carteira no canto. Preserve acesso por teclado e movimento reduzido.
- Discuta escolhas relevantes ainda abertas: integrações, dados acessados e armazenamento, autorização/desconexão, sincronização/conflitos, exclusão/substituição, metodologias financeiras, comportamentos importantes, navegação/identidade, custos/privacidade e mudanças estruturais.
- Registre respostas e critérios de aceitação antes de implementar a parte dependente. Continue tarefas independentes enquanto aguarda. Não transforme proposta em decisão confirmada.
- Nas perguntas de produto/design, explique com detalhes e exemplos concretos o que acontece na tela e as consequências das opções. Gabriel pediu em 30/10/2026 para não economizar palavras quando isso prejudicar a compreensão; diferencie, por exemplo, redimensionamento salvo de expansão temporária.
- Ao concluir uma pequena entrega significativa, valide, atualize o estado, apresente um resultado verificável e proponha a próxima. Aguarde a resposta antes de iniciar outro conjunto de funcionalidades.
- Ao apresentar uma entrega ou sua continuidade, informe sempre o identificador e o nome, por exemplo **F02b.2 — Período padrão em Configurações**. Preferência reforçada por Gabriel em 30/10/2026.
- “Pode ir para a próxima” aprova o trabalho apresentado e autoriza a próxima pequena entrega proposta; decisões importantes ainda abertas continuam exigindo levantamento.
- Não repita perguntas já respondidas, salvo novas evidências. O primeiro conjunto limitado descrito nas fontes já está autorizado; não peça permissão novamente apenas para iniciá-lo.

## Direção estabelecida

- Produto desktop pessoal para Windows, com Angular, Electron e TypeScript. Investimentos são o principal diferencial.
- Navegação principal: Visão geral, Finanças e Investimentos. Simulador em Investimentos. Configurações em acesso secundário por engrenagem, com seção Integrações.
- Nome: **FinDesk**. A referência isolada a “Alça” é uma inconsistência do complemento, não um segundo nome aprovado.
- Logo: usar o PNG original de Gabriel em `FinDesk-Project/public/brand/logo-original.png`, com moedas e seta ascendente. O arquivo contém versões branca e preta; foi preservado sem alteração. Os SVGs de apresentação apenas enquadram essas versões e não são vetorização. O F anterior foi substituído; não propor outra marca por dificuldade de visualizar um anexo.
- Tema escuro primeiro. PrimeNG para componentes pontuais, com composição própria e recursos gratuitos. Pesquise compatibilidade oficial antes de escolher versões.
- Gabriel confirmou Angular 21 + PrimeNG 21 Community MIT e barra nativa do Windows nesta casca. Versões e pesquisa em `docs/DECISIONS.md`. Não atualizar PrimeNG para major com outra licença sem discussão; revisar a base antes do fim previsto do LTS do Angular 21 em junho/2027.
- SQLite local confirmado (D23), node:sqlite em worker privilegiado (D25), `%LOCALAPPDATA%\FinDesk\data` (D26) e restauração somente demo preservando preferências/layout (D27). F01c.2 implementa demo.sqlite e preferences.sqlite, com seed idempotente e esquema versionado. Testes usam somente perfis temporários; nunca gravar nos bancos normais para testar falhas. Não há servidor separado.
- Gastos do resumo/relatórios abrem por padrão em parcelas por fatura (D24); a visão contratada permanece disponível. Não duplicar o pagamento da fatura como consumo. Regras temporais dos ciclos ainda precisam ser fechadas nas entregas correspondentes.
- Cabeçalho D36–D39: saldo com largura/posição preservadas, fundo uniforme e pequena altura adicional. Só os períodos ficam em coluna ao lado, expansão à direita do ativo; importar/banco/moeda continuam juntos no canto anterior. Ciclos básicos usam datas salvas da conta, sem geração: salário previsto até véspera do próximo; cartão do dia seguinte ao fechamento anterior até o próximo, inclusivo. Conta incompatível volta ao calendário sem aviso. Configuração de recorrências/dias úteis e referências entre vários cartões continuam pendentes; não repetir as regras já respondidas.
- F02b.3/D44–D52 amplia salário para regra mensal configurada por conta: dia 1–31, fim do mês quando necessário, sem ajuste de dias úteis, datas confirmadas prioritárias, geração somente pelo ciclo atual na ativação e futuros. Configurações também define cartão de referência da própria conta. Salvamento automático e aplicação imediata dos ajustes; preferência de modo padrão continua valendo na próxima abertura (D43). Preferências v3 preservadas na restauração demo; não criar receitas ou valores por gerar intervalos. Fechamentos seguem datas salvas.
- F03a/D55–D64: cards de protótipo no Geral, alinhados sem sobreposição e controles sempre disponíveis (sem modo Organizar). Arraste pelo corpo comum, sem espera; preservar controles internos. Sem três pontos/menu de tamanhos. Canto grosso redimensiona continuamente; vizinho cede até o mínimo antes de descer e recuperar sua largura preferida. Duplo clique entra/sai do foco temporário, mantendo filtros/cabeçalho; Escape retorna. Setas movem, Shift + setas redimensionam, Enter/espaço alterna foco. Salvar automaticamente ao terminar ajustes; restauração confirmada preserva fatos/preferências. Namespace próprio em preferences.sqlite e ponte restrita. Não recolocar título Geral ou selo Protótipo acima dos cards, removidos por D61; estados dos conteúdos permanecem explícitos.
- Separe interface, aplicação, domínio e infraestrutura. Componentes Angular não executam SQL nem acessam segredos. Electron usa renderer isolado, preload restrito e tipado e validação também no processo privilegiado.
- Demonstração identificada, dados fictícios coerentes e separados dos dados reais futuros; seed idempotente, migrações versionadas e restauração explícita. Nunca apagar o banco automaticamente ao abrir.
- Consulte as regras financeiras completas nas fontes antes de implementá-las. Controle precisão e arredondamento; preserve moedas originais; não some BRL com USD; diferencie ausente de zero. Transferências próprias, aportes e pagamentos de fatura não podem duplicar receitas, despesas ou rendimentos.
- Não conectar contas reais, solicitar credenciais, publicar/distribuir, criar custos, introduzir telemetria ou enviar dados financeiros para IA sem a discussão/autorização aplicável. Não implementar pagamentos, ordens de compra ou movimentação de dinheiro.

F03a/D65–D66: Restaurar layout confirma pelo segundo clique no próprio botão (“Restaurar layout?”), sem painel extra; Escape/clique fora/perda de foco cancelam. Categorias/Evolução usam 344 px de altura inicial e Compromissos 304 px; preservar layouts já salvos. O canto de resize deve capturar também o traço externo, sem deixar o clique iniciar arraste pelo conteúdo.

D67/D68: arrastar a navbar pelo fundo, sem alça/três pontos, preservando links/botões/rolagem. Menu de posições por clique direito no fundo ou Enter/espaço com foco no painel. Cards/navbar só mostram mão de arraste durante movimento efetivo, nunca no hover ou clique parado. Limpar o cursor ao terminar/cancelar; canto de resize mantém seu cursor próprio.

D69/D70: destacar navbar/destino em verde durante arraste; cards flutuam por toda a janela durante o gesto e inserem antes/depois dos vizinhos, abrindo espaço durante a prévia. Soltar somente em posições válidas do layout; fora/Escape restaura sem gravar. Não voltar a prender o movimento visual ao conteúdo nem limitar a interação ao centro dos vizinhos. Preservar resize adaptativo, foco, teclado e mesma instância do conteúdo.

D71: preservar troca direta ao sobrepor outro card e inserção ao ultrapassar sua borda, no mesmo gesto; troca não deve deslocar intermediários. Não substituir um comportamento pelo outro. Preparar posição/tamanho antes de expor a camada de arraste e manter transições desativadas no próprio card ativo, inclusive com movimento reduzido, para evitar piscada inicial.

D72: permitir posição horizontal contínua no espaço livre da própria linha, sem sobreposição; outras linhas mantêm troca/inserção/empurrão. Salvar em layout v3 com `align` normalizado; ler v1/v2 sem regravar/apagar legados. Alt + setas laterais ajusta a posição. Soltura aplica o modelo final antes de retirar a camada superior, sem retornar brevemente à origem. Status de salvamento não ocupa espaço visual e a largura da rolagem fica reservada.

D73: diminuir um card não comprime vizinhos nem puxa outra linha para cima. Crescimento horizontal só adapta os vizinhos que já estavam na linha; card de largura completa não é comprimido para subir. Preservar limites das linhas ao redimensionar, liberar esses limites ao reorganizar e não converter a apresentação estreita em layout amplo salvo. Diminuir mantém a posição horizontal dos vizinhos quando não há colisão.

Estabilidade da F03a: durante arraste de cards, não reduzir a área rolável conforme a prévia, para evitar saltos de scroll. Espaços livres são associados primeiro à linha vertical, depois à posição horizontal. Reagrupar linhas pode manter a ordem dos IDs e ainda assim liberar limites do resize. Segurar na borda mantém rolagem automática nos dois sentidos; terminar/cancelar remove agendamento/listeners/cursor e altura temporária. Não remover troca/inserção, posição livre ou a proteção D73 para corrigir esses casos.

D74–D76: períodos centralizados na altura do saldo; conteúdo começa mais perto do topo, com Sobre no mesmo lugar. Restaurar layout fica junto dos submenus somente no Geral, sem barra própria acima dos cards, preservando confirmação em dois cliques. Altura de cards tem assistência leve de 8 px, liberada acima de 12 px, só com vizinhos da mesma linha e guia discreta; não mudar os vizinhos. Navbar usa faixa de encaixe de 128 px e mantém prévia/confirmação ao soltar.

## Git e aprovação

Fluxo: **implementar → validar → apresentar → receber aprovação → commitar → iniciar a próxima entrega**.

A aprovação da entrega autoriza seu commit local sem outra pergunta. Faça e valide correções solicitadas junto da aprovação antes do commit. Inclua somente o trabalho apresentado; revise status, diff, arquivos selecionados e conteúdo preparado. Preserve mudanças de terceiros. Não crie commits vazios ou checkpoints incompletos sem acordo.

Use `tipo(escopo): descrição`, com descrição curta e específica em português. Antes de configurar Git, confira repositório, histórico, branch e remotos. Use a identidade já configurada pelo proprietário; não invente nome/e-mail.

A política de push confirmada por Gabriel é **push após cada entrega aprovada**. O destino confirmado é `https://github.com/GabrielNZ/FinDesk.git`. Após revisar, validar e commitar a entrega aprovada, envie os commits correspondentes a esse remoto sem repetir a pergunta. Não inclua trabalho ainda não aprovado. Não confunda commit local com publicação no GitHub.

Não versione segredos, `.env` real, bancos pessoais/auxiliares, extratos, importações reais, logs pessoais, backups, dependências, builds ou instaladores. Versione código, migrações, fixtures fictícias, configurações sem segredos, lockfile, documentação e assets aprovados. Configure `.gitignore` na preparação do repositório.

Não faça force push, reset destrutivo, limpeza de arquivos não rastreados, exclusão de branches com trabalho, reescrita de commits publicados ou alteração/remoção de remoto sem autorização específica.

## Continuidade e qualidade

`PROJECT_STATUS.md` na raiz é a fonte única de estado; não criar `docs/STATUS.md`. Registre etapa, última entrega concluída/aprovada, verificações efetivas, limitações, decisões abertas, próxima entrega e autorização para avançar, além da política de push.

Separe sempre **decisão confirmada**, **proposta do Codex**, **pendência de pesquisa** e **pergunta aguardando resposta**. Não declare testes, instalação, cobertura de provedores ou compatibilidade que não foram verificados. Consulte documentação oficial ao selecionar dependências e implementar segurança do Electron. Não realize pesquisas de etapas futuras apenas para apresentá-las como já resolvidas.

Agrupe verificações após conjuntos coerentes de mudanças, conforme o risco. Não crie ou execute testes para cada ajuste simples de texto, estilo ou formatação. Para esses ajustes, revisão e uma verificação conjunta de compilação/layout quando pertinente são suficientes. Regras financeiras, persistência, IPC, segurança e mecânicas relevantes exigem testes adequados. Reutilize evidências ainda válidas; não repita instalação, build completo ou toda a suíte sem mudança, falha ou preocupação concreta que justifique. Antes de commit, confirme que as verificações pertinentes ao diff estão atendidas.
