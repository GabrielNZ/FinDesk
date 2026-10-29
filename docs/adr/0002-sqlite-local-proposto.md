# ADR 0002 — SQLite local como padrão proposto

**Status: proposto nas fontes; não implementado nesta entrega.**

Atualização F00, 29/10/2026: a [especificação de Finanças](../FINANCAS_SPEC.md) pede explicação comparativa com MySQL e decisão conjunta. A inspeção local confirma ausência de ambos os bancos e de drivers. A recomendação abaixo é histórica e continua proposta; não autoriza instalar SQLite, escolher biblioteca ou migrar dados. Trazer comparação pesquisada antes da decisão e registrar o resultado neste ADR quando confirmado.

## Contexto e recomendação

O mestre recomenda SQLite e autoriza adotá-lo como escolha padrão proposta, com justificativa. O produto é pessoal, local, inicialmente para Windows, e precisa reabrir com dados disponíveis sem um servidor separado. SQLite se ajusta a esse uso e simplifica instalação e acesso offline.

## Limites da proposta

Banco e operações de arquivo pertencem ao lado privilegiado. Dados fictícios precisam de banco ou namespace separado, migrações versionadas e seed idempotente. Não recriar bancos ao abrir. Dados locais não substituem backup.

A casca não instala driver, cria arquivo de banco ou define esquema financeiro. A próxima entrega de persistência deverá pesquisar opções oficiais compatíveis com o Node embutido no Electron e suas consequências de empacotamento. O proprietário participa das escolhas relevantes sobre dados armazenados, restauração, exclusão e comportamento das preferências.

## Alternativas

MySQL exigiria serviço separado para um uso que ainda não o justifica. Persistir dados financeiros apenas em armazenamento do navegador não atende à separação planejada. Não existe necessidade atual de servidor remoto, sincronização entre dispositivos ou ORM.
