# F09d — Composição por estabelecimento da fatura

## Objetivo e autorização

Gabriel pediu abrir o FinDesk e continuar em 27/11/2026, retomando a próxima proposta após a F09c aprovada e enviada. Esta fatia complementa a composição por categoria com uma leitura por estabelecimento da fatura consultada (§9.4, FIN-030). Aprovação, execução e verificações efetivas ficam exclusivamente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

Gabriel confirmou “Confirmo as duas recomendações” em 27/11/2026 na caixinha consolidada: alternância na barra da Fatura e filtro temporário de compras (D170/D171). Resposta recebida antes do código da interface. As alternativas abaixo preservam o levantamento; nenhuma escolha desta rodada permanece aberta. Gabriel informou que a caixinha some ao encerrar a etapa: manter a etapa aberta enquanto aguarda futuras respostas por caixinha.

**Continuidade em 27/11/2026:** Gabriel respondeu “pode continuar”, autorizando o avanço. Sem escolher composição/ação de clique, essas decisões permanecem abertas; uma caixinha consolidou a confirmação das duas recomendações. Trabalho independente autorizado: consulta pura dos itens por ID de estabelecimento e testes financeiros pertinentes, aplicando D24/D33 sem código de interface, filtro ou persistência. Os detalhes visuais não são pressupostos pela consulta.

## Base confirmada aplicável

- D24: somar apenas os itens/parcelas da fatura selecionada, preservando compra contratada e pagamento como informações distintas. Não acrescentá-los novamente ao consumo.
- D157: composição por categoria usa barra única proporcional, expansão temporária somente em altura e dica com nome/valor/participação por hover/foco. Essa direção permanece vigente para Categorias.
- D158/D159: compras individuais e agendas permanecem consultáveis na tabela, com uma expansão por vez. Agregar um estabelecimento nesta análise não funde compras, IDs ou agendas.
- D163–D166: seleção de fatura compartilhada, sem rolagem automática; cards organizáveis com layout próprio, dimensões salvas e padrão compacto preservado. Qualquer novo card depende da escolha de composição.
- D33: moeda original preservada, conversão somente para apresentação e identificada. Ausência/precisão indisponível não viram zero.
- F09c/D167–D169: comparação entre faturas e dica ancorada na coluna continuam preservadas. Composição por estabelecimento não altera essa metodologia.

## Diagnóstico técnico local — 27/11/2026

Leitura de documentos, fontes e consulta pura da fixture fictícia já existente; sem testar ou gravar fatos nos bancos normais:

- `Purchase` possui `merchantId`, categoria, cartão, data, total contratado e origem. `InvoiceItem` vincula a compra à fatura e informa o valor da parcela. O agrupamento pode usar o ID do estabelecimento, independentemente de nomes iguais no catálogo. Não inferir identidade por semelhança de texto.
- `invoicePurchases` e `cardInvoices` já delimitam conta/cartão/fatura e validam vínculos/centavos. O snapshot atual permite a composição sem nova fonte, IPC, esquema, seed ou dependência.
- `CategoryStore` já fornece os nomes do catálogo de estabelecimentos compartilhado com a tabela. ID sem nome cadastrado conserva identificação explícita, sem inventar uma marca ou conectar um serviço. A classificação de despesas da conta não reclassifica compras do cartão.
- Novembro do cartão 0000: duas compras Loja contribuem R$ 233,34; Netflix, R$ 49,90. Base conhecida R$ 283,24; participações 82,4% e 17,6%. As duas compras Loja continuam distintas nos detalhes.
- Outubro do cartão 0000: Loja R$ 120,10, Mercado R$ 100,00 e Netflix R$ 39,90; total conhecido e confirmado R$ 260,00. Não é necessário criar histórico para conferir mais estabelecimentos.
- Novembro do cartão 1111: Loja R$ 89,90. Dezembro desse cartão não tem itens conhecidos e não equivale a distribuição de gasto zero. A referência fictícia permanece em 29/10/2026, mesmo com a retomada em novembro.
- O catálogo de estabelecimentos não fornece ícone/cor próprios. Um estabelecimento pode ter compras em categorias diferentes; não atribuir uma categoria única por inferência. Tratamento visual será concretizado dentro da composição escolhida, sem editar o catálogo ou reclassificar compras.
- A barra atual de categorias está no painel Fatura; a lista de compras recebe a mesma consulta de conta/cartão/fatura. A composição proposta pode compartilhar esse estado, sem alterar o período global. Um filtro por estabelecimento exigirá somente estado temporário de consulta, caso escolhido, com identificação do subtotal filtrado.
- Não há compatibilidade de dependência externa pendente para apresentar as alternativas. Reutilizar Angular, recursos nativos e mecanismo de cards/expansões existentes. Nenhuma alteração de código da F09d durante este levantamento.

## Alternativas apresentadas — recomendações confirmadas

1. **Composição:** recomendar alternância compacta “Categorias | Estabelecimentos” acima da barra atual do painel Fatura. Cada modo usa os mesmos itens e sua própria distribuição; hover/foco mostra nome, valor e participação, com expansão temporária em altura. Preserva o espaço do painel, mas os dois agrupamentos não ficam visíveis simultaneamente. Alternativa: novo card organizável com ranking de barras horizontais, nomes e valores sempre visíveis; categorias continuam na Fatura, porém há outro card ocupando espaço e participando do layout. Não presumir aprovação de um novo card.
2. **Ação de clique:** recomendar filtro temporário no card Compras desta fatura, com identificação removível “Loja ×”, duas compras e subtotal filtrado R$ 233,34 no exemplo de novembro. Total da Fatura R$ 283,24 permanece. Remover o recorte volta às três compras; trocar conta/cartão/fatura o limpa. Não rolar a página. Alternativas: janela flutuante com as compras daquele estabelecimento, ou somente dica sem ação de clique. A preferência da F09a por expandir a compra na lista permanece; esta pergunta trata do acesso pelo agrupamento.

## Critérios de aceitação — D170/D171, anteriores à interface

Alternância compacta na barra existente, Categorias ao abrir, escolha temporária preservada durante a consulta da tela. Estabelecimentos por ID, cores discretas estáveis independentes da categoria, com nomes do catálogo; múltiplas categorias não são fundidas em uma classificação inventada. Mouse/foco/teclado preservam a expansão temporária/dica, sem mudar larguras proporcionais. Clique/Enter/espaço no estabelecimento aplica filtro na lista, com estado pressionado explícito; Categorias conserva sua interação anterior.

Filtro em estado temporário do painel Cartão, compartilhado com a lista, sem mudar Fatura/Evolução/período/layout ou rolar a página. Nome removível, quantidade visível e Subtotal filtrado explícitos. Trocar conta/cartão/fatura limpa; moeda preserva e reapresenta originais/conversão. Mudar recorte recolhe compra expandida. Remover pelo botão retorna foco ao título da lista sem rolagem; Escape fecha primeiro a expansão e, sem compra expandida, remove o filtro. Barras/totais não são recalculados pelo próprio filtro.

Para a consulta independente, aplicar desde já os invariantes existentes: fronteiras de conta/cartão/fatura, soma apenas dos itens da fatura por ID de estabelecimento, integridade dos IDs originais, ausência diferente de zero, percentuais sobre a base conhecida e conversão somente após agregar. Esses invariantes não dependem de barra versus ranking ou da ação de clique. Não aplicar filtro, cor/ícone, novo card ou expansão de interface nesta parte.

- Uma entrada por ID de estabelecimento, somando apenas itens conhecidos da fatura selecionada. Ordenar por valor decrescente, com desempate estável; nomes iguais de IDs diferentes não são fundidos. Compra ou agenda não sofre mutação.
- Participação sobre o total dos itens conhecidos, não sobre um total confirmado diferente. Exibir a diferença entre essas bases sem fabricar ajustes ou “Outros” para reconciliar dados ausentes. Fatura aberta/futura conserva identificação de conhecido, sem projetar cobrança final.
- Aritmética segura de centavos e percentuais com intermediários exatos. Agregar na moeda original e converter cada agregado uma única vez para apresentação, identificando original/cotação. Não somar moedas diferentes; soma insegura ou conversão indisponível fica explícita.
- Distinguir fatura sem itens, valor conhecido zero, catálogo indisponível e agrupamento fora da precisão. Zero não fabrica percentual com denominador zero. Falha de catálogo conserva erro/retentativa existentes.
- Se o filtro for escolhido: manter total completo da Fatura e distribuição do gráfico; somente a lista e seu subtotal filtrado mudam, com recorte explícito e remoção acessível. Não persistir como preferência, não alterar período global ou layout, não criar nova compra. Detalhar foco/Escape e expansão antes do código dependente.
- Mouse e teclado acessíveis, Escape conforme interação existente, foco sem rolagem automática e movimento reduzido preservado. Layout estreito e resize não ocultam controles; personalizações existentes não são substituídas silenciosamente.

## Escopo delimitado e validação prevista

Composição da fatura atual por estabelecimento e interação escolhida. Não inclui classificação/edição de compras, cadastro de estabelecimentos, histórico por estabelecimento, comparação causal entre faturas, estornos ou futuro previsto/contratado. Nenhuma integração real, ampliação de seed ou mudança financeira para preencher o gráfico.

Consulta independente em `application/invoice-merchants.ts`: entradas por ID de estabelecimento, com IDs dos itens e categorias preservados, valor original/apresentado e participação sobre a base conhecida. Nenhuma cor/ícone ou posição de interface assumida. Nomes são metadados do catálogo, sem influenciar a identidade do grupo. Valores zero conhecidos conservam a entrada, mas participação com denominador zero permanece indisponível; ausência e soma fora da precisão não retornam uma distribuição parcial enganosa.

Seis testes cobrem soma/percentuais, vínculo de conta/cartão/fatura, identidade/empates, categorias diferentes no mesmo estabelecimento, moedas/conversão única do agregado, precisão, ausência/zero e preservação dos fatos. Registrado no comando npm test para execução nas rodadas pertinentes. Resultado efetivo e verificações exclusivamente no PROJECT_STATUS.

## Implementação da interface

**Revisão D173 — critérios anteriores ao código:** abertura e fechamento com altura natural descendendo/subindo em 320 ms, seta girando no mesmo ritmo e leve entrada/saída de opacidade. O card acompanha a altura animada pelo mecanismo D172, sem rolagem interna. Movimento reduzido desativa a animação. Não persistir alturas intermediárias; preservar Escape/foco/seleção e verificar trocas rápidas e remoção final. Angular oferece retenção do elemento durante `animate.leave` ([documentação oficial](https://angular.dev/guide/animations)); `interpolate-size` permite interpolar 0/auto sem teto artificial ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size)). Nenhuma dependência/versão nova selecionada.

**Implementação D173:** entrada no wrapper dos detalhes; saída declarada diretamente na linha removida, mantendo-a no DOM até terminar a animação da altura. A primeira verificação encontrou que animar somente o filho não preservava a linha na versão instalada; a saída foi ligada à própria linha e validada novamente. Fechamento parte da altura/opacidade visual atual, inclusive se a entrada ainda estiver em andamento. Linha em saída fica inerte, oculta para tecnologia assistiva e sem ID de região duplicado; o foco continua retornando ao acionador. Recorte apenas durante o movimento, preservando contorno de foco quando aberto. ResizeObserver da D172 acompanha os quadros sem salvar dimensões. Teste Electron específico mede alturas intermediárias e verifica redução de movimento/trocas rápidas; resultados efetivos exclusivamente no estado único.

**Revisão D172 — critérios anteriores ao código:** Gabriel pediu que Compras cresça ao expandir uma compra, com rolagem somente na página principal. Não esconder a barra mantendo conteúdo cortado. Medir altura natural da lista, aplicar mínimo visual temporário e acomodar linhas seguintes, sem alterar o tamanho salvo ou os outros cards. Altura manual é um mínimo; voltar ao conteúdo menor preserva esse mínimo. Mesma regra no foco temporário e ao filtrar/trocar fatura/moeda/largura. Arraste/resize usam a geometria exibida, sem converter a expansão automática em uma preferência salva. A redução de conteúdo pode limitar naturalmente a rolagem da página ao novo final, sem comando para rolar até a tabela.

`invoice-categories` reutiliza a barra existente nos dois modos, mantém proporções calculadas em centavos originais e resolve nomes pelo catálogo. Estabelecimentos têm paleta discreta estável por ID e ícone de compras; não assumem a categoria de uma das compras. O modo começa em Categorias ao abrir a tela e não é persistido. Troca de agrupamento/fatura limpa a dica temporária, sem alterar a consulta global. A distribuição independe do filtro aplicado pelo próprio clique.

`card-page` guarda o ID de estabelecimento apenas na execução e o compartilha com `invoice-purchases`. Trocar conta/cartão/fatura remove o filtro; moeda mantém. Lista distingue Subtotal filtrado de Itens conhecidos, mantém cada compra/agenda e recolhe a expansão ao trocar o recorte. Botão com nome/ícone de remoção retorna o foco ao título; Escape fecha primeiro os detalhes da compra e depois o filtro. Sem novo card, alteração de layout salvo, IPC ou persistência.

Fluxo Electron próprio e regressões verificam composição, dica/teclado/Escape, seleção/remoção, subtotal/total, moeda, contextos e largura estreita, em perfis temporários. Evidências efetivas e aprovação exclusivamente no PROJECT_STATUS. Preferência do usuário: quando houver decisão em caixinha, manter a etapa aberta até receber a resposta, pois ele informou que a escolha desaparece ao encerrar o trabalho.

**Implementação D172:** `DashboardCard` observa a altura natural do conteúdo apenas em Compras, com limpeza do observador ao destruir. `CardBoard` aplica o mínimo transitório por `fitCardContent`, que desloca linhas seguintes sem mudar dimensões salvas ou alturas dos vizinhos. O foco temporário também acomoda o conteúdo; o wrapper deixa de criar rolagem interna. Resize pelo ponteiro usa a altura preferida como base nesse card, para não persistir a expansão automática quando o gesto altera somente a largura. Testes puros e Electron cobrem expansão/recolhimento, ausência de overflow interno, foco, reorder, resize e persistência. Resultado efetivo no estado único.
