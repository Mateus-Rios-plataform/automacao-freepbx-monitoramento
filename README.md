# Automação FreePBX: monitoramento com n8n e WhatsApp

[![CI](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/actions/workflows/ci.yml/badge.svg)](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/actions/workflows/ci.yml) [![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg)](LICENSE)

[English](README.en.md) | **Português**

Monitora, a cada 5 minutos, as centrais telefônicas **FreePBX/Asterisk** da sua empresa (sede e filiais) e **avisa no WhatsApp** quando algo falha: Asterisk parado, painel fora do ar, linha da operadora caída, disco cheio, IP da operadora bloqueado pelo Fail2Ban.

> **Só lê e avisa.** O monitor nunca altera uma central. Ele entra com um usuário **somente leitura**, restrito a um único script de consulta.

## Como funciona

```text
n8n (a cada 5 min) ──► painel web / ARI / SSH somente leitura ──► regras de alerta ──► WhatsApp (Evolution API)
```

- **n8n** agenda e executa o fluxo (gerado a partir de uma planilha das suas centrais).
- **Evolution API** envia as mensagens ao grupo de WhatsApp.
- Cada central recebe **um script** (`central/criar-usuario-monitor.sh`) que cria o usuário de leitura.

Mais detalhes em [docs/arquitetura.md](docs/arquitetura.md).

## O que ele avisa

| Mensagem | Quando |
|---|---|
| 🚨 **PROBLEMA NA TELEFONIA** | Problema por 2 verificações seguidas (Asterisk parado, painel fora do ar, tronco SIP/IAX caído, disco cheio, IP da operadora banido) |
| ✅ **Telefonia normalizada** | Tudo voltou ao normal |
| 🔄 **Asterisk reiniciou** | O tempo no ar da central voltou a zero |
| ⚠️ **ATENÇÃO (prevenção)** | Risco que ainda não derrubou nada (por exemplo, o Fail2Ban pode banir a operadora) |

## Requisitos

- Um **servidor Linux** dedicado ao monitor: **Debian 12** ou **Ubuntu 22.04/24.04**, 2 CPUs, 3 GB de RAM, 9 GB de disco, acesso à internet e à porta 22 de cada central (rede interna ou VPN).
- Centrais **FreePBX** (testado com FreePBX 15, `chan_sip` e PJSIP) e um **TI** em cada uma, com acesso de administrador.
- Um **número de WhatsApp dedicado** e um grupo para receber os avisos.

## Início rápido

No servidor de monitoramento (como usuário com `sudo`):

```bash
sudo apt-get update && sudo apt-get install -y git curl
git clone https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento.git
cd automacao-freepbx-monitoramento

cp centrais.exemplo.csv centrais.csv   # edite: uma linha por central (separador ;)
sudo ./monitor/instalar.sh             # instala Docker, n8n e Evolution API e importa o fluxo
```

O instalador imprime, para **cada central**, o comando que o TI da filial deve rodar (`central/criar-usuario-monitor.sh`). Depois:

```bash
sudo ./monitor/instalar.sh --verificar   # confere o acesso a cada central
sudo ./monitor/instalar.sh --whatsapp    # pareia o WhatsApp, escolhe o grupo e ATIVA o monitoramento
```

Para quem **não é técnico**, siga o passo a passo ilustrado: **[docs/index.md](docs/index.md)**.

## Documentação

| Página | Para quê |
|---|---|
| [Comece aqui](docs/index.md) | Visão geral e ordem de leitura |
| [O que você precisa ter](docs/precisa.md) | Lista de verificação antes de começar |
| [Acessar o servidor](docs/acessar-servidor.md) | WinSCP, terminal e como baixar o projeto |
| [Planilha de centrais](docs/planilha.md) | Como criar o `centrais.csv` |
| [Instalação](docs/instalacao.md) | Passo a passo completo |
| [Ligar o WhatsApp](docs/whatsapp.md) | Parear o número e escolher o grupo |
| [Painel do n8n](docs/painel-n8n.md) | Conta de administrador e execuções |
| [Guia do TI da filial](docs/ti-filial.md) | O que cada filial faz na sua central |
| [Como funciona](docs/arquitetura.md) · [Segurança](docs/seguranca.md) · [Solução de problemas](docs/solucao-de-problemas.md) · [FAQ](docs/faq.md) · [Glossário](docs/glossario.md) | Referência |

## Segurança

O acesso às centrais é somente leitura e restrito por chave SSH com comando forçado. Leia [docs/seguranca.md](docs/seguranca.md) antes de colocar em produção: o painel do n8n usa HTTP e precisa ficar atrás de firewall/VPN (ou use `sudo ./monitor/instalar.sh --painel-local` para ele escutar só em `127.0.0.1`). Para reportar uma vulnerabilidade, veja [SECURITY.md](SECURITY.md).

## Avisos e limitações

- **Sem garantias.** Software fornecido "como está" (licença MIT). Teste primeiro em uma central de homologação.
- A **Evolution API não é oficial** e usa o WhatsApp de forma não suportada pela Meta: o número pode ser bloqueado. Use um número dedicado.
- Validado em laboratório com **FreePBX 15** e testes automáticos. Não foi validado em todas as versões de FreePBX/Asterisk.
- O instalador **não** deve ser executado no próprio servidor FreePBX.
- Este projeto não é afiliado ao FreePBX, à Sangoma, ao n8n, à Evolution API nem ao WhatsApp/Meta.

## Testes

```bash
node fluxos/testes/avaliar.test.js
```

Sem dependências (somente Node.js 18+). Os testes cobrem as regras de alerta, a leitura da planilha e a garantia de que a automação só lê.

## Contribuir

Contribuições são bem-vindas: veja [CONTRIBUTING.md](CONTRIBUTING.md) e o [Código de Conduta](CODE_OF_CONDUCT.md). Histórico de versões em [CHANGELOG.md](CHANGELOG.md).

## Licença

[MIT](LICENSE).
