# F09e — Comprometimento futuro do cartão

**Ampliação F09f/D176–D179:** subtotal e barras passam a usar compras menos estornos registrados na fatura de destino, incluindo crédito isolado como valor conhecido negativo. Detalhe identifica o crédito e a compra vinculada sem alterar a agenda original. Havendo negativo, barras compartilham eixo com zero central e créditos abaixo; proporções continuam na moeda original. Exemplo após novembro permanece R$ 1.066,66; após outubro passa a R$ 1.299,90. Sem transportar créditos, projetar assinaturas ou substituir itens por total confirmado. Critérios em [ESTORNOS_CARTAO.md](ESTORNOS_CARTAO.md).

## Objetivo e autorização

Gabriel aprovou a F09d até D173 e autorizou a próxima pequena entrega ao responder “proximo!”, retomado em 28/11/2026. Objetivo de produto: consultar o comprometimento futuro do cartão, distinguindo parcelas/itens registrados de recorrências previstas (§9.4, FIN-030). Aprovação, execução e verificações efetivas ficam exclusivamente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).

Gabriel confirmou em 28/11/2026: Começar pelos itens registrados e Novo card organizável (D174/D175). Respostas recebidas antes da implementação dependente. Nenhuma pergunta desta rodada permanece pendente; as alternativas abaixo preservam o levantamento. A etapa foi mantida aberta até receber ambas as respostas, conforme preferência de Gabriel.

## Base confirmada aplicável

- D24: parcelas/itens por fatura, compra contratada e pagamento não são consumos adicionais a somar entre si.
- D33: conservar moeda original, converter somente na apresentação, identificar a cotação fictícia. Ausência/precisão indisponível não viram zero.
- D159: agenda completa/parcial e posterior conhecido permanecem distintos; último vencimento conhecido não prova quitação ou término de uma agenda incompleta.
- D163–D166: consulta de fatura compartilhada e contexto global preservado, sem rolagem automática para a lista. Cards organizáveis e personalizações existentes não podem ser substituídos silenciosamente.
- D170/D171: filtro de estabelecimento afeta somente Compras desta fatura; não deve recalcular o futuro do cartão por consequência do próprio clique.
- D172/D173: detalhes crescem com conteúdo e a rolagem fica na página, com expansão/fechamento suave e movimento reduzido preservado. A posição/composição de um novo painel ainda é uma escolha aberta.
- Previsões não são cobrança confirmada. Não conectar fontes reais, gerar fatos financeiros, alterar seed ou concluir que meses sem itens representam gasto zero.

## Diagnóstico técnico local — 28/11/2026

Leitura das fontes/código e consulta pura da fixture em memória; nenhum teste/gravação nos bancos normais:

- `Purchase` informa total contratado, quantidade de parcelas, cobertura da agenda, categoria, estabelecimento, cartão e assinatura opcional. `InvoiceItem` preserva número/valor exato e vínculo de fatura. As parcelas futuras salvas são observadas na fonte; sua presença não afirma que uma fatura futura já foi cobrada.
- `Invoice` fornece fechamento/vencimento, situação e total confirmado opcional. `invoicePurchases` já calcula, por compra, os itens com vencimento posterior ao da fatura consultada. O recorte agregado pode reutilizar os mesmos vínculos sem gerar parcelas ou faturas.
- Cartão 0000, após novembro/2026: dezembro R$ 233,33, janeiro/2027 R$ 233,33 e fevereiro/março/abril R$ 200,00 cada. Subtotal conhecido R$ 1.066,66. São cinco parcelas de R$ 200 da compra em 6x e duas de R$ 33,33 da compra em 3x; não inclui o valor da fatura atual.
- Após outubro, a fatura de novembro também contém uma cobrança Netflix à vista de R$ 49,90. Portanto a consulta não pode chamar todos os itens posteriores de “parcelas de uma compra parcelada”: distinguir parcelamentos, cobranças recorrentes já registradas e outros itens conhecidos conforme a apresentação final, sem excluir silenciosamente compras à vista.
- Cartão 1111: existe dezembro sem itens/total confirmado. Isso representa ausência, não compromisso zero ou quitação. A referência fictícia permanece 29/10/2026; a data de execução em novembro não muda automaticamente o cenário.
- `SubscriptionFact` possui somente ID, periodicidade mensal/anual, valor e próxima data esperada. Não há `cardId`, regra de alocação por fatura, vigência/pausa/cancelamento ou agenda de ocorrências previstas. O ID `sub-card` aparece em duas compras Netflix do cartão 0000, mas histórico não comprova sozinho onde ocorrerá uma cobrança futura. Assinaturas da conta (`sub-conta`, `sub-anual`) não podem ser atribuídas ao cartão.
- Não há motor de projeções de assinaturas em `application/`; o gerador de intervalos salariais da F02b.3 não cria valores/ocorrências financeiras e não resolve essa metodologia. O motor geral de previsões permanece na F12. Antecipar uma projeção limitada na F09e exige direção explícita e critérios de associação/datas/horizonte/não duplicação.
- Um novo card exige acrescentar ID e compatibilidade no mecanismo de layout/validação. O contrato atual de Cartão contém quatro IDs fixos; não basta inserir um quinto e tornar os layouts salvos incompatíveis. Preservar posições/tamanhos dos quatro atuais, adicionando o novo em posição válida e sem restaurar preferências por conta própria. Detalhar a evolução do contrato somente se essa composição for escolhida.
- Uma seção dentro de Compras evita um quinto card, mas vincula tamanho/posição e expansão à lista existente. As duas composições usam dados/consulta independentes do filtro de estabelecimento.
- Não foi escolhida dependência nova nem há integração externa para pesquisar nesta rodada. Não iniciar pesquisa de API ou cobertura de instituições para uma consulta fictícia local.

## Alternativas apresentadas — recomendações confirmadas

1. **Escopo/base:** recomendar começar pelos itens já registrados nas faturas com vencimento posterior à selecionada. Novembro é a referência do exemplo de R$ 1.066,66, com estados/agenda conhecida identificados. Parcelas e outros itens registrados ficam distintos; recorrências sem agenda exibem “Ainda não projetadas” e não entram na soma. Não chamar esse recorte de dívida total ou total final de faturas abertas. Alternativa: incluir projeções de assinaturas nesta entrega, em série separada, fechando antes o vínculo com cartão, datas/ciclos, horizonte e conciliação com itens já salvos. Netflix R$ 49,90 seria uma previsão explícita, nunca parcela contratada ou nova cobrança confirmada.
2. **Composição:** recomendar novo card “Futuro do cartão”, abaixo de Compras por padrão, com total conhecido e barras por fatura; consultar mês revela os itens correspondentes. Arraste/resize como os demais e detalhes com crescimento/rolagem na página, sem sobrescrever personalizações atuais. Alternativa: seção recolhível dentro de Compras desta fatura, sem organização independente. Não presumir aprovação de um novo card.

## Critérios de aceitação anteriores ao código — D174/D175

Mostrar todos os vínculos salvos com vencimento estritamente posterior ao da fatura consultada; não gerar intervalos ou meses vazios. Cada fatura conserva ID, vencimento e situação; consultas históricas podem incluir uma fatura hoje paga, identificada como Paga. Cabeçalho usa Subtotal conhecido / Itens registrados após a referência, sem dizer dívida ou a pagar. Itens recorrentes já registrados ficam separados de parcelamentos e de outros itens; uma compra parcelada com assinatura é contada uma única vez em parcelamentos.

Detalhes locais: clicar/Enter/espaço em uma fatura abre seus itens no próprio novo card, uma vez por vez; repetir recolhe. Escape fecha e retorna ao acionador sem rolagem automática. Não alterar a fatura principal, Compras, período global ou filtro de estabelecimento; trocar a referência/conta/cartão recolhe, moeda preserva. Barras horizontais proporcionais ao maior subtotal conhecido, nomes/mês/ano/valor/situação visíveis; crescer com detalhes e respeitar movimento reduzido.

Agenda parcial identificada, ausência de vínculos ou fatura sem itens não significa zero/quitação. Subtotal soma os itens conhecidos disponíveis, explicitando faturas sem itens; excesso de precisão não gera soma parcial enganosa. Total confirmado diferente não altera a base dos itens. Datas/IDs iguais no mesmo mês permanecem separados. Sem geração de recorrências; Ainda não projetadas fora da soma.

Compatibilidade: novo layout v4 de Cartão com quinto ID; v3 com quatro IDs continua aceito no processo privilegiado e lido sem escrita. Renderer acrescenta o novo card ao fim, com largura completa e início de linha, preservando campos/ordem/dimensões dos quatro originais. Salvar após gesto explícito ou Restaurar layout grava v4. Demais áreas continuam v3 e versões futuras/IDs indevidos são recusados. Mesma chave de preferências e IPC restrito, sem novo schema SQLite ou seed. Validar leitura/reabertura/bytes e erro/rollback em perfil temporário antes da entrega.

- Usar IDs/vínculos e vencimentos salvos; não somar total contratado com suas parcelas ou pagar fatura como novo gasto. Preservar os centavos originais e indicar agenda parcial.
- Separar fatura sem itens, ausência de faturas posteriores, itens conhecidos zero, precisão e conversão indisponíveis. Não inferir limite utilizado/liberado por essa consulta; limites possuem fonte própria.
- Não misturar moedas. Agregar na moeda original comum do cartão e converter uma vez por agregado apresentado, com original/cotação identificados.
- Se houver projeções: definir fonte autorizada de vínculo, periodicidade, fim de mês, vigência/ausência de dados, horizonte, alocação ao ciclo salvo e conciliação de ocorrência já registrada. Não duplicar a cobrança prevista com a observada nem gravar projeções como compras/parcelas/faturas reais.
- Se houver novo card: preservar layout salvo por evolução compatível, testar leitura/restauração/reabertura sem corromper preferências de Cartão ou de outras áreas. Crescimento automático não persiste alturas intermediárias.
- Preservar conta/moeda/período, seleção da fatura e referências de Configurações. Filtro de estabelecimento fica restrito à lista atual. Teclado/foco/Escape e movimento reduzido conforme o produto.

## Implementação e validação

`application/card-future.ts` produz o recorte por vencimento e itens originais, classificando uma vez cada parcela/recorrência registrada/à vista. Total confirmado não substitui itens; ausência e precisão são explícitas. Conversão uma vez por agregado preserva os originais e o percentual da barra; a apresentação identifica que total e faturas são convertidos separadamente. Agenda parcial conserva aviso, sem deduzir quitação ou inventar recorrência.

`fd-card-future` apresenta barras horizontais por fatura, resumo/estados e detalhe local de itens com tipo/posição/valor. Sem troca da fatura principal; moeda conserva o detalhe e referência/conta/cartão o recolhem. Mouse/teclado/Escape, expansão/fechamento suave, movimento reduzido, crescimento natural e rolagem da página reutilizam a direção do produto. Cadastro/edição/encerramento de assinaturas, motor geral de previsões, estornos, importação/integração real e pagamentos continuam em fatias próprias.

Layout de Cartão v4 inclui o quinto ID. `parseCardLayout` aceita v3 com quatro IDs e v4 com cinco somente nessa área; áreas anteriores seguem v3. Renderer normaliza v3 em memória e acrescenta o novo card ao fim, sem escrita. Main/worker/store validam na fronteira existente; versões futuras/campos indevidos continuam recusados. Próximo gesto explícito ou Restaurar layout grava v4 pela mesma chave e IPC, sem schema SQLite/seed novo. Leituras preservam bytes e dimensões antigas, com teste de erro/rollback/reabertura.

Sete testes puros próprios e um de compatibilidade/persistência acrescentados às regressões existentes. Fluxo Electron próprio cobre legado sem escrita, subtotal/itens/detalhes, preservação da fatura principal/filtro/período, moeda, teclado/Escape, ausência, largura estreita, expansão/resize/ordem, mesma instância e reabertura v4. Verificações/resultados efetivos e aprovação ficam exclusivamente no estado único. Nenhum teste financeiro no perfil normal.
