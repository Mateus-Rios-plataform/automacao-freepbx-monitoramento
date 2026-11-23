---
title: "Como acessar o servidor e copiar arquivos"
---

# Como acessar o servidor e copiar arquivos

[⬅ Início](index.md) | Anterior: [O que você precisa ter](precisa.md) | Próxima: [Como criar a planilha](planilha.md)

Para instalar o monitor você precisa fazer **duas coisas** no servidor:

1. **Copiar arquivos** para ele. Faremos isso **arrastando com o mouse**, no programa WinSCP.
2. **Digitar (colar) comandos** nele. Faremos isso em uma janela preta chamada **terminal**.

Esta página ensina as duas coisas. Palavras novas estão no [Glossário](glossario.md).

| 📋 Você vai precisar |
|---|
| ☐ O **IP do servidor** (exemplo: 10.0.0.5), o **usuário** e a **senha** que o responsável pelo servidor lhe passou |
| ☐ O programa **WinSCP** instalado (veja a Parte 1) |
| ☐ O **PowerShell** (já vem no Windows) ou o **PuTTY** |

## Parte 1. Copiar arquivos com o WinSCP (por tela)

### Passo 1. Instalar o WinSCP

1. No navegador, abra [winscp.net](https://winscp.net).
2. Clique no botão **Download WinSCP**, e depois em **Installation package**.
3. Abra o arquivo baixado (na pasta Downloads). Se o Windows perguntar se deseja permitir, clique em **Sim**.
4. Na instalação, clique em **Next** (Avançar) até o fim e depois em **Finish** (Concluir). Pode aceitar tudo como está.

**✅ Como saber que deu certo:** o programa **WinSCP** aparece quando você digita "WinSCP" no menu Iniciar.

**⚠️ Se der errado:** se o Windows bloquear a instalação, peça ao TI da equipe central para instalar.

### Passo 2. Entrar no servidor

1. Abra o **WinSCP**. Aparece uma janela chamada **Login**.
2. Preencha os campos:

| Campo (em inglês / português) | O que escrever |
|---|---|
| **File protocol** (Protocolo) | Escolha **SFTP** |
| **Host name** (Nome do host) | O **IP do servidor**, por exemplo `10.0.0.5` |
| **Port number** (Número da porta) | `22` |
| **User name** (Nome do usuário) | O usuário que você recebeu |
| **Password** (Senha) | A senha que você recebeu |

Depois de preencher os campos:

- Clique no botão **Login**.
- Na primeira vez aparece um aviso: *"Continue connecting to an unknown server and add its host key to a cache?"*. É normal, é só a primeira conexão. Clique em **Yes** (Sim).

**✅ Como saber que deu certo:** a janela fica dividida em **duas partes**: a da **esquerda** mostra os arquivos do **seu computador** e a da **direita** mostra os arquivos do **servidor**.

**⚠️ Se der errado:**

| O que aparece | O que fazer |
|---|---|
| *Access denied* (Acesso negado) ou *Authentication failed* | Usuário ou senha errados. Confira com quem lhe passou |
| *Connection timed out* (Tempo esgotado) | O IP está errado, o servidor está desligado ou você está fora da rede/VPN. Confira o IP |
| *Network error: Connection refused* | O servidor não aceita acesso remoto. Peça ao responsável para ligar o serviço "SSH" |

### Passo 3. Conhecer a pasta do servidor

1. A parte da **direita** mostra a **pasta inicial** do seu usuário no servidor (por exemplo `/home/usuario`). É ali que o projeto vai ficar depois que você baixá-lo (Parte 4 desta página).
2. A parte da **esquerda** mostra o seu computador. É de lá que você vai **arrastar** a planilha `centrais.csv` mais tarde.

**✅ Como saber que deu certo:** você vê as duas partes e consegue abrir as pastas da direita sem erro.

### Dica: como voltar mais tarde

Sempre que precisar copiar mais um arquivo (por exemplo, a planilha), abra o WinSCP, entre do mesmo jeito (Passo 2) e arraste. Você pode clicar em **Save** (Salvar) na janela de Login para não precisar digitar tudo de novo; mas **não** marque para salvar a senha em um computador compartilhado.

## Parte 2. Digitar comandos no servidor (terminal)

Os comandos serão **copiados desta documentação e colados** na janela preta. Há três jeitos de abrir essa janela. **Use o Jeito A**, que já vem no Windows. Os outros dois são alternativas.

### Jeito A (recomendado): PowerShell

1. Aperte a tecla **Windows** do teclado, digite **PowerShell** e aperte **Enter**. Abre uma janela azul ou preta.
2. Digite o comando abaixo (trocando `usuario` e o IP pelos seus) e aperte **Enter**:

```bash
ssh usuario@10.0.0.5
```

**O que ele faz:** entra no servidor, como se você estivesse na frente dele.

Depois de apertar Enter:

- Na primeira vez, o Windows pergunta //"Are you sure you want to continue connecting (yes/no/[fingerprint])?"//. Digite **yes** e aperte **Enter**.
- Pede a senha: *"usuario@10.0.0.5's password:"*. **Digite a senha e aperte Enter**. Atenção: **não aparece nada enquanto você digita**. Isso é normal, é por segurança.

**✅ Como saber que deu certo:** aparece uma linha parecida com `usuario@servidor:~$`. Essa linha se chama **prompt** e quer dizer "pode digitar".

**⚠️ Se der errado:**

| O que aparece | O que fazer |
|---|---|
| *Permission denied, please try again* | Senha errada. Tente de novo |
| *Connection timed out* | IP errado ou fora da rede/VPN |
| *ssh não é reconhecido* | O Windows é antigo. Use o Jeito B (PuTTY) |
| *WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED* | O servidor foi refeito, ou algo está errado. Peça ajuda ao TI antes de continuar |

### Jeito B: PuTTY (alternativa)

1. Baixe e instale o PuTTY em [putty.org](https://www.putty.org) (pelo botão de download), aceitando tudo como está.
2. Abra o **PuTTY**. Na tela **Session**, preencha **Host Name (or IP address)** com o IP do servidor, deixe **Port** em `22` e **Connection type** em **SSH**. Clique em **Open**.
3. Na primeira vez aparece **PuTTY Security Alert**. Clique em **Accept**.
4. Na janela preta, aparece *"login as:"*. Digite o **usuário** e aperte Enter. Depois digite a **senha** (não aparece nada) e aperte Enter.

**✅ Como saber que deu certo:** aparece o prompt (`usuario@servidor:~$`).

### Jeito C: Console da plataforma de virtualização (só se os outros não funcionarem)

1. Abra o programa que controla as máquinas virtuais da sua empresa (por exemplo XCP-ng Center, o painel do Proxmox ou o vSphere) e procure o **servidor** (a máquina virtual).
2. Clique no nome dele e abra a aba ou botão **Console**.
3. Clique **dentro** da tela preta e aperte Enter. Digite o usuário e a senha.

**Atenção:** neste console normalmente **não dá para colar**. Você teria que digitar tudo à mão, e uma letra errada estraga o comando. Por isso prefira o Jeito A ou B. Este console é bom para **descobrir o IP** do servidor, com o comando abaixo:

```bash
hostname -I
```

**O que ele faz:** mostra o IP do servidor.

**✅ Como saber que deu certo:** aparece um número parecido com `10.0.0.5`.

## Parte 3. Como usar o terminal (o básico)

- **Colar um comando:** copie o comando desta documentação (selecione e aperte **Ctrl+C**), clique com o **botão direito** dentro da janela preta (cola) e aperte **Enter**.
- **Copiar um texto da janela:** selecione com o mouse e clique com o botão direito (no PowerShell/PuTTY isso copia). Se não funcionar, tente **Ctrl+Shift+C**.
- **Esperar:** alguns comandos demoram. Enquanto estiver trabalhando, o prompt **não volta**. Espere o prompt (`usuario@servidor:~$`) voltar antes de digitar outro.
- **Cancelar um comando:** aperte **Ctrl+C**.
- **Senha do sudo:** o comando `sudo` pede a **sua senha** de novo. Digite (não aparece nada) e aperte Enter.

Dois comandos para se orientar:

```bash
ls
```

**O que ele faz:** lista os arquivos e pastas do lugar onde você está.

**✅ Como saber que deu certo:** aparece uma lista de nomes (ou nada, se a pasta estiver vazia), sem mensagem de erro. Depois da Parte 4, aparece a pasta `automacao-freepbx-monitoramento`.

```bash
pwd
```

**O que ele faz:** mostra em qual pasta você está agora.

**✅ Como saber que deu certo:** aparece algo como `/home/usuario`.

## Parte 4. Baixar o projeto no servidor

Com o terminal aberto e o prompt na tela, rode os comandos abaixo, **um de cada vez**.

```bash
sudo apt-get update && sudo apt-get install -y git curl
```

**O que ele faz:** instala o `git` e o `curl`, programas usados para baixar o projeto. O `sudo` pede a **sua senha** (não aparece nada ao digitar).

**✅ Como saber que deu certo:** o comando termina e o prompt volta, sem linhas começando com `E:`.

**⚠️ Se der errado:** se aparecer `Unable to locate package` ou `Could not resolve`, o servidor está sem internet ou não é Debian/Ubuntu. Peça ajuda ao responsável pelo servidor.

```bash
git clone https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento.git
```

**O que ele faz:** baixa o projeto para uma pasta nova, chamada `automacao-freepbx-monitoramento`, dentro da pasta onde você está.

**✅ Como saber que deu certo:** aparece `Cloning into 'automacao-freepbx-monitoramento'...` e o prompt volta, sem `fatal:`.

```bash
ls automacao-freepbx-monitoramento
```

**O que ele faz:** lista o que tem dentro da pasta do projeto.

**✅ Como saber que deu certo:** aparecem, entre outros, `central`, `docs`, `fluxos` e `monitor`.

Para atualizar o projeto no futuro: entre na pasta (`cd automacao-freepbx-monitoramento`) e rode `git pull`.

## Pronto?

- ☐ Entrei no WinSCP e vi os arquivos do servidor.
- ☐ Abri o terminal e vi o prompt.
- ☐ O comando `ls automacao-freepbx-monitoramento` mostra as pastas `central`, `fluxos` e `monitor`.

Tudo certo? Siga para [Como criar a planilha de centrais](planilha.md).

