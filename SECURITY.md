# Política de segurança

## Versões suportadas

Apenas a versão mais recente da branch `main` recebe correções de segurança.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública** para falhas de segurança.

Use o relato privado do GitHub: na aba **Security** do repositório, clique em **Report a vulnerability** (*Private vulnerability reporting*). Descreva:

- o que você encontrou e onde (arquivo, comando ou página);
- como reproduzir, com passos mínimos;
- o impacto que você enxerga.

**Não inclua** dados reais de empresas (IPs, chaves, senhas, IDs de grupo). Se for necessário, use valores fictícios.

Responderemos assim que possível, normalmente em alguns dias, e combinaremos a correção e a divulgação. Este é um projeto mantido por voluntários, sem prazo garantido.

## O que está no escopo

- Scripts de `central/` e `monitor/` (permissões, escalonamento de privilégio, injeção de comandos, vazamento de segredos).
- O fluxo gerado por `fluxos/deploy.js` e as regras de `fluxos/avaliar.js`.
- A documentação, quando ela ensina uma prática insegura.

## Fora do escopo

Vulnerabilidades do **n8n**, da **Evolution API**, do **FreePBX/Asterisk**, do **Docker** ou do **WhatsApp**: reporte aos respectivos projetos. Se o nosso uso deles for o problema, aí sim, nos avise.

## Boas práticas para quem usa

Veja [docs/seguranca.md](docs/seguranca.md): painel do n8n atrás de firewall/VPN, senha forte de administrador, backup cifrado do `.env`, número de WhatsApp dedicado e **nunca** publicar a sua planilha `centrais.csv`.
