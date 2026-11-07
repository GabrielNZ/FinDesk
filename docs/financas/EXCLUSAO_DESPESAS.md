# F06c — Exclusão de despesas manuais com confirmação

## Base e continuidade

Continuidade autorizada em 07/11/2026 após a apresentação/aprovação da F06b. Exclusão foi proposta como próxima pequena entrega; as fontes de cadastro/edição (FIN-042 / especificação §14.1) e consistência (§15) não fecham automaticamente a confirmação ou a recuperação. Estado, aprovação e verificações efetivas ficam somente em PROJECT_STATUS.

Primeira fatia: excluir uma despesa de caixa cadastrada manualmente no FinDesk por vez, na demonstração atual. Não ampliar para lote, arquivo/integração, outros tipos, compras/parcelas, recorrências ou ambiente real. Não remover conta, categoria, estabelecimento ou regra ao excluir uma despesa. Recuperação persistente confirmada em D122.

## Diagnóstico antes das escolhas

- F06b já valida despesa manual local por tipo/origem/recibo de criação. O acesso visual não basta: exclusão e eventual recuperação também precisam dessa validação privilegiada, contrato fechado e proteção contra estado obsoleto.
- Saldo deriva dos movimentos de caixa ativos até snapshot.asOf. A retirada da despesa precisa refletir extrato, Agrupamento, Seleção e saldo sem duplicação. Exemplo apresentado: excluir saída de R$ 20 no Nubank aumenta em R$ 20 o saldo calculado dessa conta. Data/referência e moeda permanecem as estabelecidas.
- Recibos de criação e edição permitem repetir pedidos confirmados sem aplicá-los de novo. Atualmente presumem a existência do movimento; exclusão precisará distinguir ausência esperada de corrupção, impedir que uma repetição antiga recrie o registro e manter revisões coerentes.
- O registro de primeira entrada impede reclassificar IDs antigos como novos. Se houver recuperação, ela deve devolver o mesmo ID/origem e classificação anterior, sem aplicar a regra atual. Categorias/nomes/regras de outros registros permanecem intactos.
- Recuperação após reabrir exige manter dados locais suficientes para isso. A alternativa sem recuperação não deve anunciar lixeira ou Desfazer disponíveis. Formato de persistência depende dessa escolha, sem presumir biblioteca nova ou alterar arquivos normais para simular exclusões.
- Se um registro for excluído e recuperado, uma edição aberta antes desse ciclo não deve ser aceita silenciosamente com versão antiga, mesmo se os campos voltarem aos mesmos valores. Integrar esse ciclo à proteção de versão é requisito técnico da futura implementação.

Inspeção local dos contratos/fatos/recibos existentes. Sem comando de exclusão, migração nova ou teste funcional desta fatia; nenhuma exclusão no perfil normal.

## Perguntas apresentadas — respondidas abaixo

1. **Acesso:** lixeira no cabeçalho, junto do lápis e antes do + de seleção (recomendação), ou Excluir despesa somente no painel de edição? Acesso somente a despesas cadastradas manualmente no FinDesk.
2. **Confirmação:** prévia no painel direito com descrição/data/conta/valor/categoria do registro salvo e efeito no saldo, Confirmar exclusão/Cancelar (recomendação), ou segundo clique na própria ação, com Excluir esta despesa? Cancelar/Escape não altera fatos.
3. **Recuperação:** área Excluídas acessível por botão em Movimentações, abrindo lista no painel direito com Recuperar inclusive após reabrir (recomendação), ou remoção sem recuperação pelo aplicativo? Na proposta recuperável, dados permanecem guardados localmente, fora do saldo/totais. Recuperação devolve o mesmo lançamento/classificação, sem aplicar regra nova.

As perguntas foram enviadas antes da implementação dependente; as respostas abaixo substituem as alternativas divergentes.

## Respostas confirmadas e critérios antes da implementação — D120–D122

Gabriel confirmou lixeira no cabeçalho, prévia no painel direito e Excluídas com recuperação após reabrir. Nenhuma pergunta pendente desta fatia.

1. Acesso por Cards/Lista/Agrupamento/Seleção, somente em despesas manuais elegíveis por origem/tipo/recibo. Prévia lê dados salvos e versão esperada; Cancelar/Escape não grava. Confirmar exclusão mantém filtros e remove só o registro confirmado dos fatos ativos e da Seleção.
2. Área Excluídas no painel direito reúne despesas manuais excluídas de todas as contas, com conta/data/moeda/categoria explícitas, sem misturar valores em total global nem depender dos filtros temporários do extrato. Esse detalhe de composição segue o catálogo global e permite recuperar um item fora da consulta; Ver lançamento ajusta a consulta somente por ação explícita, conforme D115. Recuperar não preenche a Seleção automaticamente.
3. Guardar localmente cópia do movimento e posição para recuperação, mantendo identidade/origem, classificações/atribuições e IDs conhecidos. Categorias/nomes/regras continuam disponíveis e não são apagados. Recuperar reinsere o mesmo ID e classificação, sem tratar como nova entrada ou reaplicar regra, validando vínculos/datas/precisão/saldo da conta.
4. Recibos específicos evitam repetir exclusão/recuperação ou recriar por tentativas antigas de cadastro/edição. Versão do ciclo excluir/recuperar participa da proteção de edição obsoleta, inclusive A→B→A. Rejeitar prévia antiga; falha mantém estado e permite recarregar explicitamente, sem confirmar outro estado silenciosamente.
5. Snapshot ativo, estado de exclusão/recuperação e recibo são gravados numa transação. Falha reverte tudo. Migração versionada preserva payloads existentes; restauração explícita da demo inclui Excluídas/recibos e mantém preferências/layout. Sem exclusão definitiva, lote, novas dependências ou escrita genérica na ponte.
6. Testar dinheiro/saldos/moedas, exclusão/recuperação idempotentes, persistência após reabrir, categoria preservada com regra alterada, prévias obsoletas, repetição antiga de criação/edição, migração/rollback/restauração/contratos/IPC. Conferir interface ampla/estreita, teclado e Seleção. Somente perfis temporários, nunca falhas ou restauração no perfil normal.

## Requisitos existentes a preservar

Demais lançamentos, moedas, categorias/estabelecimentos/regras, preferências e layout intactos. Seleção segue D82: após confirmação, o item excluído deixa a consulta/Seleção; os demais continuam conforme os filtros. Prévia usa dados salvos atuais, sem salvar alterações pendentes de edição silenciosamente. Operação e eventual recuperação devem ser atômicas, com falha sem efeito parcial, repetição segura e remetente/frame/argumentos validados no principal/worker. Testes financeiros/persistência/IPC/Electron somente em perfis temporários; nenhum banco normal para simular falhas ou restauração.

## Implementação e limites

Demo esquema 6 guarda cópia/posição/estado/revisão e recibos de ciclo em tabelas próprias. Fatos ativos não contêm o movimento excluído; classificações, atribuições e IDs conhecidos preservam sua identidade para recuperar sem regra nova. Não há remoção definitiva ou limpeza periódica automática. Restaurar dados da demonstração esvazia Excluídas, informado na confirmação. Métodos específicos e os mesmos padrões oficiais de [isolamento](https://www.electronjs.org/docs/latest/tutorial/context-isolation) e [validação de remetente IPC](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages), já consultados na F06a/F06b, foram reutilizados. Sem dependência nova. Execução/aprovação somente em PROJECT_STATUS.
