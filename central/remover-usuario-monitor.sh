#!/bin/bash
# remover-usuario-monitor.sh - desfaz o criar-usuario-monitor.sh (rodar como root).
# Remove o usuario monitor-n8n, o arquivo do sudo e o script check-monitor.
# Uso: ./remover-usuario-monitor.sh [--sim]   (--sim = nao pergunta)
set -u
USUARIO="monitor-n8n"
CHECK="/usr/local/sbin/check-monitor"
SUDOERS="/etc/sudoers.d/monitor-n8n"

[ "$(id -u)" -eq 0 ] || { echo "ERRO: rode como root." >&2; exit 1; }

if [ "${1:-}" != "--sim" ]; then
  read -r -p "Remover usuario $USUARIO, $SUDOERS e $CHECK? [s/N] " r
  case "$r" in s|S|sim|SIM) ;; *) echo "Cancelado."; exit 0 ;; esac
fi

pkill -u "$USUARIO" 2>/dev/null
id "$USUARIO" >/dev/null 2>&1 && userdel -r "$USUARIO" 2>/dev/null && echo "usuario removido."
[ -f "$SUDOERS" ] && rm -f "$SUDOERS" && echo "$SUDOERS removido."
[ -f "$CHECK" ] && rm -f "$CHECK" && echo "$CHECK removido."
id "$USUARIO" >/dev/null 2>&1 && { echo "ERRO: usuario ainda existe." >&2; exit 1; }
echo "Pronto. O monitor nao tem mais acesso a esta central."
echo "Obs.: o firewall e o Fail2Ban NAO foram alterados por nenhum dos scripts; se voce liberou o IP do monitor ali, remova manualmente."
