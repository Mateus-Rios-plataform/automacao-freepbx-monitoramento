---
title: "Segurança"
---

# Segurança

[⬅ Início](index.md)

O monitor foi pensado para **ler e avisar, nunca alterar**. Mesmo assim, ele tem acesso de leitura às suas centrais e guarda chaves no servidor. Esta página diz o que está protegido e o que **você** precisa fazer.

Para **reportar uma falha de segurança** no projeto, veja [SECURITY.md](https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento/blob/main/SECURITY.md).

## O que o projeto já faz por você

| Proteção | Como |
|---|---|
| Acesso às centrais só de leitura | O usuário `monitor-n8n` não tem senha e a chave SSH dele só executa o script `check-monitor` (comando forçado, sem terminal, sem redirecionamento de portas, só a partir do IP do monitor) |
| O script de leitura é só consulta | Pertence ao root; só usa comandos `show` do Asterisk, `fail2ban-client status/get` e `iptables -S/-nL`. Testes automáticos garantem isso |
| Segredos fora do código | A planilha real, as chaves e o `.env` ficam só no servidor (permissão 600) e estão no `.gitignore` |
| Evolution API fechada | Escuta só em `127.0.0.1:8080` (não é acessível pela rede) |
| Chaves geradas no servidor | A chave SSH do monitor, a chave da Evolution e a chave de criptografia do n8n são geradas na instalação |
| Instalador seguro de repetir | Pode rodar de novo sem estragar nada |
| Só chaves modernas | O script da central aceita apenas chaves `ssh-ed25519` e `ecdsa-sha2-nistp256` (RSA não) |
| Versões fixas | As imagens do n8n e da Evolution API têm versão fixa. O PostgreSQL segue a série `15-alpine`, para receber correções de segurança. Você pode fixar outra versão com `N8N_VERSION`, `EVO_VERSION` e `POSTGRES_VERSION` no `/opt/monitor-telefonia/.env` (e rodar o instalador de novo) |

## O que é responsabilidade sua

1. **Proteger o painel do n8n (porta 5678).** Por padrão ele escuta em todas as interfaces, em HTTP simples. Você tem duas opções: (a) liberar a porta só para a rede de administração (firewall ou VPN); ou (b) rodar `sudo ./monitor/instalar.sh --painel-local`, que faz o painel escutar **só em 127.0.0.1**. Nesse caso, acesse por túnel SSH (`ssh -L 5678:127.0.0.1:5678 usuario@IP-DO-SERVIDOR`, depois abra `http://127.0.0.1:5678`) ou coloque um proxy HTTPS na frente (e então defina `N8N_SECURE_COOKIE=true` no `/opt/monitor-telefonia/.env` e rode o instalador de novo). **Nunca** exponha a porta 5678 na internet.
2. **Criar uma senha forte** para a conta de administrador do n8n (veja [Painel do n8n](painel-n8n.md)) e guardá-la em um gerenciador de senhas.
3. **Guardar o `/opt/monitor-telefonia/.env`**: ele tem as chaves. Faça backup em local seguro e cifrado.
4. **Dedicar um número de WhatsApp** só para o monitor (a Evolution API não é oficial e o número pode ser bloqueado).
5. **Manter o servidor atualizado** (`sudo apt-get update && sudo apt-get upgrade`) e conferir de tempos em tempos as versões do n8n e da Evolution API.
6. **Liberar só o necessário no firewall das filiais:** o IP do monitor na porta 22 (SSH).
7. **Não colocar dados reais no GitHub**: planilha, IPs, chaves, IDs de grupo de WhatsApp. Se você fizer um *fork*, mantenha-o **privado**.

## Riscos aceitos (e como reduzi-los)

| Risco | Observação | Como reduzir |
|---|---|---|
| Painel do n8n em HTTP (padrão) | O tráfego (inclusive a senha) pode ser lido na rede interna | `--painel-local` + túnel SSH, VPN, firewall ou proxy HTTPS |
| A chave da Evolution API fica no nó **Config** do fluxo | Quem tem acesso ao painel do n8n pode ver a chave | Dê acesso ao painel só a quem precisa; use uma conta de administrador forte |
| Chave privada do monitor no servidor, **sem senha (passphrase)** | É necessário para o monitor entrar sozinho a cada 5 minutos. O arquivo tem permissão 600. Se o servidor for invadido, o invasor só consegue **ler** o mesmo relatório que o monitor lê (comando forçado, só do IP do monitor) | Proteja o servidor; para cortar o acesso, rode `remover-usuario-monitor.sh` na central |
| Primeira conexão do `--verificar` confia na identidade da central (*trust on first use*) | Se alguém se passasse pela central naquele momento, o monitor aprenderia a identidade errada | Rode o `--verificar` na rede interna ou VPN; se aparecer "identidade (host key) mudou", confirme com o TI antes de continuar |
| WhatsApp não oficial | Bloqueio do número | Número dedicado; mensagens poucas e úteis |

## Se você suspeitar de um problema

1. Rode `./remover-usuario-monitor.sh` nas centrais afetadas (corta o acesso do monitor).
2. Troque a senha do administrador do n8n e gere uma nova chave SSH (apague `/opt/monitor-telefonia/ssh/monitor_ed25519*` e rode de novo `sudo ./monitor/instalar.sh`, que é seguro repetir; depois rode `sudo ./monitor/instalar.sh --instrucoes` e repita o script nas centrais com o comando novo).
3. Se o `.env` vazou, troque as chaves (reinstale em um servidor novo) e **reconecte o WhatsApp** com `sudo ./monitor/instalar.sh --whatsapp`, depois de desconectar o aparelho antigo no celular (Aparelhos conectados).
