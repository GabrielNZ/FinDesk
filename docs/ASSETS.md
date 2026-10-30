# Assets dos seletores de Finanças

Obtidos em 29/10/2026 para D34/D35, guardados localmente e carregados pela origem do aplicativo. Nenhuma consulta a sites de logos ou bancos acontece durante o uso. A logo original do FinDesk não foi alterada.

## Instituições

- **Nubank:** [favicon do site Nu](https://nu.com/favicon.ico), origem conferida na [sala de imprensa oficial](https://nu.com/pt/sala-de-imprensa). Arquivo original em `FinDesk-Project/public/institutions/nubank.ico`.
- **Nomad:** [ícone de 512 px](https://cdn.prod.website-files.com/63a1dad0b4ace196f1bf8f84/6a691f29dbcb7cf14b8d410c_nomad-global.jpg), indicado no HTML da [página oficial](https://www.nomadglobal.com/). Arquivo original em `FinDesk-Project/public/institutions/nomad.jpg`.

Marcas pertencem aos respectivos proprietários. Não foi identificada licença aberta para esses favicons; o FinDesk os usa para identificar instituições na demonstração pessoal. Isso não constitui avaliação de direitos para distribuição futura. A conta auxiliar usa carteira e Todas as contas usa ícone de instituições; nomes continuam acessíveis.

## Bandeiras

[flag-icons](https://github.com/lipis/flag-icons), de Panayiotis Lipiridis, sob [licença MIT](https://github.com/lipis/flag-icons/blob/main/LICENSE). Somente os SVGs [Brasil](https://raw.githubusercontent.com/lipis/flag-icons/main/flags/1x1/br.svg) e [Estados Unidos](https://raw.githubusercontent.com/lipis/flag-icons/main/flags/1x1/us.svg) foram copiados, sem pacote npm ou CSS externo. Licença integral preservada em `FinDesk-Project/public/flags/LICENSE`. Original usa globo, pois é um modo de exibição, sem país próprio.

## Integridade dos originais recebidos

| Arquivo    | SHA-256                                                            |
| ---------- | ------------------------------------------------------------------ |
| nubank.ico | `7F3F2DCA283160AE4B9D21E27E9CE1B25F5E569D0BA32DB0CCA5F00AEBE88A6B` |
| nomad.jpg  | `B88530D80C3CEEEB82BDEB4B4B6F5470B1883FB4DBD74053671BB085E82B6473` |
| br.svg     | `575AB789B4DEBBCF4BA10561FD9C8A16CA037B3384914E686B4BC597BB0BC5E2` |
| us.svg     | `633325CBE879D698584238B9955D850B4A34E7C5DCFB7622BAD50CEC119214E5` |

A apresentação circular é feita em CSS, preservando os arquivos. Os SVGs de bandeiras não contêm scripts nem referências externas. Falha de imagem usa um ícone genérico; a opção conserva nome e operação.

O seletor usa o [Popover API documentado](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using), com layout próprio transparente, opções em círculos e navegação por teclado. Compatibilidade efetiva e estados são verificados no Electron do projeto; nenhuma dependência foi adicionada.
