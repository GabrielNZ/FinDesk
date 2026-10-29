# Complemento — Git, commits e aprovação das entregas do FinDesk

## 1. Objetivo

Manter um histórico frequente, organizado e recuperável do desenvolvimento.

O trabalho deve avançar em pequenas entregas, permitindo revisar mudanças e corrigir a direção antes que o projeto acumule alterações demais.

Os commits devem representar conjuntos coerentes de mudanças. Não é necessário criar um commit por arquivo ou por ajuste mínimo.

## 2. Aprovação implícita para commit

Quando o proprietário avaliar a entrega e disser algo como:

- “Está bom, pode continuar.”
- “Pode ir para a próxima parte.”
- “Vamos para a próxima etapa.”
- “Aprovado.”

Interprete isso como autorização para:

1. Revisar as alterações da entrega atual.
2. Executar as verificações pertinentes.
3. Atualizar a documentação e o estado do projeto.
4. Criar o commit da entrega aprovada.
5. Começar a próxima pequena entrega proposta.

Não peça novamente autorização para esse commit.

A aprovação vale para o trabalho apresentado. Se houver alterações adicionais não revisadas ou escopo diferente, não as inclua silenciosamente.

Caso o proprietário peça correções junto da autorização para continuar, faça e valide essas correções antes do commit.

## 3. Momento de commitar

Fluxo padrão:

**Implementar → validar → apresentar → receber aprovação → commitar → iniciar a próxima entrega.**

Ao terminar uma pequena entrega, deixe claro que ela está pronta para revisão e que será registrada quando o proprietário aprovar a continuação.

Não inicie a próxima entrega antes de registrar a anterior aprovada, salvo instrução explícita do proprietário.

Não acumule várias entregas aprovadas em um único commit.

Se uma entrega exigir alterações extensas, divida o planejamento em partes menores antes de implementá-la.

Commits intermediários de checkpoint podem ser utilizados quando solicitados ou combinados com o proprietário. Não crie commits incompletos apenas para aumentar a quantidade de registros.

## 4. Verificações antes de cada commit

Antes de registrar:

- Consulte o estado do Git.
- Revise o diff.
- Identifique quais arquivos pertencem à entrega.
- Execute os testes e verificações apropriados.
- Atualize a documentação necessária.
- Confira se há arquivos sensíveis ou gerados indevidamente.
- Revise o conteúdo preparado para o commit.

Adicione arquivos de forma seletiva. Evite incluir indiscriminadamente todo o diretório.

Preserve alterações feitas pelo proprietário ou por outros processos. Não descarte, sobrescreva ou inclua trabalho alheio sem compreender sua origem.

Não use a aprovação do proprietário como substituto das verificações técnicas.

Se uma verificação relevante falhar, corrija a causa ou comunique o bloqueio. Não registre a entrega como validada quando ela não estiver.

Limitações do ambiente devem ser registradas com honestidade.

## 5. Padrão das mensagens

Use mensagens curtas, específicas e em português, seguindo:

`tipo(escopo): descrição`

Exemplos:

- `chore(setup): configura Angular e Electron`
- `docs(projeto): registra escopo e roadmap do FinDesk`
- `feat(layout): adiciona navegação e tema escuro`
- `feat(cartao): apresenta parcelas por fatura`
- `fix(simulador): corrige cálculo com taxa zero`
- `test(financas): valida distribuição de centavos`
- `refactor(carteira): separa cálculos dos componentes`

Tipos principais:

- `feat`: funcionalidade.
- `fix`: correção.
- `refactor`: reorganização sem alteração intencional do comportamento.
- `test`: testes.
- `docs`: documentação.
- `chore`: configuração e manutenção.
- `style`: formatação de código sem mudança de comportamento.

Use o corpo da mensagem quando for necessário explicar uma decisão ou limitação relevante.

Evite mensagens vagas como “ajustes”, “atualização” ou “coisas novas”.

## 6. Arquivos que não devem entrar no Git

Configure o `.gitignore` desde a preparação do projeto.

Não versionar:

- Credenciais e tokens.
- Arquivos `.env` com valores reais.
- Bancos SQLite de uso pessoal e seus arquivos auxiliares.
- Extratos e relatórios financeiros reais.
- Dados importados das contas.
- Logs com informações pessoais.
- Backups de dados pessoais.
- Dependências instaladas.
- Builds e instaladores gerados, salvo decisão específica de distribuição.

Versionar:

- Código-fonte.
- Migrações.
- Dados fictícios reproduzíveis.
- Arquivos de configuração adequados.
- Lockfile do gerenciador de pacotes.
- Documentação.
- Exemplos de configuração sem segredos.
- Assets oficiais do FinDesk.

## 7. Commit e push

Commit registra uma versão no repositório local.

Push envia os commits para o repositório remoto no GitHub.

A autorização para commitar não deve ser interpretada automaticamente como autorização para enviar qualquer conteúdo ao remoto.

Na configuração inicial, combine com o proprietário uma destas políticas:

- Push após cada entrega aprovada.
- Push apenas quando solicitado.

Depois que a política estiver definida, registre-a em `AGENTS.md` e siga-a sem pedir a mesma autorização repetidamente.

Nunca afirme que o trabalho está no GitHub se apenas o commit local foi realizado.

Se o push falhar, preserve os commits locais e informe o problema.

## 8. Proteção do histórico

Não execute sem autorização específica:

- Force push.
- Reset destrutivo.
- Limpeza de arquivos não rastreados.
- Exclusão de branches com trabalho.
- Reescrita de commits já publicados.
- Alteração ou remoção do remoto existente.

Prefira commits de correção para preservar o histórico revisado.

Se não houver alterações após uma aprovação, informe que não há novo conteúdo para commitar. Não crie commits vazios apenas para marcar progresso.

## 9. Preparação do repositório

Antes de configurar Git:

1. Verifique se já existe um repositório.
2. Confira a branch e os remotos.
3. Preserve o histórico existente.
4. Confirme o destino antes do primeiro push.
5. Utilize a identidade Git configurada pelo proprietário.

Não invente nome ou e-mail de autor.

Se faltar identidade ou autenticação, explique exatamente o que precisa ser configurado. Nunca solicite tokens ou senhas em mensagens do chat nem os grave nos arquivos do projeto.

A estratégia de branches deve ser simples e compatível com o repositório. Não crie processos complexos de branches e PRs sem necessidade.

## 10. Continuidade e comunicação

Registre esta política em `AGENTS.md`.

Mantenha `PROJECT_STATUS.md` com:

- Última entrega aprovada.
- Situação das verificações.
- Próxima entrega proposta.
- Pendências.
- Política de push escolhida.

Após um commit, informe brevemente:

- Identificador curto.
- Mensagem.
- Se foi apenas local ou enviado ao GitHub.
- Próxima atividade.

Não é necessário inserir o hash do próprio commit dentro de um arquivo que faz parte dele.

**O comportamento esperado é: ao receber aprovação para avançar, consolidar a entrega atual em um commit e então começar a próxima parte, mantendo o histórico e a documentação alinhados.**