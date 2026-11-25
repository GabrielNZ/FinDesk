# Conferência visual — F09c — Variação entre faturas

Data: 24/11/2026. Escopo: indicador escolhido na Imagem 1, inserido no produto existente conforme D167/D168. Nenhum novo aplicativo, biblioteca visual ou asset criado na implementação.

## Evidências e normalização

- Referência escolhida: `C:/Users/gabri/.codex/generated_images/01a20a7a-a96e-75d2-916d-8aed72c6a546/exec-305c3c99-395f-4540-84f6-aee7042146ba.png`, 1653 × 952 px. Estudo gerado a partir da aplicação, sem moldura do Windows.
- Implementação renderizada no Electron: `FinDesk-Project/test-results/f09c-variation-wide.png`, recorte `.card-page` de 1457 × 838 px, density 1. Janela externa solicitada de 1800 × 1000; captura integral do renderer com 1784 × 961 px/CSS px. Captura sem moldura, novembro/2026, cartão 0000, moeda Original/BRL, movimento reduzido e sem dica aberta.
- Comparação conjunta: `%TEMP%/findesk-f09c-comparison.png`, 2914 × 838 px. Referência à esquerda normalizada para 1457 × 838, implementação à direita em densidade original. Pequena diferença de proporção da geração (~0,2%) identificada; não tratada como erro de layout.
- Região de resumo/indicador/legenda comparada em `%TEMP%/findesk-f09c-focus.png`, 1232 × 140 px, extraída da mesma composição conjunta. Texto permanece legível no tamanho da interface.
- Adaptação estreita inspecionada em `FinDesk-Project/test-results/f09b-evolution-narrow.png`, 884 × 881 px/CSS px; intermediária em `f09b-evolution-below.png`, 1364 × 921 px/CSS px. A solicitação de janela estreita foi 820 × 920, sujeita ao mínimo nativo do aplicativo; não equivale a um renderer com 820 px. Todos os testes em perfis temporários, preservando os bancos normais.

## Resultado da comparação

Sem diferenças P0/P1/P2 acionáveis no escopo escolhido. A variação está abaixo do resumo da Evolução e antes da legenda, em cor neutra, com referência e Parcial na mesma linha quando há largura. Nenhum indicador foi acrescentado ao painel Fatura. Os dois cards mantêm 400 px; compras continuam abaixo, com proporções e layout existentes.

- **Fontes e tipografia:** famílias Bahnschrift/Segoe UI do produto preservadas, variação com 14 px/peso 500 e referência com 10 px. Hierarquia equivalente ao estudo, números tabulares, texto quebra quando necessário. A geração tem diferenças de rasterização/escala e maior peso aparente; manter fontes reais é intencional.
- **Espaços e composição:** padding de 20 px mantido; linha de variação com 8 px acima e 10 px abaixo, separador discreto. Legenda e mínimo do gráfico acomodam o indicador na altura existente. Colunas continuam crescendo no redimensionamento. Sem corte horizontal nas larguras verificadas.
- **Cores:** tokens existentes de superfície, texto, cinza, borda e verde preservados. A variação não ganha cor de lucro/perda. Textura e brilhos introduzidos pela imagem gerada não foram aplicados ao produto.
- **Imagens e assets:** logo, carteira e ícones existentes preservados. A geração altera ligeiramente o chip, iluminação e afastamento dos cartões; esses elementos estão fora da escolha de posição e permanecem no desenho aprovado do aplicativo. Nenhum asset novo necessário para o indicador textual.
- **Conteúdo:** novembro contra outubro mostra +R$ 23,24 · +8,9%, referência out. de 2026 e Parcial. Valores/datas/estado, legenda e ressalva de valores conhecidos preservados. Referência exata também disponível à tecnologia assistiva. Ausência e conversão têm mensagens próprias.

## Interações verificadas

Dois fluxos Electron passaram: evolução com asserções F09c e organização de Cartão. Conferidos mouse/teclado/Escape, seleção por gráfico/setas sem rolagem, diferença negativa/zero/Parcial, outra moeda com original, outro cartão/sem anterior/sem valor, conta sem cartão, adaptação estreita, arraste/troca, resize com crescimento do gráfico, foco temporário, instância preservada, reabertura e restauração isolada. Nenhum erro de execução capturado pelos ouvintes `pageerror`; fatos/preferências/layouts externos preservados.

## Histórico e checklist

Primeira comparação visual conjunta após a implementação: aprovada sem correção visual decorrente da comparação. Sem iteração P0/P1/P2 pendente. Ajustes de estilo anteriores à captura alinharam tamanho/peso e referência na mesma linha ao estudo escolhido.

- [x] Comparação completa e região detalhada inspecionadas.
- [x] Cinco superfícies de fidelidade avaliadas.
- [x] Larguras e principais interações verificadas.
- [x] Altura padrão e personalização preservadas.

Estados financeiros extremos, ambiguidade, ausência de taxa e base percentual zero verificados em testes Node; não possuem estudo visual específico. Nenhuma pendência de produto nesta rodada. Aprovação da entrega pelo proprietário continua separada desta conferência.

## Revisão D169 — dica acompanha a barra

Após a revisão inicial, Gabriel pediu que os detalhes deixassem a posição fixa e acompanhassem o topo da coluna consultada. Essa correção intencional do comportamento não altera a composição estática da Imagem 1. Captura atual `FinDesk-Project/test-results/f09c-tip-march.png` aberta e inspecionada: março consultado, janela acima da sua barra, sem corte nas bordas nem sobreposição ao seu preenchimento. Tipografia, cores, conteúdo e card preservados.

Verificação geométrica Electron: centro horizontal da barra com contenção, distância de 10 px acima; primeira/intermediária/última coluna, foco por teclado, conversão, marcador sem valor, conteúdo de 300 px com navegação/rolagem horizontal e retorno à largura normal. Regressão de organização de Cartão passou; sem mudança nos cálculos ou nos dados. Nenhuma diferença P0/P1/P2 pendente dessa correção.

final result: passed
