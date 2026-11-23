#!/bin/bash
# =============================================================================
# criar-usuario-monitor.sh
# Prepara UMA central FreePBX/Asterisk para ser monitorada pelo n8n.
# Rodar como root, no servidor da central.
#
# O que faz (e SO isso):
#   1. cria o usuario "monitor-n8n" (sem senha, so entra por chave SSH)
#   2. instala /usr/local/sbin/check-monitor (script SOMENTE LEITURA, dono root)
#   3. cria /etc/sudoers.d/monitor-n8n liberando APENAS esse script
#   4. grava a chave publica do monitor, restrita: so roda o check-monitor,
#      so a partir do(s) IP(s) informado(s), sem terminal e sem tunel
#   5. testa e mostra um resumo
# NAO altera firewall, Fail2Ban, Asterisk nem o sshd_config. Para desfazer:
# remover-usuario-monitor.sh
# =============================================================================
set -u

USUARIO="monitor-n8n"
CHECK="/usr/local/sbin/check-monitor"
SUDOERS="/etc/sudoers.d/monitor-n8n"

emitir_check() {
cat <<'CHECK_EOF'
#!/bin/bash
# check-monitor - SOMENTE LEITURA. Chamado pelo usuario monitor-n8n via sudo.
# Ignora qualquer argumento ou comando enviado pelo cliente SSH: roda sempre
# a mesma lista fixa de consultas abaixo.
export PATH=/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/sbin:/usr/local/bin
export LC_ALL=C
T() { timeout "$1" "${@:2}" 2>&1; }
ast() { T 15 asterisk -rx "$1"; }

echo '##UPTIME';   ast 'core show uptime seconds'
echo '##IAX';      ast 'iax2 show peers'
echo '##PJSIP';    ast 'pjsip show registrations'
echo '##SIPREG';   ast 'sip show registry'
echo '##SIPPEERS'; ast 'sip show peers'
echo '##CHAN';     ast 'core show channels count'
echo '##DISK';     df -P / /var 2>&1 | tail -n +2
echo '##LOAD';     cat /proc/loadavg

echo '##F2B'
if command -v fail2ban-client >/dev/null 2>&1; then
  jails=$(T 10 fail2ban-client status | sed -n 's/.*Jail list:[[:space:]]*//p' | tr -d ',')
  echo "jails: $jails"
  for j in $jails; do
    echo "--- jail $j"
    T 10 fail2ban-client status "$j"
    echo "ignoreip: $(T 10 fail2ban-client get "$j" ignoreip | tr '\n' ' ')"
  done
else
  echo 'fail2ban ausente'
fi

echo '##F2BCONF'
grep -rH '^[[:space:]]*ignoreip' /etc/fail2ban/jail.local /etc/fail2ban/jail.d 2>/dev/null

echo '##IPT'
for c in $(iptables -S 2>/dev/null | sed -n 's/^-N \(fail2ban.*\)/\1/p'); do
  echo "--- chain $c"
  iptables -nL "$c" 2>&1 | head -n 60
done

echo '##SCANNER'
f=/var/log/asterisk/full
if [ -r "$f" ]; then
  echo "unknown_did: $(tail -n 50000 "$f" | grep -c 'unknown call with DID')"
  tail -n 50000 "$f" | grep -o 'Friendly Scanner from [0-9.]*' | sort | uniq -c | sort -rn | head -n 5
fi
echo '##END'
CHECK_EOF
}

uso() {
cat <<'USO_EOF'
Uso (como root):
  ./criar-usuario-monitor.sh --ip-monitor IP[,IP...] --chave "ssh-ed25519 AAAA... comentario"
  ./criar-usuario-monitor.sh --ip-monitor IP[,IP...] --chave-arquivo /caminho/monitor.pub
  ./criar-usuario-monitor.sh --ver-check     (mostra o script que a chave podera executar)

  --ip-monitor   IP (ou rede CIDR) do servidor de monitoramento. A chave so funciona a partir dele.
  --chave        chave PUBLICA fornecida pela equipe central (uma linha)
  --chave-arquivo  o mesmo, lendo de arquivo
USO_EOF
}

erro() { echo "ERRO: $*" >&2; exit 1; }
aviso() { echo "AVISO: $*"; }

IPS=""; CHAVE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --ip-monitor) IPS="${2:-}"; shift 2 ;;
    --chave) CHAVE="${2:-}"; shift 2 ;;
    --chave-arquivo) [ -r "${2:-}" ] || erro "arquivo de chave nao encontrado: ${2:-}"; CHAVE="$(head -n 1 "$2")"; shift 2 ;;
    --ver-check) emitir_check; exit 0 ;;
    -h|--ajuda|--help) uso; exit 0 ;;
    *) uso; erro "opcao desconhecida: $1" ;;
  esac
done

[ "$(id -u)" -eq 0 ] || erro "rode como root."
[ -n "$IPS" ] && [ -n "$CHAVE" ] || { uso; erro "informe --ip-monitor e --chave."; }

# --- validacoes de entrada ---------------------------------------------------
IFS=',' read -r -a LISTA_IPS <<< "$IPS"
for ip in "${LISTA_IPS[@]}"; do
  [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}(/[0-9]{1,2})?$ ]] || erro "IP invalido: $ip"
done
[[ "$CHAVE" =~ ^(ssh-ed25519|ecdsa-sha2-nistp256)\ [A-Za-z0-9+/]+=*(\ [^\"]*)?$ ]] \
  || erro "chave publica invalida. Use a linha completa (ssh-ed25519 AAAA...), sem aspas dentro. Chaves RSA nao sao aceitas."
case "$CHAVE" in *PRIVATE*) erro "isso parece uma chave PRIVADA. Envie/use apenas a chave PUBLICA (.pub)." ;; esac

command -v visudo >/dev/null 2>&1 || erro "visudo nao encontrado (pacote sudo)."
command -v sudo >/dev/null 2>&1 || erro "sudo nao instalado."
grep -Eq '^[#@]includedir[[:space:]]+/etc/sudoers.d' /etc/sudoers \
  || erro "/etc/sudoers nao inclui /etc/sudoers.d. Nada foi alterado."

# --- 1) usuario ---------------------------------------------------------------
if id "$USUARIO" >/dev/null 2>&1; then
  echo "[1/5] usuario $USUARIO ja existe: mantido, chave sera atualizada."
else
  useradd -m -s /bin/bash -c "Monitoramento n8n (somente leitura)" "$USUARIO" || erro "useradd falhou."
  echo "[1/5] usuario $USUARIO criado."
fi
# '*' = sem senha valida, mas o SSH por chave continua funcionando
usermod -p '*' "$USUARIO" || erro "nao foi possivel bloquear a senha."
HOME_DIR="$(getent passwd "$USUARIO" | cut -d: -f6)"

# --- 2) script de leitura -----------------------------------------------------
TMP_CHECK="$(mktemp)"
emitir_check > "$TMP_CHECK"
install -m 0755 -o root -g root "$TMP_CHECK" "$CHECK" || erro "falha ao instalar $CHECK."
rm -f "$TMP_CHECK"
echo "[2/5] $CHECK instalado (dono root, nao editavel pelo usuario)."

# --- 3) sudoers ----------------------------------------------------------------
TMP_SUDO="$(mktemp)"
cat > "$TMP_SUDO" <<EOF
# Gerado por criar-usuario-monitor.sh - permite SOMENTE o script de leitura.
Defaults:$USUARIO !requiretty
$USUARIO ALL=(root) NOPASSWD: $CHECK ""
EOF
if ! visudo -cf "$TMP_SUDO" >/dev/null 2>&1; then
  rm -f "$TMP_SUDO"
  erro "sudoers gerado e invalido. Nada foi instalado no sudo."
fi
install -m 0440 -o root -g root "$TMP_SUDO" "$SUDOERS" || erro "falha ao instalar $SUDOERS."
rm -f "$TMP_SUDO"
echo "[3/5] $SUDOERS criado e validado com visudo."

# --- 4) chave SSH restrita ------------------------------------------------------
install -d -m 0700 -o "$USUARIO" -g "$(id -gn "$USUARIO")" "$HOME_DIR/.ssh"
FROM="$(IFS=,; echo "${LISTA_IPS[*]}")"
OPCOES="from=\"$FROM\",command=\"/usr/bin/sudo $CHECK\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-user-rc"
printf '%s %s\n' "$OPCOES" "$CHAVE" > "$HOME_DIR/.ssh/authorized_keys"
chown "$USUARIO:$(id -gn "$USUARIO")" "$HOME_DIR/.ssh/authorized_keys"
chmod 600 "$HOME_DIR/.ssh/authorized_keys"
command -v restorecon >/dev/null 2>&1 && restorecon -R "$HOME_DIR/.ssh" >/dev/null 2>&1
echo "[4/5] chave gravada (restrita ao IP $FROM e ao comando fixo)."

# --- 5) teste -------------------------------------------------------------------
SAIDA="$(su -s /bin/bash "$USUARIO" -c "sudo -n $CHECK" 2>&1)"
if echo "$SAIDA" | grep -q '^##END'; then
  echo "[5/5] TESTE OK: o usuario consegue rodar o check-monitor via sudo."
else
  echo "[5/5] TESTE FALHOU. Saida:"; echo "$SAIDA" | head -n 15
  erro "o check-monitor nao rodou. Rode remover-usuario-monitor.sh se quiser desfazer."
fi
echo "$SAIDA" | grep -q 'Unable to connect' && aviso "Asterisk parece parado neste momento (asterisk -rx nao conectou)."

# --- avisos uteis ------------------------------------------------------------------
echo
echo "================= RESUMO ================="
echo "Usuario .......: $USUARIO (sem senha, shell sem terminal remoto)"
echo "Chave .........: $(echo "$CHAVE" | ssh-keygen -lf /dev/stdin 2>/dev/null | cut -d' ' -f1-2)"
echo "Permitido de ..: $FROM"
echo "Comando unico .: sudo $CHECK  (veja: $0 --ver-check)"
echo "SSH ...........: $(ss -ltn 2>/dev/null | awk '/:22 /{print "porta 22 ouvindo"; exit}')"

SSHD="$(sshd -T 2>/dev/null)"
if echo "$SSHD" | grep -qi '^pubkeyauthentication no'; then
  aviso "sshd com PubkeyAuthentication=no: a chave nao vai funcionar ate habilitar."
fi
if echo "$SSHD" | grep -qiE '^allowusers ' && ! echo "$SSHD" | grep -iE '^allowusers ' | grep -qw "$USUARIO"; then
  aviso "sshd tem AllowUsers e $USUARIO nao esta nele: adicione para o monitor entrar."
fi
if echo "$SSHD" | grep -qiE '^allowgroups '; then
  aviso "sshd tem AllowGroups: confirme que o grupo de $USUARIO esta liberado."
fi

echo
echo "PROXIMOS PASSOS (NAO executados por este script):"
echo " - Firewall: o IP do monitor precisa alcancar o SSH (porta 22) desta central."
command -v fwconsole >/dev/null 2>&1 && echo "   FreePBX: fwconsole firewall trust $FROM   (apenas IP unico; revise antes)"
if command -v fail2ban-client >/dev/null 2>&1; then
  echo " - Fail2Ban: inclua o IP do monitor em ignoreip, SEPARADO POR ESPACO (nao por virgula):"
  echo "   ignoreip = 127.0.0.1 $FROM"
  echo "   depois: fail2ban-client reload  e  fail2ban-client get <jail> ignoreip"
fi
echo " - Informe a equipe central: nome da filial, IP desta central e a saida acima."
echo "Para desfazer tudo: remover-usuario-monitor.sh"
exit 0
