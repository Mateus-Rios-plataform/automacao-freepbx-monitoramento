---
title: "Instalação passo a passo"
---

# Instalação passo a passo

[⬅ Início](index.md) | Anterior: [Como criar a planilha](planilha.md) | Próxima: [Ligar o WhatsApp](whatsapp.md)

Aqui você instala o monitor no servidor. É só **copiar e colar** os comandos, na ordem. Cada comando vem com **o que ele faz**, **como saber que deu certo** e **o que fazer se der errado**. Palavras novas estão no [Glossário](glossario.md).

O código está no [repositório no GitHub](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento) (o que há em cada pasta está em [O que tem no repositório](arquivos.md)).

| 📋 Você vai precisar | Onde conseguir |
|---|---|
| ☐ Ter lido [O que você precisa ter](precisa.md) | Página anterior |
| ☐ Saber **entrar no servidor** (WinSCP e terminal) | [Como acessar o servidor](acessar-servidor.md) |
| ☐ O **projeto** já copiado para o servidor | Mesma página (Parte 1) |
| ☐ A planilha `centrais.csv` pronta | [Como criar a planilha](planilha.md) |
| ☐ A **senha** do seu usuário no servidor (para o `sudo`) | Com o responsável pelo servidor |
| ☐ **30 minutos** livres, sem desligar o computador | Você |

## Passo 1. Abrir o terminal e entrar no servidor

Abra o **PowerShell** e entre no servidor, como ensina a página [Como acessar o servidor](acessar-servidor.md) (Parte 2, Jeito A):

```bash
ssh usuario@10.0.0.5
```

**O que ele faz:** entra no servidor (troque `usuario` e o IP pelos seus).

**✅ Como saber que deu certo:** aparece o prompt, parecido com `usuario@servidor:~$`.

## Passo 2. Conferir se o projeto está no servidor

```bash
ls automacao-freepbx-monitoramento
```

**O que ele faz:** lista o que tem dentro da pasta do projeto.

**✅ Como saber que deu certo:** aparecem, entre outros, `central`, `docs`, `fluxos` e `monitor`.

**⚠️ Se der errado:** se aparecer *"No such file or directory"*, o projeto ainda não foi baixado. Faça a **Parte 4** da página [Como acessar o servidor](acessar-servidor.md) e repita este passo.

## Passo 3. Entrar na pasta do projeto

```bash
cd automacao-freepbx-monitoramento
```

**O que ele faz:** entra na pasta do projeto. A partir daqui, todos os comandos são dados **dentro dessa pasta**.

**✅ Como saber que deu certo:** o prompt passa a mostrar `automacao-freepbx-monitoramento`, por exemplo `usuario@servidor:~/automacao-freepbx-monitoramento$`.

```bash
git pull
```

**O que ele faz:** busca a versão mais nova do projeto (útil se você baixou há algum tempo).

**✅ Como saber que deu certo:** aparece `Already up to date.` ou uma lista de arquivos atualizados.

## Passo 4. Colocar a planilha na pasta do projeto

Se ainda não fez, siga a página [Como criar a planilha](planilha.md) (Passos 1 a 5). O arquivo `centrais.csv` precisa estar **dentro da pasta `automacao-freepbx-monitoramento`** no servidor. Para conferir:

```bash
ls centrais.csv
```

**O que ele faz:** procura o arquivo da planilha na pasta.

**✅ Como saber que deu certo:** aparece `centrais.csv`.

**⚠️ Se der errado:** se aparecer *"No such file or directory"*, a planilha não está na pasta certa. Volte ao Passo 5 da página da planilha.

## Passo 5. Instalar

Este é o comando principal. **Não feche a janela** enquanto ele trabalha.

```bash
sudo ./monitor/instalar.sh
```

**O que ele faz:** instala tudo o que o monitor precisa (o programa Docker, o n8n e a Evolution API), cria as chaves de acesso e prepara o monitor com as centrais da sua planilha. Ele **não liga** o monitoramento ainda: isso é feito na página do WhatsApp.

- O `sudo` pede a **sua senha**. Digite (não aparece nada) e aperte Enter.
- Demora **10 a 20 minutos** na primeira vez, porque baixa programas da internet. As linhas vão passando; é normal.
- Se a conexão cair, abra o terminal de novo e rode o mesmo comando: **é seguro repetir**.

As mensagens que você vai ver, em ordem:

| Mensagem | O que quer dizer |
|---|---|
| `== Verificando o ambiente` e `ok: Debian ... planilha N linhas` | Conferiu o servidor e leu a planilha |
| `== Instalando Docker` | Instalando o Docker (demora) |
| `== Subindo n8n e Evolution` | Ligando os programas (demora) |
| `ok: n8n respondendo` e `ok: Evolution API respondendo` | Os programas ligaram |
| `ok: credenciais SSH e fluxo importados` | Cadastrou as centrais da planilha |
| `ok: fluxo importado INATIVO` | Normal: será ligado na página do WhatsApp |
| `== Instalacao do servidor de monitoramento concluida` | **Terminou!** |

**✅ Como saber que deu certo:** no fim aparece **`Instalacao do servidor de monitoramento concluida`**, seguido de um texto "INSTRUCOES PARA O TI DE CADA CENTRAL" e da lista "PROXIMOS PASSOS".

**⚠️ Se der errado:** leia a linha que começa com **ERRO:**. As mais comuns:

| Mensagem | O que fazer |
|---|---|
| `ERRO: rode como root` | Faltou o `sudo` no começo do comando |
| `ERRO: planilha nao encontrada` | O `centrais.csv` não está na pasta do projeto (Passo 4) |
| `ERRO: a planilha esta separada por VIRGULA` | Salve a planilha de novo como ensina o Passo 3 da página da planilha |
| `ERRO: linha N da planilha: ...` | Há um erro **na linha N** da planilha: a mensagem explica qual. Isso aparece **logo no começo**, antes de instalar qualquer coisa. Corrija, salve, copie de novo e rode o comando outra vez |
| `ERRO: sem acesso a internet` | O servidor não alcança a internet. Peça ajuda ao responsável pelo servidor |
| `ERRO: sistema nao suportado` | O servidor não é Debian nem Ubuntu |
| `ERRO: a porta 5678 ja esta em uso` (ou 8080) | O servidor já tem outro programa. Use um servidor só para o monitor |
| `apt falhou (tentativa 1/3)...` | **Não é erro.** Ele tenta de novo sozinho. Só preocupe-se se disser "ERRO" no fim |

Se a planilha tiver centrais com `ari` igual a `sim`, o instalador pergunta o **usuário e a senha da ARI**. Peça ao TI da filial.

## Passo 6. Mandar as instruções para as filiais

O instalador gerou, para **cada central**, o comando que o TI da filial deve rodar. Para ver de novo:

```bash
sudo ./monitor/instalar.sh --instrucoes
```

**O que ele faz:** mostra, para cada filial, o comando pronto (com o IP do monitor e a chave pública).

**✅ Como saber que deu certo:** aparece uma lista com o nome de cada filial e uma linha começando com `./criar-usuario-monitor.sh --ip-monitor ...`.

**Pegar o texto pelo mouse (mais fácil):** no **WinSCP**, dentro da pasta `automacao-freepbx-monitoramento`, dê dois cliques no arquivo `instrucoes-para-as-filiais.txt` para abrir no Bloco de Notas, e copie. Esse arquivo só tem o IP do monitor e a chave **pública**: pode mandar por e-mail ou WhatsApp.

Para cada filial, envie ao **TI**:

1. O **comando dela** (a linha do arquivo).
2. Os dois scripts (`criar-usuario-monitor.sh` e `remover-usuario-monitor.sh`, na pasta `central/` do projeto) e o link do [Guia do TI da filial](ti-filial.md). Eles podem baixar os scripts no [repositório no GitHub](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento), ou você os envia por e-mail ou pelo WinSCP.
3. Um texto de apresentação curto: o modelo está no fim do [Guia do TI da filial](ti-filial.md).

O TI segue o [Guia do TI da filial](ti-filial.md) e **devolve a ficha** com nome, IP, troncos e IPs da operadora. Use essa ficha para completar a planilha (página da planilha) e depois rode a atualização (veja "Depois: mudar a lista de filiais", mais abaixo).

## Passo 7. Conferir se o monitor alcança cada central

Quando os TIs avisarem que terminaram:

```bash
sudo ./monitor/instalar.sh --verificar
```

**O que ele faz:** o monitor tenta entrar (só para **ler**) em cada central da planilha e diz se conseguiu.

**✅ Como saber que deu certo:** uma linha `[ OK ]` por central, com "13 secoes lidas", e no fim "**N de N centrais prontas**".

**⚠️ Se aparecer `[FALHA]`:** o motivo vem escrito na linha.

| Mensagem | O que quer dizer e o que fazer |
|---|---|
| `usuario/chave nao instalados ou IP do monitor diferente` | O TI ainda não rodou o script na central, ou usou outro IP. Peça para rodar de novo com o comando certo |
| `sem rota/firewall bloqueando o SSH` | O servidor não chega até a central: rede, VPN ou firewall. O TI da filial precisa liberar o IP do monitor na porta 22 |
| `SSH recusou a conexao` | A porta está errada na planilha, ou o acesso remoto da central está desligado |
| `o check-monitor nao respondeu` | Peça ao TI para rodar o script de novo |
| `a identidade (host key) da central mudou` | A central foi refeita, ou algo está errado. Confirme com o TI antes de continuar |

Só passe adiante quando todas as centrais estiverem `[ OK ]`. (Uma central com falha não atrapalha as outras, mas ela fica **sem vigilância**.)

## Passo 8. Ligar o WhatsApp

Siga a página [Ligar o WhatsApp](whatsapp.md). É nela que o monitor é **ligado** de verdade.

## Passo 9. Ver o painel

Siga a página [Conhecer o painel do n8n](painel-n8n.md) para criar a sua conta de administrador e conferir que o monitor está funcionando.

## Passo 10. Teste final e aceite

- ☐ O `--verificar` mostrou **todas as centrais** `[ OK ]`.
- ☐ A **mensagem de teste** chegou no grupo dos chefes (página do WhatsApp).
- ☐ No painel, o fluxo está **Published** e as execuções acontecem a cada 5 minutos.
- ☐ **Teste de alerta (opcional, seguro):** veja a caixa abaixo.
- ☐ Guardei em local seguro (gerenciador de senhas) o IP do servidor, o usuário do painel e a senha. **Não guarde no repositório nem em documentos compartilhados.**
- ☐ Combinei quem é o responsável pelo monitor e quem recebe os avisos.

### Teste de alerta, sem mexer em nenhuma central

Para ver um alerta de verdade chegando, sem risco:

1. Abra a planilha no Excel, **acrescente** uma linha de teste e salve como CSV (como na página da planilha): `teste;Central de Teste;10.255.255.1;22;nao;sim;;;`. Esse IP não existe.
2. Copie a planilha de novo para a pasta do projeto no servidor (WinSCP), escolhendo **Yes** para substituir.
3. No terminal, dentro da pasta do projeto, rode o comando abaixo.

```bash
sudo ./monitor/instalar.sh --atualizar
```

**O que ele faz:** atualiza o monitor com a lista nova de centrais.

**✅ Como saber que deu certo:** aparece `ok: credenciais SSH e fluxo importados` e `ok: fluxo ATIVO`.

Depois de rodar o comando:

- **Espere uns 10 minutos.** O monitor só avisa depois de **2 verificações seguidas** com problema. Deve chegar no grupo um **🚨** dizendo que o painel da "Central de Teste" está fora do ar.
- **Depois do teste:** apague a linha de teste da planilha, salve, copie de novo e rode `sudo ./monitor/instalar.sh --atualizar` outra vez. Um **✅** "normalizada" pode chegar quando a central de teste sair da lista.

## Depois: mudar a lista de filiais

Entrou uma filial nova? Mudou um IP? Siga sempre estes 3 passos:

1. Mude a planilha no Excel e salve como CSV (página da planilha, Passos 2 a 4).
2. Copie para a pasta `automacao-freepbx-monitoramento` no servidor, com o WinSCP, substituindo o arquivo.
3. No terminal, dentro da pasta do projeto, rode `sudo ./monitor/instalar.sh --atualizar`. Se for filial nova, rode também `sudo ./monitor/instalar.sh --instrucoes` e envie o comando dela.

## Se alguma coisa não funcionar

Veja se os programas do monitor estão ligados:

```bash
sudo docker compose -f /opt/monitor-telefonia/docker-compose.yml ps
```

**O que ele faz:** lista os 3 programas do monitor e se estão ligados.

**✅ Como saber que deu certo:** três linhas (`n8n`, `evolution-api` e `evolution-postgres`) com **Up** no estado.

Para ver as últimas mensagens do n8n (para mostrar a quem for ajudar):

```bash
sudo docker compose -f /opt/monitor-telefonia/docker-compose.yml logs --tail 50 n8n
```

**O que ele faz:** mostra as 50 últimas linhas do registro do n8n.

**✅ Como saber que deu certo:** aparece texto. Copie e mande a quem for ajudar.

## Desinstalar

Só se for **realmente** o caso. Isso apaga o monitor do servidor (as centrais não são alteradas):

```bash
sudo docker compose -f /opt/monitor-telefonia/docker-compose.yml down -v
```

**O que ele faz:** desliga e apaga os programas do monitor e os dados deles.

**✅ Como saber que deu certo:** aparecem linhas com `Removed`.

Depois, cada TI roda `./remover-usuario-monitor.sh` na sua central, e você desconecta o aparelho no celular (Aparelhos conectados). Por fim, apague a pasta `/opt/monitor-telefonia` com ajuda do responsável pelo servidor.

## Próximo passo

[Ligar o WhatsApp](whatsapp.md)

