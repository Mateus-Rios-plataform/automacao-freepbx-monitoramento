# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-11-23

Primeira versão pública.

### Incluído
- Fluxo do n8n gerado a partir de uma planilha (`centrais.csv`), com verificação a cada 5 minutos do painel web, da ARI (opcional) e de um relatório somente leitura por SSH (`check-monitor`).
- Regras de alerta: 🚨 problema (após 2 verificações seguidas, com lembrete), ✅ normalizado, 🔄 reinício do Asterisk e ⚠️ prevenção (Fail2Ban, `ignoreip`, "Friendly Scanner").
- Instalador `monitor/instalar.sh` (Docker, n8n, Evolution API e PostgreSQL) com fases `--whatsapp`, `--verificar`, `--atualizar` e `--instrucoes`.
- Scripts da central: `criar-usuario-monitor.sh` (usuário `monitor-n8n` somente leitura, chave SSH com comando forçado) e `remover-usuario-monitor.sh`.
- Planilha modelo (`.xlsx` e `.csv`) tolerante a BOM e quebras de linha do Windows.
- Documentação passo a passo em português para quem não é técnico, FAQ, solução de problemas e segurança.
- Testes automáticos (`node fluxos/testes/avaliar.test.js`), incluindo a garantia de que a automação só lê.

### Segurança
- `--painel-local` no instalador: o painel do n8n escuta só em `127.0.0.1` (acesso por túnel SSH ou proxy HTTPS).
- `N8N_BIND`, `N8N_SECURE_COOKIE`, `N8N_VERSION`, `EVO_VERSION` e `POSTGRES_VERSION` configuráveis pelo `.env`.
- O script da central não aceita mais chaves `ssh-rsa`.
- GitHub Actions fixadas por SHA de commit.

### Limitações conhecidas
- Validado em laboratório com FreePBX 15; sem teste em outras versões.
- A Evolution API não é oficial: risco de bloqueio do número de WhatsApp.
- O painel do n8n usa HTTP; proteja com firewall/VPN ou proxy HTTPS.
