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
- `test`: compila desktop/domínio e executa quatro testes de segurança e 18 testes de domínio. `test:domain` compila e executa somente os 18 testes de domínio, sem abrir Electron.
- `tests/domain/`: IDs FIN e cenários C nos nomes dos testes. Cobre centavos/limites/ausência/moedas, taxas exatas e arredondamento, calendário/bissextos/quatro fusos, caixa separado de cartão e previsão, parcelas observadas/centavos/ano, transferências, pagamento integral, Sem categoria, IDs de origem e instantes de coleta. Nenhuma regra de ciclo é inferida desses testes.
- `test:desktop`: build completo e teste Playwright no Electron real; protocolo local, versão pela ponte, ausência de Node no renderer, sandbox no Windows, navegação/recarga, Configurações/Integrações, propostas SVG, diálogo PrimeNG, Escape, janela menor e ausência de erros capturados no console.
- O mesmo teste também confere o botão abaixo de Configurações, recolhimento em 72 px, ganho de largura do conteúdo, navegação com ícones e expansão por teclado. Não é necessário repetir testes de domínio/segurança isolados por uma mudança apenas de navegação visual.
- `navigation.spec.ts` usa mouse real para verificar encaixe nas quatro bordas, prévia sem texto, recolhimento pelo botão em cada orientação, cancelamento, menu por teclado e controles em janela menor. Confere também que a borda não redimensiona e não há separador ajustável, conforme D20.

O suporte de Electron no Playwright é [experimental](https://playwright.dev/docs/api/class-electron). Não usa um navegador externo instalado: automatiza o executável Electron do projeto. Os testes usam perfis temporários exclusivos e validam o caminho antes de removê-los. Para verificar gestos e transições reais no Windows, mostram temporariamente a janela; o modo de teste também evita a redução de frames ao fundo. A execução normal preserva o comportamento padrão do Electron. Capturas e traces ficam em `FinDesk-Project/test-results/`, ignorados pelo Git.

## Verificação manual

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
