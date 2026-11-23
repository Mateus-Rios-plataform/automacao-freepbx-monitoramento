---
title: "Perguntas frequentes"
---

# Perguntas frequentes

[⬅ Início](index.md)

## Preciso saber programar?

Não. Toda a instalação é copiar e colar comandos e preencher uma planilha. As páginas explicam cada passo.

## Que centrais telefônicas funcionam?

**FreePBX/Asterisk** (testado com FreePBX 15, `chan_sip` e PJSIP). Outras centrais não são suportadas. Veja [Como o monitor funciona](arquitetura.md).

## Posso usar para só uma central (sem filiais)?

Sim. A planilha pode ter uma única linha (a sede).

## O monitor muda alguma coisa na minha central?

Não. Ele só **lê** (usuário `monitor-n8n` somente leitura, comando forçado). Veja [Segurança](seguranca.md). O aviso pode sugerir um comando de correção, mas **só como texto**: ele nunca executa.

## Quanto custa?

O projeto é gratuito (licença MIT). Você precisa de um servidor Linux pequeno (2 processadores, 3 GB de memória, 9 GB de disco) e de um número de WhatsApp dedicado.

## Posso usar Telegram, e-mail ou Slack em vez do WhatsApp?

Hoje, só **WhatsApp** (pela Evolution API). O envio é feito por um único nó do fluxo ("Avisar no WhatsApp"); quem quiser outro canal pode trocar esse nó no n8n ou contribuir com o projeto (veja [CONTRIBUTING.md](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/CONTRIBUTING.md)).

## Meu número de WhatsApp pode ser bloqueado?

Pode. A Evolution API não é oficial. Use um número **dedicado** ao monitor, que não seja o principal da empresa.

## Como mudo os limites de alerta (2 verificações, 30 minutos, 90% de disco)?

1. Abra o painel do n8n, depois o fluxo **FreePBX - Monitor de telefonia**.
2. Clique no nó **Config**.
3. Edite os valores: `falhas_para_alertar` (padrão 2), `lembrete_min` (30), `disco_max` (90), `lembrete_prevencao_h` (24) e `scanner_min` (3).
4. Salve e publique.

**Atenção:** o comando `sudo ./monitor/instalar.sh --atualizar` recria o fluxo com os valores padrão. Depois de rodá-lo, confira o nó **Config** e ajuste de novo, se for o caso.

## Posso mudar o intervalo de 5 minutos?

Sim, no nó de agendamento do fluxo (primeiro nó, "A cada 5 minutos"). Intervalos muito curtos aumentam a carga nas centrais e o risco de alertas por oscilações rápidas.

## Como atualizo o projeto?

No servidor: `cd automacao-freepbx-monitoramento && git pull`. Depois rode `sudo ./monitor/instalar.sh --atualizar` se quiser aplicar regras novas do fluxo. Veja o [CHANGELOG](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/CHANGELOG.md).

## Como desinstalo?

Veja "Desinstalar" na página [Instalação](instalacao.md). As centrais **não** são alteradas pelo monitor; cada TI roda `remover-usuario-monitor.sh` para remover o usuário de leitura.

## Posso colocar a minha planilha no GitHub?

**Não.** Ela tem IPs reais da sua empresa. O `.gitignore` já bloqueia `centrais.csv`. Se você fizer um *fork*, mantenha-o privado.

## Como contribuo ou reporto um erro?

Veja [CONTRIBUTING.md](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/CONTRIBUTING.md). Falhas de **segurança** vão pelo canal privado descrito em [SECURITY.md](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/SECURITY.md).
