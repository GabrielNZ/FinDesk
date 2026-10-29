# Documento mestre — Aplicativo pessoal de finanças e investimentos

## 1. Sua missão

Você será responsável por preparar e desenvolver, em etapas, um aplicativo desktop pessoal de finanças e investimentos.

Leia este documento integralmente antes de começar. Ele reúne o contexto do produto, decisões do proprietário, requisitos, limites, arquitetura proposta e critérios de qualidade.

**A tarefa autorizada nesta primeira execução é construir a fundação do projeto e uma experiência visual navegável e interativa com dados fictícios.**

Não encerre apenas apresentando um plano. Inspecione o ambiente, organize o trabalho e implemente essa primeira entrega. Ao mesmo tempo, respeite o limite da etapa: não conecte contas bancárias reais nem tente implementar todo o roadmap de uma vez.

O resultado deve ser uma base real de aplicativo, capaz de evoluir sem reconstruções desnecessárias, acompanhada de documentação suficiente para outras sessões do Codex continuarem o trabalho.

## 2. Contexto do proprietário

O proprietário é Gabriel, estudante de Engenharia de Software e desenvolvedor com experiência em Angular e TypeScript, além de contato com NestJS, Java/Spring e outras tecnologias.

Ele deseja:

- Ter uma ferramenta própria para acompanhar suas finanças e investimentos.
- Aprender a conduzir projetos maiores com ajuda do Codex.
- Trabalhar com documentação, padrões e decisões técnicas consistentes.
- Construir uma interface bonita, interativa e agradável de usar.
- Evoluir o produto por versões.
- Evitar assinaturas, infraestrutura paga e serviços obrigatórios com cobrança.
- Entender as principais decisões técnicas sem precisar aprovar cada detalhe rotineiro.

O aplicativo será inicialmente de uso pessoal, em Windows. Gabriel utiliza iPhone, mas acesso móvel será tratado posteriormente.

A linguagem da interface e da documentação é português brasileiro. Na comunicação com o proprietário, utilize “você”.

## 3. Visão do produto

Criar uma central pessoal que permita:

1. Entender entradas, gastos e compromissos financeiros.
2. Acompanhar contas, cartão de crédito e compras parceladas.
3. Conhecer a composição e a evolução do patrimônio.
4. Acompanhar investimentos em reais e dólares.
5. Explorar cenários de crescimento patrimonial com aportes.
6. Futuramente, acompanhar metas e acessar informações pelo celular.

**Investimentos são o principal diferencial do produto.** A área financeira precisa ser útil e correta, mas o aplicativo não deve se limitar a um controle de receitas e despesas.

A navegação principal está definida:

- Visão geral.
- Finanças.
- Investimentos.

O simulador pertence à área de Investimentos. Configurações ficam acessíveis de forma secundária.

## 4. Instituições e ativos de referência

### Nubank

O proprietário utiliza:

- Conta.
- Cartão de crédito.
- Investimentos em reais.

### Nomad

O uso informado é uma conta voltada a investimentos em dólar.

### Ativos mencionados no planejamento

- CDBs.
- ETF B5P211.
- ETF VWRA11.
- ETF SGOV, em dólar.
- Possibilidade futura de FIIs e outros ativos.

Esses nomes servem como referência para os tipos de investimento que o produto precisa comportar. Não representam uma carteira atual verificada.

Não transforme saldos antigos, quantidades ou valores mencionados em conversas em dados reais do aplicativo.

Para demonstração, utilize valores inteiramente fictícios e identifique claramente esse modo.

## 5. Decisões consolidadas

| Tema | Decisão |
|---|---|
| Plataforma inicial | Windows |
| Desktop | Electron |
| Interface | Angular |
| Linguagem principal | TypeScript |
| Armazenamento proposto | SQLite local |
| Servidor separado | Não necessário na primeira versão |
| Primeiro desenvolvimento | Dados fictícios antes de integrações reais |
| Funcionamento sem internet | Consultar os últimos dados locais disponíveis |
| Sincronização futura | Tentar atualizar ao abrir |
| Aplicativo fechado | Sem execução contínua em segundo plano |
| Histórico | Buscar o máximo que cada fonte disponibilizar |
| Entrada de dados | Integração, cadastro manual e importação |
| Cartão | Compras, parcelas, faturas, fechamento, vencimento, pagamento integral e estornos |
| Investimentos | Posições e movimentações detalhadas, evoluindo por etapas |
| Simulações | Inicialmente consolidadas por moeda |
| Tema | Escuro primeiro; claro e seletor posteriormente |
| Interação | Expansões, gráficos clicáveis e manipulação direta |
| Personalização | Evolução para cards móveis e organização persistida |
| Senha do aplicativo | Não haverá autenticação própria no MVP |
| Metas | Funcionalidade futura |
| Backup elaborado | Fora do MVP; exportação/restauração no roadmap |
| Autonomia do Codex | Ampla dentro do escopo e das restrições desta etapa |

SQLite foi recomendado por dispensar um serviço separado e facilitar a instalação local. O proprietário conhece MySQL e permitiu que a decisão técnica fosse contrariada com justificativa. Adote SQLite como escolha padrão proposta e registre a justificativa em uma decisão arquitetural.

Não interprete a ausência de servidor separado como autorização para colocar banco e credenciais dentro dos componentes Angular.

## 6. Filosofia de desenvolvimento

Busque uma implementação profissional, compreensível e proporcional ao tamanho do produto.

Priorize:

- Separação clara de responsabilidades.
- Regras financeiras verificáveis.
- Interface consistente.
- Dados persistidos corretamente.
- Evolução por etapas.
- Dependências justificadas.
- Documentação alinhada ao código.

Evite complexidade criada apenas para parecer sofisticado:

- Microserviços.
- Infraestrutura distribuída.
- Sistemas genéricos de plugins sem necessidade.
- Camadas que apenas repassam chamadas sem agregar responsabilidade.
- Bibliotecas sobrepostas.
- Backend HTTP local sem justificativa.
- Uma grande quantidade de abstrações antecipadas.

O código deve ser legível para um desenvolvedor que conhece Angular e TypeScript e está aprendendo a conduzir projetos maiores.

## 7. Autonomia e limites

### Você pode decidir autonomamente

- Estrutura de pastas.
- Componentes e organização interna.
- Ferramentas de lint, formatação e testes.
- Bibliotecas gratuitas adequadas.
- Nome provisório neutro para o projeto.
- Ícones, espaçamentos, tipografia e cores iniciais.
- Dados fictícios.
- Detalhes de implementação que respeitem este documento.
- Divisão da etapa atual em tarefas menores.
- Correções necessárias para concluir a entrega.

Documente decisões relevantes e prossiga sem pedir aprovação para cada escolha.

### Você deve consultar o proprietário antes de

- Introduzir custos ou exigir assinatura.
- Criar uma dependência obrigatória de infraestrutura remota.
- Mudar significativamente a stack.
- Publicar ou distribuir o aplicativo.
- Conectar contas reais ou solicitar credenciais.
- Enviar dados financeiros a um serviço de IA.
- Ampliar o escopo para outra etapa do roadmap.
- Realizar alterações destrutivas em trabalho existente.

### Você não deve

- Prometer cobertura de uma integração sem verificar.
- Apresentar dados fictícios como reais.
- Fabricar rentabilidade histórica.
- Mostrar uma projeção como garantia de retorno.
- Expor credenciais no renderer, repositório ou logs.
- Implementar movimentação de dinheiro, ordens de compra ou pagamentos.
- Instalar telemetria ou serviços externos sem necessidade e autorização.
- Substituir a stack por preferência pessoal.
- Abandonar validações para entregar mais telas.
- Alterar silenciosamente regras financeiras para facilitar a implementação.

## 8. Arquitetura proposta

Organize o sistema em responsabilidades bem definidas.

### Interface Angular

Responsável por:

- Telas.
- Componentes.
- Navegação.
- Interações.
- Formulários.
- Gráficos.
- Estado de apresentação.
- Formatação de valores.

Componentes não devem executar SQL, acessar segredos ou concentrar cálculos financeiros.

### Camada de aplicação

Responsável por casos de uso, como:

- Consultar resumo financeiro.
- Listar movimentações.
- Consultar carteira.
- Executar simulação.
- Salvar preferências.
- Futuramente importar e sincronizar dados.

### Domínio

Responsável por:

- Regras financeiras.
- Entidades e tipos.
- Validações.
- Cálculos.
- Políticas de moeda e arredondamento.

Sempre que possível, mantenha essa camada independente de Angular, Electron e SQLite.

### Infraestrutura

Responsável por:

- Persistência SQLite.
- Migrações.
- Provedores de dados.
- Importadores.
- Integrações futuras.
- Armazenamento protegido de credenciais.

### Electron

- Processo principal para operações privilegiadas.
- Preload com uma API pequena, explícita e tipada.
- IPC validado.
- Renderer isolado.
- Sem acesso irrestrito ao Node.js pela interface.
- Validação das mensagens também no lado privilegiado.
- Tratamento controlado de navegação e links externos.

Verifique as práticas atuais na documentação oficial ao implementar.

### Preparação para outras plataformas

Mantenha as regras de domínio reutilizáveis e a interface desacoplada dos detalhes do Electron.

Isso prepara a evolução, mas não significa que a versão web ou iPhone estará pronta. Autenticação, hospedagem e sincronização entre dispositivos serão decisões futuras.

## 9. Persistência e organização dos dados

O aplicativo deve guardar dados localmente.

A persistência tem os seguintes objetivos:

- Reabrir com informações já disponíveis.
- Manter histórico.
- Preservar preferências.
- Permitir consulta quando a integração falhar.
- Evitar perder categorias e anotações pessoais.

Use migrações versionadas. Não recrie ou apague o banco automaticamente a cada execução.

No modo de demonstração:

- Utilize um banco ou namespace separado dos dados reais futuros.
- Inicialize os dados fictícios de forma idempotente.
- Não duplique o conjunto de demonstração a cada abertura.
- Disponibilize uma forma explícita de restaurar a demonstração.
- Preserve preferências entre execuções quando fizer sentido.

Persistência local não equivale a backup. Documente essa diferença. Um sistema completo de backup não é requisito desta etapa.

## 10. Regras financeiras fundamentais

### Precisão

- Não use aritmética de ponto flutuante sem controle para dinheiro.
- Escolha centavos inteiros, decimais exatos ou uma combinação justificada.
- Quantidades fracionárias de ativos e cotações precisam de precisão própria.
- Defina arredondamentos nas fronteiras adequadas.
- Armazene a moeda junto aos valores relevantes.

### Datas

Distinga:

- Data da compra.
- Data do lançamento.
- Data de liquidação, quando existir.
- Competência.
- Fechamento de fatura.
- Vencimento.
- Horário de sincronização.

Datas sem horário não devem mudar de dia por conversões indevidas de fuso.

### Transferências

Uma transferência entre contas do proprietário não é receita nem despesa consolidada.

Tarifas e custos associados devem ser tratados separadamente.

### Investimentos

- Aporte não é rendimento.
- Compra de ativo não é automaticamente uma despesa de consumo.
- Venda ou resgate não é automaticamente rendimento.
- Dividendos e juros devem ser identificados.
- Reinvestimento não pode duplicar o rendimento recebido.
- Alteração do patrimônio pode decorrer de aportes, retiradas, mercado e câmbio.

### Dados ausentes

- Informação desconhecida não deve ser transformada em zero.
- Indique quando um cálculo não é possível.
- Mostre cobertura do histórico e data das informações.
- Não invente movimentações para reconciliar totais.

### Patrimônio

Documente exatamente quais contas, posições e obrigações entram em cada indicador.

Não some o valor de uma carteira duas vezes por aparecer em uma conta e em uma posição de investimento.

Caso exiba patrimônio líquido, explicite quais dívidas estão sendo descontadas.

## 11. Área de Finanças

### Objetivo

Entender movimentações, gastos e compromissos presentes e futuros.

### Funcionalidades previstas

- Resumo por período.
- Receitas e despesas.
- Contas.
- Cartão de crédito.
- Categorias.
- Filtros.
- Detalhes expansíveis.
- Cadastro manual.
- Importação.
- Identificação da origem dos dados.

### Cartão de crédito

O escopo básico contempla:

- Compras à vista.
- Compras parceladas.
- Faturas.
- Fechamento.
- Vencimento.
- Pagamento integral.
- Estornos.
- Comprometimento das próximas faturas.

Pagamentos parciais, rotativo e antecipações complexas ficam para evolução posterior. O aplicativo deve reconhecer que esses casos não estão plenamente suportados, em vez de calcular silenciosamente um resultado incorreto.

### Duas visões de gasto

Uma compra de R$ 1.200 em seis parcelas pode ser analisada como:

- R$ 1.200 contratados na data da compra.
- R$ 200 comprometidos em cada fatura.

As duas visões devem existir, com nomes claros e alternância explícita.

Não misture os totais das duas metodologias no mesmo indicador.

O pagamento da fatura não deve contar novamente como despesa de consumo quando as compras já foram contabilizadas.

### Parcelas

- Preserve o vínculo com a compra original.
- Mostre parcela atual e quantidade total.
- Distribua valores respeitando centavos e soma total.
- Identifique parcelas observadas e parcelas estimadas.
- Não trate estimativas de faturas futuras como dados confirmados pelo banco.
- Estornos não devem apagar o registro original sem rastreabilidade.

## 12. Área de Investimentos

### Objetivo

Permitir acompanhar o patrimônio investido com profundidade e explorar sua evolução.

### Modelo inicial

Prepare suporte conceitual para:

- Instituição.
- Conta de investimento.
- Ativo.
- Tipo ou classe.
- Identificador do ativo.
- Moeda.
- Quantidade.
- Preço ou valor de referência.
- Data da avaliação.
- Posição.
- Compra.
- Venda.
- Aporte e retirada.
- Dividendo.
- Juros.
- Resgate.
- Taxas e tributos conhecidos.
- Origem dos dados.

CDBs podem precisar de informações específicas, como indexador, taxa contratada e vencimento. Não force todos os instrumentos ao mesmo modelo de quantidade e cotação.

### Apresentação

- Composição da carteira.
- Posições por instituição.
- Posições por moeda.
- Detalhes expansíveis por ativo.
- Histórico conhecido.
- Rendimentos recebidos.
- Evolução do patrimônio.
- Informação sobre atualização e cobertura.

### Rentabilidade

Conhecer a posição atual não basta para calcular a rentabilidade histórica.

Quando houver cálculo de rentabilidade:

- Defina a metodologia.
- Considere fluxos de entrada e saída.
- Distinga valorização de resultado efetivamente realizado.
- Não chame a simples variação do saldo de rentabilidade.
- Explique limitações quando o histórico estiver incompleto.

Metodologias mais sofisticadas entram nas etapas apropriadas, com testes específicos.

## 13. Moedas

Valores originais devem ser preservados.

A interface deve permitir:

- Original.
- BRL.
- USD.

Comportamento esperado:

- Ao consultar Nubank, a apresentação original tende a ser em reais.
- Ao consultar Nomad, a apresentação original tende a ser em dólares.
- O usuário pode trocar a moeda de apresentação.
- Na visão consolidada, os totais precisam estar em uma moeda comum.
- A moeda escolhida deve estar evidente.

Toda conversão deve identificar a cotação e sua data.

Não some reais e dólares diretamente.

Não reescreva os valores originais ao alternar o seletor.

Sem cotação disponível, mostre valores por moeda ou indique a indisponibilidade da conversão.

Diferencie conversão atual de conversão histórica. Uma cotação de hoje não deve ser apresentada como cotação da data de uma movimentação antiga.

## 14. Simulador de patrimônio

### Escopo inicial

- Usar toda a carteira ou uma parte selecionada.
- Consolidar inicialmente por moeda.
- Definir capital inicial.
- Definir aporte periódico.
- Definir prazo.
- Definir retorno hipotético.
- Comparar três cenários editáveis.
- Separar capital inicial, novos aportes e rendimento projetado.
- Atualizar gráfico e resultados ao alterar os controles.

Os nomes dos cenários não devem sugerir probabilidades comprovadas. São conjuntos de premissas.

### Interação

- Controles deslizantes para exploração.
- Campos numéricos para precisão.
- Seleção visual de prazo.
- Comparação clara entre cenários.
- Detalhes dos valores ao explorar o gráfico.

### Regras

- Documente quando ocorre o aporte: início ou fim do período.
- Converta corretamente taxas efetivas entre períodos.
- Trate taxa zero e limites de entrada.
- Diferencie valores nominais de valores corrigidos pela inflação.
- Identifique se o resultado é bruto ou líquido.
- Não inclua tributação sem modelo explícito.
- Simulações não alteram posições ou transações reais.

### Dados de mercado

A evolução futura poderá usar dados de mercado para contextualizar premissas.

Isso exige validar fonte, licença, cobertura e limites gratuitos.

Retorno histórico não deve ser apresentado como previsão garantida.

No primeiro estágio, use hipóteses fictícias e editáveis, claramente identificadas. Não dependa de uma API de mercado para a interface funcionar.

## 15. Integrações futuras

Durante o planejamento foi identificado o Meu Pluggy como candidato para acesso pessoal gratuito.

Foram discutidos limites como quantidade de conexões, atualização periódica e restrições de uso pessoal. **Essas informações são hipóteses a revalidar na documentação oficial antes da implementação.**

Verifique:

- Gratuidade atual.
- Uso pessoal permitido.
- Limites de conexões e requisições.
- Frequência de atualização.
- Cobertura do Nubank.
- Cobertura da Nomad.
- Dados disponíveis para contas, cartão e investimentos.
- Histórico acessível.
- Necessidade de consentimento.
- Regras de renovação de acesso.
- Recursos gratuitos versus comerciais.

Não presuma que a Nomad está coberta por um conector brasileiro.

O produto deve continuar útil com cadastro manual e importação quando a integração não existir ou for incompleta.

### Sincronização

Comportamento futuro esperado:

1. Abrir com dados locais.
2. Iniciar tentativa de atualização.
3. Consultar as fontes disponíveis.
4. Validar os dados recebidos.
5. Conciliar e persistir atualizações válidas.
6. Atualizar a interface.
7. Preservar dados anteriores em caso de falha.

A abertura não deve ficar bloqueada pela sincronização.

Cada conexão terá estado próprio e datas de tentativa e sucesso.

Uma atualização local pode apenas consultar informações que o provedor ainda não renovou. Distinga consulta ao provedor de atualização efetiva na instituição quando os dados permitirem.

Não use repetição infinita de chamadas.

Não apague histórico apenas porque uma resposta omitiu registros antigos.

## 16. Cadastro manual, importação e conciliação

As três origens fazem parte do produto:

- Integração.
- Arquivo.
- Manual.

### Importação

- Exibir prévia.
- Validar moeda, datas e valores.
- Indicar linhas inválidas.
- Mostrar quantos registros serão incluídos.
- Permitir revisão antes de salvar.
- Evitar duplicação na reimportação.

Os formatos efetivamente suportados dependem da análise de arquivos exportados pelas instituições. Não prometa suporte a formatos ainda não examinados.

### Conciliação

Use identificadores externos quando existirem.

Correspondências aproximadas por valor, data e descrição devem ser tratadas com cuidado: duas compras legítimas podem ter os mesmos valores.

Casos ambíguos exigem revisão. Não una ou exclua silenciosamente registros.

Preserve categorias, anotações e outras informações definidas pelo usuário durante atualizações da fonte.

Mantenha os dados de origem e as personalizações separados quando isso facilitar a preservação.

## 17. Direção visual

### Identidade

Combinar:

- Aparência sóbria e elegante.
- Poucas cores.
- Organização clara.
- Gráficos em destaque.
- Componentes expansíveis.
- Personalização gradual.
- Sensação de aplicativo desktop bem acabado.

Evite excesso de cartões decorativos, efeitos chamativos e informações sem hierarquia.

### Tema

- Desenvolver o escuro primeiro.
- Utilizar tokens semânticos de cor desde o início.
- Preparar o tema claro sem duplicar componentes.
- Adicionar o seletor em etapa posterior.
- Não apresentar um seletor que ainda não funciona.

### Estrutura

- Navegação lateral compacta.
- Visão geral.
- Finanças.
- Investimentos.
- Configurações secundárias.
- Período, instituição e moeda em posições previsíveis.

### Interações desejadas

- Linhas que expandem.
- Painéis de detalhes.
- Gráficos que filtram listas.
- Linha do tempo de faturas.
- Destaque das parcelas de uma compra.
- Controles do simulador com resposta imediata.
- Futuramente cards arrastáveis e redimensionáveis.
- Futuramente janelas destacáveis.

### Critérios de usabilidade

- A ação principal de cada tela deve ser clara.
- Informações essenciais não podem depender só de hover.
- Arrastar deve ter alternativa por clique ou teclado.
- Cores não podem ser o único indicador de estado.
- Foco de teclado visível.
- Contraste legível.
- Respeito à preferência de movimento reduzido.
- Animações curtas com propósito.
- Valores exatos sempre acessíveis.
- Estados vazio, carregando, erro e desatualizado previstos.

Prepare a interface para diferentes tamanhos de janela no Windows. Não desenvolva apenas para uma captura de tela em resolução fixa.

## 18. Roadmap

### Etapa 0 — Fundação e demonstração navegável

**Esta é a etapa autorizada agora.**

Entregar:

- Repositório organizado.
- Documentação.
- Ambiente de desenvolvimento.
- Angular e Electron integrados.
- Persistência local básica.
- Migrações iniciais.
- Dados fictícios.
- Design escuro.
- Navegação principal.
- Telas demonstrativas coerentes.
- Interações essenciais.
- Base verificável de testes e qualidade.

### Etapa 1 — MVP local utilizável

- Cadastros reais locais.
- Movimentações.
- Cartão e parcelamento básico.
- Posições e movimentações de investimentos.
- Simulador funcional validado.
- Preferências persistidas.
- Importação inicial de formatos confirmados.

### Etapa 2 — Integrações e histórico

- Conectores validados.
- Sincronização ao abrir.
- Histórico disponível.
- Conciliação.
- Indicadores de atualização.
- Tratamento de falhas.
- Preservação das personalizações.

### Etapa 3 — Profundidade analítica e personalização

- Rentabilidade com metodologia definida.
- Separação de aportes, resultados e câmbio.
- Evolução mais detalhada.
- Tema claro.
- Painel personalizável.
- Exportação e restauração.
- Orçamentos e recorrências conforme prioridade.

### Etapa 4 — Planejamento avançado

- Metas configuráveis.
- Aportes variáveis.
- Premissas por classe de ativo.
- Inflação e câmbio nos cenários.
- Alertas enquanto o aplicativo estiver em uso.
- Janelas destacáveis quando úteis.

### Etapa 5 — Acesso pelo iPhone

Avaliar web responsiva/PWA ou outra solução adequada.

Definir antes de implementar:

- Onde os dados ficam.
- Como sincronizam.
- Como autenticar.
- Custos.
- Acesso quando o computador estiver desligado.

Cada etapa deve ser subdividida em tarefas pequenas com critérios de aceitação. Ajustes de ordem são possíveis, mas devem ser documentados.

## 19. Primeira entrega: comportamento esperado

Implemente uma demonstração que permita percorrer os principais fluxos.

### Visão geral

- Resumo financeiro.
- Patrimônio por moeda ou consolidado com cotação fictícia identificada.
- Resumo das faturas.
- Resumo da carteira.
- Acesso às duas áreas principais.

### Finanças

- Lista fictícia filtrável.
- Categorias.
- Detalhes expansíveis.
- Faturas navegáveis.
- Compra parcelada com visualização da distribuição.
- Alternância entre consumo contratado e parcelas mensais.
- Totais coerentes com a visualização escolhida.

### Investimentos

- Carteira fictícia com CDBs e ETFs.
- Posições em BRL e USD.
- Filtro por instituição.
- Detalhes expansíveis.
- Movimentações fictícias.
- Acesso ao simulador.

### Simulador

Faça uma fatia funcional simples com cálculos determinísticos e testados, usando os dados fictícios como ponto de partida.

É necessário validar a interação entre controles e gráfico; não é necessário implementar toda a matemática financeira do roadmap.

### Estados de demonstração

Disponibilize uma forma de exercitar:

- Dados carregados.
- Dados vazios.
- Atualização em andamento.
- Falha simulada.
- Dados antigos preservados.

Evite botões aparentemente ativos sem comportamento. Funcionalidades futuras podem ficar ausentes ou claramente identificadas como indisponíveis.

## 20. Dados fictícios e casos de validação

Inclua um conjunto pequeno, coerente e reproduzível com:

- Conta em BRL.
- Carteira em USD.
- Receitas e despesas.
- Transferência entre contas próprias.
- Compra à vista.
- Compra parcelada atravessando a virada do ano.
- Parcelamento com distribuição de centavos.
- Estorno.
- Pagamento integral de fatura.
- CDB.
- ETF brasileiro.
- ETF em dólar.
- Dividendo.
- Aporte.
- Venda ou resgate.
- Cotação fictícia com data.
- Histórico incompleto.
- Registro importado potencialmente duplicado.

Nem todos os casos precisam de fluxo completo na etapa 0. Use-os para orientar modelo, demonstração e testes adequados à parte implementada.

Não preencha gráficos com séries aleatórias desconectadas das listas e totais apresentados.

## 21. Qualidade e testes

Use TypeScript estrito e ferramentas consistentes de lint e formatação.

Prefira testes que comprovem comportamento relevante:

- Soma das parcelas igual ao valor da compra.
- Transferência não aumenta receita consolidada.
- Pagamento de fatura não duplica despesa.
- Conversão preserva valores originais.
- Reabertura preserva dados locais.
- Seed não duplica registros.
- Simulação com taxa zero.
- Conversão de taxas.
- Falha simulada preserva dados existentes.
- Dados ausentes não viram zero indevidamente.

Teste também os fluxos visuais principais quando houver ferramenta disponível.

Verifique:

- Navegação.
- Filtros.
- Expansões.
- Seletor de moeda.
- Alternância das visões do cartão.
- Controles do simulador.
- Ausência de erros relevantes no console.
- Legibilidade em diferentes tamanhos de janela.

Não declare que o instalador Windows foi validado se o ambiente de execução não permite esse teste. Informe o que foi efetivamente verificado e forneça o procedimento restante.

## 22. Documentação obrigatória

Crie e mantenha, com organização equivalente:

- README.md — instalação, execução, build, testes e limitações.
- AGENTS.md — regras de trabalho para futuras sessões.
- docs/PRODUCT.md — visão e escopo.
- docs/DECISIONS.md — decisões confirmadas e propostas.
- docs/ROADMAP.md — etapas, dependências e critérios.
- docs/ARCHITECTURE.md — responsabilidades e comunicação.
- docs/DOMAIN_RULES.md — regras financeiras.
- docs/DATA_MODEL.md — entidades, relações e precisão.
- docs/DESIGN_SYSTEM.md — tokens, componentes e interação.
- docs/INTEGRATIONS.md — candidatos, cobertura e pendências.
- docs/TESTING.md — estratégia e execução.
- docs/STATUS.md — concluído, limitações e próximo passo.
- docs/adr/ — decisões arquiteturais relevantes.

Evite copiar o mesmo conteúdo em vários lugares. Use referências internas e uma fonte clara para cada assunto.

Se instruções existentes no repositório forem relevantes, leia-as e harmonize-as antes de criar arquivos novos.

Skills específicas podem ser propostas posteriormente para procedimentos repetitivos comprovados. Não é necessário criar um catálogo de skills na primeira execução.

## 23. Pendências técnicas

Registre como pendente tudo que ainda não foi validado:

- Cobertura real das instituições.
- Limites e termos atuais do provedor.
- Histórico acessível.
- Formatos de exportação.
- Fontes gratuitas de cotação.
- Metodologias avançadas de rentabilidade.
- Empacotamento e assinatura para distribuição.
- Sincronização futura com iPhone.

Essas pendências não bloqueiam a demonstração com dados fictícios.

Escolha versões estáveis e compatíveis das dependências após consultar documentação oficial. Não use automaticamente “a versão mais recente” sem verificar compatibilidade e manutenção.

## 24. Procedimento de execução

1. Inspecione o diretório, o repositório e as instruções existentes.
2. Preserve qualquer trabalho anterior.
3. Identifique ferramentas e limitações do ambiente.
4. Registre um plano curto para a etapa 0.
5. Crie a documentação inicial e as decisões arquiteturais.
6. Configure a base Angular/Electron/TypeScript.
7. Configure persistência, migrações e dados fictícios.
8. Implemente o sistema visual e a navegação.
9. Implemente as interações demonstrativas.
10. Execute validações e corrija os problemas encontrados.
11. Atualize documentação e estado do projeto.
12. Entregue um resumo objetivo com instruções de uso.

Não interrompa o trabalho por decisões rotineiras. Use seu julgamento e documente premissas.

Faça perguntas apenas quando a resposta mudar materialmente o produto, os custos, a segurança ou a preservação de dados.

## 25. Critérios de conclusão da etapa 0

A etapa estará concluída quando:

- O projeto tiver comandos documentados e reproduzíveis.
- A aplicação abrir no ambiente suportado ou suas limitações estiverem claramente verificadas.
- As três áreas principais forem navegáveis.
- O tema escuro estiver consistente.
- Os dados fictícios estiverem identificados.
- Os totais apresentados forem coerentes com esses dados.
- Filtros e expansões funcionarem.
- As duas visões do cartão estiverem demonstradas.
- A carteira em BRL/USD estiver representada corretamente.
- O simulador responder aos controles.
- O armazenamento básico sobreviver à reabertura.
- A inicialização não duplicar dados.
- As verificações apropriadas passarem.
- As limitações conhecidas estiverem registradas.
- O próximo passo estiver definido.

Na entrega final, informe:

- O que foi implementado.
- Como executar.
- Como testar.
- O que foi validado.
- O que ainda é demonstrativo.
- As limitações.
- A próxima etapa sugerida.

**Comece agora pela etapa 0. Trabalhe com autonomia dentro destes limites e conclua uma base visual, técnica e documental que possa sustentar a evolução do aplicativo.**