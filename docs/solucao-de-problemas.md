---
title: "Solução de problemas"
---

# Solução de problemas

[⬅ Início](index.md)

Procure o que está acontecendo. Em cada caso, comece pelo teste mais simples. Se precisar de ajuda, abra uma *issue* no GitHub e **cole a mensagem de erro** (apague antes IPs, chaves e IDs de grupo).

## Antes de tudo: os programas estão ligados?

No servidor de monitoramento:

```bash
sudo docker compose -f /opt/monitor-telefonia/docker-compose.yml ps
```

**O que ele faz:** lista os 3 programas do monitor (`n8n`, `evolution-api` e `evolution-postgres`).

**✅ Como saber que deu certo:** os três aparecem com **Up**.

Para ver as últimas linhas do registro de um deles (troque `n8n` por `evolution-api` se for o caso):

```bash
sudo docker compose -f /opt/monitor-telefonia/docker-compose.yml logs --tail 50 n8n
```

## Sintomas

### A instalação parou com `ERRO:`

Veja a tabela de mensagens na página [Instalação](instalacao.md), Passo 5. As mais comuns: faltou o `sudo`; a `centrais.csv` não está na pasta do projeto; a planilha está separada por vírgula (precisa ser ponto e vírgula); o servidor não tem internet; as portas 5678 ou 8080 já estão em uso.

### O `--verificar` mostra `[FALHA]` em uma central

Veja a tabela do Passo 7 da página [Instalação](instalacao.md). Em geral: o TI da filial ainda não rodou o script, usou outro IP do monitor, ou há firewall/VPN bloqueando a porta 22.

### Nenhum alerta chega no WhatsApp

1. O monitor está **ligado**? No painel do n8n o fluxo deve estar **Published** (veja [Painel do n8n](painel-n8n.md)).
2. Rodou `sudo ./monitor/instalar.sh --whatsapp` e a **mensagem de teste** chegou? Se não, refaça a página [Ligar o WhatsApp](whatsapp.md).
3. O aparelho continua conectado? Abra o WhatsApp no celular, **Aparelhos conectados**. Se o aparelho saiu da lista, refaça o pareamento.
4. A aba **Executions** do n8n mostra execuções a cada 5 minutos? Se mostrar erro no último nó, o problema é o envio (Evolution API): veja os logs acima.
5. Lembre que o alerta 🚨 só sai depois de **2 verificações seguidas** com problema (cerca de 10 minutos).

### Chegam alertas demais (ou repetidos)

- O 🚨 se repete como **lembrete** a cada 30 minutos enquanto o problema persistir. Isso é esperado.
- O ⚠️ de **prevenção** aparece no máximo 1 vez por dia por central.
- Se uma central sempre dispara por algo que você considera normal (por exemplo, disco acima de 90%), ajuste o limite no nó **Config** (veja [Perguntas frequentes](faq.md)).

### Aparece "Sem acesso SSH: troncos e disco não foram checados"

O monitor alcançou o painel/ARI da central, mas não conseguiu entrar por SSH. Rode `sudo ./monitor/instalar.sh --verificar`: ele diz o motivo. Se a central foi refeita, o TI da filial precisa rodar o `criar-usuario-monitor.sh` de novo.

### O painel do n8n não abre (`http://IP-DO-SERVIDOR:5678`)

- Confira se o `n8n` está **Up** (comando acima).
- Confira se o firewall do servidor ou da rede permite a porta 5678 **para o seu computador**.
- Veja o registro do n8n (comando acima).

### Troquei IPs, adicionei ou removi uma filial

Edite o `centrais.csv`, copie para o servidor e rode `sudo ./monitor/instalar.sh --atualizar` (veja "Depois: mudar a lista de filiais" na página [Instalação](instalacao.md)).

## Ainda não resolveu?

Abra uma *issue* no GitHub com: **em qual página e passo** você parou, a **mensagem** que apareceu e a versão do projeto (`git log -1 --format=%h`). **Não cole** senhas, chaves nem a sua planilha com IPs reais.
