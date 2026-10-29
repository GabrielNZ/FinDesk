# Complemento — Levantamento conjunto e decisões importantes

Esta regra complementa a autonomia definida nos documentos anteriores. Em caso de conflito, prevalece este complemento para decisões relevantes de produto, integração e arquitetura.

## 1. Colaboração com o proprietário

O FinDesk deve ser desenvolvido em colaboração com Gabriel.

O Codex tem autonomia para implementar decisões estabelecidas e resolver detalhes técnicos rotineiros. Decisões importantes ainda em aberto devem ser discutidas antes de sua implementação.

Não interprete uma descrição geral de funcionalidade como definição completa de seus requisitos.

## 2. Levantamento antes da implementação

Ao iniciar uma funcionalidade relevante:

1. Leia os requisitos e decisões já registrados.
2. Identifique o que já está definido.
3. Apresente brevemente sua compreensão do objetivo.
4. Destaque decisões em aberto e suas consequências.
5. Sugira uma abordagem, com justificativa.
6. Faça perguntas objetivas ao proprietário.
7. Registre as respostas e os critérios de aceitação.
8. Implemente o escopo acordado.

O levantamento pode acontecer em pequenas rodadas. Evite questionários enormes e perguntas repetidas sobre decisões já tomadas.

Quando a resposta depender de informação técnica, pesquise primeiro. Traga alternativas verificadas para discussão, sem pedir ao proprietário que adivinhe limitações de uma API ou biblioteca.

## 3. Decisões que exigem discussão

Consulte o proprietário antes de definir ou alterar significativamente:

- Provedores e fluxo de integração bancária.
- Dados financeiros acessados e onde serão armazenados.
- Configuração, autorização e desconexão de contas.
- Regras de sincronização e tratamento de conflitos.
- Exclusão ou substituição de dados.
- Metodologias de indicadores financeiros e simulações.
- Comportamentos importantes das telas.
- Mudanças expressivas na navegação ou identidade visual.
- Novas dependências externas com consequências de custo ou privacidade.
- Alterações estruturais na arquitetura.
- Funcionalidades cujo escopo ainda esteja aberto.

Apresente uma recomendação quando possível. Explique os efeitos práticos das alternativas.

## 4. Decisões que podem ser tomadas autonomamente

Dentro do escopo aprovado, prossiga sem interromper por:

- Nomes de arquivos e variáveis.
- Divisão interna de componentes.
- Pequenos ajustes de espaçamento.
- Correções de bugs.
- Validações já determinadas pelas regras.
- Testes pertinentes.
- Refatorações locais sem mudança de comportamento.
- Atualização da documentação.

Se um detalhe revelar uma decisão maior, interrompa apenas a parte dependente dessa decisão e continue tarefas independentes.

## 5. Exemplo: configurações das integrações

Registre como requisito do produto:

**Uma engrenagem acessível na interface abre Configurações, onde existe uma seção Integrações.**

Antes de implementar essa seção com dados reais, discuta com o proprietário:

- Como adicionar uma instituição.
- Onde ocorre a autorização.
- Quais informações cada conexão disponibiliza.
- Como mostrar status e última atualização.
- Como explicar limitações de atualização do provedor.
- Como tratar falhas e consentimento expirado.
- Como desconectar.
- O que acontece com os dados locais após a desconexão.
- Como a integração convive com registros manuais e importados.

Esses pontos são assuntos para levantamento, não decisões já aprovadas.

Na demonstração, é possível apresentar uma proposta com estados fictícios, claramente identificada como protótipo, para facilitar a conversa.

## 6. Significado de “pode ir para a próxima”

Quando o proprietário autorizar a próxima parte:

- Registre a entrega anterior conforme a política de commits.
- Identifique a próxima pequena entrega.
- Se os requisitos estiverem definidos, implemente.
- Se existirem decisões importantes em aberto, inicie o levantamento conjunto.
- Aguarde as respostas antes de executar as partes que dependem delas.

Autorizar a próxima etapa não significa autorizar decisões importantes ainda não discutidas.

## 7. Registro e continuidade

Documente as decisões acordadas nos arquivos correspondentes e resuma o estado em `PROJECT_STATUS.md`.

Diferencie claramente:

- Decisão confirmada.
- Proposta do Codex.
- Pendência de pesquisa.
- Pergunta aguardando resposta.

Não transforme uma sugestão em requisito aprovado sem confirmação. Também não volte a perguntar decisões já respondidas, salvo quando novas evidências justificarem reconsiderá-las.

**O Codex deve atuar como parceiro técnico: investigar, sugerir, questionar e implementar. O proprietário participa das decisões que definem o comportamento e a evolução do FinDesk.**
