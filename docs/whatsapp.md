---
title: "Ligar o WhatsApp"
---

# Ligar o WhatsApp

[⬅ Início](index.md) | Anterior: [Instalação passo a passo](instalacao.md) | Próxima: [Conhecer o painel do n8n](painel-n8n.md)

Esta é a hora em que o monitor é **ligado** de verdade: ele "entra" no WhatsApp de um número dedicado ao monitor (como se fosse mais um aparelho conectado) para poder mandar os alertas ao grupo dos chefes. Palavras novas estão no [Glossário](glossario.md).

| 📋 Você vai precisar | Onde conseguir |
|---|---|
| ☐ A instalação do Passo 5 **concluída** | Página [Instalação](instalacao.md) |
| ☐ O **celular do número de WhatsApp dedicado ao monitor**, **em mãos**, com o WhatsApp aberto | Com a equipe central |
| ☐ O **número** desse WhatsApp: código do país + DDD + número, só dígitos (no Brasil: 55 + DDD + número, exemplo `5511999999999`) | O número do chip |
| ☐ Um **grupo de WhatsApp só com os chefes** (você vai criar abaixo) | Passo 1 desta página |
| ☐ Estar com o **terminal aberto**, dentro da pasta `automacao-freepbx-monitoramento` | Página [Acessar o servidor](acessar-servidor.md) |
| ☐ **10 minutos** sem interrupção | Você |

**Atenção:** este tipo de ligação não é oficial do WhatsApp, e o número pode ser bloqueado. Use um chip **só para os alertas** (não use o número principal da empresa) e tenha outra forma de avisar os chefes (e-mail ou ligação).

## Passo 1. Criar o grupo dos chefes

Faça isso **no celular desse número**, para o número já fazer parte do grupo.

1. Abra o **WhatsApp**.
2. **No Android:** toque nos **três pontinhos** (canto de cima) e em **Novo grupo**. **No iPhone:** na aba **Conversas**, toque em **Novo grupo**.
3. Escolha **somente os chefes** que devem receber os alertas e toque na **seta** (Avançar).
4. Dê um nome ao grupo, por exemplo **Alertas telefonia**, e toque no **✔** (Criar).

**✅ Como saber que deu certo:** o grupo aparece na lista de conversas.

**⚠️ Importante:** só adicione ao grupo quem pode ver os alertas: eles trazem o nome das filiais, os IPs das centrais e os nomes das linhas da operadora.

## Passo 2. Rodar o comando

```bash
sudo ./monitor/instalar.sh --whatsapp
```

**O que ele faz:** liga o WhatsApp ao monitor, pede para você escolher o grupo e **liga o monitoramento**.

1. Pede a **senha** do `sudo` (não aparece nada ao digitar).
2. Depois pergunta: *"Numero do WhatsApp que enviara os alertas (so digitos, com 55 e DDD, ex.: 5511999999999):"*. **Digite o número** (só números, com 55 e o DDD) e aperte Enter.

**✅ Como saber que deu certo:** aparece o texto "Pareamento do WhatsApp" e, logo depois, uma linha como esta:

```
      CODIGO:  ABCD-1234   (14:30:05)
```

(o código de verdade é diferente do exemplo.)

## Passo 3. Digitar o código no celular

**Seja rápido:** o código vale **menos de 1 minuto**. Se vencer, o instalador **gera outro sozinho** (a cada uns 45 segundos); é só olhar o novo código na tela e tentar de novo.

1. No celular desse número, abra o **WhatsApp**.
2. **No Android:** toque nos **três pontinhos** e em **Aparelhos conectados**. **No iPhone:** toque em **Configurações** (canto de baixo) e em **Aparelhos conectados**.
3. Toque em **Conectar um aparelho**. O celular pode pedir sua digital, rosto ou senha: confirme.
4. Vai abrir a câmera para ler um QR. **Não use a câmera.** Procure, na parte de baixo da tela, a opção **Conectar com número de telefone** e toque nela.
5. O celular mostra uma tela para **digitar o código**. Digite o código que está no terminal (as letras e números do `CODIGO`).

**✅ Como saber que deu certo:** no terminal, depois de alguns segundos, aparece `ok: WhatsApp conectado` e a lista de grupos. No celular, o monitor aparece em **Aparelhos conectados**.

**⚠️ Se der errado:**

| O que acontece | O que fazer |
|---|---|
| O celular diz *"código incorreto"* | O código venceu. Olhe o **código novo** no terminal e digite de novo, mais rápido |
| Não acho "Conectar com número de telefone" | Nas versões mais novas fica embaixo da tela do QR. O nome pode variar um pouco: procure algo como "vincular com número de telefone" |
| Passou muito tempo e apareceu `ERRO: WhatsApp nao conectou` | Rode o comando do Passo 2 de novo |

## Passo 4. Escolher o grupo

Depois de conectar, o terminal mostra a lista dos grupos do número, **numerada**, e pergunta *"Numero do grupo de alertas:"*.

1. Procure o grupo **Alertas telefonia** (ou o nome que você deu) e **digite o número dele** na lista. Aperte Enter.

**✅ Como saber que deu certo:** aparece `ok: grupo escolhido: Alertas telefonia`. Em seguida aparecem `== Importando credenciais e fluxo no n8n` e `ok: fluxo ATIVO (verifica a cada 5 minutos)`.

**⚠️ Se o grupo não aparece:**

- Se aparecer *"nenhum grupo encontrado ainda"*, o número ainda não está em nenhum grupo. Crie o grupo (Passo 1), espere um minuto e aperte **Enter** no terminal para procurar de novo.

## Passo 5. A mensagem de teste

O instalador manda sozinho uma mensagem ao grupo.

**✅ Como saber que deu certo:** no terminal aparece `ok: mensagem de teste enviada` e, no grupo do WhatsApp, chega: **"✅ Monitor de telefonia instalado"**, com o nome do servidor.

**⚠️ Se a mensagem não chegar:** aguarde 1 minuto. Se não chegar, rode de novo o comando do Passo 2 e escolha o grupo outra vez. Se ainda assim não chegar, mande ao responsável pelo monitor as últimas linhas do terminal.

**Pronto: o monitor está ligado.** Agora ele verifica as centrais a cada 5 minutos.

## O que vai chegar no grupo

| Símbolo | Quando chega | O que fazer |
|---|---|---|
| 🚨 **PROBLEMA NA TELEFONIA** | Há um problema que **continuou depois de 2 verificações seguidas** (uns 10 minutos). Repete a cada 30 minutos se não mudar | Leia as linhas do aviso e avise o TI da filial citada |
| ✅ **Telefonia normalizada** | O problema acabou (só vem depois de um 🚨) | Nada: está resolvido |
| 🔄 **Asterisk reiniciou** | A central reiniciou | Veja se foi planejado |
| ⚠️ **ATENÇÃO (prevenção)** | Um **risco**, não um problema agora. No máximo 1 vez por dia | Avise o TI para corrigir |

O que um 🚨 costuma dizer, e a primeira coisa a fazer (quem faz é o TI da filial, **com autorização do responsável**):

| O aviso diz | Em português simples | Primeira conferência |
|---|---|---|
| *Processo do Asterisk parado* | A central telefônica não está ligada | O TI olha se o Asterisk está no ar e, com autorização, liga de novo |
| *Painel do FreePBX fora do ar* | A página de controle da central não abre | O TI abre o painel no navegador e confere o serviço web |
| *Tronco SIP ... UNREACHABLE* (ou IAX) | A linha da operadora (ou entre centrais) não responde | O TI confere a rede e a operadora |
| *IP ... BANIDO no firewall local* | A **própria central** bloqueou a operadora por engano (Fail2Ban). **Não é queda da operadora** | O TI confere e, se confirmar, libera à mão com o comando que vem no aviso, e depois corrige o `ignoreip` |
| *Disco ... com 9X% de uso* | O disco da central está quase cheio | O TI apaga arquivos antigos (por exemplo, backups) |
| ⚠️ *ignoreip ... não inclui ...* | A lista de "endereços que nunca podem ser bloqueados" está incompleta | O TI inclui o IP da operadora, separado por espaço |
| ⚠️ *Friendly Scanner ...* | A operadora está mandando chamadas para números que a central não conhece | O TI confirma com a operadora e **não cria rota sem confirmar** |

**Importante:** o monitor **só avisa**. Qualquer correção na central é feita pelo TI, com autorização.

## Mudar o grupo ou o número depois

Rode de novo o comando do Passo 2 e escolha outro grupo (ou outro número).

## Desligar o WhatsApp do monitor

No celular: **WhatsApp**, **Aparelhos conectados**, toque no aparelho do monitor e em **Desconectar**.

## Pronto?

- ☐ A mensagem "✅ Monitor de telefonia instalado" chegou no grupo.
- ☐ Só os chefes estão no grupo.
- ☐ Sei o que significa cada símbolo (🚨, ✅, 🔄, ⚠️).

Tudo certo? Siga para [Conhecer o painel do n8n](painel-n8n.md).

