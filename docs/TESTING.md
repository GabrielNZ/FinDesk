# Verificações

Resultados efetivamente executados ficam em [PROJECT_STATUS.md](../PROJECT_STATUS.md). Os comandos abaixo são o procedimento reproduzível, não uma alegação de aprovação automática.

## Frequência e seleção

Agrupar pequenas mudanças e verificar o conjunto. Não executar todos os comandos abaixo após cada alteração.

- Texto, estilos e formatação: revisar o diff; conferir compilação e layout uma vez ao concluir o grupo, quando pertinente. Não criar testes triviais para espelhar a mudança.
- Navegação e interações: testar o comportamento afetado em conjunto.
- Cálculos, persistência, IPC e segurança: testes pertinentes são obrigatórios à entrega dessas regras e fronteiras.
- Instalação limpa: ao preparar/verificar o ambiente ou investigar dependências/lockfile, não a cada rodada.
- Revisão completa/commit: considerar os resultados existentes e executar o que o diff ou falhas novas exigirem. Não repetir verificações que continuam válidas.

Esta política foi explicitada por Gabriel após a primeira revisão da casca para manter qualidade sem alongar desnecessariamente cada avanço.

## Comandos de revisão completa

A partir da raiz do repositório:

```powershell
cd FinDesk-Project
npm ci
npm run check
npm run test:desktop
```

Os demais comandos desta página pressupõem o diretório `FinDesk-Project/`. Não é necessário reinstalar dependências apenas por reorganizar pastas.

## Cobertura desta fatia

- `typecheck`: TypeScript estrito de desktop, domínio/fixtures, templates Angular e testes/configuração.
- `lint`: ESLint e regras Angular de código, templates e acessibilidade; scripts Node incluídos.
- `format:check`: Prettier; originais em `docs/references/` e arquivos gerados estão excluídos intencionalmente.
- `test`: compila desktop/domínio/aplicação e executa 41 testes Node: quatro segurança, 19 domínio, oito aplicação e dez persistência. test:domain executa somente os testes do domínio; test:persistence compila desktop e verifica o backend/worker sem abrir janela.
- `tests/domain/`: IDs FIN e cenários C nos nomes dos testes. Cobre centavos/limites/ausência/moedas, taxas exatas e arredondamento, calendário/bissextos/quatro fusos, caixa separado de cartão e previsão, parcelas observadas/centavos/ano, transferências, pagamento integral, Sem categoria, IDs de origem e instantes de coleta. Nenhuma regra de ciclo é inferida desses testes.
- `probe:sqlite`: avaliação isolada no Electron real e worker Node, sem janela ou banco pessoal; seis grupos de capacidade (parâmetros, rollback, referências, inteiros, reabertura/integridade e cópia consistente). Usa perfil/bancos temporários exclusivos com limpeza delimitada. Não substitui testes futuros de esquema, migração, seed, restauração do produto ou IPC. Protocolo e limites em [PERSISTENCIA.md](financas/PERSISTENCIA.md).
- `test:desktop`: build completo e teste Playwright no Electron real; protocolo local, versão pela ponte, ausência de Node no renderer, sandbox no Windows, navegação/recarga, Configurações/Integrações, propostas SVG, diálogo PrimeNG, Escape, janela menor e ausência de erros capturados no console.
- O mesmo teste também confere o botão abaixo de Configurações, recolhimento em 72 px, ganho de largura do conteúdo, navegação com ícones e expansão por teclado. Não é necessário repetir testes de domínio/segurança isolados por uma mudança apenas de navegação visual.
- `navigation.spec.ts` usa mouse real para verificar encaixe nas quatro bordas, prévia sem texto, recolhimento pelo botão em cada orientação, cancelamento, menu por teclado e controles em janela menor. Confere também que a borda não redimensiona e não há separador ajustável, conforme D20.

O suporte de Electron no Playwright é [experimental](https://playwright.dev/docs/api/class-electron). Não usa um navegador externo instalado: automatiza o executável Electron do projeto. Os testes usam perfis temporários exclusivos e validam o caminho antes de removê-los. Para verificar gestos e transições reais no Windows, mostram temporariamente a janela; o modo de teste também evita a redução de frames ao fundo. A execução normal preserva o comportamento padrão do Electron. Capturas e traces ficam em `FinDesk-Project/test-results/`, ignorados pelo Git.

## Verificação manual

D41: build web/templates, lint dos arquivos envolvidos e tipos dos testes passaram. Cenário Electron focado passou nos três modos: aba de 20 × 44 px, seletor aberto com altura preservada, seta deslocada e separada por 8 px, nenhuma linha visível de datas, intervalo acessível preservado, teclado/Escape, contexto e layout compacto. Conferida captura ampla. Reutilizados os 41 testes Node anteriores para lógica inalterada. Antes do commit, format:check passou em toda a aplicação; não houve repetição de builds ou suítes já válidos.

D40: build web/templates, lint e tipos dos testes aprovados; um fluxo Electron existente foi ampliado e passou com início recolhido, abertura por teclado, painel mensal de 44 px sem linha visível de datas, Escape/foco e preservação do mês/ciclos. Capturas recolhida/aberta conferidas. Helpers dos outros testes abrem explicitamente o mês quando necessário. Reutilizados os 41 testes Node e demais cenários já válidos, sem repetição integral por alteração de apresentação/estado local.

Revisão D36–D39: passaram tipos/templates, lint, formatação, builds e os 41 testes Node. Sete cenários Electron aprovados entre rodada agrupada e repetição focada (seis de Finanças + casca), com inspeção ampla/compacta. O novo fluxo verifica três modos exclusivos, datas salvas, navegação só em intervalos existentes, saldo estável, fallback sem aviso, preferência padrão/fatos preservados e posição dos grupos. O seletor não repete o valor atual. Foi corrigida a interpretação de disponibilidade nula no contexto e uma tooltip cortada na janela menor. Sem repetir gestos da navbar ou provocar falhas nos bancos normais. Testes de lógica do período em `tests/application/finance-periods.test.mjs` e do dia vizinho em `tests/domain/dates.test.mjs`; não são geração de recorrência.

Revisão D34/D35 da F02a: passaram tipos/templates, lint, formatação e build web. Seis cenários Electron aprovados entre execução agrupada e repetição dos afetados: cinco de Finanças (incluindo o novo seletor) e casca. Mouse/teclado, expansão lateral, alinhamento sem deslocar conteúdo, saída por Escape/Tab/clique fora, troca de menu, imagens e movimento reduzido conferidos. Inspeção visual ampla/compacta. Corrigido fechamento prematuro durante a transição de foco e evitada a sobreposição dos gatilhos. Os 36 testes Node anteriores foram reutilizados; não houve mudança financeira/IPC/backend nesta revisão. Limites de 60 s nos dois fluxos longos acomodam a navegação conjunta, sem adicionar espera fixa no produto.

F02a: passaram tipos/templates, lint, formatação, build web/desktop e 36 testes Node (incluindo quatro da aplicação e duas novas verificações de migração). Dez cenários Electron foram aprovados entre rodada conjunta e repetição focada: Finanças (quatro), casca (um), Configurações (três) e armazenamento (dois). Cobertos contexto entre submenus/áreas, reabertura sem salvar mês histórico, câmbio/consolidação, cartão ausente, conta salva ausente, preferência de ciclo preservada, falha de gravação e armazenamento indisponível. Layout amplo/compacto e teclado conferidos. A asserção de opção nativa desabilitada foi corrigida sem alteração do produto. Os quatro testes de gestos da navbar não foram repetidos, pois sua mecânica não mudou. Perfis de teste isolados.

F01c.3: passaram tipos/templates, lint, formatação, build web e quatro cenários Electron (três da seção de dados + casca), com inspeção visual ampla/compacta. A restauração foi contada por auditoria no banco temporário para verificar que Cancelar/Escape não escrevem e cliques repetidos não executam novamente. Falha de escrita, verificação sem restauração implícita, foco, indisponibilidade por versão futura e prévia sem ponte foram conferidos. Os 30 testes Node anteriores foram reutilizados, sem mudanças no backend/domínio.

F01c.2: passaram tipos/templates, lint, formatação, build web/desktop, os 30 testes Node e três testes Electron (casca e dois de armazenamento). Os quatro testes de gestos da navbar não foram repetidos, pois a mecânica não mudou. Testes adicionais validam origem de outra janela, argumentos extras, token de restauração inválido, reabertura, preferências preservadas e falha de versão futura com dados intactos. Janela de teste usa armazenamento temporário; execução normal usa o diretório D26. A ação visual de restauração ainda será desenvolvida em F01c.3.

1. `npm start` abre o build com barra nativa Windows.
2. Percorrer as três áreas; atualizar a página pelo teste ou DevTools somente em desenvolvimento.
3. Abrir Configurações pela engrenagem; confirmar seção Integrações sem conexão ativa.
4. Abrir Ver logo e conferir as versões branca e preta do original fornecido.
5. Abrir Sobre esta versão, conferir ambiente/versão, fechar por Escape e percorrer controles com Tab. O primeiro Tab oferece pular ao conteúdo.
6. Redimensionar a janela; conferir legibilidade, foco e ausência de corte horizontal.
7. `npm run dev`: conferir que o Angular recarrega após uma alteração; fechar a janela deve encerrar o servidor iniciado pelo script. Alterações no desktop exigem reiniciar.
8. `npm run dev:web`: avaliar a prévia no navegador; o diálogo deve identificar esse ambiente corretamente, sem dizer que está conectado ao desktop.

## Limites

Para Finanças, o plano de cobertura vem da [especificação](FINANCAS_SPEC.md), seção 20, e está ligado na F01a a [IDs de requisitos](financas/REQUISITOS.md) e [cenários C01–C31](financas/CENARIOS.md). Inclui precisão/parcelas, transferências e faturas sem duplicação, mensal/anual, ausência versus zero, datas/ciclos, histórico/cobertura, déficit, conciliação/deduplicação e reabertura/seed idempotente. Cards também exigirão gestos distintos, teclado, retorno do foco com filtros preservados, restauração e inspeção visual em janelas diferentes. Essa cobertura é planejada, ainda não executada.

Na F01a foram conferidos vínculos documentais, IDs, referências entre cenários e aritmética dos exemplos; houve sondagem isolada da versão embarcada/API SQLite, sem abertura de banco. Isso não é teste de domínio ou persistência. A F01b proposta deve começar pelos cenários independentes das políticas em aberto, conforme a lista ao final do catálogo; não precisa implementar todos os cenários futuros para validar dinheiro/datas/fatos básicos.

A F00 foi uma inspeção estática e documental, sem alterações de código. Reutilizou os resultados anteriores da casca e conferiu integridade da especificação, links locais e diff; não repetiu instalação, build ou testes de execução e não validou cálculos financeiros.

Na F01b passaram tipos/templates, lint, formatação e os 22 testes Node (18 domínio + quatro segurança). A interface e a ponte não mudaram; build web, inspeção visual e Playwright não foram repetidos nesta rodada. Não há teste de persistência, seed/migração, relatórios, disponível diário, importação ou integração real. A validação no Node de desenvolvimento não comprova banco ou empacotamento no Electron; estes continuam para as etapas pertinentes. Não registrar aprovação visual como confirmada apenas porque um teste automatizado passou.
