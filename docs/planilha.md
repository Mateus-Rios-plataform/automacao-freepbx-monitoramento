---
title: "Como criar a planilha de centrais (CSV)"
---

# Como criar a planilha de centrais (CSV)

[⬅ Início](index.md) | Anterior: [Como acessar o servidor](acessar-servidor.md) | Próxima: [Instalação passo a passo](instalacao.md)

A planilha é a **lista das centrais que o monitor vai vigiar**: uma linha para a sede e uma para cada filial. O monitor lê essa lista para saber **onde olhar**.

Ela precisa ser um arquivo chamado exatamente `centrais.csv`. Parece complicado, mas é só preencher uma tabela no Excel e salvar de um jeito especial. Palavras novas estão no [Glossário](glossario.md).

| 📋 Você vai precisar | Onde conseguir |
|---|---|
| ☐ A **planilha modelo** (`centrais-modelo.xlsx`) | No [repositório no GitHub](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento) (veja [O que você precisa ter](precisa.md), item 3) |
| ☐ **Excel** ou **LibreOffice Calc** | Já no computador, ou [pt-br.libreoffice.org](https://pt-br.libreoffice.org) |
| ☐ A **ficha de cada filial** preenchida pelo TI | Veja o [Guia do TI da filial](ti-filial.md) |
| ☐ O **projeto já baixado** no servidor | Página [Como acessar o servidor](acessar-servidor.md) |

## O que vai em cada coluna

A planilha modelo tem **9 colunas**. **Não mude o nome das colunas** (a primeira linha).

| Coluna | O que escrever | De onde vem | Exemplo |
|---|---|---|---|
| **chave** | Um apelido curto: só **letras minúsculas e números**, sem espaço e sem acento | Você inventa | `filial01` |
| **nome** | O nome que aparece no alerta do WhatsApp. Pode ter espaço e acento | Você escolhe | `Filial Municipal Centro` |
| **ip** | O IP da central telefônica da filial | Ficha do TI | `10.0.1.10` |
| **porta_ssh** | A porta de acesso. Quase sempre `22` | Ficha do TI | `22` |
| **ari** | Escreva `nao` na maioria dos casos | Ficha do TI | `nao` |
| **web** | Escreva `sim` (o monitor confere se o painel da central abre) | Você | `sim` |
| **troncos** | O nome da "linha" da operadora. Se houver mais de uma, separe com **vírgula** | Ficha do TI | `SIP-OPERADORA` |
| **ips_protegidos** | O IP da operadora (que **nunca** pode ser bloqueado). Mais de um? Separe com vírgula | Ficha do TI | `203.0.113.10` |
| **grupo_jid** | **Deixe vazio**. Todos os alertas vão para o grupo único dos chefes | Não precisa | (vazio) |

**Atenção:** escreva `sim` e `nao` **sem acento** (nunca "não"). O modelo já tem uma lista para escolher.

## Passo 1. Abrir a planilha modelo

1. Use o arquivo `centrais-modelo.xlsx` que você baixou do repositório (se ainda não baixou, veja [O que você precisa ter](precisa.md), item 3).
2. Dê dois cliques nele para abrir no Excel (ou no LibreOffice Calc).
3. Se aparecer uma faixa amarela *"Modo de Exibição Protegido"*, clique em **Habilitar Edição**.

**✅ Como saber que deu certo:** aparece uma tabela com uma linha azul no topo (os nomes das colunas) e **duas linhas amarelas de exemplo** (sede e filial01). Há uma segunda aba, **"Como preencher"**, com um resumo.

## Passo 2. Preencher

1. **Apague as duas linhas amarelas de exemplo** (elas têm IPs de mentira!). Clique no número da linha, botão direito, **Excluir**.
2. Na linha 2, escreva a **sede**. Na linha 3, a primeira filial, e assim por diante. **Uma linha por central.**
3. Não deixe linhas em branco no meio.
4. Não use ponto e vírgula (;) dentro de um campo.

Exemplo de como deve ficar (duas centrais):

```
chave;nome;ip;porta_ssh;ari;web;troncos;ips_protegidos;grupo_jid
sede;Central (sede);10.0.0.10;22;nao;sim;SIP-OPERADORA;203.0.113.10;
filial01;Filial 01;10.0.1.10;22;nao;sim;SIP-OPERADORA;203.0.113.10;
```

**✅ Como saber que deu certo:** cada linha tem um nome, um IP e todas as colunas preenchidas, menos `grupo_jid` (vazia de propósito).

## Passo 3. Salvar como CSV

Este é o passo mais importante. **O arquivo precisa ser salvo no tipo CSV UTF-8, com ponto e vírgula.**

### No Excel

1. Clique em **Arquivo**, depois em **Salvar como**.
2. Clique em **Procurar** (ou **Este Computador**) e escolha uma pasta, como a **Área de Trabalho**.
3. Em **Nome do arquivo**, escreva `centrais`.
4. Em **Tipo** (a caixa embaixo do nome), clique na seta e escolha **CSV UTF-8 (delimitado por vírgulas) (*.csv)**.
5. Clique em **Salvar**.
6. O Excel avisa que "alguns recursos podem se perder". Clique em **Sim** (ou **Manter formato**). É normal: o CSV é só texto.
7. Feche o Excel. Se perguntar se quer salvar alterações, escolha **Não** (o arquivo `centrais.csv` já está salvo).

**Observação:** o nome "delimitado por vírgulas" confunde, mas o Excel em português usa **ponto e vírgula** nesse tipo de arquivo, e é isso que queremos. O Passo 4 confere.

### No LibreOffice Calc

1. **Arquivo**, **Salvar como**.
2. Em **Tipo**, escolha **Texto CSV (.csv)**. Marque a caixa **Editar configurações de filtro** e clique em **Salvar**.
3. Na janela que abrir, ajuste: **Conjunto de caracteres:** `Unicode (UTF-8)`. **Delimitador de campo:** `;` (ponto e vírgula). **Delimitador de texto:** `"`. Clique em **OK**. Confirme **Usar formato Texto CSV**.

## Passo 4. Conferir o arquivo

1. Clique com o **botão direito** no arquivo `centrais.csv`. Escolha **Abrir com** e depois **Bloco de Notas**.
2. Olhe a primeira linha.

**✅ Como saber que deu certo:** a primeira linha é igual a esta, com **ponto e vírgula** entre os nomes:

```
chave;nome;ip;porta_ssh;ari;web;troncos;ips_protegidos;grupo_jid
```

**⚠️ Se der errado:**

| O que você vê | O que fazer |
|---|---|
| Aparecem **vírgulas** no lugar dos pontos e vírgulas (`chave,nome,ip...`) | O Excel salvou do jeito "inglês". Abra de novo o modelo no **LibreOffice Calc** e salve como no bloco "No LibreOffice Calc" acima, escolhendo `;` como delimitador |
| Palavras com acento aparecem estranhas (`ColÃ©gio`) | Salve de novo escolhendo **UTF-8** |
| Linhas só com `;;;;;;;;` no final | Pode deixar: o instalador ignora. |
| O instalador reclama de uma "chave" | A chave tem letra maiúscula, espaço ou acento. Troque por letras minúsculas e números |
| O instalador reclama do "IP" | Tem um espaço sobrando ou um número a menos. Compare com o exemplo (`10.0.1.10`) |

## Passo 5. Colocar o arquivo no servidor

**Onde colocar:** dentro da pasta do projeto **no servidor**, ao lado da pasta `monitor`. O WinSCP faz isso arrastando.

1. Se ainda não baixou o projeto no servidor, faça isso primeiro: veja a **Parte 4** da página [Como acessar o servidor](acessar-servidor.md). Depois volte aqui.
2. Abra o **WinSCP** e entre no servidor (como na página [Como acessar o servidor](acessar-servidor.md)).
3. Na parte da **direita**, dê dois cliques na pasta **automacao-freepbx-monitoramento** para entrar nela. Você deve ver as pastas `monitor`, `central` e `fluxos`.
4. Na parte da **esquerda**, ache o arquivo `centrais.csv` e **arraste** para a direita. Clique em **Copy**.

**✅ Como saber que deu certo:** na direita, dentro de **automacao-freepbx-monitoramento**, aparece o arquivo `centrais.csv`.

## Para mudar a planilha depois

Adicionou uma filial? Mudou um IP? É só:

1. Abrir o Excel, mudar, **salvar como CSV de novo** (Passo 3) e conferir (Passo 4).
2. **Arrastar de novo** para a pasta do projeto no servidor, escolhendo **Yes** (Sim) para substituir.
3. Rodar o comando `sudo ./monitor/instalar.sh --atualizar` (veja a página [Instalação](instalacao.md), seção "Depois: mudar a lista de filiais").

## Pronto?

- ☐ Apaguei as linhas de exemplo e preenchi as centrais de verdade.
- ☐ Salvei como **CSV UTF-8** e conferi no Bloco de Notas (ponto e vírgula).
- ☐ O arquivo `centrais.csv` está dentro da pasta **automacao-freepbx-monitoramento** no servidor.

Tudo certo? Siga para [Instalação passo a passo](instalacao.md).

