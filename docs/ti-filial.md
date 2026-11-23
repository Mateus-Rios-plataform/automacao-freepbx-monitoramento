---
title: "Guia do TI da filial: preparar a central para o monitor"
---

# Guia do TI da filial: preparar a central para o monitor

[⬅ Início](index.md)

A equipe central vai instalar um **monitor** que olha a central telefônica da sua filial. Quando algo falha, ele avisa no WhatsApp dos chefes. Por exemplo: central parada, linha da operadora fora do ar, disco cheio ou IP da operadora bloqueado por engano. Para isso ele precisa de um **usuário que só lê** na sua central. Este guia mostra como criar esse usuário, em uns **10 minutos**, e como desfazer quando quiser.

Este guia não ensina a instalar nem a configurar o FreePBX: ele já está funcionando na sua filial. Palavras novas estão no [Glossário](glossario.md).

## O que o monitor faz e o que NÃO faz

| O monitor FAZ | O monitor NÃO FAZ |
|---|---|
| Só **lê** informações. Por exemplo: se o Asterisk está no ar, o estado das linhas da operadora, o disco e os IPs bloqueados | **Não altera nada**: não reinicia serviço, não muda configuração, não mexe em firewall nem em ramais |
| Entra pelo usuário `monitor-n8n`, **sem senha**, só com uma chave | Não consegue abrir uma janela de comandos livre na sua central |
| Só funciona a partir do **IP do servidor do monitor** | Não aceita login de nenhum outro lugar |
| Quando sugere uma correção (por exemplo, desbloquear um IP), mostra **só como texto** | Nunca executa a correção. Quem executa é você, se concordar |

## 📋 Você vai precisar

| Item | Onde conseguir |
|---|---|
| ☐ **Acesso de administrador** à central (usuário **root** e senha do acesso remoto "SSH", porta 22) | Você, como TI da filial |
| ☐ A **autorização** do responsável pela filial para fazer isto | Com a direção |
| ☐ O **comando pronto** da sua filial, que a equipe central enviou (começa com `./criar-usuario-monitor.sh`). Nele já estão o **IP do monitor** e a **chave pública** | Mensagem da equipe central |
| ☐ Os dois **scripts**: `criar-usuario-monitor.sh` e `remover-usuario-monitor.sh` | No [repositório no GitHub](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento), pasta `central/` (abra cada arquivo e clique em **Download raw file**), ou enviados pela equipe central |
| ☐ O programa **WinSCP** e um terminal (PowerShell ou PuTTY) | Veja [Como acessar o servidor](acessar-servidor.md) (é igual, só que o destino é a **sua central**) |
| ☐ **10 minutos** | Você |

## Parte 1. Preencher a ficha (e devolver à equipe central)

Antes ou depois do script, preencha esta ficha e mande de volta. Ela serve para montar a lista de filiais do monitor.

| Campo | O seu valor | Como descobrir |
|---|---|---|
| **Nome da filial** |   | Como deve aparecer no alerta |
| **Chave curta** |   | Um apelido: só letras minúsculas e números, sem espaço (exemplo: `filial01`). A equipe central pode sugerir |
| **IP da central** |   | O endereço que você digita no navegador para abrir o painel do FreePBX (exemplo: `10.0.1.10`) |
| **Porta do SSH** |   | Quase sempre `22` |
| **Nome do tronco** |   | Veja "Como achar o nome do tronco e o IP da operadora", logo abaixo |
| **IP da operadora** |   | Mesma seção |
| **A ARI está ligada?** |   | Quase sempre **não** |

### Como achar o nome do tronco e o IP da operadora (pelo painel do FreePBX)

O **tronco** é a "linha" que liga a sua central à operadora. Os nomes dos menus podem variar um pouco conforme a versão do FreePBX; se a sua tela for diferente, use a alternativa por comando logo abaixo.

1. No navegador, abra o painel do FreePBX da sua filial e entre como administrador.
2. No menu, clique em **Connectivity** (Conectividade) e depois em **Trunks** (Troncos).
3. A lista mostra os troncos. A coluna **Trunk Name** é o **nome do tronco** (exemplo: `SIP-OPERADORA`). Anote o nome do tronco da **operadora** (não os de ramais).
4. Clique no tronco para abrir. Procure a aba **sip Settings** (ou **pjsip Settings**) e, nela, a parte **Outgoing** (Saída). No campo **PEER Details** (ou **SIP Server**) aparece uma linha `host=203.0.113.10`: esse número é o **IP da operadora**. Anote.
5. **Não clique em Submit** (Enviar) nem mude nada: é só para **olhar**.

**✅ Como saber que deu certo:** você tem anotado o **nome do tronco** (letras e números, como `SIP-OPERADORA`) e o **IP da operadora** (quatro números separados por pontos).

### Alternativa por comando (se a tela for diferente)

Com o terminal aberto na central (como mostra a Parte 2):

```bash
asterisk -rx "sip show peers"
```

**O que ele faz:** mostra a lista das "linhas" da central. **Só lê, não muda nada.**

**✅ Como saber que deu certo:** aparece uma tabela. O **nome do tronco** é a primeira coluna, **antes da barra** (em `SIP-OPERADORA/1234567`, o nome é `SIP-OPERADORA`). O **IP da operadora** está na coluna seguinte. Ramais (números como 7010) não são troncos: ignore.

## Parte 2. Criar o usuário de leitura na central

### Passo 1. Copiar os scripts para a central (WinSCP)

1. Abra o **WinSCP** e entre na **sua central** (como na página [Como acessar o servidor](acessar-servidor.md), mas usando o **IP da central**, a porta **22** e o usuário **root**).
2. Na parte da **esquerda**, ache os dois scripts que baixou (na pasta Downloads). **Arraste os dois** para a parte da **direita** (a pasta inicial, `/root`). Clique em **Copy**.

**✅ Como saber que deu certo:** os dois arquivos aparecem na parte da direita.

### Passo 2. Abrir o terminal na central

No **PowerShell**, digite o comando abaixo (troque o IP pelo da sua central), aperte Enter e digite a senha (não aparece nada ao digitar):

```bash
ssh root@10.0.1.10
```

**O que ele faz:** entra na sua central, como se você estivesse na frente dela.

**✅ Como saber que deu certo:** aparece o prompt, parecido com `[root@central ~]#`. Detalhes na página [Como acessar o servidor](acessar-servidor.md).

### Passo 3. Dar permissão de execução aos scripts

```bash
chmod +x criar-usuario-monitor.sh remover-usuario-monitor.sh
```

**O que ele faz:** avisa o sistema de que esses dois arquivos são programas que podem ser executados.

**✅ Como saber que deu certo:** não aparece nada e o prompt volta.

### Passo 4. Ver o que o monitor poderá fazer (só olhar)

```bash
./criar-usuario-monitor.sh --ver-check
```

**O que ele faz:** mostra o texto do script de leitura que o monitor poderá executar. **Não instala nada.** Você pode ler para ter certeza de que são só consultas.

**✅ Como saber que deu certo:** aparece um texto com comandos como `asterisk -rx 'core show uptime seconds'` e termina em `echo '##END'`.

### Passo 5. Criar o usuário

Cole o **comando completo que a equipe central enviou** (com o IP do monitor e a chave). Ele tem este formato (os valores são só um exemplo):

```bash
./criar-usuario-monitor.sh --ip-monitor 10.0.0.5 --chave "ssh-ed25519 AAAA... monitor-n8n@servidor"
```

**O que ele faz:** cria o usuário `monitor-n8n`, sem senha. Instala o script de leitura, que só o root pode alterar. Libera no sudo **apenas** esse script. Grava a chave do monitor, que só funciona a partir do IP do monitor.

**✅ Como saber que deu certo:** o script mostra os passos de `[1/5]` a `[5/5]` e, no quinto, a frase **`TESTE OK: o usuario consegue rodar o check-monitor via sudo`**. No fim vem um "RESUMO" com o IP permitido e os próximos passos.

**⚠️ Se der errado:** o script **para e avisa**; nada fica pela metade.

| Mensagem | O que fazer |
|---|---|
| `ERRO: rode como root` | Você não está como root. Digite `sudo -i` e rode de novo |
| `ERRO: chave publica invalida` | A chave foi colada incompleta ou com aspas a mais. Copie de novo, o comando **inteiro** |
| `isso parece uma chave PRIVADA` | Foi colado o arquivo errado. Peça à equipe central a chave **pública** (começa com `ssh-ed25519`) |
| `ERRO: /etc/sudoers nao inclui /etc/sudoers.d` | O sudo desta central é antigo ou foi personalizado. **Nada foi alterado.** Fale com a equipe central |
| `TESTE FALHOU` | Mande a saída à equipe central. Para desfazer: `./remover-usuario-monitor.sh` |

Se o script mostrar **AVISO** sobre `AllowUsers`, `AllowGroups` ou `PubkeyAuthentication`, o acesso remoto da central restringe quem pode entrar. Peça ajuda à equipe central: é preciso incluir o `monitor-n8n`.

## Parte 3. Garantir que o monitor consiga chegar na central

O script **não mexe** em firewall nem em Fail2Ban. Estes dois ajustes são seus, com autorização do responsável.

### 3.1. Liberar o IP do monitor no firewall

O IP do monitor precisa conseguir chegar na **porta 22** da central. Se a central tiver firewall (o do próprio FreePBX, por exemplo), coloque o IP do monitor como **confiável**:

1. No painel do FreePBX, vá em **Connectivity** (Conectividade) e **Firewall**.
2. Procure a área das **zonas** (**Zones**) e adicione o **IP do monitor** (exemplo: `10.0.0.5`) na zona **Trusted** (confiável).
3. Aplique a mudança (**Apply** / **Apply Config**).

Os menus variam entre versões. No final do script (Passo 5) há uma linha de **sugestão de comando** do firewall: use-a se o menu não bater com o seu.

**✅ Como saber que deu certo:** a equipe central roda a verificação (`--verificar`) e a sua central aparece como **[ OK ]**.

### 3.2. Evitar que o Fail2Ban bloqueie o monitor e a operadora

O **Fail2Ban** é um "porteiro" que bloqueia endereços suspeitos. Já aconteceu de ele **bloquear o IP da operadora por engano** e derrubar as ligações. Para prevenir, coloque o IP do **monitor** e o(s) IP(s) da **operadora** na lista de endereços que ele **nunca** bloqueia. A lista se chama `ignoreip` e os endereços ficam **separados por espaço (não por vírgula)**.

**Antes de mexer, faça uma cópia de segurança do arquivo** (no terminal da central):

```bash
cp -p /etc/fail2ban/jail.local /etc/fail2ban/jail.local.bak-antes-do-monitor
```

**O que ele faz:** faz uma cópia do arquivo de configuração do Fail2Ban, para você poder voltar atrás.

**✅ Como saber que deu certo:** não aparece nada e o prompt volta.

Agora edite o arquivo **pelo WinSCP**, que é mais fácil que o terminal:

1. No WinSCP (conectado à central), clique na barra de endereço (acima da lista da direita), digite `/etc/fail2ban/` e aperte Enter.
2. Clique com o botão direito em **jail.local** e escolha **Edit** (Editar). Abre um editor de texto.
3. Procure a linha que começa com `ignoreip` (aperte **Ctrl+F** e digite `ignoreip`).
4. Deixe-a assim (troque pelos seus IPs), **tudo na mesma linha, separado por espaço**:

```
ignoreip = 127.0.0.1 10.0.0.5 203.0.113.10
```

Depois de editar a linha:

- Aperte **Ctrl+S** para salvar e feche o editor.
- Se não existir nenhuma linha `ignoreip`, pare e peça ajuda à equipe central.

Depois, no terminal, aplique a mudança:

```bash
fail2ban-client reload
```

**O que ele faz:** manda o Fail2Ban ler o arquivo de novo.

**✅ Como saber que deu certo:** aparece `OK` (ou não mostra erro).

Confira se cada IP foi entendido **separado**. O nome do "jail" do Asterisk costuma ser `asterisk-iptables`; para ver os nomes, use `fail2ban-client status`.

```bash
fail2ban-client get asterisk-iptables ignoreip
```

**O que ele faz:** mostra a lista de endereços que o Fail2Ban nunca bloqueia.

**✅ Como saber que deu certo:** aparecem os IPs **um por linha**, incluindo o do monitor e o da operadora. **Se aparecerem todos juntos numa linha só, com vírgulas, a mudança não foi entendida:** volte ao arquivo e use **espaço**.

**⚠️ Se der errado:** para voltar atrás, copie de volta o arquivo de segurança e rode `fail2ban-client reload`.

## Parte 4. Avisar a equipe central

1. Devolva a **ficha** preenchida (Parte 1).
2. Avise que terminou. A equipe central roda a verificação e confirma que a sua central está **[ OK ]**.

## Pronto?

- ☐ O script mostrou **TESTE OK** (Parte 2, Passo 5).
- ☐ O IP do monitor consegue chegar na porta 22 da central (Parte 3.1).
- ☐ O IP do monitor e o da operadora estão no `ignoreip`, separados por espaço (Parte 3.2).
- ☐ A ficha foi devolvida à equipe central.
- ☐ Sei como desfazer tudo (seção "Para desfazer tudo").

## Riscos de segurança, em português simples

| Preocupação | Como o desenho a trata |
|---|---|
| Alguém usar a chave para entrar na central | A chave só funciona a partir do **IP do monitor**, não abre janela de comandos livre, não faz "túneis" de rede e só executa o relatório de leitura |
| O usuário virar "dono" da central | O `sudo` dele permite **somente** o script de leitura, que pertence ao root e **ele não consegue alterar** |
| Alguém tentar entrar com senha | O usuário **não tem senha** válida: só entra por chave |
| O servidor do monitor ser invadido | O invasor só consegue ler o mesmo relatório. Para cortar o acesso, rode o script de remoção |
| Informação sensível no relatório | O relatório tem IPs, nomes de linhas, disco e IPs bloqueados. **Não tem senhas nem áudio** |
| O script mudar depois | O script de leitura é um arquivo do root. Você pode ler quando quiser: `cat /usr/local/sbin/check-monitor` |

O que continua sendo seu: manter a central atualizada e o firewall liberando só o necessário.

## Para desfazer tudo

A qualquer momento, na central, como root:

```bash
./remover-usuario-monitor.sh
```

**O que ele faz:** pergunta se você tem certeza (digite **s** e Enter) e remove o usuário, o arquivo do sudo e o script de leitura.

**✅ Como saber que deu certo:** aparece "Pronto. O monitor nao tem mais acesso a esta central."

O firewall e o Fail2Ban **não** são alterados pelos scripts. Se você liberou o IP do monitor ali, retire à mão.

## Problemas comuns

| O que acontece | O que fazer |
|---|---|
| A equipe central diz "Permission denied" na verificação | O IP informado no comando não é o do monitor, ou a chave foi colada incompleta. Rode o comando do Passo 5 de novo, completo |
| A equipe central diz "timed out" | O IP do monitor não alcança a porta 22 da central: firewall, VPN ou porta errada (Parte 3.1) |
| A verificação diz que a identidade (host key) mudou | A central foi refeita. Avise a equipe central |
| O `sshd` restringe usuários | Inclua `monitor-n8n` em `AllowUsers` (peça ajuda) e recarregue o acesso remoto |


## Modelo de mensagem da equipe central para a filial

A equipe central pode copiar o texto abaixo, trocar o que está entre `[colchetes]` e enviar ao TI de cada filial:

```text
Olá, [nome do TI]!

Estamos ligando a central telefônica da [nome da filial] ao nosso monitor de telefonia.
Ele só LÊ informações (estado do Asterisk, linhas da operadora, disco) e avisa no
WhatsApp quando algo falha. Não altera nenhuma configuração da central.

Você vai precisar de uns 10 minutos e de acesso de administrador (root) à central.

1. Siga o guia: [link do Guia do TI da filial]
2. Rode, na central, o comando abaixo (já contém o IP do monitor e a chave pública):

   [cole aqui a linha ./criar-usuario-monitor.sh ...]

3. Preencha a ficha do guia (nome, IP da central, nomes dos troncos e IPs da operadora)
   e devolva a esta conversa.

Se algo der errado, envie a mensagem que apareceu na tela. Obrigado!
```
