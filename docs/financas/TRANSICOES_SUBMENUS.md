# F02c — Deslizamento entre submenus de Finanças

## Solicitação e critérios — D161

Gabriel pediu em 24/11/2026 uma animação de deslizamento horizontal entre os conteúdos dos submenus, com sentido conforme a aba escolhida. Esta entrega antecede a parte dependente da F09b, cujas perguntas Gabriel informou não ter recebido; reapresentá-las no texto da conversa, sem presumir respostas.

Critérios registrados antes da implementação:

- Ordem: Geral, Movimentações, Cartão, Compromissos e Assinaturas. Avançar move o conteúdo anterior para a esquerda e traz o próximo pela direita; voltar inverte. Saltar abas segue a mesma ordem. Histórico do navegador também usa origem/destino efetivos.
- Animação breve, inicialmente 240 ms, somente entre submenus distintos de Finanças. Primeira abertura, mesma aba e navegação para fora/para dentro de Finanças não deslizam.
- Saldo, seletores e abas permanecem parados. Não duplicar instâncias Angular, salvar novos estados ou mudar consulta financeira por causa da animação.
- Preservar links/teclado/foco, cards/arraste/resize, consulta do cartão e filtros/Seleção existentes. Trocas rápidas devem cancelar a apresentação anterior e terminar no destino correto, sem bloquear a próxima escolha ou deixar uma camada sobre a interface.
- Movimento reduzido desativa o deslizamento. Ausência da API mantém a navegação normal. Nenhuma dependência nova, IPC, schema ou atualização de dados fictícios.

## Pesquisa técnica

Angular 21.2.25 instalado possui `withViewTransitions`, `skipInitialTransition` e `onViewTransitionCreated`. A integração de View Transitions é documentada em [Angular 21 — Route transition animations](https://v21.angular.dev/guide/routing/route-transition-animations); o contrato é developer preview na versão instalada. Uso restrito à apresentação, com fallback nativo do Router, sem alteração de dependências.

O Router entrega as árvores de rota anteriores/seguintes. Elas permitem determinar o sentido em cliques, teclado e histórico, sem depender de um clique interceptado. Capturas nativas preservam a imagem de saída sem manter componentes antigos vivos. CSS dos pseudo-elementos fica global, conforme a documentação oficial; o nome da captura pertence apenas ao conteúdo de Finanças. Não transformar ou recortar o conteúdo vivo de cards, para preservar seus gestos e elementos flutuantes.

O sentido usa tipos nativos da transição, sem classes temporárias ou timers próprios. A captura da raiz foi desativada e os pseudo-elementos não capturam eventos, mantendo abas/cabeçalho interativos durante a passagem, conforme [Chrome — manter elementos fora da transição interativos](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/group-element-transitions). `DOM.Iterable` foi incluído somente na configuração de tipos da interface para o conjunto de tipos nativos, sem efeito na persistência ou no código privilegiado.

## Validação prevista

Tipos/templates/build/lint/formatação pertinentes. Electron em perfis temporários: direções nos dois sentidos e saltos, quadro intermediário, cabeçalho estável, voltar/avançar, trocas rápidas, movimento reduzido, API indisponível, estado/contexto preservados e retorno à interação normal. Reutilizar regressões pertinentes e evidências financeiras existentes. Estado efetivo e aprovação ficam exclusivamente em PROJECT_STATUS.
