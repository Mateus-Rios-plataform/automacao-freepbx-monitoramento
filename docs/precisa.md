---
title: "O que você precisa ter antes de começar"
---

# O que você precisa ter antes de começar

[⬅ Início](index.md) | Próxima: [Como acessar o servidor](acessar-servidor.md)

Juntar tudo isto **antes** evita ficar parado no meio da instalação. Marque cada item. Se algum item não estiver pronto, a tabela diz **onde conseguir**. Palavras novas estão no [Glossário](glossario.md).

## 1. No seu computador (Windows)

| 📋 Você vai precisar | Para quê | Onde conseguir | Como saber que está pronto |
|---|---|---|---|
| ☐ Um computador com **Windows 10 ou 11** e internet | Para abrir os programas e as páginas | O seu mesmo | Você consegue abrir esta página |
| ☐ O programa **WinSCP** (gratuito) | Copiar arquivos para o servidor, arrastando com o mouse | Site [winscp.net](https://winscp.net): botão "Download" e instalar | Aparece o ícone do WinSCP no menu Iniciar |
| ☐ **Excel** ou **LibreOffice Calc** | Criar a planilha das filiais | Já vem no computador, ou [pt-br.libreoffice.org](https://pt-br.libreoffice.org) (gratuito) | Você abre uma planilha |
| ☐ **PowerShell** (já vem no Windows) ou **PuTTY** (gratuito) | Digitar os comandos no servidor | PowerShell: já existe. PuTTY: [putty.org](https://www.putty.org) | Você abre o PowerShell (veja [Acessar o servidor](acessar-servidor.md)) |
| ☐ O **Bloco de Notas** | Conferir a planilha | Já vem no Windows | Você abre o Bloco de Notas |

## 2. O servidor do monitor

O **servidor** é um computador que fica ligado o tempo todo e onde o monitor vai morar. Costuma ser uma "máquina virtual" (em XCP-ng, Proxmox, VMware, Hyper-V ou na nuvem) ou um computador físico pequeno. **Esta documentação não ensina a criar essa máquina**: peça a quem cuida da sua infraestrutura, que já sabe fazer isso.

| 📋 Peça ao responsável pelo servidor | Detalhe |
|---|---|
| ☐ Sistema **Linux Debian 12** ou **Ubuntu 22.04/24.04** | É o sistema onde o monitor funciona (já testado) |
| ☐ **2 processadores, 3 GB de memória e 9 GB de disco** | O tamanho mínimo testado |
| ☐ Acesso à **internet** | Precisa baixar programas (porta 443, "https") |
| ☐ Que o servidor **alcance as centrais** da sede e das filiais | Na mesma rede, ou por VPN. O monitor entra na porta 22 de cada central |
| ☐ O **endereço (IP) do servidor** | Algo como 10.0.0.5. Você vai digitar isso nos programas |
| ☐ Um **usuário e uma senha** com permissão de administrador (sudo) | Para instalar. Não precisa ser o usuário root |
| ☐ Um servidor **só para o monitor** (de preferência) | Evita conflito com outros programas |

**Como saber que está pronto:** o responsável lhe entrega por escrito o IP, o usuário e a senha, e você consegue entrar seguindo a página [Como acessar o servidor](acessar-servidor.md).

## 3. Os arquivos do monitor

| 📋 Você vai precisar | Onde conseguir |
|---|---|
| ☐ O **projeto** (o código do monitor) | Você vai baixá-lo **no servidor** com o `git`, na página [Como acessar o servidor](acessar-servidor.md) (Parte 4). Não precisa baixar agora |
| ☐ A **planilha modelo** (`centrais-modelo.xlsx`) | No [repositório no GitHub](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento): abra o arquivo `centrais-modelo.xlsx` e clique em **Download raw file** (ícone de seta para baixo) |

**Como saber que está pronto:** a planilha modelo está na pasta "Downloads" do computador.

## 4. As informações de cada filial

Cada filial (e a sede) precisa informar alguns dados. Quem sabe é o **TI da filial**. Peça a ele que preencha a ficha do [Guia do TI da filial](ti-filial.md). Você vai precisar de:

| 📋 Dado | O que é | Exemplo |
|---|---|---|
| ☐ **Nome** da filial | Como vai aparecer no alerta | Filial Municipal Centro |
| ☐ **IP da central** | O endereço da central telefônica da filial | 10.0.1.10 |
| ☐ **Nome do tronco** | O nome da "linha" que vem da operadora | SIP-OPERADORA |
| ☐ **IP da operadora** | O endereço da operadora, que **nunca** pode ser bloqueado | 203.0.113.10 |
| ☐ Se a central usa a **porta 22** | Quase sempre sim | 22 |

**Como saber que está pronto:** você tem uma ficha preenchida de **cada** filial. Se faltar alguma, comece só com as que estão prontas e acrescente as outras depois.

## 5. O WhatsApp

| 📋 Você vai precisar | Detalhe |
|---|---|
| ☐ Um **número de WhatsApp dedicado ao monitor** (um chip só para os alertas) | É o número que "envia" os alertas |
| ☐ O **celular** desse número **em mãos** na hora de ligar o monitor | Vai aparecer um código para digitar nele |
| ☐ Um **grupo de WhatsApp só com os chefes** (por exemplo "Alertas telefonia") | Quem está no grupo recebe os alertas. Crie o grupo **antes** (veja [Ligar o WhatsApp](whatsapp.md)) |

**Atenção:** este tipo de ligação não é oficial do WhatsApp. Existe o risco de o WhatsApp bloquear o número. Por isso, use um chip separado só para os alertas (nunca o número principal da empresa) e tenha outra forma de avisar os chefes (e-mail ou ligação) caso o bloqueio aconteça.

## 6. Pessoas e tempo

- Reserve **uma manhã ou uma tarde** para a primeira instalação.
- Combine com os TIs das filiais **antes**, para eles já irem preparando as centrais.
- Tenha um **gerenciador de senhas** ou um caderno seguro para guardar a senha do administrador do painel e o IP do servidor.

## Lista final: está tudo pronto?

- ☐ Tenho Windows, WinSCP e Excel (ou LibreOffice).
- ☐ Tenho o IP, o usuário e a senha do servidor, e consegui entrar nele.
- ☐ Baixei a planilha modelo (`centrais-modelo.xlsx`) do repositório.
- ☐ Pedi a ficha ao TI de cada filial (ou pelo menos de uma, para começar).
- ☐ O celular do número dedicado está comigo e o grupo dos chefes existe.

Tudo marcado? Siga para [Como acessar o servidor e copiar arquivos](acessar-servidor.md).

