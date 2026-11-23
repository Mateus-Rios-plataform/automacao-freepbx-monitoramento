---
title: "Monitor de telefonia: comece aqui"
---

# Monitor de telefonia: comece aqui

Esta é a porta de entrada. Se é a sua primeira vez, **leia com calma e siga a ordem**. Você não precisa saber programar: cada passo diz o que clicar ou o que copiar e colar, e como saber se deu certo.

Versão: 1.0.0.

## O que é isso?

É um "vigia" que olha, a cada 5 minutos, as centrais telefônicas da sede e das filiais. Se alguma coisa der errado (a central parou, a linha da operadora caiu, o disco encheu), ele manda uma mensagem no WhatsApp do grupo dos chefes, para o problema ser resolvido antes de as pessoas ficarem sem telefone.

## O que o monitor faz e o que ele NÃO faz

| O monitor FAZ | O monitor NÃO FAZ |
|---|---|
| Só **lê** informações das centrais | Não muda nenhuma configuração |
| Avisa no WhatsApp quando algo falha | Não reinicia nada sozinho |
| Mostra o comando de correção no aviso, só como texto | Não executa comando de correção |
| Funciona com um usuário que só tem permissão de leitura | Não mexe em firewall, senhas nem ramais |

## Quem faz o quê

| Quem | O que faz | Páginas |
|---|---|---|
| **Equipe central** | Instala o monitor no servidor, prepara a planilha, liga o WhatsApp e acompanha | [O que você precisa ter](precisa.md), [Acessar o servidor](acessar-servidor.md), [Planilha](planilha.md), [Instalação](instalacao.md), [WhatsApp](whatsapp.md), [Painel](painel-n8n.md) |
| **TI de cada filial** | Prepara a central da sua filial (um script, uns 10 minutos) e devolve uma ficha | [Guia do TI da filial](ti-filial.md) |
| **Responsável pelo servidor (infraestrutura)** | Entrega o servidor Linux pronto e a senha de acesso | [O que você precisa ter](precisa.md) |

## Por onde começar (na ordem)

1. [O que você precisa ter](precisa.md): a lista do que juntar antes de começar. **Comece por aqui.** (30 minutos)
2. [Glossário](glossario.md): o significado das palavras técnicas. Consulte sempre que uma palavra não fizer sentido.
3. [Como acessar o servidor e copiar arquivos](acessar-servidor.md): instalar os programas no seu computador, entrar no servidor e baixar o projeto. (20 minutos)
4. [Como criar a planilha de centrais (CSV)](planilha.md): a lista das filiais que o monitor vai vigiar. (15 minutos)
5. [Instalação passo a passo](instalacao.md): instalar o monitor no servidor. (20 a 30 minutos)
6. **Em paralelo:** cada filial segue o [Guia do TI da filial](ti-filial.md) e devolve a ficha.
7. [Ligar o WhatsApp](whatsapp.md): parear o número e escolher o grupo. (10 minutos)
8. [Conhecer o painel do n8n](painel-n8n.md): ver se está funcionando. (10 minutos)

Onde está o código: no [repositório no GitHub](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento). O projeto é baixado direto no servidor (veja [Como acessar o servidor](acessar-servidor.md), Parte 4). O que há em cada pasta está em [O que tem no repositório](arquivos.md).

## Três regras de ouro

1. **Siga a ordem.** Cada passo depende do anterior.
2. **Copie e cole os comandos.** Não digite à mão: uma letra errada muda tudo. Os comandos aparecem em caixas cinzas, e cada um vem com "o que ele faz" e "como saber que deu certo".
3. **Senhas e chaves são só suas.** Nunca coloque senha, chave ou o arquivo `.env` no repositório, em e-mail ou em grupo de WhatsApp.

## Quanto tempo leva

Mais ou menos **1 hora e meia** para a equipe central, mais cerca de **10 minutos por filial** para o TI de cada uma (que pode fazer ao mesmo tempo).

## Palavras que você vai ver

Todas as palavras técnicas estão explicadas no [Glossário](glossario.md). Se travar em alguma, procure lá.

## Precisa de ajuda?

Fale com a pessoa da equipe central responsável pelo monitor. Ao pedir ajuda, diga **em qual página e em qual passo** você parou e **copie a mensagem que apareceu na tela** (ou tire uma foto). Isso ajuda muito.


## Referência

- [Como o monitor funciona](arquitetura.md): as peças, o que é verificado e quando ele avisa.
- [Segurança](seguranca.md): o que já está protegido e o que é responsabilidade sua.
- [Solução de problemas](solucao-de-problemas.md): o que fazer quando algo não funciona.
- [Perguntas frequentes](faq.md)
- [O que tem no repositório](arquivos.md)
- [Glossário](glossario.md)

## Projeto

Código aberto sob a [licença MIT](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/LICENSE). Veja o [README](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/README.md), o [CHANGELOG](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/CHANGELOG.md) e como [contribuir](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/CONTRIBUTING.md).
