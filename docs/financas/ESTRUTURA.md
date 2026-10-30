# Finanças — estrutura e contexto (F02)

## Confirmado para a F02a

- **D30:** composição compacta: saldo à esquerda; importação/conta/moeda à direita; cinco submenus e linha de período abaixo. Controles reacomodam em janela estreita.
- **D31:** primeira abertura no Nubank de demonstração; depois lembrar a última conta. Manter contexto ao trocar de submenu.
- **D32:** começar pelo mês calendário e navegação entre meses. Ciclos de salário/cartão aparecem indisponíveis, com indicação breve; suas regras serão discutidas na próxima fatia.
- **D33:** usar a cotação fictícia já definida no cenário v1: 1 USD = 5 BRL, em 29/10/2026, identificada na interface. Oferecer Original/BRL/USD e Todas as contas, com consolidação apenas em moeda comum.

## Critérios de aceitação

**Revisão solicitada — D34/D35:** saldo em card com carteira no canto; retirar os dois parágrafos de contexto/data do saldo. Conta/moeda usam botões circulares com marcas/bandeiras, opções descendo por animação sem caixa/fundo e nomes revelados pela expansão lateral do próprio botão. Hover e foco têm o mesmo acesso; Escape, clique fora, troca de seletor e teclado funcionam sem alterar a seleção involuntariamente. Demonstração permanece identificada e câmbio fictício continua explícito. Esta revisão substitui a composição inicial de selects nativos e o contexto visível repetido; fonte original preservada. Procedência dos assets em [ASSETS.md](../ASSETS.md).

**Evolução confirmada — D36–D39:** fundo uniforme e pequena altura adicional do saldo, preservando sua largura/posição. Opção atual ausente na lista de conta/moeda. Somente os períodos ficam em coluna ao lado do saldo, com expansão à direita; ações permanecem lado a lado no canto anterior. Modos básicos sobre datas salvas e retorno ao calendário sem aviso foram confirmados em [PERIODOS.md](PERIODOS.md), substituindo a indisponibilidade inicial de D32 quando há dados suficientes. Não significa implementar relatórios ou configuração de recorrência.

1. Ler a demonstração salva, sem recriar fatos ao navegar. Identificar a data fixa de referência; saldo = abertura + caixa até essa data, sem investimentos/limites nem dependência do mês consultado.
2. Nas contas individuais, mostrar original ou equivalente identificado. Em Todas as contas + Original, mostrar saldos separados por moeda; consolidar somente ao selecionar BRL/USD. Câmbio usa arredondamento já testado no domínio, conserva originais e informa taxa/data/fictício; sem taxa compatível, informar ausência.
3. Geral / Movimentações / Cartão / Compromissos / Assinaturas são destinos navegáveis próprios. Conta/moeda/mês permanecem entre eles e ao retornar de outra área na mesma execução. Conteúdo futuro é identificado como ainda não implementado; conta sem cartão não exibe cartão de outra conta.
4. Mês calendário inicia no mês da referência da demonstração, com intervalo explícito e anterior/seguinte. Não salvar mês histórico como padrão de abertura. Modos de ciclo não configuram datas silenciosamente.
5. Salvar conta e moeda em preferências tipadas; migrar preferências v1 conservando moeda/período e namespaces existentes. Se a conta salva não existir, pedir seleção sem atribuir silenciosamente outro saldo. Falha de gravação informa que a alteração vale apenas na execução atual.
6. Importar dados permanece indisponível com explicação até F18; nome acessível e tooltip preservados. Sem nova integração/dependência, cards de F03 ou controles de funcionalidades ficticiamente ativas.
7. Banco indisponível: mostrar erro e ação de nova consulta, sem saldo zero nem fallback para fixture na interface desktop. Prévia sem ponte informa indisponibilidade do armazenamento, sem simular persistência.
8. Validar migração/reabertura/preservação, aritmética e contexto com dados temporários; conferir teclado e layout amplo/compacto. Não usar o banco normal para provocar falhas.

## Implementação proposta dentro da arquitetura existente

Casos de uso puros montam o contexto financeiro a partir do snapshot. Um serviço Angular mantém somente estado de apresentação e usa a ponte existente. Rotas filhas preservam o cabeçalho e o contexto. A cotação é referência fictícia imutável do cenário v1 já confirmado, sem consulta externa nem atualização automática; não altera o formato do agregado salvo. Preferências recebem formato v2 e migração transacional para incluir a conta, sem nova operação IPC genérica.

## Próxima fatia e pendências

F02b recebeu a primeira fatia sobre datas salvas conforme D37/D38 e a preferência em Configurações na [F02b.2](PERIODO_PADRAO.md), conforme D42/D43. Permanecem configuração de fontes/recorrências, dias úteis/meses curtos gerados, escolha entre vários cartões e alocação de compras sem vínculo observado. Fronteira do intervalo, retorno ao calendário e preferência já foram respondidos; não repetir o levantamento. Estado/autorização somente em [PROJECT_STATUS.md](../../PROJECT_STATUS.md).
