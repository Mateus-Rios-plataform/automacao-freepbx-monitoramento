---
title: "Como o monitor funciona (arquitetura)"
---

# Como o monitor funciona (arquitetura)

[⬅ Início](index.md)

Esta página é para quem quer entender o que roda onde. Você **não** precisa dela para instalar.

## Visão geral

```text
   Servidor de monitoramento (Debian/Ubuntu, Docker)
  ┌─────────────────────────────────────────────────┐
  │  n8n  ──(a cada 5 min)──►  fluxo "FreePBX -      │
  │                             Monitor de telefonia"│
  │   │                                              │
  │   ├─► HTTP: painel web de cada central           │
  │   ├─► HTTP: ARI do Asterisk (opcional)           │
  │   └─► SSH (somente leitura) ──► check-monitor    │
  │                                                  │
  │  nó "Avaliar" decide se há problema              │
  │   └─► Evolution API ──► grupo de WhatsApp        │
  └─────────────────────────────────────────────────┘
          │ SSH (porta 22, chave restrita)
          ▼
   Central FreePBX (uma por linha da planilha)
   usuário `monitor-n8n`, só roda o script `check-monitor`
```

## As peças

| Peça | Onde roda | O que faz |
|---|---|---|
| **n8n** | Servidor de monitoramento (Docker, porta 5678) | Agenda a verificação e executa o fluxo |
| **Evolution API** | Servidor de monitoramento (Docker, só em `127.0.0.1:8080`) | Envia as mensagens pelo WhatsApp |
| **PostgreSQL** | Servidor de monitoramento (Docker) | Banco de dados da Evolution API |
| **Fluxo do n8n** | Dentro do n8n | Gerado do `centrais.csv` por `fluxos/deploy.js` |
| **`check-monitor`** | Em cada central FreePBX | Script **somente de consulta**, instalado pelo `criar-usuario-monitor.sh` |

## O que é verificado em cada central

1. **Asterisk respondendo na ARI** (porta 8088), quando a coluna `ari` da planilha é `sim`.
2. **Painel web do FreePBX** (HTTPS), quando a coluna `web` é `sim`.
3. **Por dentro, via SSH** (um único relatório, `check-monitor`): se o Asterisk está rodando, tempo no ar (para detectar reinício), canais ativos, troncos IAX, registros SIP/PJSIP em operadoras, uso de disco, carga, jails e IPs banidos do Fail2Ban e tentativas de "Friendly Scanner".

## Quando ele avisa

| Mensagem | Quando |
|---|---|
| 🚨 **PROBLEMA NA TELEFONIA** | Há problema por **2 verificações seguidas** (ajustável). Repete como lembrete a cada 30 minutos enquanto persistir, ou na hora se o problema mudar |
| ✅ **Telefonia normalizada** | Tudo voltou ao normal depois de um 🚨 |
| 🔄 **Asterisk reiniciou** | O tempo no ar da central voltou a zero |
| ⚠️ **ATENÇÃO (prevenção)** | Um **risco** que ainda não derrubou nada (por exemplo, IP da operadora que o Fail2Ban pode banir). Aparece só quando muda e, no máximo, 1 vez por dia. **Não** dispara o alarme |

Os limites padrão (2 verificações, 30 minutos, 90% de disco, 24 h) ficam no nó **Config** do fluxo, no painel do n8n. Veja [Perguntas frequentes](faq.md).

## A regra de ouro: só lê e avisa

O projeto foi desenhado para **nunca alterar** uma central:

- o usuário `monitor-n8n` **não tem senha** e só entra por chave, com `no-pty`, sem redirecionamento de portas e **só a partir do IP do monitor**;
- a chave dele executa **apenas** o script `check-monitor` (comando forçado);
- o `check-monitor` só usa comandos de consulta do Asterisk (`show`), `fail2ban-client status/get` e `iptables -S/-nL`;
- o fluxo gerado tem **um** envio para o mundo externo: a mensagem do WhatsApp.

Os testes automáticos (`node fluxos/testes/avaliar.test.js`) conferem essas garantias: se alguém acrescentar um comando que altera o servidor, os testes falham. Detalhes de segurança em [Segurança](seguranca.md).

## Limitações conhecidas

- Testado com **FreePBX 15/Asterisk com `chan_sip`** e com PJSIP, em laboratório. Não há garantia em outras versões.
- O instalador funciona em **Debian 12 e Ubuntu 22.04/24.04**. Não instale no próprio servidor FreePBX (CentOS 7 não é suportado).
- A **Evolution API** usa o WhatsApp de forma **não oficial**: há risco de o número ser bloqueado pelo WhatsApp. Use um número dedicado.
- O painel do n8n fica em **HTTP** na porta 5678. Proteja com firewall/VPN ou um proxy HTTPS (veja [Segurança](seguranca.md)).
