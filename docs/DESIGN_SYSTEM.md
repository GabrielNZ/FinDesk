# Sistema visual — proposta inicial

Gabriel confirmou manter a base visual da casca e enxugar o conteúdo. Tema escuro, menu, cores e espaçamento permanecem. A logo original fornecida, com moedas e seta ascendente, substitui o F.

## Base visual

Revisão de espaçamento após D74: padding superior do conteúdo em 28 px em todas as larguras. Ícone Sobre alinhado ao centro vertical do título, acompanhando sua escala responsiva. Título de Finanças sem selo Demonstração, conforme revisão de Gabriel.

D74–D76: conteúdo inicia com 16 px no topo; Sobre continua no cabeçalho de 48 px, sobreposto sem bloquear o restante da interface. Coluna de períodos mede 148 px (três botões de 44 px com dois intervalos de 8 px) e fica centralizada na altura do saldo. Linha de submenus inclui Restaurar layout à direita, visível no Geral; 16 px até os cards, sem barra extra. Assistência de altura: captar a 8 px de um vizinho da mesma linha e liberar após 12 px; guia fina sem texto, somente durante encaixe. Navbar oferece destino dentro de 128 px da borda mais próxima.

D73: ao diminuir um card, manter os vizinhos em seus lugares e tamanhos, sem puxar cards da linha inferior. Somente crescer horizontalmente pode comprimir vizinhos da mesma linha. Próximos compromissos em largura completa permanece em linha própria; arraste para reorganizar continua disponível.

D72: card pode ocupar qualquer posição horizontal livre na própria linha, sem colisão; outra linha mantém troca/inserção/empurrão. Alt + setas laterais oferece o ajuste por teclado. Soltura termina no destino sem animação intermediária de retorno à origem. Anúncio de salvamento automático oculto visualmente; espaço da barra de rolagem reservado para evitar mudança de largura.

D71: sobreposição propõe troca direta; atravessar a borda propõe inserção. Espaço de destino com borda contínua na troca, tracejada na inserção. Card ativo sem transições, já com posição/tamanho de tela antes de abrir a camada superior; animação dos vizinhos permanece. Evitar salto inicial também no modo de movimento reduzido.

D69/D70: durante arraste, borda verde de 3 px na navbar e no destino válido. Cards flutuam sobre a janela e inserem antes/depois de vizinhos; o espaço de encaixe fica tracejado e os demais se deslocam durante o gesto (140 ms, respeitando movimento reduzido). Movimento visual fora do conteúdo é permitido; soltura continua restrita à área válida. Cancelar/soltar fora restaura sem salvar.

D65/D66: confirmação no próprio botão Restaurar layout, que muda para “Restaurar layout?” e confirma no segundo clique, sem outro painel; Escape/clique fora/perda de foco cancelam. Altura padrão de Categorias/Evolução: 344 px; Próximos compromissos: 304 px. Preservar layouts escolhidos. A área transparente do canto de resize é retangular para capturar também a extremidade do traço, sem alterar a forma visual.

F03a/D55–D64: Geral usa Categorias/Evolução em meia largura por padrão e Próximos compromissos em largura completa, com estados sem números fictícios. D61 retira título Geral/selo acima dos cards. Arraste pelo corpo comum, sem alça de três pontos; controles internos preservados. Canto inferior direito em traço de 4 px acompanha a borda e redimensiona continuamente, sem seta/menu. Dimensões preferidas em unidades normalizadas de 12 colunas; vizinho cede até 280 px antes de descer e recuperar sua preferência. Duplo clique entra/sai do foco na área dos cards, preservando cabeçalho/filtros e layout salvo; Escape retorna. Setas movem, Shift + setas redimensionam e Enter/espaço alterna foco. Instruções acessíveis sem texto visual extra. Restaurar layout confirma na página.

D53, revisão dos botões de período: sem dica visual repetindo o nome; clique no botão selecionado abre/recolhe o seletor, mantendo a setinha. Troca de modo começa recolhida; nomes acessíveis e dicas de indisponibilidade permanecem. Não mudar dimensões ou posição dos grupos.

F02b.3 (D44–D52): Ciclos por conta expande a linha com marca/nome da instituição. Grade de dias 1–31 tem foco por setas/Home/End e seleção por Enter/espaço; botão Somente datas confirmadas desativa a regra. Cartões aparecem em botões por final; referência automática é válida só com um cartão. Salvamento automático e retorno de falha junto dos ajustes. Consulta recebe alterações após sucesso; modo padrão continua com aplicação na próxima abertura.

F02b.2 (D42/D43): Configurações → Finanças → Período padrão usa três botões com ícone e nome, seleção exclusiva e salvamento automático. Estados de salvamento/falha objetivos; aplicação na próxima abertura indicada em uma linha. Botões reacomodam em janela estreita; foco e teclado preservados. Ícones de período são os mesmos do cabeçalho.

Tokens em `FinDesk-Project/src/styles.scss`: fundo grafite, superfícies discretas, texto claro, bordas suaves e acento verde dessaturado. A paleta é uma proposta substituível, não identidade definitiva. Tipografia do sistema, sem fontes remotas. Navegação lateral compacta, poucos painéis, hierarquia de títulos e espaço para leitura.

O preset PrimeNG usa a API pública de temas com `@primeuix/themes` 2.0.3 MIT. Button e Dialog são usados pontualmente. PrimeIcons 7.0.0 compõe os ícones. Não há Angular Material, template pago, wrapper por controle ou sobrescritas dependentes da estrutura interna dos componentes.

## Tipografia confirmada

Gabriel escolheu a combinação A após comparação visual: **Bahnschrift** nos títulos `h1`, `h2` e `h3`; **Segoe UI Variable Text** em parágrafos e controles. Os tokens `--fd-font-heading` e `--fd-font-body` ficam em `FinDesk-Project/src/styles.scss`, com fallback para Segoe UI. Tamanhos e espaçamentos foram mantidos. As fontes estão instaladas no Windows; não são baixadas nem incluídas nos assets. Os ícones preservam sua própria fonte.

## Comportamento da casca

- Três áreas principais e Configurações secundárias por engrenagem.
- A navegação encaixa nas quatro bordas arrastando pelo fundo, sem três pontos, com prévia visual sem texto antes de soltar. Links e botões mantêm suas ações. Não há redimensionamento pela borda. Topo/base usam disposição horizontal. O painel fica na borda escolhida; o conteúdo usa e rola na área restante.
- O botão no final, depois de Configurações, recolhe/expande. Recolhida, mostra logo e ícones em 72 px nas laterais ou 56 px no topo/base. Expandida, usa largura de 228 px (200 px em janelas menores) ou altura horizontal de 88 px. A seta acompanha a posição; nomes acessíveis e dicas permanecem.
- Configurações e Recolher/Expandir menu ficam no final da lateral, com pequeno respiro inferior. Não exibir o antigo rodapé “Uso pessoal / PT-BR”, nem reservar espaço para ele quando o menu estiver recolhido.
- Sem o bloco lateral “Meu espaço / Pessoal” ou o texto “Meu espaço / FinDesk” no cabeçalho: não tinham função implementada nem uso futuro acordado. O cabeçalho mantém apenas o botão de informação, sem linha divisória horizontal ou rótulo “Versão de apresentação”.
- Após remover a divisão, reduzir a altura reservada ao cabeçalho e o padding superior do conteúdo para aproximar os títulos do topo; manter o botão de informação à direita.
- Links com estado atual e indicação acessível; foco visível e link para pular ao conteúdo.
- Diálogo Sobre esta versão com operação real de metadados, foco controlado pelo PrimeNG e fechamento por Escape.
- Estados vazios que explicam a etapa, sem zero financeiro falso ou botões de funcionalidades ainda inexistentes.
- Sem abertura promocional, slogans, frases de efeito ou blocos decorativos com texto. Priorizar títulos, ações, informações e estados necessários.
- Em prévias estreitas, o menu mantém nomes acessíveis mesmo quando o texto fica oculto. No desktop, a janela mínima é 900 × 640; testar diferentes tamanhos.
- Movimento curto e respeito a `prefers-reduced-motion`. Informações essenciais não dependem de hover ou cor.

## Ajustes da navegação

- **Borda:** sem alça de redimensionamento, cursor de resize ou ajuste de largura/altura por arraste. Essa funcionalidade foi retirada a pedido de Gabriel em 29/10/2026.
- **Compactação:** pelo botão de recolher/expandir. Em faixa horizontal com pouco espaço, rótulos podem ficar ocultos para manter os controles acessíveis. Ícones não esticam.
- **Encaixe:** pressionar e mover no fundo da navbar, preservando links/botões e barras de rolagem. Depois de 6 px, capturar ponteiro; aproximar de uma borda mostra apenas a área destacada, sem “Soltar: posição”. Soltar confirma; fora das bordas mantém o local. Escape, cancelamento do ponteiro ou perda de foco cancelam. Posição/recolhimento valem para a execução atual, sem gravação em disco.
- **Alternativas:** clique direito no fundo abre posições; focar o painel e pressionar Enter/espaço também abre o menu. Sem alça ou botão extra.
- **Cursor D68:** fundo de cards e navbar usa seta comum no hover e ao pressionar sem mover. Mão fechada somente durante arraste efetivo; ao terminar/cancelar, restaurar imediatamente. Controles internos e canto de resize preservam seus cursores próprios.

Referência técnica: [captura do ponteiro](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture). Nenhuma biblioteca adicional foi instalada.

## Logo original

O PNG reenviado por Gabriel foi recuperado do anexo e preservado sem alteração em `FinDesk-Project/public/brand/logo-original.png` (1774 × 887). Ele contém a versão branca à esquerda e a preta à direita sobre transparência. O enquadramento de apresentação retira as margens vazias do campo de visão, sem modificar os pixels do original.

Os arquivos `symbol.svg`, `symbol-on-light.svg`, `lockup-dark.svg`, `lockup-light.svg` e `app-icon.svg` incorporam esse mesmo PNG e enquadram a variante apropriada. São invólucros de apresentação, **não vetorização**. O símbolo branco é usado no tema escuro; o preto fica preparado para fundo claro.

**Configurações → Ver logo** apresenta as duas variantes e sua leitura em tamanho pequeno. O F foi substituído no menu, favicon e arquivos de ícone. A janela já aberta pode manter o ícone anterior até ser reaberta.

`npm run brand:icons` regenera as apresentações SVG e exporta o ícone em PNG/ICO com Edge e Playwright a partir do original. Não é uma etapa necessária para cada build ou alteração de texto. O PNG original permanece intacto.

Os estudos anteriores em `FinDesk-Project/public/identity/` ficam preservados apenas como histórico e não são a marca em uso. Não houve limpeza de bordas, redesenho ou criação de uma nova identidade nesta aplicação.

## Participação nas próximas telas

### Configurações — dados de demonstração (D28/D29)

Seção entre Integrações e Identidade, seguindo os tokens/fontes e o espaçamento existentes. Título, estado e ação Restaurar dados; confirmação inline com Cancelar/Restaurar e aviso de preservação de preferências/layout. Sem modal novo ou texto promocional. PrimeNG Button usado pontualmente.

Verificação inicial e progresso têm estado explícito; restauração desabilitada fora de disponibilidade. Cancelar e Escape devolvem foco à ação; durante a operação os botões ficam bloqueados. Sucesso anunciado; erro sanitizado com Verificar novamente, que não restaura dados. Sem ponte, a seção identifica a prévia e mantém a ação indisponível. A confirmação e as ações acomodam janelas menores sem corte horizontal.

Antes de implementar composição ou comportamento relevante, discutir com Gabriel a prioridade das informações, densidade, interações e alternativas visuais. Trazer uma recomendação concreta em pequenas rodadas. Não limitar a participação à escolha de biblioteca, barra da janela ou símbolo. Detalhes rotineiros dentro da direção acordada continuam autônomos.

## Padrão confirmado para Finanças

D41 substitui D40: calendário, salário e cartão recolhidos por padrão. Aba de seta de 20 × 44 px acompanha a expansão horizontal, na extremidade direita. Ao abrir, seletor de 230 × 44 px e seta ficam separados por 8 px, ocupando 258 px. Nenhum modo mostra linha de datas; intervalos completos seguem na descrição acessível. Salário usa cofrinho recebendo moeda. Submenus sem linha divisória com o conteúdo, preservando o indicador ativo. Estado local, Escape com retorno de foco e movimento reduzido preservados; saldo e ações mantêm suas posições.

A [especificação vigente](FINANCAS_SPEC.md), seções 4–14, define cabeçalho com saldo atual, importação e seletores, cinco submenus, hierarquia do Geral e padrões de extrato, carteira, lista/calendário e assinaturas. Preservar os tokens, fontes, marca e navegação já corretos. A composição concreta será trabalhada por entrega, com participação de Gabriel nas mudanças relevantes.

F02a, composição confirmada em D30 e revista em D34/D35: saldo em card discreto, arredondado, com carteira no canto; sem os parágrafos de conta/referência repetidos. Seletores à direita em círculos com marca/bandeira; Original usa globo, conta auxiliar usa carteira e Todas as contas usa instituições. Ao clicar, opções descem deslizando sem caixa/fundo; hover e foco alongam a própria opção lateralmente para mostrar o nome, com pontas arredondadas. Gatilhos permanecem circulares para não bloquear outros controles. Escape, clique fora, Tab e setas mantêm a operação acessível; movimento reduzido sem animação. Assets locais documentados em [ASSETS.md](ASSETS.md).

Revisão D36–D39: card de saldo com fundo uniforme, altura mínima de 156 px e largura máxima anterior de 520 px; carteira no canto. Ações de importar/banco/moeda permanecem no canto anterior, lado a lado. Apenas calendário/cofre com moeda/cartão ficam em coluna junto ao saldo, em quadrados de 44 px com cantos de 10 px, com um modo ativo. O intervalo desliza à direita do botão ativo, sem deslocar o card de saldo ou levar as ações para o título. Em janela estreita, período reacomoda abaixo para preservar os demais elementos. Opção atual não se repete na lista de conta/moeda; gatilhos fechados mantêm somente hover, alternativas abertas conservam a expansão lateral.

Cinco links horizontais abaixo do cabeçalho. Demonstração e câmbio fictício permanecem identificados; originais nos detalhes e referência em atributo acessível. Modos salvos da conta e retorno silencioso ao calendário seguem [PERIODOS.md](financas/PERIODOS.md). Editor de cards, conteúdo financeiro dos submenus, configuração de recorrências e importação ficam para entregas próprias. Critérios em [financas/ESTRUTURA.md](financas/ESTRUTURA.md); fonte original preservada.

Cards reorganizáveis, redimensionáveis, expansíveis, com foco/lado a lado quando aplicável, persistência por área e restauração explícita são requisitos desta versão local, a desenvolver em F03 e nas seções correspondentes. São gestos distintos do encaixe da navbar; D20 continua retirando o resize apenas da navbar. Logos de serviços devem ter origem/licença avaliadas e cache local, sem enviar extratos para busca; fallback com ícone e nome.

Tema claro funcional e janelas destacáveis permanecem evoluções separadas. Não há seletor de tema sem implementação. Nenhum dos novos padrões financeiros foi implementado nesta F00.
