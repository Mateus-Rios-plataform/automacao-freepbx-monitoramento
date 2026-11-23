# FreePBX automation: monitoring with n8n and WhatsApp

**English** | [Português](README.md)

Checks your **FreePBX/Asterisk** phone systems (headquarters and branches) every 5 minutes and **sends a WhatsApp alert** when something breaks: Asterisk stopped, web panel down, carrier trunk unreachable, disk full, carrier IP banned by Fail2Ban.

> **Read-only.** The monitor never changes a PBX. It logs in with a **read-only** user restricted (forced command) to a single query script.

> The detailed, step-by-step documentation is written in **Brazilian Portuguese** (see [docs/](docs/index.md)). This page is a short summary.

## How it works

```text
n8n (every 5 min) ──► web panel / ARI / read-only SSH ──► alert rules ──► WhatsApp (Evolution API)
```

- **n8n** schedules and runs the workflow, which is generated from a spreadsheet (`centrais.csv`) listing your PBXs.
- **Evolution API** delivers the messages to a WhatsApp group.
- Each PBX gets **one script** (`central/criar-usuario-monitor.sh`) that creates the read-only user.

## Requirements

- A dedicated Linux server: **Debian 12** or **Ubuntu 22.04/24.04**, 2 CPUs, 3 GB RAM, 9 GB disk, internet access, and reachability of port 22 on every PBX (LAN or VPN).
- **FreePBX** PBXs (tested with FreePBX 15, `chan_sip` and PJSIP) and an administrator for each.
- A **dedicated WhatsApp number** and a group to receive alerts.

## Quick start

On the monitoring server (as a user with `sudo`):

```bash
sudo apt-get update && sudo apt-get install -y git curl
git clone https://github.com/Mateus-Rios-plataform/automacao-freepbx-monitoramento.git
cd automacao-freepbx-monitoramento

cp centrais.exemplo.csv centrais.csv   # edit: one line per PBX (semicolon-separated)
sudo ./monitor/instalar.sh             # installs Docker, n8n and Evolution API, imports the workflow
```

The installer prints, for each PBX, the command that its administrator must run. Then:

```bash
sudo ./monitor/instalar.sh --verificar   # checks read-only access to every PBX
sudo ./monitor/instalar.sh --whatsapp    # pairs WhatsApp, picks the group and ACTIVATES monitoring
```

## Alerts

| Message | When |
|---|---|
| 🚨 **PROBLEMA NA TELEFONIA** | A problem persists for 2 consecutive checks |
| ✅ **Telefonia normalizada** | Everything is back to normal |
| 🔄 **Asterisk reiniciou** | Asterisk uptime reset |
| ⚠️ **ATENÇÃO (prevenção)** | A risk that has not caused an outage yet (e.g. Fail2Ban may ban your carrier) |

Alert messages are in Portuguese. The text lives in `fluxos/avaliar.js`.

## Security

Access to PBXs is read-only and restricted by an SSH key with a forced command. The n8n panel is served over plain HTTP: keep it behind a firewall/VPN or an HTTPS reverse proxy. See [docs/seguranca.md](docs/seguranca.md) (Portuguese) and [SECURITY.md](SECURITY.md).

## Limitations

- **No warranty** (MIT license). Try it on a staging PBX first.
- **Evolution API is unofficial**: your WhatsApp number may get banned. Use a dedicated number.
- Validated in a lab with FreePBX 15 and automated tests only.
- Do not run the installer on the FreePBX server itself.
- Not affiliated with FreePBX, Sangoma, n8n, Evolution API or WhatsApp/Meta.

## Tests

```bash
node fluxos/testes/avaliar.test.js
```

No dependencies (Node.js 18+).

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under the [MIT License](LICENSE).
