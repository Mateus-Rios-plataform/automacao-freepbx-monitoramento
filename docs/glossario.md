---
title: "Glossário: as palavras técnicas, em português simples"
---

# Glossário: as palavras técnicas, em português simples

[⬅ Início](index.md)

Em ordem alfabética. Procure a palavra que você não entendeu.

| Palavra | O que significa |
|---|---|
| **Alerta** | A mensagem que o monitor manda no WhatsApp quando algo está errado |
| **ARI** | Uma "porta de conversa" opcional da central. Na maioria das filiais está desligada, e na planilha você escreve `nao` |
| **Asterisk** | O programa que faz as ligações acontecerem dentro da central telefônica |
| **Bloco de Notas** | O editor de texto simples do Windows. Serve para conferir a planilha |
| **Central telefônica (PBX)** | O equipamento ou programa que liga os ramais entre si e com a rua. Aqui, é o FreePBX |
| **Chave pública / chave privada** | Um par de "chaves digitais". A pública pode ser entregue a qualquer um (é como o cadeado). A privada fica só no servidor (é a chave do cadeado) |
| **Console (virtualização)** | A "tela" do servidor dentro do programa que controla as máquinas virtuais (XCP-ng Center, Proxmox, VMware...), como se você estivesse na frente dele |
| **Credencial** | Um "acesso" guardado no n8n (usuário, chave ou senha) para ele poder entrar em outro lugar. Há uma por central |
| **CSV** | Um tipo de arquivo de planilha, só com texto. Cada linha é uma central e as colunas são separadas por ponto e vírgula |
| **DID** | O número de telefone "público" que a operadora entrega à central. Quem liga para ele cai na central |
| **Docker** | Um programa que roda outros programas em "caixinhas" prontas. O instalador o instala sozinho |
| **Evolution API** | O programa que liga o monitor ao WhatsApp para enviar as mensagens |
| **Execução** | Cada vez que o monitor rodou e fez as verificações. O painel guarda o histórico delas |
| **Fail2Ban** | Um "porteiro" da central: bloqueia endereços que parecem estar atacando. Às vezes bloqueia por engano até a operadora |
| **Firewall** | O "muro" que decide quem pode ou não chegar a uma máquina |
| **Fluxo** | Um "roteiro" de tarefas do n8n. O do monitor se chama "FreePBX - Monitor de telefonia (5 min)" |
| **FreePBX** | O programa de painel e controle da central telefônica da filial |
| **Host key (identidade da central)** | A "assinatura" de um servidor. O monitor guarda a assinatura de cada central e avisa se ela mudar |
| **IAX** | Um tipo de linha usada entre centrais da mesma rede (por exemplo, da sede para a filial) |
| **ignoreip** | A lista de endereços que o Fail2Ban **nunca** pode bloquear. Os endereços ficam separados por **espaço**, não por vírgula |
| **IP** | O "endereço" de uma máquina na rede, como 10.0.1.10 |
| **Jail** | No Fail2Ban, cada "regra de vigia" tem um nome. A que vigia o Asterisk costuma se chamar asterisk-iptables |
| **Projeto** | A pasta com todos os arquivos do monitor, baixada do GitHub com o `git` |
| **LibreOffice Calc** | Um programa de planilha gratuito, parecido com o Excel |
| **n8n** | O programa que faz o monitor funcionar: ele executa as verificações e manda os alertas. Tem um painel que se abre no navegador |
| **Operadora** | A empresa que fornece a linha telefônica |
| **Painel** | Uma página que você abre no navegador para ver e controlar um programa |
| **PBX** | Veja "Central telefônica" |
| **Porta** | Um "número de entrada" de uma máquina. A porta 22 é a do acesso remoto seguro (SSH) |
| **PowerShell** | A janela de comandos que já vem no Windows. Serve para entrar no servidor |
| **Published** | A palavra que o painel do n8n mostra para dizer que o monitor está **ligado e funcionando** |
| **Prompt** | A linha, na janela de comandos, que mostra que o servidor está esperando você digitar. Parece com usuario@servidor:~$ |
| **Prevenção (aviso)** | Um aviso amarelo (⚠️) que fala de um **risco**, mas não de um problema atual |
| **PuTTY** | Um programa gratuito para digitar comandos em um servidor |
| **Ramal** | Um telefone interno da filial, com número curto, como 7010 |
| **root** | O usuário "dono de tudo" de um servidor Linux. Use com cuidado |
| **Script** | Um arquivo com uma lista de comandos que roda sozinho, como uma "receita". Aqui, os scripts criam e removem o usuário de leitura |
| **Servidor** | Um computador que fica ligado o tempo todo prestando um serviço. Aqui, onde o monitor mora |
| **SIP** | O tipo de linha mais comum entre a central e a operadora |
| **SSH** | A forma segura de entrar em uma máquina pela rede para ler informações ou digitar comandos |
| **sudo** | Uma palavra que se coloca antes de um comando para ele rodar com permissão de administrador. Pede a senha |
| **Terminal** | Uma janela preta onde se digitam comandos. O PowerShell e o PuTTY são terminais |
| **Tronco** | A "linha" que liga a central à operadora. Tem um nome, como SIP-OPERADORA |
| **Usuário de leitura (monitor-n8n)** | O usuário criado em cada central só para o monitor **ler** informações. Ele não consegue alterar nada |
| **VPN** | Uma ligação segura entre redes distantes, como se as filiais estivessem na mesma rede da equipe central |
| **WinSCP** | Um programa gratuito para copiar arquivos para o servidor, arrastando com o mouse |
| **XCP-ng Center** | Um dos programas usados para controlar servidores virtuais (outros: Proxmox, VMware). Só é necessário se o seu servidor for uma máquina virtual |
| **Repositório** | O lugar no GitHub onde ficam o código e a documentação do projeto |

## Palavras que você vai digitar

| Palavra | Quando usar |
|---|---|
| `sim` / `nao` | Nas colunas `ari` e `web` da planilha, **sem acento** |
| `sudo` | Antes de cada comando de instalação. Pede a sua senha |
| `cd` | Entrar em uma pasta |
| `ls` | Listar os arquivos da pasta |

