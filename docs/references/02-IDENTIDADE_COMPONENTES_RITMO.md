# Complemento ao documento mestre — Identidade, componentes e ritmo de desenvolvimento 
 
Este documento complementa o documento mestre do aplicativo. Em caso de conflito sobre identidade visual, uso de componentes e passagem entre etapas, prevalecem as instruções deste complemento. 
 
## 1. Nome e identidade 
 
Adote o nome: 
 
**FinDesk** 


 
O nome remete a crescimento e evolução. Ele deve aparecer com discrição, sem transformar a interface em uma peça publicitária. 
 

 
Centralize nome, descrição e referências de identidade para facilitar uma mudança futura. 
 
## 2. Conceito do logo 
 
Estara anexado ao chat, no momento com cor escuro/preto para o tema claro, porem no tema escuro a logo deve ser clara/branca
 
## 3. Processo para a identidade 
 
Antes de espalhar a identidade por todas as telas: 
 
1. Prepare duas propostas simples do símbolo. 
2. Mostre ambas aplicadas ao nome Alça. 
3. Mostre como funcionam em fundo escuro e em tamanho pequeno. 
4. Explique brevemente a diferença. 
5. Peça ao proprietário que escolha ou ajuste a direção. 
 
Enquanto a escolha estiver pendente, avance em tarefas independentes e use uma identidade provisória substituível. 
 
Depois da escolha, prepare os formatos apropriados para: 
 
- Marca com símbolo e nome. 
- Símbolo isolado. 
- Versão monocromática. 
- Ícone do aplicativo. 
- Aplicação no tema escuro. 
- Aplicação futura no tema claro. 
 
Prefira um resultado vetorial para o símbolo simples. Exporte os formatos necessários ao empacotamento quando chegar a essa etapa. 
 
## 4. PrimeNG como base de componentes 
 
A preferência do proprietário é usar **PrimeNG para componentes pontuais**, mantendo a identidade e a composição próprias do aplicativo. 
 
Avalie a versão estável compatível com o Angular escolhido, consultando a documentação oficial. 
 
Exemplos de uso apropriado: 
 
- Botões. 
- Campos. 
- Seletores. 
- Checkboxes. 
- Alternâncias. 
- Menus. 
- Tooltips. 
- Diálogos. 
- Mensagens de feedback. 
- Outros controles convencionais que façam sentido. 
 
PrimeIcons pode ser utilizado se atender à consistência visual e às condições de licença do projeto. 
 
Não introduza Angular Material junto com PrimeNG apenas para variar a aparência. Uma segunda biblioteca de componentes exige necessidade concreta. 
 
Utilize recursos gratuitos. Não adote templates, kits ou componentes pagos sem autorização. 
 
## 5. Identidade própria sobre os componentes 
 
PrimeNG é uma ferramenta de implementação. O desenho das telas deve seguir o produto e seu sistema visual. 
 
Personalize de forma consistente: 
 
- Cores. 
- Tipografia. 
- Espaçamentos. 
- Altura dos controles. 
- Bordas. 
- Raios. 
- Estados de foco. 
- Estados selecionados. 
- Densidade. 
- Movimento. 
 
Use APIs de tema e mecanismos suportados pela biblioteca. Evite uma coleção de sobrescritas frágeis de CSS e dependência de detalhes internos. 
 
Não crie um wrapper para cada componente automaticamente. Crie componentes próprios quando houver comportamento, composição ou padrão visual recorrente que justifique essa abstração. 
 
## 6. Interatividade permanece essencial 
 
A adoção do PrimeNG não reduz os requisitos de criatividade. 
 
Preserve a direção já estabelecida: 
 
- Gráficos exploráveis. 
- Filtros conectados aos gráficos. 
- Linhas e blocos expansíveis. 
- Linha do tempo de faturas. 
- Parcelas destacadas visualmente. 
- Controles dinâmicos no simulador. 
- Personalização gradual. 
- Cards arrastáveis e redimensionáveis nas etapas previstas. 
- Janelas destacáveis quando chegarem ao roadmap. 
 
Escolha a solução de gráficos e de arrastar/redimensionar conforme os requisitos, acessibilidade, manutenção e licença. Não é obrigatório que todos os comportamentos venham da mesma biblioteca. 
 
As interações devem ajudar a explorar os dados. Mantenha caminhos simples para consultar valores, editar informações e navegar. 
 
## 7. Documentação na raiz do projeto 
 
O projeto deve ter um ponto de entrada evidente para o proprietário e para futuras sessões do Codex. 
 
Na raiz, mantenha: 
 
- `AGENTS.md`: instruções operacionais para os agentes. 
- `PROJECT_BRIEF.md`: visão consolidada, decisões do proprietário e limites. 
- `PROJECT_STATUS.md`: estado atual e próximo passo. 
- `README.md`: instalação, execução e índice da documentação. 
 
O conteúdo detalhado permanece organizado em `docs/`, conforme o documento mestre. 
 
Para evitar duplicação, substitua a proposta anterior de `docs/STATUS.md` por `PROJECT_STATUS.md` na raiz. Utilize links para os documentos de produto, roadmap, arquitetura e design. 
 
Registre a identidade e as decisões sobre PrimeNG em `docs/DESIGN_SYSTEM.md`. Se necessário, mantenha orientações adicionais de marca em um arquivo próprio referenciado por ele. 
 
Regras: 
 
- Documentação e código devem permanecer coerentes. 
- Mudanças de escopo ou design precisam ser registradas. 
- Decisões provisórias devem estar identificadas. 
- Uma decisão nova substitui explicitamente a anterior. 
- O histórico da conversa não pode ser a única fonte de contexto. 
- Não coloque credenciais ou dados bancários reais nesses documentos. 
 
## 8. Autonomia por pequenas entregas 
 
O proprietário quer participar das decisões e acompanhar a evolução. 
 
Você deve conseguir identificar o próximo passo sem precisar que ele reconstrua o contexto, mas não deve executar todas as etapas do roadmap sem consulta. 
 
Diferencie: 
 
### Tarefa interna 
 
Uma ação dentro do conjunto de trabalho já autorizado. 
 
Exemplos: 
 
- Configurar uma ferramenta. 
- Implementar um componente. 
- Corrigir um erro. 
- Acrescentar um teste relevante. 
- Atualizar documentação. 
 
Execute autonomamente, sem pedir autorização a cada tarefa. 
 
### Pequena entrega 
 
Um conjunto coerente e verificável de tarefas, com resultado que o proprietário consegue avaliar. 
 
Exemplos: 
 
- Estrutura inicial que abre no Electron. 
- Navegação e tema escuro. 
- Tela de cartão com dados fictícios. 
- Carteira demonstrativa. 
- Simulador interativo. 
 
Ao concluir uma pequena entrega significativa, apresente o resultado e proponha a próxima. Aguarde a resposta antes de iniciar um novo conjunto de funcionalidades. 
 
### Etapa do roadmap 
 
Um marco maior composto por pequenas entregas. 
 
Ao concluir uma etapa, revise seus critérios, informe as pendências e peça autorização para a próxima. 
 
## 9. Primeiro conjunto de trabalho autorizado 
 
Na primeira execução, comece por: 
 
- Inspeção do ambiente e das instruções existentes. 
- Documentação inicial. 
- Registro das decisões. 
- Configuração da estrutura Angular/Electron/TypeScript. 
- Inicialização mínima da aplicação. 
- Preparação das propostas de identidade. 
 
Esse conjunto já está autorizado pelo documento inicial. Não peça novamente permissão apenas para começar. 
 
Ao concluí-lo, mostre o que funciona, apresente as propostas visuais e indique qual pequena entrega recomenda executar em seguida. 
 
Não interprete essa autorização como aprovação para implementar todas as telas ou conectar contas reais. 
 
## 10. Quando consultar o proprietário 
 
Faça perguntas em momentos em que a resposta realmente muda o resultado: 
 
- Escolha entre propostas de identidade. 
- Aprovação da direção visual aplicada a uma tela. 
- Ambiguidade em uma regra financeira. 
- Escolha de comportamento com impacto perceptível. 
- Mudança importante de arquitetura. 
- Inclusão de custos. 
- Integração com contas reais. 
- Passagem para uma nova pequena entrega ou etapa. 
 
Agrupe perguntas relacionadas. Evite interromper o fluxo por nomes de arquivos, pequenos espaçamentos ou detalhes internos já cobertos pelas diretrizes. 
 
Quando houver uma recomendação clara, apresente-a junto da pergunta. 
 
## 11. Comunicação de progresso 
 
Durante a implementação, informe de maneira breve: 
 
- O que está sendo construído. 
- O que foi descoberto. 
- Alguma limitação relevante. 
- Qual verificação será feita em seguida. 
 
Ao concluir uma pequena entrega, apresente: 
 
1. O que ficou pronto. 
2. Como executar ou conferir. 
3. O que foi validado. 
4. Pendências relevantes. 
5. A próxima pequena entrega recomendada. 
6. As decisões necessárias para continuar. 
 
Evite tanto silêncio prolongado quanto relatos de cada alteração de arquivo. 
 
## 12. Continuidade entre sessões 
 
Atualize `PROJECT_STATUS.md` ao final de cada pequena entrega com: 
 
- Etapa atual. 
- Última entrega concluída. 
- Verificações realizadas. 
- Problemas conhecidos. 
- Decisões pendentes. 
- Próxima entrega proposta. 
- Situação da autorização para avançar. 
 
Quando o proprietário disser “continue” ou “vá para a próxima”: 
 
- Leia as instruções e o estado do projeto. 
- Identifique a próxima entrega proposta. 
- Considere a resposta autorização para essa entrega. 
- Execute suas tarefas internas autonomamente. 
- Faça nova revisão ao concluí-la. 
 
Essa autorização não se estende automaticamente ao restante do roadmap. 
 
**O ritmo desejado é: propor uma entrega clara, implementá-la com autonomia, validar, mostrar o resultado, ouvir o proprietário e avançar.**