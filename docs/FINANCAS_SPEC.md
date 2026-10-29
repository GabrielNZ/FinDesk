# FinDesk — Especificação de Finanças e plano incremental

Versão 1.0 · 29/10/2026 · Idioma: português brasileiro

## 1. Instrução inicial ao Codex

Leia este documento integralmente, as instruções do repositório e o código local antes de alterar o projeto. Sua missão é evoluir a área de Finanças do FinDesk conforme as decisões abaixo, por pequenas entregas revisáveis.

Este documento especifica experiência, comportamento, regras e critérios de aceitação. Não é um layout para reprodução pixel a pixel nem exige reescrever o código existente. Preserve a implementação que já atende aos requisitos. Você tem liberdade para escolher composição, componentes e organização técnica dentro dos comportamentos aprovados.

O proprietário, Gabriel, quer participar das decisões importantes. Ele responderá perguntas, sugerirá mudanças e dirá “próximo passo”, “próxima etapa” ou equivalente. Você deve saber qual é o próximo trabalho, sem exigir que ele reconstrua o contexto ou escreva novos prompts detalhados.

**Nesta execução, comece pela etapa F00: diagnóstico e plano adaptado ao estado local. Não implemente o restante inteiro automaticamente.**

Não confunda autorização para continuar com autorização para decidir requisitos importantes ainda abertos. Execute autonomamente tarefas rotineiras dentro da entrega autorizada; faça levantamento conjunto quando necessário.

## 2. Contexto e precedência

FinDesk é um aplicativo pessoal Windows, com Angular, Electron e TypeScript. Investimentos são seu diferencial geral, mas este documento trata de Finanças. SQLite local foi sugerido; o usuário pediu explicação comparativa com MySQL e não há aprovação explícita dessa escolha nas respostas disponíveis. Confirme o que já foi adotado no projeto, sem migrar o banco por conta própria. Não é necessário presumir um servidor remoto: Electron pode usar serviços locais fora do renderer. Não criar senha de entrada obrigatória nesta fase; preservar a segurança das credenciais de integração e não confundir persistência local com backup independente.

O usuário utiliza Nubank para conta, cartão e investimentos; Nomad é usada principalmente para investimentos em dólar. O iPhone é uma evolução futura, não alvo desta entrega.

A navegação principal é Visão geral / Finanças / Investimentos. Não confunda a Visão geral do aplicativo com o submenu Geral de Finanças.

O repositório informado é https://github.com/GabrielNZ/FinDesk. Na leitura feita durante o levantamento, PROJECT_BRIEF.md e PROJECT_STATUS.md continham contexto e preparação inicial, sem representar necessariamente o código local já desenvolvido. Inspecione o estado efetivo: ausência de código publicado não significa que o aplicativo local não existe.

As instruções gerais anteriores continuam válidas. Este documento prevalece sobre sugestões antigas conflitantes para a área de Finanças. Em especial:

- Assinaturas mensais e anuais entram na primeira versão funcional de Finanças.
- Contas recorrentes e avulsas, detecção, salário previsto, alertas, orçamento e “quanto posso gastar” entram nessa versão.
- Cards reorganizáveis, redimensionáveis, expansíveis e modos foco/lado a lado são parte do padrão desta versão, não apenas ideias distantes.
- A implementação continua dividida em entregas pequenas, inicialmente com dados fictícios.
- Integrações reais dependem de pesquisa e levantamento próprios. Não são pré-condição para validar os fluxos locais.
- Não introduza metas completas de patrimônio, execução de pagamentos ou ordens de investimento neste escopo.

O nome definitivo para este projeto é FinDesk, não Alça. O símbolo aprovado como referência é um montinho compacto de moedas em alturas crescentes, com seta ascendente angular e pontuda: preto no tema claro, branco no escuro. Use os assets locais aprovados; não redesenhe a marca sem conversar.

## 3. Política de decisões

Neste documento:

- **Confirmado:** decisão tomada na conversa e que deve ser preservada.
- **Diretriz técnica:** orientação para garantir consistência; adapte ao código existente.
- **Pendente:** precisa de proposta e resposta antes da implementação dependente.

Não transforme exemplos de valores ou imagens demonstrativas em dados pessoais reais. Não considere uma funcionalidade implementada apenas porque está documentada.

## 4. Padrão global de design — confirmado

A experiência combina aparência sóbria, elegante e limpa com exploração dinâmica. Poucas cores, hierarquia clara, gráficos legíveis, ícones e detalhes progressivos. O usuário não deve precisar repetir esse padrão em cada tela.

### 4.1 Componentes e identidade

- Tema escuro primeiro, cores semânticas preparadas para tema claro e seletor posterior.
- PrimeNG para controles pontuais: botões, seletores, campos, menus e outros controles convencionais. Não deixar o produto preso à aparência de um template.
- Logos próprias em serviços reconhecidos, como Netflix, Uber e Spotify. Ícones genéricos são fallback para serviços sem logo e representação de categorias.
- Logo sempre acompanhada de nome; mantenha legibilidade em ambos os temas. Avalie origem/licença/cache dos assets sem transmitir o extrato a serviços de busca de logos.
- Não depender só de cor para transmitir situação. Ícones e rótulos complementam a sinalização.
- Aumento de gasto é informação; ultrapassar um limite configurado é alerta. Evite tratar toda saída como erro.

### 4.2 Cards e organização

- Cards arrastáveis, redimensionáveis e expansíveis onde aplicável.
- Posição e dimensões salvas por área, com restauração explícita do padrão.
- A ordem definida neste documento é a composição inicial; personalização pode alterá-la.
- Gráficos adaptam-se às dimensões disponíveis e continuam legíveis.
- Modos de foco preservam os filtros e permitem retornar à disposição anterior.
- Arraste de organização ocorre em alça/cabeçalho; gestos internos de troca de visualização e seleção da carteira não podem conflitar com ele.
- Alternativas por clique e teclado; foco visível, movimento reduzido, textos legíveis e estados claros.
- Em janelas estreitas, reorganizar verticalmente preservando conteúdo. Não esmagar gráficos ou dados.
- Evitar controles falsamente ativos, valores inventados para preencher ausência e modais excessivos.

### 4.3 Fronteira entre intenção e implementação

As demonstrações da conversa mostraram exemplos interativos, não uma especificação visual rígida. Preserve os objetivos e relações entre dados. O Codex pode propor refinamentos de composição e deve validar mudanças relevantes com Gabriel.

## 5. Estrutura da área de Finanças

### 5.1 Cabeçalho persistente

- Saldo atual no topo à esquerda, com o maior destaque tipográfico da área, semelhante à hierarquia de um aplicativo bancário.
- Permanece presente ao mudar de submenu. Isso não determina obrigatoriamente comportamento sticky durante rolagem.
- Saldo representa dinheiro em conta; não soma investimentos nem limite do cartão.
- Rotular contexto: por exemplo, “Saldo em conta · Nubank”.
- No canto superior direito: seletor de banco/conta e seletor de moeda, com ícones e apresentação clean.
- À esquerda desses seletores: botão circular somente com ícone para importar, com nome acessível e tooltip “Importar dados”.
- Moedas: Original / BRL / USD, mantendo valores originais nos detalhes. Conversões precisam de cotação, data e identificação de estimativa quando aplicável.
- O saldo continua atual mesmo ao visualizar um período histórico; indicar essa diferença.

Diretriz de filtros: manter seleção entre submenus e aplicá-la aos dados compatíveis. “Todas as contas” exige total consolidado em uma moeda comum. Seleção de instituição sem cartão deve produzir estado vazio adequado, não um cartão de outra instituição silenciosamente.

### 5.2 Submenus horizontais

Abaixo do cabeçalho: **Geral / Movimentações / Cartão / Compromissos / Assinaturas**.

Configurações permanece acessível por engrenagem, com seção Integrações, conforme contexto geral. Fluxos de conexão real serão levantados separadamente.

## 6. Períodos

Ao abrir, mostrar o período atual conforme preferência salva:

1. Mês calendário — padrão inicial: primeiro ao último dia do mês.
2. Entre salários: data prevista confirmada até a véspera da próxima data prevista.
3. Entre fechamentos: ciclo do cartão selecionado.

Datas do intervalo sempre visíveis. Navegação entre períodos anteriores e seguintes. Prever troca temporária na tela e preferência em Configurações → Finanças → Período padrão.

**Confirmado:** o ciclo salarial usa a data prevista, mesmo se o pagamento real chegar antes ou depois. A movimentação é registrada na data real.

O usuário também pediu acompanhamento até a próxima virada do cartão (fechamento, não vencimento). Preserve esse horizonte como opção; valide sua apresentação e fórmula em relação ao disponível até o salário, sem tratar limite do cartão como dinheiro em conta. O destaque visual posteriormente escolhido foi “Até o próximo salário — DD/MM”.

Resumo e análise seguem o período selecionado. Saldo atual não se torna saldo histórico. “Quanto posso gastar” usa horizonte explícito até o próximo salário. Compromissos tem opção local adicional de próximos 30 dias.

Pendências para definição técnica conjunta: fronteiras inclusivas do fechamento, compras lançadas no dia do fechamento, dias 29–31 em meses curtos, dias úteis e ausência de cartão/salário configurado. Use datas/ciclos confirmados pelo banco quando disponíveis, sem supor que fechamento e vencimento sejam a mesma coisa.

## 7. Geral

### 7.1 Ordem padrão aprovada

1. Resumo do período.
2. Análise dos gastos.
3. Quanto posso gastar.
4. Próximos compromissos.
5. Atenção necessária.

### 7.2 Resumo do período

Indicadores compactos de entradas, gastos e resultado do período. Entradas excluem transferências entre contas próprias. Resultado não é saldo atual. Clique em entradas/gastos leva às movimentações correspondentes com filtros preservados.

A metodologia de despesas do cartão deve estar explícita. Não misturar valor total contratado, parcelas e pagamento da fatura numa mesma soma. A escolha final do modo padrão do resumo ainda precisa ser verificada com Gabriel antes de implementar os cálculos dependentes.

### 7.3 Análise dos gastos

Dois cards lado a lado por padrão:

- Categorias: barras horizontais, do maior para o menor gasto, com valor e participação.
- Evolução: distribuição dos gastos ao longo do período.

Gráficos interativos: categoria/data selecionada permite investigar lançamentos. Cards arrastáveis, redimensionáveis, expansíveis, layout salvo e restauração do padrão. A granularidade temporal pode adaptar-se ao intervalo, com rótulo claro.

### 7.4 Quanto posso gastar

Hierarquia aprovada:

- Valor disponível estimado em destaque.
- “Até o próximo salário — DD/MM” com destaque claro.
- Referência de gasto médio por dia em segundo plano.
- Expansão revela saldo considerado, compromissos descontados e valor protegido opcional.

Regra conceitual aprovada: **saldo disponível hoje − compromissos ainda não pagos no horizonte − valor protegido**.

Exemplo fictício: saldo R$ 1.500, compromissos R$ 700, protegido R$ 200 → disponível R$ 600. Com seis dias considerados, referência R$ 100/dia.

A referência diária orienta; não impõe teto diário. Se faltar dinheiro, mostrar “Faltam R$ X para cobrir os compromissos”, sem recomendar gasto diário negativo. Salário previsto não vira saldo antes de recebido; limite de crédito e investimentos não entram como dinheiro para gastar.

Valor protegido é opcional e não exige construir o módulo de metas.

Explicar atualização/cobertura dos dados. Descontar obrigações uma única vez: compra de assinatura já na fatura não pode entrar também como desembolso separado.

Antes do cálculo definitivo, fechar: contagem de dias, comportamento no dia do salário ou atraso, pendências vencidas, vencimento de cartão fora do horizonte, contas selecionadas e valor protegido por conta ou global. São decisões relevantes, não autorização para inventar uma política.

### 7.5 Próximos compromissos

Card inicia em lista cronológica: serviço/conta, ícone/logo, vencimento, valor e situação. Detalhes expandem.

Dois modos:

- Foco: lista ou calendário, um por vez; troca por seletor, setas ou deslizamento lateral do conteúdo.
- Lado a lado: lista e calendário vinculados.

Controle discreto no cabeçalho alterna os modos; preferência salva. Selecionar data filtra os itens e oferece retorno a todos. Reorganizar o card é gesto distinto de deslizar o conteúdo. Em pouco espaço, reacomodar sem perder legibilidade.

Mostrar vencimentos futuros pertinentes, inclusive fatura e assinaturas, sem duplicar obrigações. Especificar com Gabriel se o horizonte desse resumo acompanha o seletor do submenu Compromissos ou é independente; isso não foi fechado.

### 7.6 Atenção necessária

Lista compacta por prioridade, com ações diretas e detalhes expansíveis:

- Possível assinatura/recorrência/salário para confirmar.
- Pagamento não identificado.
- Limite de orçamento atingido/ultrapassado.
- Vencimentos próximos.

Expansão explica motivo e registros relacionados. Alertas informativos não devem bloquear navegação. Avisos funcionam com o aplicativo aberto, sem tarefa persistente após fechá-lo.

## 8. Movimentações

### 8.1 Composição padrão

1. Topo: cards de análises e relatórios.
2. Centro: extrato e tabela agrupada lado a lado, com modo foco em qualquer um.
3. Abaixo: gráficos comparativos e evolução.

Busca e filtros conectam as visualizações. Filtros ativos devem estar visíveis e removíveis. Preserve contexto ao abrir detalhes.

### 8.2 Extrato

Movimentações individuais organizadas por data. Ícone/logo, descrição, categoria, conta/meio e valor, conforme espaço. Expansão mostra dados completos, origem e ações pertinentes.

### 8.3 Tabela agrupada

Não é duplicação compacta do extrato. Apresenta categorias com total e quantidade, com hierarquia confirmada:

**Categoria → estabelecimento/serviço → lançamentos.**

Exemplos: Transporte → Uber → corridas; Entretenimento → Netflix → cobranças. Totais refletem período e filtros. Selecionar um grupo filtra o extrato, com indicação clara e opção de remover seleção.

Netflix pode ser categoria Entretenimento e também uma assinatura. Recorrência e categoria são atributos diferentes, sem duplicação financeira.

### 8.4 Relatórios e gráficos

Cards: maior gasto, maior aumento, maior redução e desvio do habitual. Mostrar valores em reais/moeda selecionada e porcentagens quando válidas.

Exemplos fictícios: Transporte R$ 300, +R$ 80 (+36% arredondados); Alimentação R$ 450, −R$ 100 (−18% arredondados). Clique na análise filtra os registros que a explicam.

Referências propostas para concretizar as comparações solicitadas; validar os parâmetros na etapa correspondente:

- Período anterior.
- Habitual: média dos últimos três períodos.

Para período em andamento, comparar a mesma quantidade de dias decorridos. Informar cobertura e limitações; não comparar parte do mês com um mês inteiro como se fossem equivalentes. Referência zero: apresentar diferença absoluta, sem porcentagem infinita. Sem histórico suficiente: indicar indisponibilidade ou base reduzida explicitamente.

Fechar a regra para períodos de tamanhos diferentes e composição da média antes dos cálculos finais. Não inferir causas dos aumentos além do que os lançamentos comprovam.

## 9. Cartão

### 9.1 Composição aprovada

Referência de interação: Apple Wallet adaptada ao desktop, sem reprodução rígida.

- Esquerda: carteira visual de cartões parcialmente sobrepostos, identidade do banco, cartão virtual e final do número quando disponível.
- Seleção por clique ou arrasto para destaque; alternativa acessível. Um único cartão já inicia selecionado.
- Direita: informações e fatura do cartão selecionado.
- Abaixo: compras, parcelas e gráficos analíticos.

Mudança de cartão atualiza os dados e preserva filtros compatíveis. Gestos da carteira são distintos da organização dos cards.

### 9.2 Fatura e limites

Priorizar próxima fatura a pagar; após quitada, destacar fatura em aberto. Navegar entre faturas anteriores, atual e futuras.

Mostrar valor, situação, fechamento e vencimento. Limite total, utilizado e disponível aparecem discretamente com barra de utilização; não competem com a fatura em destaque. Crédito disponível não é saldo bancário.

Limite não deve ser deduzido ingenuamente do valor da fatura: utilizar fonte confiável ou dado manual identificado, pois parcelamento e regras da instituição podem diferir.

### 9.3 Compras e parcelas

Compras à vista, parceladas, faturas, pagamento integral e estornos fazem parte do básico. Pagamentos parciais, rotativo e antecipações complexas não estão aprovados para implementação completa; sinalizar casos não suportados sem resultados enganosos.

Duas visões: valor contratado na compra e parcelas por fatura. Exemplo R$ 1.200 em 6x: R$ 1.200 no consumo contratado ou R$ 200 por fatura; nunca somar os dois como despesas diferentes.

Parcelas preservam compra original, quantidade, posição atual, restante e término; soma exata inclusive distribuição de centavos. Estornos preservam rastreabilidade. Pagamento de fatura não duplica consumo.

### 9.4 Análises abaixo

- Evolução mensal das faturas, com clique para abrir o mês.
- Variação em moeda e porcentagem.
- Composição por categoria e estabelecimento.
- Comprometimento futuro com parcelas contratadas e recorrências previstas diferenciadas.

Selecionar barra mensal mostra compras correspondentes. Expandir compra mostra suas parcelas ao longo das faturas.

Distinguir faturas fechadas, abertas e futuras. Fatura em formação não é redução definitiva. Previsão não é cobrança confirmada.

## 10. Compromissos

Contas recorrentes e avulsas, inclusive aluguel, internet, energia, mensalidades e despesas únicas. Assinaturas possuem submenu próprio e alimentam previsões consolidadas sem duplicação.

Lista e calendário com foco/lado a lado, filtros A vencer / Vencidos / Pagos, detalhes expansíveis e ação Adicionar compromisso dentro da seção.

Seletor local confirmado:

- Seguir Finanças — padrão.
- Próximos 30 dias — hoje e os próximos 29 dias, intervalo explícito.

Salvar preferência; não alterar outros submenus. Lista, calendário e totais seguem a opção escolhida.

Pendências vencidas anteriores ficam em grupo separado “Pendências anteriores”, com quantidade e total próprios. Não desaparecem ao mudar de período nem são misturadas silenciosamente ao total do intervalo.

Contas recorrentes e avulsas sem pagamento identificado permanecem pendentes. Mostrar “Vencido — pagamento não identificado”, sem afirmar inadimplência comprovada quando o histórico for incompleto.

Permitir corrigir associação, marcar como pago, pausar e encerrar recorrência. Encerrar interrompe previsões futuras, não apaga pendências antigas. Marcação manual e reconciliação com lançamento real precisam evitar pagamento duplicado; definir o fluxo antes da implementação.

## 11. Assinaturas

### 11.1 Composição aprovada

Topo: custo mensal equivalente, quantidade de assinaturas ativas e próximas cobranças.

Cards por serviço: logo própria, nome, valor e próxima cobrança. Expansão: gráfico individual de valores cobrados, histórico, periodicidade, forma de pagamento e ações.

Filtros: ativas/inativas, mensais/anuais e forma de pagamento. Faixa discreta para possíveis assinaturas aguardando confirmação.

Editar, pausar e encerrar acompanhamento no FinDesk. Não insinuar que essas ações cancelam o serviço no fornecedor.

### 11.2 Mensais e anuais

Suportar ambas desde esta versão. Anual dividido por 12 somente para custo mensal equivalente. A previsão de caixa conserva cobrança integral na renovação.

Gráfico mostra cobranças efetivas e alterações de preço. Próxima cobrança prevista é distinguível. Ausência de cobrança não significa valor zero.

### 11.3 Ausência e inativação

A decisão explícita foi inativar automaticamente após um mês sem cobrança. A interpretação operacional abaixo usa a renovação esperada como referência; confirme com Gabriel se “um mês” significa mês calendário ou prazo em dias antes de codificar os limites.

Uma assinatura sem cobrança é retirada automaticamente das previsões após um mês da data de renovação esperada, apenas se dados atualizados cobrirem esse intervalo. Preservar histórico e permitir reativação.

Mensal e anual usam sua própria data esperada: uma anual não é desativada nos meses em que não deveria cobrar.

Antes do prazo, sinalizar cobrança não encontrada. Integração com falha não é evidência de cancelamento. Usar estado “inativa por ausência de cobrança”, não “cancelada no fornecedor”.

**Pendente específico:** comportamento de inativação automática de assinaturas exclusivamente manuais, sem fonte capaz de observar pagamentos. A conversa sugeriu mantê-las até ação do usuário, mas isso não recebeu decisão explícita isolada. Perguntar antes de automatizar.

## 12. Detecção de recorrências e receitas

Identificar padrões de cobranças/entradas e sugerir, nunca transformar toda repetição em assinatura silenciosamente.

- Assinatura: “Possível assinatura detectada”, serviço, valor e dia estimados; Confirmar / Ajustar / Não é assinatura.
- Conta recorrente: confirmar tipo, vencimento e valor fixo/variável.
- Salário: detectar entrada recorrente, com confirmação de origem e dia; cadastro manual disponível.
- Despesa avulsa futura: só é conhecida se cadastrada ou fornecida explicitamente por uma fonte; não pode ser adivinhada pelo extrato.

Após confirmação, gerar previsões. Quando cobrança/pagamento real aparecer, associar sem duplicar. Ambiguidade exige revisão.

Data de uma cobrança no cartão não é necessariamente data do desembolso da fatura. Preserve ambas e use a apropriada em cada visão.

Número de ocorrências, tolerâncias de data/valor, variações de descrição e identificação de estabelecimento ainda precisam de proposta técnica. “Três cobranças mensais” foi exemplo, não parâmetro definitivamente aprovado.

Não exige IA remota: regras locais são compatíveis com o objetivo sem custo. Análise de extrato real pelo Codex ocorre somente quando o proprietário fornecer/autorizar os dados, sem versioná-los.

## 13. Alertas e contas variáveis

Sugestões de valores iniciais, configuráveis e sujeitos a confirmação antes de implementar (os alertas e o controle de gastos estão confirmados; estes números não aparecem explicitamente nas respostas disponíveis):

- Vencimento: 3 dias antes.
- Orçamento: 80% e 100%.
- Limite geral e limites opcionais por categoria.
- Valor protegido opcional no disponível para gastar.

Não repetir o mesmo alerta incessantemente. Definir estados lido/resolvido/dispensado conforme necessário, sem eliminar a obrigação por dispensar um aviso. Nada funciona em segundo plano após fechar o aplicativo nesta versão.

Proposta para contas variáveis, a confirmar: média das últimas três cobranças; com menos histórico, usar disponíveis e informar. Identificar valor estimado, permitir edição e substituir por cobrança real quando conhecida. Sem histórico, solicitar valor; não usar zero silenciosamente.

Limites foram discutidos como mensais; comportamento em ciclos salariais/fatura ainda precisa de definição. Não aplicar rateio ou trocar horizonte de orçamento silenciosamente.

## 14. Cadastro, edição, importação e categorias

### 14.1 Cadastro e edição

Ações dentro da seção correspondente: Adicionar assinatura, Adicionar compromisso, etc. Edição no item/detalhes. Abrir painel lateral direito com campos pertinentes, mantendo contexto. Definir validações e alterações de recorrência futura versus ocorrência isolada na entrega correspondente.

### 14.2 Importação

Botão circular com ícone no cabeçalho, à esquerda dos seletores de banco/moeda. Abre fluxo amplo:

1. Selecionar arquivo.
2. Conferir conta de destino, datas, moeda, dados inválidos e possíveis duplicações.
3. Confirmar importação.

Validar formatos a partir de arquivos reais examinados. Não prometer suporte universal a PDF/CSV/OFX. Prévia antes de gravar, reimportação idempotente, revisão de coincidências ambíguas. Mesmo valor e data não provam duplicidade.

### 14.3 Categorias

Criar, renomear, escolher ícone/cor e reclassificar. Alcances:

- Só este lançamento.
- Lançamentos do estabelecimento, com prévia.
- Regra para futuros lançamentos do estabelecimento.

O proprietário quer sugestões de categorias a partir do extrato. Propor e revisar antes de aplicar em massa.

Fallback obrigatório **Sem categoria**, visual neutro e ícone genérico. Registros continuam em todos os totais/gráficos/extrato. Preferências manuais prevalecem sobre sugestões automáticas e devem sobreviver à sincronização.

## 15. Dados, integração e consistência transversal

Persistir localmente. Abrir imediatamente com dados existentes e tentar atualizar, sem bloquear a consulta. Sucesso substitui/atualiza dados válidos; falha preserva dados anteriores. Estados por instituição, tentativa e sucesso separados quando necessário.

Buscar máximo de histórico disponível e informar intervalo conhecido. Sem cobertura não significa ausência de gastos. Cobertura e gratuidade de Meu Pluggy, Nubank e Nomad continuam pendentes de validação oficial. Não conectar contas nesta fase de design/mock.

Origem visível: manual / arquivo / integração. Preservar anotações e categorias. Não expor dados reais, credenciais, bases pessoais ou extratos no Git, logs e demonstrações.

Precisão monetária controlada; moeda original preservada; sem soma direta de BRL/USD. Datas civis sem deslocamento acidental de fuso. Nenhum indicador deve duplicar transferências próprias, aportes, compras, parcelas, assinaturas ou pagamentos de fatura.

Saldo, consumo, obrigações, orçamento e limite de crédito são conceitos distintos. Documentar o significado de cada número e seu horizonte.

## 16. Pendências que exigem conversa — não bloqueiam todo o projeto

Antes da implementação dependente, agrupar perguntas relevantes:

1. Metodologia padrão de gastos no resumo e relatórios: compra contratada ou parcelas; conciliação com o caixa.
2. Cálculo diário e horizonte salarial no dia do recebimento, atraso, ausência de previsão e pendências vencidas.
3. Fechamento do cartão, meses curtos, datas inclusivas e múltiplos cartões.
4. Valor protegido global versus por conta; impactos dos filtros no orçamento.
5. Horizonte de próximos compromissos no Geral e limites mensais em ciclos não calendários.
6. Inativação de assinaturas manuais, reativação automática ou sugerida após nova cobrança.
7. Critérios de detecção e comparação histórica em períodos de comprimentos diferentes.
8. Cadastro/edição de ocorrências e séries; marcação manual de pagamento.
9. Arquivos de importação e cobertura real dos provedores.

Traga recomendação e exemplos. Não repita decisões já aprovadas. Nenhuma resposta deve ser presumida apenas por tempo decorrido.

## 17. Como trabalhar em pequenas entregas

### 17.1 Ciclo de trabalho obrigatório

1. Ler AGENTS.md, PROJECT_STATUS.md, esta especificação e o código relevante.
2. Identificar a próxima pequena entrega prevista.
3. Apresentar objetivo, escopo e dúvidas realmente relevantes.
4. Executar tarefas internas autonomamente quando autorizadas.
5. Validar comportamento e aparência.
6. Atualizar documentação.
7. Mostrar resultado e propor próximo passo.
8. Aguardar revisão do proprietário.

“Próximo passo”, “próxima etapa”, “pode continuar” ou aprovação equivalente autoriza concluir o registro Git da entrega apresentada e iniciar a próxima pequena entrega proposta. Se ela tiver requisitos abertos, começar pelo levantamento, não pela decisão unilateral.

Se vierem correções, fazê-las antes de avançar. Não abrir uma rodada de autorização para cada componente, teste ou ajuste rotineiro.

### 17.2 Git

Revisar diff e arquivos preparados, executar verificações pertinentes e criar commit coerente da entrega aprovada. Não acumular várias entregas. Não commitar dados reais, bancos pessoais, segredos, logs ou builds.

Mensagens específicas, por exemplo `feat(financas): adiciona períodos de consulta`.

A documentação do repositório consultada registrava **push após cada entrega aprovada**. Confirmar a política vigente em AGENTS.md e segui-la; não solicitar autorização repetida se já estabelecida. Relatar commit local e push separadamente, inclusive falhas. Sem force push ou reescrita destrutiva.

Não alterar ou incluir trabalho alheio silenciosamente. Não considerar aprovação visual um substituto de validação técnica.

### 17.3 Comunicação

Atualizações curtas durante o trabalho. Ao concluir: o que mudou, como conferir, testes realizados, limitações, próxima entrega e perguntas pendentes. Não declarar mock como integração real nem chamar código não testado de validado.

## 18. Plano de implementação proposto

Adapte ao código existente sem apagar trabalho nem refazer funcionalidades equivalentes. Se uma entrega for grande, divida em subetapas com identificadores, registrando a próxima. O resultado final desta versão contempla todos os requisitos aprovados; a divisão só organiza a execução.

| Etapa | Pequena entrega | Critério de conclusão |
|---|---|---|
| F00 | Diagnóstico local, leitura das regras e matriz de lacunas | Mapa existente/parcial/ausente, conflitos identificados e próximo passo claro; nenhuma reescrita precipitada |
| F01 | Documentação consolidada, regras comuns e fixtures | IDs de requisitos, dados fictícios coerentes, pendências registradas e primeiras decisões de cálculo levantadas |
| F02 | Cabeçalho, submenus e preferências de período | Saldo atual, seletores e intervalos identificados; troca de submenu preserva contexto |
| F03 | Padrão reutilizável de cards | Arrastar, redimensionar, expandir, foco, persistir e restaurar; gestos sem conflito e teclado funcional |
| F04 | Movimentações: extrato e detalhes | Lista por data, busca/filtros, logos/fallback, estados vazios e origem |
| F05 | Tabela agrupada e categorias | Categoria→estabelecimento→lançamento; sincronização com extrato; Sem categoria e regras manuais |
| F06 | Cadastros e edição locais | Painéis contextuais, persistência, validação e alcance de alterações discutido |
| F07 | Análises de movimentações | Cards no topo, gráficos abaixo, anterior/média de três, comparações equivalentes e filtros por clique |
| F08 | Carteira visual e seleção de faturas | Cartões à esquerda, dados à direita, prioridade de fatura e limites corretamente rotulados |
| F09 | Parcelas e análises do cartão | Compras, estornos, distribuição exata, histórico e futuro sem dupla contagem |
| F10 | Compromissos: lista, calendário e filtros | Foco/lado a lado, seguir Finanças/30 dias e pendências anteriores separadas |
| F11 | Assinaturas: cards e histórico | Logos, mensal/anual, gráfico expansível, filtros, ações e custo equivalente |
| F12 | Motor de previsões locais | Contas fixas/variáveis, salário confirmado, recorrências e ocorrências conciliáveis |
| F13 | Detecção assistida e associação | Sugestões com confirmação, rejeição/correção e reconciliação sem duplicar |
| F14 | Ausência de cobrança e pendências | Assinatura inativa só com cobertura; contas permanecem; regras manuais esclarecidas |
| F15 | Quanto posso gastar | Fórmula/horizonte fechados, composição, protegido, referência diária e déficit testados |
| F16 | Orçamentos e alertas | Limites gerais/categoria, 80/100%, aviso de 3 dias e ações sem repetição indevida |
| F17 | Composição final do Geral | Cinco blocos na ordem aprovada, reaproveitando cálculos e dados já validados |
| F18 | Importação local | Fluxo amplo acionado no cabeçalho, formatos examinados, prévia e deduplicação |
| F19 | Revisão integrada da versão local | Acessibilidade, responsividade, persistência, cálculos, regressões e rastreabilidade |
| F20 | Levantamento de integração real | Pesquisar cobertura/custos e discutir fluxos; conectar apenas após autorização específica |

Etapas podem precisar de subdivisão (por exemplo F03a/F03b). Ao reorganizar dependências, explique e atualize o plano. Não elimine escopo confirmado para facilitar a entrega. Tema claro é evolução preparada, não pré-requisito para terminar cada uma destas entregas escuras.

## 19. Padrão documental dentro do repositório

Manter pontos de entrada na raiz: AGENTS.md, PROJECT_BRIEF.md, PROJECT_STATUS.md e README.md. Incorporar esta especificação como `docs/FINANCAS_SPEC.md` ou caminho equivalente já existente. Referenciá-la pela raiz.

Para cada feature/seção, registrar:

- Objetivo e pergunta que responde.
- Requisitos confirmados e pendências.
- Dados exibidos e significado dos valores.
- Hierarquia visual e composição inicial.
- Interações, filtros e alcance.
- Estados vazio, carregando, erro, desatualizado e incompleto.
- Regras financeiras.
- Critérios de aceitação e testes.
- Referências visuais como exemplos, sem impor implementação.

Atualizar ROADMAP, DESIGN_SYSTEM, DOMAIN_RULES, DATA_MODEL e TESTING conforme os arquivos existentes. Não duplicar fontes de verdade. A raiz deve apontar para os detalhes.

PROJECT_STATUS.md precisa indicar: etapa/subetapa atual, concluído, testes, pendências, perguntas, próxima entrega proposta e situação da autorização. Isso permite continuar com um simples “próximo passo”.

## 20. Critérios de aceitação e revisão

### Interface

- Saldo permanece ao trocar de submenu; dados históricos não mudam seu significado.
- Banco/moeda e importação na posição relativa aprovada.
- Os cinco submenus têm estados claros e nenhuma ação principal ficticiamente funcional.
- Ordem padrão do Geral preservada e restaurável.
- Cards persistem organização; foco retorna sem perder contexto.
- Extrato e agrupamento representam os mesmos registros filtrados.
- Logos próprias onde disponíveis; fallback adequado e acessível.
- Carteira e fatura ficam relacionadas sem misturar cartões.
- Calendário/lista são sincronizados; os gestos não confundem organização e navegação.

### Cálculos e dados

- Transferências próprias não contam como receita/despesa consolidada.
- Pagamento de fatura não duplica compras.
- Assinatura no cartão não duplica obrigação da fatura.
- Compra parcelada soma valor original até os centavos.
- Anual tem equivalente mensal e desembolso integral separados.
- Contas vencidas não somem por mudança de período.
- Falha de sincronização não inativa assinatura.
- Média variável usa até três cobranças e indica base reduzida.
- Comparações parciais usam dias equivalentes; base zero não produz percentual inválido.
- Sem categoria entra em totais; dado ausente não vira zero.
- Receitas previstas, investimentos e limite não viram caixa disponível.
- Disponível negativo mostra déficit; contagem diária tem regra explícita.
- Importação repetida não duplica registros; correspondências ambíguas exigem revisão.
- Reabertura preserva dados/preferências; seed fictício é idempotente e separado de dados pessoais.

### Cenários para fixtures e testes

Incluir salário antecipado/atrasado, mês curto, fechamento/vencimento distintos, parcela atravessando ano, estorno, despesa sem categoria, duas compras legítimas com mesmo valor/data, conta variável sem histórico suficiente, assinatura anual, assinatura ausente com integração atrasada, obrigação antiga vencida e comparação com referência zero.

Testes proporcionais e relevantes, com inspeção visual das telas. Não exigir integração real para testar regras locais. Relatar limitações do ambiente, especialmente validação Windows, sem inventar resultados.

## 21. Revisão de completude deste levantamento

Nota de rastreabilidade: algumas respostas da conversa são concordâncias com sugestões cujo texto não está reproduzido no histórico disponível. Por isso, parâmetros como 3 dias, 80%/100% e médias de três períodos/cobranças são propostas operacionais a validar, não decisões numéricas presumidas. Os critérios e etapas que os citam devem acompanhar a configuração finalmente aprovada.

Conferido contra as decisões da conversa:

- [x] Identidade FinDesk, tema escuro, PrimeNG pontual, logos e fallback.
- [x] Saldo persistente, seletores superiores e botão circular de importação.
- [x] Cinco submenus e regra global de interação/personalização.
- [x] Preferências calendário/salário/fechamento e data salarial estável.
- [x] Ordem completa do Geral e todos os seus blocos.
- [x] Análises lado a lado, cards dinâmicos e filtros interativos.
- [x] Disponível, reserva opcional, referência diária secundária e déficit.
- [x] Lista/calendário em foco ou simultâneos com gestos distintos.
- [x] Extrato, tabela hierárquica e análises acima/abaixo.
- [x] Período anterior/média de três, equivalência temporal e base zero.
- [x] Carteira à esquerda, fatura à direita, gráficos abaixo e limites discretos.
- [x] Compromissos com preferência local 30 dias/Finanças e pendências anteriores.
- [x] Assinaturas mensais/anuais, detecção confirmada, histórico e inativação condicional.
- [x] Contas recorrentes não desaparecem; salário detectável e manual.
- [x] Cadastro contextual, edição lateral, importação ampla e conciliação.
- [x] Categorias sugeridas/revisáveis, regras futuras e Sem categoria.
- [x] Alertas 3 dias/80%/100%, valor variável e funcionamento apenas aberto.
- [x] Plano incremental, perguntas relevantes, commits/push e continuidade por status.

Os itens marcados acima significam presença na especificação, não implementação concluída. As pendências da seção 16 são explícitas para que o Codex não transforme lacunas em decisões silenciosas.

**Comece por F00, apresente o diagnóstico e a próxima pequena entrega recomendada. Gabriel conduzirá a continuidade com respostas e “próximo passo”.**
