---
title: "O que tem no repositório"
---

# O que tem no repositório

[⬅ Início](index.md)

Esta página explica o que existe em cada pasta, para você saber **o que mexer** e **o que não mexer**.

## Mapa das pastas

| Pasta ou arquivo | Para quem | Para quê |
|---|---|---|
| `README.md` | Todos | Resumo do projeto e início rápido |
| `docs/` | Todos | Esta documentação (passo a passo para quem não é técnico) |
| `monitor/instalar.sh` | Equipe central | Instalador do servidor de monitoramento (Docker, n8n, Evolution API e o fluxo pronto) |
| `central/criar-usuario-monitor.sh` | TI de cada filial | Cria, na central FreePBX, um usuário **somente leitura** para o monitor |
| `central/remover-usuario-monitor.sh` | TI de cada filial | Desfaz tudo o que o script anterior fez |
| `fluxos/deploy.js` | Equipe central (usado pelo instalador) | Gera o fluxo do n8n a partir da planilha `centrais.csv` |
| `fluxos/avaliar.js` | Quem quiser entender as regras | A lógica que decide **quando** avisar e **o que** escrever |
| `fluxos/gerar-credenciais.js` | Usado pelo instalador | Gera as credenciais SSH do n8n para cada central |
| `fluxos/testes/` | Quem for alterar o código | Testes automáticos |
| `centrais-modelo.xlsx` | Equipe central | Planilha modelo para o Excel (com aba "Como preencher") |
| `centrais-modelo.csv` | Equipe central | O mesmo modelo, já em CSV |
| `centrais.exemplo.csv` | Equipe central | Exemplo comentado do formato do `centrais.csv` |
| `tools/` | Quem mantém o projeto | Ferramentas de verificação da documentação |

## O que NÃO vai para o GitHub

O arquivo `.gitignore` impede que você envie, sem querer, dados da sua empresa:

- `centrais.csv` (a **sua** planilha, com IPs reais);
- `.env`, chaves SSH (`*_ed25519`), `config.json`, `credenciais.json`;
- o fluxo gerado (`fluxos/freepbx-monitor.json`) e a pasta `import/`.

Se você fizer um *fork* para a sua empresa, **mantenha o repositório privado** ou nunca adicione esses arquivos.

## Onde o instalador grava as coisas no servidor

O instalador usa a pasta `/opt/monitor-telefonia` no servidor. Ali ficam o `docker-compose.yml`, o arquivo `.env` (senhas geradas) e as chaves SSH, todos com permissão restrita (somente o administrador lê). **Não copie essa pasta para lugares compartilhados.**

## Versões e atualizações

- Veja o [CHANGELOG](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/CHANGELOG.md) para o que mudou em cada versão.
- Para atualizar o projeto no servidor: `cd automacao-freepbx-monitoramento && git pull`. Depois, se a lista de filiais mudou, rode `sudo ./monitor/instalar.sh --atualizar`.
