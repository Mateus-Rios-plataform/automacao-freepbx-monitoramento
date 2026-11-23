#!/bin/bash
# =============================================================================
# instalar.sh - instala o servidor de monitoramento (n8n + Evolution API + fluxo pronto).
# Rodar como root num servidor Debian 12 (ou Ubuntu 22.04/24.04) que ja exista, de preferencia dedicado.
#
# Fases (cada uma pode ser repetida sem estragar nada):
#   ./instalar.sh                      1) instala Docker, sobe n8n e Evolution, importa fluxo e credenciais
#   ./instalar.sh --whatsapp           2) pareia o WhatsApp, escolhe o grupo e ATIVA o monitoramento
#   ./instalar.sh --verificar          3) testa o acesso SSH deste servidor a cada central da planilha
#   ./instalar.sh --atualizar          depois de editar a planilha: reimporta credenciais e fluxo
#   ./instalar.sh --instrucoes         reimprime o comando que cada TI de filial deve rodar
#   ./instalar.sh --painel-local       painel do n8n so em 127.0.0.1 (acesso por tunel SSH ou proxy HTTPS)
#
# A automacao SO LE as centrais e envia avisos pelo WhatsApp. Nao altera nenhum servidor.
# =============================================================================
set -euo pipefail

APP=/opt/monitor-telefonia
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT="$(dirname "$DIR")"
CSV_ORIGEM="$KIT/centrais.csv"
N8N_VERSION_PADRAO="2.40.7"
EVO_VERSION_PADRAO="v2.3.6"
FLUXO_ID="monitorTelefonia1"
USUARIO_SSH="monitor-n8n"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '  ok: %s\n' "$*"; }
aviso(){ printf '  AVISO: %s\n' "$*"; }
erro() { printf '\nERRO: %s\n' "$*" >&2; exit 1; }

# apt com repeticao: downloads corrompidos ("Hash Sum mismatch") em redes com NAT/proxy instaveis
apt_up() {
  local n
  for n in 1 2 3 4; do
    if apt-get update -qq; then return 0; fi
    printf '  apt-get update falhou (tentativa %s/4), limpando as listas e repetindo...\n' "$n"
    rm -rf /var/lib/apt/lists/*; sleep 5
  done
  return 1
}
apt_inst() {
  local n
  for n in 1 2 3; do
    if apt-get install -y -qq --fix-missing "$@" >/dev/null; then return 0; fi
    printf '  apt falhou (tentativa %s/3), limpando o cache e repetindo...\n' "$n"
    apt-get clean; apt_up || true; sleep 5
  done
  return 1
}

uso() { sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# ---------------------------------------------------------------- argumentos
FASE="instalar"; NUMERO=""; GRUPO_NOME=""; IP_MANUAL=""; PAINEL_LOCAL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --whatsapp) FASE="whatsapp"; shift ;;
    --verificar) FASE="verificar"; shift ;;
    --atualizar) FASE="atualizar"; shift ;;
    --instrucoes) FASE="instrucoes"; shift ;;
    --painel-local) PAINEL_LOCAL=1; shift ;;
    --csv) CSV_ORIGEM="${2:?informe o arquivo}"; shift 2 ;;
    --ip) IP_MANUAL="${2:?informe o IP}"; shift 2 ;;
    --numero) NUMERO="${2:?informe o numero}"; shift 2 ;;
    --grupo) GRUPO_NOME="${2:?informe parte do nome do grupo}"; shift 2 ;;
    -h|--ajuda|--help) uso; exit 0 ;;
    *) uso; erro "opcao desconhecida: $1" ;;
  esac
done

[ "$(id -u)" -eq 0 ] || erro "rode como root (sudo -i)."

# ---------------------------------------------------------------- .env
env_get() { [ -f "$APP/.env" ] && sed -n "s/^$1=//p" "$APP/.env" | head -n1 || true; }
env_set() {
  touch "$APP/.env"; chmod 600 "$APP/.env"
  if grep -q "^$1=" "$APP/.env"; then sed -i "s|^$1=.*|$1=$2|" "$APP/.env"; else echo "$1=$2" >> "$APP/.env"; fi
}
segredo() { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
# Valida a planilha ANTES de instalar qualquer coisa (so awk, nao precisa de Node nem Docker).
# Imprime uma linha por problema, em portugues, com o numero da linha do arquivo. Sem saida = tudo certo.
validar_csv_rapido() {
  tr -d '\r' < "$CSV_ORIGEM" | sed '1s/^\xEF\xBB\xBF//' | awk -F';' '
    function limpa(s) { gsub(/^[ \t]+/, "", s); gsub(/[ \t]+$/, "", s); return s }
    /^[ \t]*#/ { next }
    /^[; \t]*$/ { next }
    !lido {
      lido = 1
      for (i = 1; i <= NF; i++) col[tolower(limpa($i))] = i
      if (!col["chave"] || !col["nome"] || !col["ip"]) {
        printf "linha %d da planilha: o cabecalho precisa ter as colunas chave, nome e ip (a primeira linha deve ser: chave;nome;ip;porta_ssh;ari;web;troncos;ips_protegidos;grupo_jid)\n", NR
        erro = 1; exit
      }
      next
    }
    {
      ch = limpa($(col["chave"])); ip = limpa($(col["ip"]))
      if (ch !~ /^[a-z][a-z0-9]*$/) { printf "linha %d da planilha: a chave \"%s\" nao serve: use so letras minusculas e numeros, sem espaco nem acento (exemplo: filial01)\n", NR, ch; erro = 1 }
      else if (ch in vistos) { printf "linha %d da planilha: a chave \"%s\" esta repetida\n", NR, ch; erro = 1 }
      vistos[ch] = 1
      if (ip !~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) { printf "linha %d da planilha: o IP \"%s\" nao parece um IP (exemplo: 10.0.1.10)\n", NR, ip; erro = 1 }
      n++
    }
    END { if (n == 0 && !erro) print "a planilha esta sem nenhuma central (so o cabecalho ou vazia)" }'
}

# Copia a planilha para a pasta do monitor ja "arrumada": tira o BOM que o Excel poe no inicio,
# o retorno de carro do Windows (CRLF) e as linhas vazias ou so com ";" (o Excel as cria as vezes).
copiar_csv() {
  sed '1s/^\xEF\xBB\xBF//' "$CSV_ORIGEM" | tr -d '\r' | grep -v '^[;[:space:]]*$' > "$APP/centrais.csv" || true
  chmod 600 "$APP/centrais.csv"
}

dc() { (cd "$APP" && docker compose "$@"); }
img_n8n() { echo "docker.n8n.io/n8nio/n8n:$(env_get N8N_VERSION)"; }
# roda Node dentro da propria imagem do n8n (nao precisa instalar Node no servidor)
node_run() {
  # ARI_USER/ARI_PASS vao pelo ambiente do processo (docker run -e NOME, sem valor): a senha nao aparece
  # na linha de comando, que qualquer usuario do servidor enxerga com "ps".
  ARI_USER="$(env_get ARI_USER)" ARI_PASS="$(env_get ARI_PASS)" \
    docker run --rm --user 0 --entrypoint node -v "$APP":/app -e ARI_USER -e ARI_PASS "$(img_n8n)" "$@"
}
evo() { # evo METODO caminho [json]
  local m="$1" p="$2" d="${3:-}"
  if [ -n "$d" ]; then curl -fsS -X "$m" -H "apikey: $(env_get EVO_APIKEY)" -H 'Content-Type: application/json' -d "$d" "http://127.0.0.1:8080$p"
  else curl -fsS -X "$m" -H "apikey: $(env_get EVO_APIKEY)" "http://127.0.0.1:8080$p"; fi
}
espera_http() { # espera_http URL segundos
  local i; for ((i = 0; i < $2; i += 3)); do curl -fs -o /dev/null "$1" && return 0; sleep 3; done; return 1
}

# ---------------------------------------------------------------- fase 1: instalacao
preflight() {
  say "Verificando o ambiente"
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ "${ID:-}" =~ ^(debian|ubuntu)$ ]] || erro "sistema nao suportado ($ID). Use Debian 12 ou Ubuntu 22.04/24.04."
  [ -f "$CSV_ORIGEM" ] || erro "planilha nao encontrada: $CSV_ORIGEM
Copie centrais.exemplo.csv para centrais.csv (na raiz do repositorio) e preencha uma linha por central."
  # a planilha precisa estar com PONTO E VIRGULA entre as colunas (o Excel em portugues faz isso ao salvar CSV)
  local primeira
  primeira="$(sed '1s/^\xEF\xBB\xBF//' "$CSV_ORIGEM" | tr -d '\r' | grep -v '^[[:space:]]*#' | grep -v '^[;[:space:]]*$' | head -n1 || true)"
  case "$primeira" in
    *\;*) ;;
    *,*) erro "a planilha esta separada por VIRGULA e o instalador espera PONTO E VIRGULA (;).
Abra o centrais.csv no Bloco de Notas: a primeira linha deve ser chave;nome;ip;porta_ssh;ari;web;troncos;ips_protegidos;grupo_jid
Se estiver com virgulas, salve de novo pelo Excel em portugues como \"CSV UTF-8\" (veja o guia docs/planilha.md)." ;;
    *) erro "a planilha esta vazia ou sem a linha de cabecalho (chave;nome;ip;porta_ssh;ari;web;troncos;ips_protegidos;grupo_jid)." ;;
  esac
  # confere cada linha ja agora: assim um erro de digitacao aparece em segundos, e nao depois da instalacao
  local problemas
  problemas="$(validar_csv_rapido || true)"
  [ -z "$problemas" ] || erro "$problemas
Corrija a planilha, salve de novo como CSV, copie para a raiz do repositorio e rode este comando outra vez. Nada foi instalado ainda."
  [ -d "$KIT/fluxos" ] || erro "pasta fluxos/ nao encontrada ao lado de monitor/. Use o kit completo."
  for p in 5678 8080; do
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p$" && [ ! -f "$APP/docker-compose.yml" ]; then
      erro "a porta $p ja esta em uso neste servidor. Use um servidor dedicado ao monitor (portas 5678 e 8080 livres)."
    fi
  done
  # Debian/Ubuntu minimos nao trazem curl: instala o basico antes de testar a internet
  if ! command -v curl >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1 || ! command -v ssh-keygen >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt_up || erro "apt-get update falhou apos 4 tentativas (sem internet, DNS ou espelho instavel?)."
    apt_inst ca-certificates curl gnupg jq openssh-client || erro "nao consegui instalar curl/jq/openssh-client."
  fi
  # 3 tentativas de 20 s (redes lentas/NAT ou com IPv6 sem rota demoram na primeira conexao)
  local tentativa net_ok=0
  for tentativa in 1 2 3; do
    if curl -fsS -m 20 -o /dev/null https://download.docker.com/ 2>/dev/null; then net_ok=1; break; fi
    sleep 3
  done
  [ "$net_ok" = 1 ] || erro "sem acesso a internet (download.docker.com). Confira DNS, proxy e firewall de saida (porta 443)."
  ok "$PRETTY_NAME, planilha $(grep -vc '^#' "$CSV_ORIGEM") linhas"
}

instalar_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then ok "Docker ja instalado"; return; fi
  say "Instalando Docker (repositorio oficial)"
  # shellcheck disable=SC1091
  . /etc/os-release
  export DEBIAN_FRONTEND=noninteractive
  apt_up || erro "apt-get update falhou."
  apt_inst ca-certificates curl gnupg jq openssh-client || erro "nao consegui instalar os pacotes basicos."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt_up || erro "apt-get update falhou (repositorio do Docker)."
  apt_inst docker-ce docker-ce-cli containerd.io docker-compose-plugin || erro "nao consegui instalar o Docker (veja a rede/espelhos do apt)."
  systemctl enable --now docker >/dev/null 2>&1 || true
  ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ,)"
}

preparar_pasta() {
  say "Preparando $APP"
  export DEBIAN_FRONTEND=noninteractive
  command -v jq >/dev/null 2>&1 || { apt_up; apt_inst jq; }
  command -v ssh-keygen >/dev/null 2>&1 || { apt_up; apt_inst openssh-client; }
  mkdir -p "$APP"/{ssh,import,fluxos}; chmod 700 "$APP" "$APP/ssh" "$APP/import"
  copiar_csv
  cp "$KIT"/fluxos/deploy.js "$KIT"/fluxos/avaliar.js "$KIT"/fluxos/gerar-credenciais.js "$APP/fluxos/"

  if [ ! -f "$APP/.env" ]; then
    local ip="${IP_MANUAL:-$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')}"
    [ -n "$ip" ] || erro "nao consegui descobrir o IP deste servidor. Use --ip <IP>."
    env_set HOST_IP "$ip"
    env_set N8N_VERSION "$N8N_VERSION_PADRAO"
    env_set EVO_VERSION "$EVO_VERSION_PADRAO"
    env_set N8N_ENCRYPTION_KEY "$(segredo)"
    env_set EVO_APIKEY "$(segredo)"
    env_set POSTGRES_PASSWORD "$(segredo)"
    env_set EVO_INSTANCE "monitor-telefonia"
    env_set GRUPO_JID ""
    env_set ARI_USER ""
    env_set ARI_PASS ""
    ok ".env criado (segredos gerados, modo 600)"
  else
    ok ".env ja existe: mantido"
  fi
  [ -n "$IP_MANUAL" ] && env_set HOST_IP "$IP_MANUAL"
  # Painel do n8n: por padrao escuta em todas as interfaces (HTTP). Com --painel-local, so em 127.0.0.1.
  if [ "$PAINEL_LOCAL" = 1 ]; then env_set N8N_BIND "127.0.0.1"; ok "painel do n8n restrito a 127.0.0.1 (use tunel SSH ou proxy HTTPS)"; fi

  # ARI (porta 8088) so e pedida se alguma central da planilha tiver ari=sim
  local col_ari
  col_ari="$(grep -v '^#' "$APP/centrais.csv" | head -n1 | tr ';' '\n' | grep -nix 'ari' | cut -d: -f1 || true)"
  if [ -n "$col_ari" ] && grep -v '^#' "$APP/centrais.csv" | tail -n +2 | cut -d';' -f"$col_ari" | grep -qiE '^(sim|s|1|true)$'; then
    [ -n "${ARI_USER:-}" ] && env_set ARI_USER "$ARI_USER"
    [ -n "${ARI_PASS:-}" ] && env_set ARI_PASS "$ARI_PASS"
    if [ -z "$(env_get ARI_USER)" ]; then
      echo "  Ha centrais com ARI habilitada (ari=sim). Informe o usuario e a senha da ARI (somente leitura)."
      read -r -p "  Usuario da ARI: " u; read -r -s -p "  Senha da ARI: " s; echo
      [ -n "$u" ] && [ -n "$s" ] || erro "usuario/senha da ARI vazios. Ou ponha ari=nao na planilha."
      env_set ARI_USER "$u"; env_set ARI_PASS "$s"
    fi
  fi

  if [ ! -f "$APP/ssh/monitor_ed25519" ]; then
    ssh-keygen -q -t ed25519 -N '' -C "monitor-n8n@$(hostname)" -f "$APP/ssh/monitor_ed25519"
    ok "par de chaves SSH criado"
  fi
  chmod 600 "$APP/ssh/monitor_ed25519"; chmod 644 "$APP/ssh/monitor_ed25519.pub"

  cat > "$APP/docker-compose.yml" <<'COMPOSE_EOF'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:${N8N_VERSION}
    restart: always
    ports:
      - "${N8N_BIND:-0.0.0.0}:5678:5678"
    environment:
      N8N_HOST: ${HOST_IP}
      N8N_PORT: "5678"
      N8N_PROTOCOL: http
      WEBHOOK_URL: http://${HOST_IP}:5678/
      N8N_SECURE_COOKIE: "${N8N_SECURE_COOKIE:-false}"
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      GENERIC_TIMEZONE: America/Sao_Paulo
      TZ: America/Sao_Paulo
      N8N_DIAGNOSTICS_ENABLED: "false"
      N8N_RUNNERS_ENABLED: "true"
    volumes:
      - n8n_data:/home/node/.n8n
  evolution-postgres:
    image: postgres:${POSTGRES_VERSION:-15-alpine}
    restart: always
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: evolution
    volumes:
      - pgdata:/var/lib/postgresql/data
  evolution-api:
    image: evoapicloud/evolution-api:${EVO_VERSION}
    restart: always
    depends_on:
      - evolution-postgres
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      SERVER_URL: http://evolution-api:8080
      AUTHENTICATION_API_KEY: ${EVO_APIKEY}
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://evolution:${POSTGRES_PASSWORD}@evolution-postgres:5432/evolution
      DATABASE_CONNECTION_CLIENT_NAME: evolution
      CACHE_REDIS_ENABLED: "false"
      CACHE_LOCAL_ENABLED: "true"
      DATABASE_SAVE_DATA_INSTANCE: "true"
      DATABASE_SAVE_DATA_NEW_MESSAGE: "false"
      DATABASE_SAVE_MESSAGE_UPDATE: "false"
      DATABASE_SAVE_DATA_CONTACTS: "false"
      DATABASE_SAVE_DATA_CHATS: "false"
      LOG_LEVEL: ERROR,WARN
      CONFIG_SESSION_PHONE_VERSION: 2.3000.1053702607
volumes:
  n8n_data:
  pgdata:
COMPOSE_EOF
  chmod 600 "$APP/docker-compose.yml"
  ok "docker-compose.yml gravado (Evolution so escuta em 127.0.0.1; n8n em :5678)"
}

subir_stack() {
  say "Subindo n8n e Evolution (a primeira vez baixa as imagens, alguns minutos)"
  dc pull -q
  dc up -d
  espera_http "http://127.0.0.1:5678/healthz" 180 || { dc logs --tail 30 n8n; erro "n8n nao respondeu em 3 min."; }
  ok "n8n respondendo"
  espera_http "http://127.0.0.1:8080/" 180 || { dc logs --tail 30 evolution-api; erro "Evolution nao respondeu em 3 min."; }
  ok "Evolution API respondendo"
}

# n8n CLI: copia o arquivo para dentro do container (dono node), importa e apaga
n8n_importar() { # n8n_importar tipo arquivo   (tipo: credentials|workflow)
  local tipo="$1" arq="$2"
  dc exec -T n8n sh -c 'umask 077; cat > /tmp/import.json' < "$arq"
  dc exec -T n8n n8n "import:$tipo" --input=/tmp/import.json >/dev/null
  dc exec -T n8n rm -f /tmp/import.json
}

importar_tudo() { # importar_tudo ativar(0|1)
  local ativar="$1" grupo; grupo="$(env_get GRUPO_JID)"
  say "Importando credenciais e fluxo no n8n"
  node_run /app/fluxos/gerar-credenciais.js /app/centrais.csv /app/ssh/monitor_ed25519 /app/import/credenciais.json "$USUARIO_SSH"
  n8n_importar credentials "$APP/import/credenciais.json"
  jq -n --arg k "$(env_get EVO_APIKEY)" --arg i "$(env_get EVO_INSTANCE)" --arg g "${grupo:-TROCAR-ID-DO-GRUPO@g.us}" \
    '{evo_url:"http://evolution-api:8080", evo_instance:$i, evo_apikey:$k, grupo_jid:$g}' > "$APP/import/config.json"
  chmod 600 "$APP/import/config.json"
  node_run /app/fluxos/deploy.js --csv /app/centrais.csv --config /app/import/config.json --id "$FLUXO_ID" --intervalo 5 --saida /app/import/fluxo.json
  n8n_importar workflow "$APP/import/fluxo.json"
  rm -f "$APP"/import/*
  ok "credenciais SSH e fluxo importados (arquivos temporarios apagados)"
  if [ "$ativar" = 1 ]; then
    dc exec -T n8n n8n "publish:workflow" --id="$FLUXO_ID" >/dev/null 2>&1 \
      || dc exec -T n8n n8n update:workflow --id="$FLUXO_ID" --active=true >/dev/null 2>&1 \
      || aviso "nao consegui ativar pela linha de comando: ative o fluxo no painel do n8n"
    dc restart n8n >/dev/null
    espera_http "http://127.0.0.1:5678/healthz" 120 || aviso "n8n demorou a voltar"
    ok "fluxo ATIVO (verifica a cada 5 minutos)"
  else
    ok "fluxo importado INATIVO (sera ativado depois do pareamento do WhatsApp)"
  fi
}

instrucoes() {
  local ip pub; ip="$(env_get HOST_IP)"; pub="$(cat "$APP/ssh/monitor_ed25519.pub")"
  local arq="$APP/instrucoes-para-as-filiais.txt"
  {
    echo "INSTRUCOES PARA O TI DE CADA CENTRAL (gerado em $(date '+%d/%m/%Y %H:%M'))"
    echo "IP do servidor de monitoramento: $ip"
    echo "Rodar COMO ROOT na central, com o script criar-usuario-monitor.sh (pasta central/ deste repositorio):"
    echo
    grep -v '^#' "$APP/centrais.csv" | tail -n +2 | while IFS=';' read -r chave nome cip _; do
      [ -n "$chave" ] || continue
      echo "--- $nome ($cip)"
      echo "./criar-usuario-monitor.sh --ip-monitor $ip --chave \"$pub\""
      echo
    done
  } > "$arq"
  chmod 644 "$arq"
  cat "$arq"
  # copia na raiz do repositorio, legivel por usuario comum (ex.: baixar pelo WinSCP). So tem o IP do monitor e a chave PUBLICA.
  local copia="$KIT/instrucoes-para-as-filiais.txt"
  if cp "$arq" "$copia" 2>/dev/null; then
    chmod 644 "$copia"
    [ -n "${SUDO_USER:-}" ] && chown "$SUDO_USER" "$copia" 2>/dev/null || true
    echo "(salvo tambem na raiz do repositorio: $copia - a chave e PUBLICA, pode ser enviada por e-mail/WhatsApp)"
  else
    echo "(salvo em $arq - a chave e PUBLICA, pode ser enviada por e-mail/WhatsApp)"
  fi
}

fase_instalar() {
  preflight
  instalar_docker
  preparar_pasta
  subir_stack
  # repetir a instalacao nao pode desativar um monitoramento que ja esta ativo (grupo ja escolhido)
  if [ -n "$(env_get GRUPO_JID)" ]; then importar_tudo 1; else importar_tudo 0; fi
  say "Instalacao do servidor de monitoramento concluida"
  instrucoes
  cat <<EOF

PROXIMOS PASSOS
  1) Envie o texto acima aos TIs das filiais (cada um roda o script na sua central).
  2) Quando os TIs terminarem:    $0 --verificar
  3) Pareie o WhatsApp e ative:   $0 --whatsapp
  4) Painel do n8n (crie a conta de administrador no primeiro acesso): http://$(env_get HOST_IP):5678
EOF
  if [ "$(env_get N8N_BIND)" = "127.0.0.1" ]; then
    echo "     (painel restrito a este servidor: do seu computador, rode  ssh -L 5678:127.0.0.1:5678 usuario@$(env_get HOST_IP)  e abra http://127.0.0.1:5678)"
  else
    echo "     ATENCAO: o painel usa HTTP. Libere a porta 5678 so para a rede de administracao (firewall/VPN) ou rode: $0 --painel-local"
  fi
}

# ---------------------------------------------------------------- fase 3: verificar SSH
fase_verificar() {
  [ -f "$APP/centrais.csv" ] || erro "rode primeiro ./instalar.sh"
  say "Testando o acesso SSH (somente leitura) a cada central"
  local falhas=0 total=0
  while IFS=';' read -r chave nome cip porta _; do
    [ -n "$chave" ] || continue
    total=$((total + 1)); porta="${porta:-22}"
    local saida rc=0
    # -n: sem isso o ssh consome a entrada do laco "while read" e as centrais seguintes sao puladas
    saida="$(ssh -n -i "$APP/ssh/monitor_ed25519" -p "$porta" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=8 \
      -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$APP/ssh/known_hosts" -o LogLevel=ERROR "$USUARIO_SSH@$cip" 2>&1)" || rc=$?
    if echo "$saida" | grep -q '^##END'; then
      local sec; sec="$(echo "$saida" | grep -c '^##')"
      printf '  [ OK ]  %-12s %-22s %s secoes lidas\n' "$chave" "$nome ($cip)" "$sec"
    else
      falhas=$((falhas + 1))
      local motivo="o check-monitor nao respondeu"
      echo "$saida" | grep -qi 'Permission denied' && motivo="usuario/chave nao instalados ou IP do monitor diferente do informado ao script"
      echo "$saida" | grep -qiE 'timed out|No route|unreachable' && motivo="sem rota/firewall bloqueando o SSH (VPN? porta?)"
      echo "$saida" | grep -qi 'refused' && motivo="SSH recusou a conexao (porta errada ou sshd parado)"
      echo "$saida" | grep -qiE 'host key verification failed|REMOTE HOST IDENTIFICATION' && motivo="a identidade (host key) da central mudou desde o 1o acesso. Se ela foi reinstalada de proposito: ssh-keygen -R $cip -f $APP/ssh/known_hosts. Se nao foi, investigue antes de confiar"
      printf '  [FALHA] %-12s %-22s %s\n' "$chave" "$nome ($cip)" "$motivo"
    fi
  done < <(grep -v '^#' "$APP/centrais.csv" | tail -n +2)
  echo
  echo "  $((total - falhas)) de $total centrais prontas."
  [ "$falhas" -eq 0 ] || exit 1
}

# ---------------------------------------------------------------- fase 2: WhatsApp
fase_whatsapp() {
  [ -f "$APP/.env" ] || erro "rode primeiro ./instalar.sh"
  local inst; inst="$(env_get EVO_INSTANCE)"
  espera_http "http://127.0.0.1:8080/" 60 || erro "a Evolution API nao esta respondendo (docker compose logs evolution-api)."

  say "Pareamento do WhatsApp"
  if [ -z "$NUMERO" ]; then
    read -r -p "Numero do WhatsApp que enviara os alertas (so digitos, com 55 e DDD, ex.: 5567999999999): " NUMERO
  fi
  NUMERO="$(echo "$NUMERO" | tr -cd '0-9')"
  [[ "$NUMERO" =~ ^[0-9]{12,13}$ ]] || erro "numero invalido: use 55 + DDD + numero (12 ou 13 digitos)."
  env_set NUMERO "$NUMERO"

  if ! evo GET /instance/fetchInstances | jq -e --arg n "$inst" '.. | objects | select(.name? == $n or .instanceName? == $n)' >/dev/null 2>&1; then
    evo POST /instance/create "$(jq -n --arg n "$inst" --arg num "$NUMERO" '{instanceName:$n, integration:"WHATSAPP-BAILEYS", qrcode:false, number:$num}')" >/dev/null
    ok "instancia $inst criada"
  fi

  local estado; estado() { evo GET "/instance/connectionState/$inst" 2>/dev/null | jq -r '.instance.state // .state // "desconhecido"'; }
  if [ "$(estado)" != "open" ]; then
    echo "  No celular: WhatsApp > Aparelhos conectados > Conectar um aparelho > Conectar com numero de telefone"
    echo "  e digite o codigo abaixo. O codigo vale menos de 1 minuto; um novo e gerado automaticamente."
    local t
    for ((t = 0; t < 8; t++)); do
      local cod; cod="$(evo GET "/instance/connect/$inst?number=$NUMERO" 2>/dev/null | jq -r '.pairingCode // empty')"
      [ -n "$cod" ] && printf '\n      CODIGO:  %s   (%s)\n' "$cod" "$(date +%H:%M:%S)" || aviso "nao recebi o codigo, tentando de novo"
      local w
      for ((w = 0; w < 12; w++)); do sleep 4; [ "$(estado)" = "open" ] && break 2; done
    done
  fi
  [ "$(estado)" = "open" ] || erro "WhatsApp nao conectou. Rode --whatsapp de novo."
  ok "WhatsApp conectado"

  say "Escolha do grupo de alertas"
  echo "  Crie (ou tenha) um grupo no WhatsApp que inclua o numero $NUMERO e as pessoas que devem receber os alertas."
  local grupos escolhido jid nome
  while true; do
    grupos="$(evo GET "/group/fetchAllGroups/$inst?getParticipants=false" 2>/dev/null | jq -r '.[] | "\(.id)\t\(.subject)"' || true)"
    if [ -z "$grupos" ]; then
      aviso "nenhum grupo encontrado ainda."
      read -r -p "  Crie o grupo e tecle Enter para procurar de novo (ou Ctrl+C para sair) " _ || exit 1
      continue
    fi
    if [ -z "$GRUPO_NOME" ]; then
      echo "$grupos" | awk -F'\t' '{printf "   %d) %s\n", NR, $2}'
      read -r -p "  Numero do grupo de alertas: " escolhido
      jid="$(echo "$grupos" | sed -n "${escolhido}p" | cut -f1)"
    else
      jid="$(echo "$grupos" | awk -F'\t' -v n="$GRUPO_NOME" 'tolower($2) ~ tolower(n) {print $1; exit}')"
      [ -n "$jid" ] || { aviso "nenhum grupo com '$GRUPO_NOME' no nome."; GRUPO_NOME=""; continue; }
    fi
    [ -n "${jid:-}" ] || { aviso "opcao invalida"; continue; }
    nome="$(echo "$grupos" | awk -F'\t' -v j="$jid" '$1==j {print $2}')"
    break
  done
  env_set GRUPO_JID "$jid"
  ok "grupo escolhido: $nome"

  importar_tudo 1

  say "Enviando mensagem de teste ao grupo"
  evo POST "/message/sendText/$inst" "$(jq -n --arg n "$jid" --arg t "✅ *Monitor de telefonia instalado*
Servidor: $(hostname) ($(env_get HOST_IP))
A partir de agora os alertas das centrais chegam neste grupo. Verificacao a cada 5 minutos, somente leitura." '{number:$n, text:$t}')" >/dev/null \
    && ok "mensagem de teste enviada" || aviso "nao consegui enviar a mensagem de teste"
}

fase_atualizar() {
  [ -f "$APP/.env" ] || erro "rode primeiro ./instalar.sh"
  [ -f "$CSV_ORIGEM" ] || erro "planilha nao encontrada: $CSV_ORIGEM"
  copiar_csv
  cp "$KIT"/fluxos/deploy.js "$KIT"/fluxos/avaliar.js "$KIT"/fluxos/gerar-credenciais.js "$APP/fluxos/"
  if [ -n "$(env_get GRUPO_JID)" ]; then importar_tudo 1; else importar_tudo 0; fi
}

case "$FASE" in
  instalar) fase_instalar ;;
  whatsapp) fase_whatsapp ;;
  verificar) fase_verificar ;;
  atualizar) fase_atualizar ;;
  instrucoes) [ -f "$APP/.env" ] || erro "rode primeiro ./instalar.sh"; instrucoes ;;
esac
