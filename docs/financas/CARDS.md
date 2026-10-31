# F03a — Padrão inicial de cards e organização

## Objetivo e base confirmada

Preparar o componente reutilizável e a primeira experiência de organização, preservando cabeçalho, filtros, navegação e os ajustes já aprovados. Fonte: §4.2 da especificação de Finanças, FIN-003–005 e cenários C27/C30.

A especificação original menciona arraste por alça/cabeçalho; D62–D64 refinam a interação para arraste pelo corpo comum, redimensionamento contínuo e duplo clique para foco. Mantêm retorno ao layout anterior, posição/dimensões salvas por área, restauração explícita, teclado, foco visível e reacomodação vertical em janela estreita. Preservar os gestos dos controles internos.

## Diagnóstico antes da implementação

- Submenus usam `finance-subpage.ts`, uma seção provisória. Não há card reutilizável ou motor de layout existente para reaproveitar.
- Angular CDK 21.2.14 já instalado oferece alças e listas ordenáveis, inclusive orientação mista. API instalada conferida em `node_modules/@angular/cdk/types/drag-drop.d.ts`. Isso não comprova redimensionamento, persistência ou o conjunto dos gestos no FinDesk.
- `preferences.sqlite` preserva namespaces, mas o renderer só tem contrato financeiro específico; ainda não existe API de layout. Não usar escrita arbitrária nem reutilizar o payload financeiro para posições dos cards sem definir um contrato adequado.
- Dados/cálculos de resumo, gráficos e compromissos mantêm as entregas próprias. Não apresentar valores ou ações ficticiamente funcionais para preencher o protótipo.

## Primeira rodada — decisões confirmadas

1. D55: no Geral, com Categorias/Evolução/Próximos compromissos em estado de protótipo.
2. D56: encaixe em grade, sem sobreposição.
3. D57: controles sempre disponíveis, sem modo Organizar obrigatório.

Respostas recebidas e registradas. Preservar o conteúdo financeiro para suas etapas; não preencher protótipos com números inventados.

## Segunda rodada — decisões e esclarecimento

- D58 inicialmente confirmou alça no canto inferior direito e opções de tamanho; D63 retira o menu, mantém o canto e alternativas por teclado.
- D59 confirmado: salvamento automático ao terminar ajustes e restauração com confirmação na página.
- D60 confirmado após esclarecimento: foco temporário na área de cards, com demais ocultos e cabeçalho/filtros/submenus utilizáveis. D63 define duplo clique para entrar/sair e Escape para retornar, em lugar de botão de expansão/Voltar. Redimensionamento é persistido; foco temporário não é salvo.

Todas as perguntas desta fatia foram respondidas. Usar perguntas detalhadas com exemplos nas próximas rodadas.

## Revisão de interação — decisões confirmadas

- D62: pressionar e mover pelo fundo, título ou conteúdo comum inicia arraste, sem espera. Botões, campos, links, sliders e regiões marcadas como interativas mantêm seus gestos. Remover alça de três pontos e menu de opções.
- D63: canto inferior direito em traço grosso, sem seta. Duplo clique no corpo entra/sai do foco. Teclado: setas movem, Shift + setas redimensionam, Enter/espaço alterna foco; setas no canto redimensionam. Escape cancela/retorna.
- D64: dimensões contínuas durante o gesto. Vizinho cede espaço até o mínimo antes de mudar de linha; ao descer, recupera sua largura preferida anterior à compressão. Reduzir novamente o card permite reencaixar o vizinho. Nenhuma preferência do vizinho é substituída.
- D65: Restaurar layout muda para “Restaurar layout?” no mesmo botão; segundo clique confirma. Escape, clique fora ou perda de foco cancelam sem restaurar. Sem seção separada ou deslocamento dos cards.
- D66: Categorias/Evolução começam em 344 px, 40 px acima do padrão anterior; Próximos compromissos permanece com 304 px. Ausência de layout ou restauração explícita usa esse padrão, sem sobrescrever tamanhos salvos.
- D70: card flutua por toda a janela durante o arraste, inclusive sobre navbar/cabeçalho; encaixe continua restrito à área de cards. Inserção antes/depois dos vizinhos e nas extremidades das linhas, com espaço marcado e vizinhos deslocados durante a prévia. Soltar fora/cancelar restaura; gravar somente ao terminar em posição válida. Mantém as interações anteriores.
- D71 esclarece a coexistência: ponteiro sobre outro card propõe troca direta apenas entre os dois, preservando os intermediários; ultrapassar sua borda propõe inserção, empurrando os demais. Voltar para cima do destino retorna à troca. Prévia com borda contínua para troca e tracejada para inserção; salvar o resultado proposto somente ao soltar.
- D72: deslocamento horizontal contínuo dentro do espaço livre da própria linha, sem sobreposição ou mudança de ordem. Esquerda/centro/direita são posições possíveis, sem opções fixas obrigatórias. Outras linhas e sobreposição continuam usando D70/D71. Alt + setas laterais ajusta essa posição por teclado.

Falha de resize reproduzida: a borda arredondada da área transparente do canto deixava um clique a 3 px da extremidade atravessar para o conteúdo, iniciando movimento. Mantido o traço visual; a região transparente de captura passa a ser retangular. Teste cobre o ponto externo, não somente o centro do controle.

## Implementação

`shared/card-layout.ts` e `application/card-layout.ts` descrevem área, ordem, dimensões preferidas e prioridade do último redimensionado. Um resolvedor puro calcula caixas em linhas sem sobreposição, mínimo de 280 px por vizinho e gap de 16 px. Em janela estreita, a apresentação vertical não sobrescreve preferências. `DashboardCard` projeta conteúdo e protege controles; `CardBoard` coordena gestos por requestAnimationFrame, captura após 6 px de movimento e permite cancelamento sem gravação. Layout v2 armazena dimensões fracionárias limitadas; v1 é lida e convertida em memória sem regravar na abertura. O próximo ajuste cria o namespace v2 preservando o legado. Persistência mantém contrato dedicado em preferences.sqlite, validação privilegiada e restauração explícita. Nenhum SQL ou escrita genérica no renderer.

Fontes técnicas consultadas em 30/10/2026: [Angular — Drag and drop](https://angular.dev/guide/drag-drop), incluindo alças e atualização explícita do modelo após soltar; [Electron — IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), com API específica no preload. A versão instalada continua a referência de API para o código; nenhuma compatibilidade de gestos foi declarada sem execução no FinDesk.

D70 usa Popover API manual como camada superior transparente, preservando a mesma instância/conteúdo do card. Coordenadas visuais fixas acompanham o ponteiro sem limite do conteúdo. A ordem do DOM é mantida durante a prévia para não remover o card da camada superior. Inserções usam caixas estáveis do início do gesto, incluindo antes/depois e regiões vazias, evitando oscilação quando o vizinho se desloca. O lugar original permanece estável até cruzar outro destino. Uma margem de 24 px nas laterais e 48 px abaixo da área permite inserir junto às extremidades, limitada ao viewport do workspace; não permite soltar na navbar/cabeçalho. Fora da área válida, a prévia de organização é desfeita, mas o card continua acompanhando o mouse. A movimentação dos vizinhos tem transição de 140 ms, respeitando movimento reduzido. Nada disso acrescenta coordenadas livres ao layout salvo v2.

## Critérios de aceitação — F03a

D74/D75: Restaurar layout na linha dos submenus, somente com o Geral ativo; mesma confirmação/cancelamento/foco, sem barra adicional e sem deslocar os cards ao confirmar. Foco do card desabilita a restauração. No ajuste de altura, vizinho da mesma linha pode atrair a até 8 px e manter até 12 px; ultrapassar libera. Guia aparece somente durante encaixe, nunca em ajuste apenas horizontal ou com referência de outra linha. Persistir somente a dimensão final; não alterar os vizinhos. Conferir troca de submenus, janela compacta e regressões anteriores.
Na disposição já rolada, a prévia deve antecipar o limite de rolagem do resultado mais curto; ao soltar, as posições de tela dos cards devem coincidir com as mostradas na prévia, mesmo retirando a altura temporária.

Correção de estabilidade entre linhas: usar a disposição com Categorias/Evolução de quatro colunas em linhas separadas e alinhamentos diferentes, seguida de Próximos compromissos em largura completa, com workspace já rolado. Mudar a prévia não pode reduzir a altura disponível durante o gesto ou fazer a rolagem recuar. Espaço vazio pertence primeiro à linha vertical sob o ponteiro; inserir pode reagrupar linhas mesmo mantendo a ordem dos IDs. Segurar na borda deve continuar rolando; inverter direção e soltar devem funcionar sem novo movimento obrigatório do mouse. Testes cobrem ida/volta no mesmo gesto e término depois do último card, preservando as regressões D70–D73.

D73: diminuir largura/altura não deve ativar compressão ou puxar outra linha. Ajuste captura as linhas existentes em `rowStarts` opcional v3; crescimento horizontal pode adaptar os membros da mesma linha, enquanto cards de largura completa permanecem em linha própria. Redução conserva a posição dos vizinhos pelo alinhamento no espaço liberado. Reordenação/troca limpa os limites; editar a apresentação estreita não salva suas quebras responsivas. Conferir redução horizontal e vertical em janela ampla, durante o gesto, após soltar e ao reabrir; repetir a regressão de crescimento/retorno.

Atualização D72: layout atual v3 acrescenta `align` opcional 0–1, proporção do espaço livre da linha. Lê v1/v2 em memória, preservando bytes legados ao salvar v3. Reduzir a janela não apaga a posição escolhida. Finalizar o gesto aplica o modelo antes de remover a camada superior, sincroniza a geometria sem transição transitória e evita processar novamente o mesmo ponto/rolagem. Anúncio de salvamento fica fora do fluxo visual; largura de rolagem reservada evita reajustes. Evidência de soltura: observar os primeiros 12 frames, não somente a posição estabilizada.

Revisão da piscada inicial: reproduzida a exposição da camada superior ainda com posicionamento absoluto e medidas anteriores à promoção; a regra global de movimento reduzido também criava uma transição breve de coordenadas. Preparar classe, posição fixa e dimensões antes de `showPopover()`, desabilitar transição/animação do próprio card arrastado e restaurar os estilos ao concluir/cancelar. Animação dos vizinhos continua independente. Conferir medidas na chamada de exposição e no primeiro frame seguinte, com/sem movimento reduzido; não basta medir depois de estabilizar.

1. Geral apresenta os três cards de protótipo, com estado do conteúdo ainda não implementado explícito e sem números inventados. D61 remove o título Geral e o selo Protótipo acima dos cards, mantendo nome acessível da região e Restaurar layout. Categorias/Evolução começam lado a lado quando couberem; Próximos compromissos abaixo. Cabeçalho e contexto existentes preservados.
2. Arraste pelo corpo comum sem espera, com canto grosso para tamanho e sem três pontos/menu/seta de resize. Controles internos não iniciam arraste/foco. Escape/cancelamento não grava o gesto inacabado.
3. Largura/altura acompanham movimentos pequenos sem saltos inteiros. Vizinho encolhe antes de descer e restaura sua largura preferida ao descer. Teclado permite mover e ajustar dimensões; foco visível e movimento reduzido respeitados.
4. Posição e dimensões salvas automaticamente ao terminar o ajuste, por área, em namespace próprio de preferences.sqlite, preservando preferências financeiras e fatos. Restauração demo mantém layout; Restaurar layout exige segundo clique no mesmo botão e afeta somente o layout. Primeiro clique não escreve nem desloca cards; Escape/clique fora/perda de foco cancelam. Padrão D66 não substitui ajustes salvos automaticamente.
5. Em erro de gravação, manter alteração na execução e informar que não foi salva, oferecendo nova tentativa. Erro de leitura/formato futuro não recria layout silenciosamente; restauração continua explícita. Estados sem ponte não simulam persistência.
6. Duplo clique entra/sai do foco D60, preservando filtros e a mesma instância/conteúdo do card; Escape também retorna. Não persiste o foco ou altera tamanho salvo. Gestos de organização ficam indisponíveis durante foco.
7. Janela estreita reacomoda verticalmente sem sobrescrever o layout amplo. Testar gestos, teclado, restauração, reabertura, erros e isolamento em perfis temporários.
8. Card acompanha o mouse fora do conteúdo sem corte pela rolagem. Ao cruzar um destino válido, vizinhos abrem espaço antes de soltar; aceitar a lateral externa do vizinho, não apenas seu centro. Fora da área válida/Escape, restaurar sem gravar. Limpar camada superior, espaço de destino e cursor ao concluir/cancelar, preservando a instância do conteúdo.
9. D71: com três cards, sobrepor o primeiro ao terceiro deve trocar somente esses dois; atravessar a borda do terceiro deve inserir e deslocar os intermediários. Testar a alternância no mesmo gesto e gravação dos dois resultados. No início do arraste, manter posição/tamanho corretos já ao expor a camada, sem salto transitório.
10. D72: um card isolado na linha pode ir à esquerda, centro e direita pelo mouse/teclado; manter tamanho, ordem e outras linhas. Salvar/reabrir preserva a posição. Trazer um card de baixo para o espaço de cima continua reformatando/empurrando. Soltar não deve mostrar a posição antiga, mover o cabeçalho por status ou alterar tamanho nos frames seguintes.

Sem nova biblioteca instalada. A primeira fatia inclui os mecanismos acima; integração dos conteúdos financeiros permanece nas entregas correspondentes.
