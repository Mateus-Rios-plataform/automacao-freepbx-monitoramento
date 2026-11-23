// Gera o arquivo de credenciais para `n8n import:credentials` a partir do CSV de centrais.
// Uso: node fluxos/gerar-credenciais.js <centrais.csv> <chave-privada> <saida.json> [usuario-ssh]
// Variaveis opcionais: ARI_USER e ARI_PASS (obrigatorias se alguma central tiver ari=sim).
// O arquivo gerado contem a chave privada: o instalador grava com modo 600 e apaga depois de importar.
const fs = require('fs');
const path = require('path');
const { lerCentrais } = require(path.join(__dirname, 'deploy.js'));

const [csv, chavePriv, saida, usuario = 'monitor-n8n'] = process.argv.slice(2);
if (!csv || !chavePriv || !saida) { console.error('uso: gerar-credenciais.js <csv> <chave-privada> <saida.json> [usuario]'); process.exit(2); }

let centrais;
try { centrais = lerCentrais(csv); } catch (e) { console.error('ERRO: ' + e.message); process.exit(4); }   // mensagem limpa, sem trecho de codigo
const privateKey = fs.readFileSync(chavePriv, 'utf8');
const creds = centrais.map((c) => ({
  id: 'ssh_' + c.chave, name: 'SSH ' + c.chave, type: 'sshPrivateKey',
  data: { host: c.ip, port: c.porta_ssh, username: usuario, privateKey, passphrase: '' },
}));
if (centrais.some((c) => c.ari)) {
  if (!process.env.ARI_USER || !process.env.ARI_PASS) { console.error('Ha central com ari=sim: defina ARI_USER e ARI_PASS no .env'); process.exit(3); }
  creds.push({ id: 'ari_central', name: 'ARI Asterisk', type: 'httpBasicAuth', data: { user: process.env.ARI_USER, password: process.env.ARI_PASS } });
}
fs.writeFileSync(saida, JSON.stringify(creds, null, 2), { mode: 0o600 });
console.log(`credenciais geradas: ${creds.length} (${centrais.length} SSH${centrais.some((c) => c.ari) ? ' + ARI' : ''})`);
