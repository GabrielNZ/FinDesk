# Período padrão — F02b.2

Decisões confirmadas D42/D43 em [DECISIONS.md](../DECISIONS.md). Esta entrega completa o acesso à preferência já existente no contrato local; regras dos ciclos continuam em [PERIODOS.md](PERIODOS.md).

## Critérios de aceitação acordados

1. Configurações contém seção Finanças com Período padrão: Calendário, Salário e Cartão, em três botões com ícone e nome, seleção exclusiva e salvamento automático.
2. Alterar o padrão preserva modo, mês e ciclo da consulta atual, inclusive ao sair/voltar de Finanças. A próxima abertura inicia no intervalo atual do padrão salvo, nunca em uma consulta histórica anterior.
3. Conta incompatível usa calendário silenciosamente, preservando o padrão salvo. A opção em Configurações não fica bloqueada pela conta atual; a validação de disponibilidade acontece na abertura.
4. Mudanças temporárias de modo na tela financeira não sobrescrevem o padrão. Salvar conta/moeda não perde uma preferência alterada em Configurações; salvar o padrão não perde conta/moeda.
5. Carregamento, salvamento, falha e ausência da ponte têm estados objetivos. Uma falha não apresenta a escolha como salva; permite nova tentativa. Sem detalhes SQL/caminho na interface.
6. Operação por teclado, foco visível, disposição compacta e janela estreita preservadas. Sem nova dependência, esquema, IPC, geração de recorrência ou alteração dos fatos fictícios.
7. Validar em perfis temporários a reabertura, fallback, preservação entre páginas e falhas. Reutilizar testes válidos para regras financeiras e backend inalterados.

## Implementação interna

Centralizar leitura e fila de atualização das preferências no renderer evita que dois consumidores sobrescrevam campos com cópias antigas. Mesclar apenas os campos da operação, na ordem da fila. Capturar o padrão inicial na primeira leitura da execução permite alterá-lo nas Configurações antes de visitar Finanças sem antecipar sua aplicação. A ponte tipada e sua validação privilegiada permanecem iguais.

## Fora desta entrega

Configuração de fontes/recorrências, geração em meses curtos/dias úteis, escolha de cartão de referência entre vários cartões e regras de alocação de compras sem vínculo observado. O conteúdo dos submenus tem etapas próprias.
