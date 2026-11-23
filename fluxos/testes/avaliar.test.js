// Testes offline do nó "Avaliar" (fluxos/avaliar.js). Sem dependências: node fluxos/testes/avaliar.test.js
// Simula o n8n (funções $ e $getWorkflowStaticData) e alimenta o código com saídas no formato real do
// check-monitor, inclusive as do incidente de operadora com Fail2Ban (FreePBX 15, chan_sip, Fail2Ban 0.8.x).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const codigo = fs.readFileSync(path.join(__dirname, '..', 'avaliar.js'), 'utf8');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const T0 = Date.parse('2026-11-18T12:00:00Z');
const MIN = 60000, HORA = 3600000;

// ------------------------------------------------------------------ simulador do n8n
function rodar({ centrais, respostas, estado, agora = T0, cfg = {} }) {
  const config = { falhas_para_alertar: 2, lembrete_min: 30, disco_max: 90, grupo_jid: 'geral@g.us', centrais: JSON.stringify(centrais), ...cfg };
  const mapa = {};
  for (const c of centrais) {
    const r = respostas[c.chave] || {};
    const n = cap(c.chave);
    if (c.ari) mapa[n + ' ARI'] = { statusCode: r.ari === undefined ? 200 : r.ari };
    if (c.web) mapa[n + ' Web'] = { statusCode: r.web === undefined ? 200 : r.web };
    mapa[n + ' SSH'] = r.ssh && r.ssh.error ? { error: { message: r.ssh.error } } : { stdout: r.ssh };
  }
  const $ = (nome) => {
    if (nome === 'Config') return { first: () => ({ json: config }) };
    if (!(nome in mapa)) throw new Error('sem nó ' + nome);
    return { first: () => ({ json: mapa[nome] }) };
  };
  const f = new Function('$', '$getWorkflowStaticData', codigo);
  const orig = Date.now;
  Date.now = () => agora;
  try { return f($, () => estado).map((x) => x.json); } finally { Date.now = orig; }
}
const central = (extra = {}) => ({ chave: 'sede', nome: 'Central (sede)', ip: '10.0.0.10', ari: false, web: false, troncos: ['SIP-OPERADORA'], ips_protegidos: ['198.51.100.10'], grupo_jid: '', ...extra });

// ------------------------------------------------------------------ saídas no formato real
const peer = (nome, host, status) => `${nome.padEnd(25)} ${host.padEnd(40)} No  No                          5060     ${status}`;
const peersSec = (linhas) => ['Name/username             Host                                    Dyn Forcerport Comedia    ACL Port     Status      Description', ...linhas, `${linhas.length} sip peers [Monitored: 1 online, 1 offline Unmonitored: 0 online, 0 offline]`].join('\n');
const ignoreTxt = (lista, virgulas) => 'These IP addresses/networks are ignored: ' + (virgulas ? '`- ' + lista.join(',') : lista.map((x, i) => (i < lista.length - 1 ? '|- ' : '`- ') + x).join(' '));
const jail = (nome, { banidos = [], ignoreip = ['127.0.0.1', '198.51.100.10'], virgulas = false } = {}) => [
  `--- jail ${nome}`, `Status for the jail: ${nome}`, '|- filter', '|  |- File list:\t/var/log/asterisk/full ', '|  |- Currently failed:\t0', '|  `- Total failed:\t0', '`- action',
  `   |- Currently banned:\t${banidos.length}`, `   |  \`- IP list:\t${banidos.join(' ')} `, `   \`- Total banned:\t${banidos.length}`,
  `ignoreip: ${ignoreTxt(ignoreip, virgulas)} `].join('\n');
const f2b = (jails) => `jails: ${jails.map((j) => j.split('\n')[0].replace('--- jail ', '')).join(' ')}\n` + jails.join('\n');
const ipt = (rejects = []) => ['--- chain fail2ban-SIP', 'Chain fail2ban-SIP (1 references)', 'target     prot opt source               destination',
  ...rejects.map((ip) => `REJECT     all  --  ${ip.padEnd(20)} 0.0.0.0/0            reject-with icmp-port-unreachable`), 'RETURN     all  --  0.0.0.0/0            0.0.0.0/0'].join('\n');

function check(o = {}) {
  const parado = o.parado;
  const msgParado = 'Unable to connect to remote asterisk (does /var/run/asterisk/asterisk.ctl exist?)';
  const secoes = {
    UPTIME: parado ? msgParado : 'System uptime: 86400',
    IAX: o.iax || 'Name/Username    Host   Mask   Port   Status\n0 iax2 peers [0 online, 0 offline, 0 unmonitored]',
    PJSIP: 'No such command \'pjsip show registrations\' (type \'core show help pjsip show\' for other possible commands)',
    SIPREG: 'Host                            dnsmgr Username       Refresh State                Reg.Time\n0 SIP registrations.',
    SIPPEERS: o.semChanSip ? "No such command 'sip show peers' (type 'core show help sip show' for other possible commands)" : peersSec(o.peers || [peer('SIP-OPERADORA/1000', '198.51.100.10', 'OK (28 ms)'), peer('7722/7722', '(Unspecified)', 'UNKNOWN')]),
    CHAN: parado ? msgParado : '0 active channels\n0 active calls\n0 calls processed',
    DISK: `/dev/sda3 30000000 20000000 9000000 ${o.disco || 70}% /`,
    LOAD: '0.10 0.05 0.01 1/200 1234',
    F2B: o.f2b || f2b([jail('asterisk-iptables'), jail('ssh-iptables', { ignoreip: ['127.0.0.1'] })]),
    F2BCONF: '/etc/fail2ban/jail.local:ignoreip = 127.0.0.1 198.51.100.10',
    IPT: o.ipt || ipt(),
    SCANNER: o.scanner || 'unknown_did: 0',
  };
  return Object.entries(secoes).map(([k, v]) => `##${k}\n${v}`).join('\n') + '\n##END\n';
}

// ------------------------------------------------------------------ mini executor
let ok = 0, falhou = 0;
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✔ ' + nome); } catch (e) { falhou++; console.log('  ✘ ' + nome + '\n      ' + String(e.message).split('\n').slice(0, 6).join('\n      ')); }
}
const textos = (r) => r.map((x) => x.texto);
const duasChecagens = (cfgCentrais, resp, estado, extra = {}) => { rodar({ centrais: cfgCentrais, respostas: resp, estado, agora: T0, ...extra }); return rodar({ centrais: cfgCentrais, respostas: resp, estado, agora: T0 + 5 * MIN, ...extra }); };

console.log('\nAvaliar: caso real de operadora / Fail2Ban');

teste('central saudável: nenhuma mensagem', () => {
  const e = {};
  const r = duasChecagens([central()], { sede: { ssh: check() } }, e);
  assert.deepStrictEqual(r, []);
});

teste('incidente: SIP-OPERADORA UNREACHABLE + IP banido => 🚨 só na 2ª checagem, com causa e comando', () => {
  const e = {};
  const resp = { sede: { ssh: check({ peers: [peer('SIP-OPERADORA/1000', '198.51.100.10', 'UNREACHABLE')], f2b: f2b([jail('asterisk-iptables', { banidos: ['198.51.100.10'], ignoreip: ['127.0.0.1'] })]), ipt: ipt(['198.51.100.10']) }) } };
  const primeira = rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 });
  assert(!primeira.some((x) => x.texto.startsWith('🚨')), '1ª checagem não pode soar o alarme 🚨 (só o ⚠️ de prevenção)');
  const r = rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 + 5 * MIN });
  assert(primeira.some((x) => x.texto.startsWith('⚠️')), 'o ⚠️ de prevenção (ignoreip sem a operadora) sai já na 1ª checagem');
  assert.strictEqual(r.length, 1, 'na 2ª só o 🚨; o ⚠️ não repete');
  const t = r.find((x) => x.texto.startsWith('🚨')).texto;
  assert(t.includes('Tronco SIP SIP-OPERADORA/1000 (198.51.100.10): UNREACHABLE'), t);
  assert(t.includes('BANIDO'), t);
  assert(t.includes('Fail2Ban, jail asterisk-iptables') && t.includes('iptables REJECT em fail2ban-SIP'), t);
  assert(t.includes('não é queda da operadora'), t);
  assert(t.includes('fail2ban-client set asterisk-iptables unbanip 198.51.100.10'), t);
  assert(!t.includes('fwconsole restart'), 'não pode sugerir reiniciar quando a causa é o bloqueio');
  assert.strictEqual((t.match(/BANIDO/g) || []).length, 1, 'o mesmo IP não pode aparecer duas vezes');
});

teste('após o desbloqueio: ✅ normalizada', () => {
  const e = {};
  const ruim = { sede: { ssh: check({ peers: [peer('SIP-OPERADORA/1000', '198.51.100.10', 'UNREACHABLE')], f2b: f2b([jail('asterisk-iptables', { banidos: ['198.51.100.10'] })]), ipt: ipt(['198.51.100.10']) }) } };
  rodar({ centrais: [central()], respostas: ruim, estado: e, agora: T0 });
  rodar({ centrais: [central()], respostas: ruim, estado: e, agora: T0 + 5 * MIN });
  const r = rodar({ centrais: [central()], respostas: { sede: { ssh: check() } }, estado: e, agora: T0 + 10 * MIN });
  assert.strictEqual(r.length, 1);
  assert(r[0].texto.startsWith('✅'), r[0].texto);
});

teste('tronco UNREACHABLE sem bloqueio local: dica de rota/operadora, sem unban', () => {
  const e = {};
  const r = duasChecagens([central()], { sede: { ssh: check({ peers: [peer('SIP-OPERADORA/1000', '198.51.100.10', 'UNREACHABLE')] }) } }, e);
  assert.strictEqual(r.length, 1);
  assert(r[0].texto.includes('Nenhum bloqueio local detectado'), r[0].texto);
  assert(!r[0].texto.includes('unbanip'));
});

teste('LAGGED também é problema', () => {
  const r = duasChecagens([central()], { sede: { ssh: check({ peers: [peer('SIP-OPERADORA/1000', '198.51.100.10', 'LAGGED (3000 ms)')] }) } }, {});
  assert(r[0].texto.includes('LAGGED (3000 ms)'), r[0].texto);
});

teste('IP protegido banido mesmo com o tronco OK => 🚨 (bloqueio iminente)', () => {
  const r = duasChecagens([central()], { sede: { ssh: check({ f2b: f2b([jail('asterisk-iptables', { banidos: ['198.51.100.10'] })]) }) } }, {});
  assert(r.some((x) => x.texto.startsWith('🚨') && x.texto.includes('BANIDO')), JSON.stringify(textos(r)));
});

teste('IP banido que NÃO é da operadora nem de tronco: sem alerta', () => {
  const r = duasChecagens([central()], { sede: { ssh: check({ f2b: f2b([jail('asterisk-iptables', { banidos: ['203.0.113.77'] })]), ipt: ipt(['203.0.113.77']) }) } }, {});
  assert.deepStrictEqual(r, []);
});

teste('ramal UNKNOWN (7722) fora da lista de troncos: sem alerta', () => {
  const r = duasChecagens([central()], { sede: { ssh: check() } }, {});
  assert.deepStrictEqual(r, []);
});

teste('IP do próprio tronco é descoberto pelo peer, mesmo sem constar em ips_protegidos', () => {
  const r = duasChecagens([central({ ips_protegidos: [] })], { sede: { ssh: check({ peers: [peer('SIP-OPERADORA/1000', '198.51.100.10', 'UNREACHABLE')], f2b: f2b([jail('asterisk-iptables', { banidos: ['198.51.100.10'] })]) }) } }, {});
  assert(r[0].texto.includes('BANIDO') && r[0].texto.includes('do tronco SIP-OPERADORA/1000'), r[0].texto);
});

teste('sem chan_sip (FreePBX 16/PJSIP) e com tronco listado: não gera falso alarme', () => {
  const r = duasChecagens([central()], { sede: { ssh: check({ semChanSip: true }) } }, {});
  assert.deepStrictEqual(r, []);
});

console.log('\nAvaliar: prevenção (⚠️, sem alarme)');

teste('ignoreip com vírgulas lido como uma entrada: ⚠️ já na 1ª checagem, sem 🚨', () => {
  const e = {};
  const resp = { sede: { ssh: check({ f2b: f2b([jail('asterisk-iptables', { ignoreip: ['127.0.0.1', '203.0.113.0/24', '198.51.100.10'], virgulas: true })]) }) } };
  const r = rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 });
  assert.strictEqual(r.length, 1);
  assert(r[0].texto.startsWith('⚠️') && r[0].texto.includes('vírgulas'), r[0].texto);
});

teste('ignoreip sem a operadora: ⚠️', () => {
  const r = rodar({ centrais: [central()], respostas: { sede: { ssh: check({ f2b: f2b([jail('asterisk-iptables', { ignoreip: ['127.0.0.1'] })]) }) } }, estado: {}, agora: T0 });
  assert(r[0].texto.startsWith('⚠️') && r[0].texto.includes('não inclui 198.51.100.10'), r[0].texto);
});

teste('ignoreip cobre a operadora por CIDR (198.51.0.0/16): sem aviso', () => {
  const r = rodar({ centrais: [central()], respostas: { sede: { ssh: check({ f2b: f2b([jail('asterisk-iptables', { ignoreip: ['127.0.0.1', '198.51.0.0/16'] })]) }) } }, estado: {}, agora: T0 });
  assert.deepStrictEqual(r, []);
});

teste('só o jail do Asterisk é cobrado pelo ignoreip (o do ssh não)', () => {
  const r = rodar({ centrais: [central()], respostas: { sede: { ssh: check() } }, estado: {}, agora: T0 });
  assert.deepStrictEqual(r, []);
});

teste('aviso de prevenção não repete na hora e repete depois de 24 h', () => {
  const e = {};
  const resp = { sede: { ssh: check({ f2b: f2b([jail('asterisk-iptables', { ignoreip: ['127.0.0.1'] })]) }) } };
  assert.strictEqual(rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 }).length, 1);
  assert.strictEqual(rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 + 5 * MIN }).length, 0, 'sem repetir');
  assert.strictEqual(rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 + 23 * HORA }).length, 0, 'antes de 24 h');
  assert.strictEqual(rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 + 25 * HORA }).length, 1, 'depois de 24 h');
});

teste('Friendly Scanner da operadora ≥ 3: ⚠️; com 2: nada; de IP desconhecido: nada', () => {
  const sc = (n, ip) => `unknown_did: ${n}\n      ${n} Friendly Scanner from ${ip}`;
  const r5 = rodar({ centrais: [central()], respostas: { sede: { ssh: check({ scanner: sc(5, '198.51.100.10') }) } }, estado: {}, agora: T0 });
  assert(r5[0].texto.startsWith('⚠️') && r5[0].texto.includes('Friendly Scanner from 198.51.100.10'), JSON.stringify(textos(r5)));
  assert.deepStrictEqual(rodar({ centrais: [central()], respostas: { sede: { ssh: check({ scanner: sc(2, '198.51.100.10') }) } }, estado: {}, agora: T0 }), []);
  assert.deepStrictEqual(rodar({ centrais: [central()], respostas: { sede: { ssh: check({ scanner: sc(40, '198.51.100.9') }) } }, estado: {}, agora: T0 }), []);
});

console.log('\nAvaliar: comportamento anterior preservado');

teste('Asterisk parado + operadora banida: os dois problemas aparecem', () => {
  const r = duasChecagens([central()], { sede: { ssh: check({ parado: true, f2b: f2b([jail('asterisk-iptables', { banidos: ['198.51.100.10'] })]) }) } }, {});
  const t = r.find((x) => x.texto.startsWith('🚨')).texto;
  assert(t.includes('Processo do Asterisk parado') && t.includes('BANIDO'), t);
});

teste('disco acima do limite continua alertando', () => {
  const r = duasChecagens([central()], { sede: { ssh: check({ disco: 95 }) } }, {});
  assert(r[0].texto.includes('Disco / com 95%'), r[0].texto);
  assert(r[0].texto.includes('fwconsole restart'), 'sem dicas específicas, mantém a sugestão padrão');
});

teste('sem acesso SSH: aviso no rodapé, sem inventar problema de tronco', () => {
  const r = duasChecagens([central()], { sede: { ssh: { error: 'timeout' } } }, {});
  assert.deepStrictEqual(r, []);
});

teste('ARI/painel só são cobrados quando habilitados na planilha', () => {
  const r = duasChecagens([central({ ari: true, web: true })], { sede: { ari: 503, web: 502, ssh: check() } }, {});
  assert(r[0].texto.includes('ARI: HTTP 503') && r[0].texto.includes('Painel do FreePBX fora do ar (HTTP 502)'), r[0].texto);
  const r2 = duasChecagens([central({ ari: false, web: false })], { sede: { ari: 503, web: 502, ssh: check() } }, {});
  assert.deepStrictEqual(r2, []);
});

teste('várias centrais: estado independente e grupo de WhatsApp por central', () => {
  const cs = [central(), central({ chave: 'filial01', nome: 'Filial 01', ip: '10.0.1.10', grupo_jid: 'filial01@g.us' })];
  const resp = { sede: { ssh: check() }, filial01: { ssh: check({ disco: 99 }) } };
  const r = duasChecagens(cs, resp, {});
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].destino, 'filial01@g.us');
  assert(r[0].texto.includes('Filial 01'), r[0].texto);
});

teste('lembrete: mesma falha só repete após lembrete_min', () => {
  const e = {};
  const resp = { sede: { ssh: check({ disco: 95 }) } };
  rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 });
  assert.strictEqual(rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 + 5 * MIN }).length, 1);
  assert.strictEqual(rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 + 10 * MIN }).length, 0);
  assert.strictEqual(rodar({ centrais: [central()], respostas: resp, estado: e, agora: T0 + 40 * MIN }).length, 1);
});

console.log('\nPlanilha de centrais (CSV como o Excel salva)');

const os = require('os');
function csvTemp(conteudo) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'csvteste-')), 'centrais.csv');
  fs.writeFileSync(f, conteudo, 'utf8');
  return f;
}
const CAB = 'chave;nome;ip;porta_ssh;ari;web;troncos;ips_protegidos;grupo_jid';
const { lerCentrais } = require('../deploy.js');

teste('CSV do Excel: BOM, quebra de linha do Windows e linhas vazias só com ";" são aceitos', () => {
  const f = csvTemp('﻿' + [CAB, 'sede;Central (sede);10.0.0.10;22;nao;sim;SIP-OP;203.0.113.10;', ';;;;;;;;', '   ', 'filial01;Filial 01;10.0.1.10;22;nao;sim;;;', ';;;;;;;;'].join('\r\n') + '\r\n');
  const c = lerCentrais(f);
  assert.deepStrictEqual(c.map((x) => x.chave), ['sede', 'filial01']);
  assert.deepStrictEqual(c[0].troncos, ['SIP-OP']);
  assert.strictEqual(c[1].web, true);
});

teste('CSV separado por vírgula: erro claro em português, sem rodar nada', () => {
  const f = csvTemp(CAB.replace(/;/g, ',') + '\nsede,Central,10.0.0.10,22,nao,sim,,,\n');
  assert.throws(() => lerCentrais(f), /VIRGULA.*PONTO E VIRGULA/);
});

teste('erros apontam a linha real do arquivo e o valor errado', () => {
  const f = csvTemp(['# comentario', CAB, 'sede;Central;10.0.0.10;22;nao;sim;;;', '', 'Filial 01;Filial;10.0.1.10;22;nao;sim;;;'].join('\n'));
  assert.throws(() => lerCentrais(f), (e) => /linha 5 da planilha/.test(e.message) && /Filial 01/.test(e.message) && /minusculas/.test(e.message));
  const g = csvTemp([CAB, 'sede;Central;10.0.0;22;nao;sim;;;'].join('\n'));
  assert.throws(() => lerCentrais(g), (e) => /linha 2 da planilha/.test(e.message) && /10\.0\.0/.test(e.message));
});

teste('planilha só com cabeçalho, ou sem a coluna ip, dá mensagem que ensina o cabeçalho certo', () => {
  assert.throws(() => lerCentrais(csvTemp(CAB + '\r\n;;;;;;;;\r\n')), /sem nenhuma central/);
  assert.throws(() => lerCentrais(csvTemp('chave;nome\nsede;Central\n')), (e) => /Falta a coluna "ip"/.test(e.message) && /chave;nome;ip;porta_ssh/.test(e.message));
});

teste('o CSV modelo que vai no kit (BOM + CRLF) é lido sem erro', () => {
  const modelo = [path.join(__dirname, '..', '..', 'kit', 'centrais-modelo.csv'), path.join(__dirname, '..', '..', 'centrais-modelo.csv')].find((p) => fs.existsSync(p));
  if (!modelo) return;   // arquivo ausente: pula este teste
  const c = lerCentrais(modelo);
  assert(c.length >= 2 && c.every((x) => x.ari === false));
});

console.log('\nRegra de ouro: a automação só LÊ e AVISA (nenhuma alteração no servidor)');

// funciona no projeto (kit/central) e dentro do pacote do kit (central/)
const arqCentral = [path.join(__dirname, '..', '..', 'kit', 'central', 'criar-usuario-monitor.sh'), path.join(__dirname, '..', '..', 'central', 'criar-usuario-monitor.sh')].find((p) => fs.existsSync(p));
const scriptCentral = fs.readFileSync(arqCentral, 'utf8');
const checkMonitor = (scriptCentral.match(/<<'CHECK_EOF'\n([\s\S]*?)\nCHECK_EOF/) || [])[1] || '';

teste('check-monitor foi encontrado no script da central', () => {
  assert(checkMonitor.includes('##END') && checkMonitor.length > 500);
});

teste('check-monitor só usa comandos Asterisk de consulta (show)', () => {
  const usados = [...checkMonitor.matchAll(/\bast '([^']+)'/g)].map((m) => m[1]);
  assert(usados.length >= 6, 'poucos comandos asterisk encontrados');
  for (const c of usados) assert(/^(core show|iax2 show|pjsip show|sip show) /.test(c), 'comando não permitido: ' + c);
});

teste('check-monitor só usa fail2ban-client status/get e iptables -S/-nL', () => {
  for (const m of checkMonitor.matchAll(/fail2ban-client (\S+)/g)) assert(['status', 'get'].includes(m[1]) || m[1] === '>/dev/null', 'fail2ban-client ' + m[1]);
  for (const m of checkMonitor.matchAll(/\biptables (-\S+)/g)) assert(['-S', '-nL'].includes(m[1]), 'iptables ' + m[1]);
});

teste('check-monitor não tem verbos que alteram o servidor nem escreve em arquivos', () => {
  const proibidos = /\b(unbanip|banip|reload|restart|stop|systemctl|service|fwconsole|rm|mv|cp|chmod|chown|kill|pkill|useradd|usermod|userdel|sed -i|tee|dd|mkfs|reboot|shutdown|passwd|crontab)\b/;
  const semComentarios = checkMonitor.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  const m = semComentarios.match(proibidos);
  assert(!m, 'verbo proibido no check-monitor: ' + (m && m[0]));
  const semRedirecaoSegura = semComentarios.replace(/2>&1|2>\/dev\/null|>\/dev\/null/g, '');
  assert(!/>/.test(semRedirecaoSegura), 'redirecionamento de saída para arquivo no check-monitor');
});

teste('fluxo gerado: todo nó SSH roda só o check-monitor; nenhum nó de execução de comando; único POST é o WhatsApp', () => {
  const { gerar, CHECK_CMD } = require('../deploy.js');
  const w = gerar({ centrais: [{ chave: 'sede', nome: 'S', ip: '10.0.0.1', porta_ssh: 22, ari: true, web: true, troncos: [], ips_protegidos: [], grupo_jid: '' }] });
  const ssh = w.nodes.filter((n) => n.type === 'n8n-nodes-base.ssh');
  assert(ssh.length >= 1 && ssh.every((n) => n.parameters.command === CHECK_CMD), 'nó SSH com comando diferente do check-monitor');
  assert(!w.nodes.some((n) => /executeCommand|code$/i.test(n.type) && n.name !== 'Avaliar'), 'nó de execução inesperado');
  const posts = w.nodes.filter((n) => (n.parameters.method || 'GET') !== 'GET').map((n) => n.name);
  assert.deepStrictEqual(posts, ['Avisar no WhatsApp']);
});

teste('nó SSH: credencial de chave exige authentication=privateKey (senão o n8n procura sshPassword e não lê a central)', () => {
  const { gerar } = require('../deploy.js');
  const c = [{ chave: 'sede', nome: 'S', ip: '10.0.0.1', porta_ssh: 22, ari: false, web: false, troncos: [], ips_protegidos: [], grupo_jid: '' }];
  const padrao = gerar({ centrais: c }).nodes.find((n) => n.type === 'n8n-nodes-base.ssh');
  assert.strictEqual(padrao.parameters.authentication, 'privateKey');
  assert(padrao.credentials.sshPrivateKey, 'credencial padrão deve ser sshPrivateKey');
  const legado = gerar({ centrais: c, credSsh: { sede: { sshPassword: { id: 'x', name: 'y' } } } }).nodes.find((n) => n.type === 'n8n-nodes-base.ssh');
  assert.strictEqual(legado.parameters.authentication, 'password', 'credencial antiga de senha continua funcionando no --update');
});

teste('avaliar.js não executa nada: sem require, fetch, eval, child_process nem $helpers', () => {
  assert(!/\b(require|child_process|eval|fetch|\$helpers|\$execution)\b|new Function/.test(codigo.replace(/\/\/.*$/gm, '')));
});

console.log('\nEndurecimento (achados da revisão de segurança)');

teste('script da central só aceita chave ed25519/ecdsa (sem ssh-rsa) e recusa chave privada', () => {
  const linha = scriptCentral.split('\n').find((l) => l.includes('^(ssh-ed25519'));
  assert(linha, 'regex da chave publica nao encontrada');
  assert(!/ssh-rsa/.test(linha), 'ssh-rsa nao deve ser aceito');
  assert(linha.includes('ssh-ed25519|ecdsa-sha2-nistp256'));
  assert(/PRIVATE/.test(scriptCentral), 'deve recusar chave privada');
});

teste('instalador: painel pode ser restrito (--painel-local); Evolution só em 127.0.0.1; versões das imagens configuráveis', () => {
  const inst = fs.readFileSync(path.join(__dirname, '..', '..', 'monitor', 'instalar.sh'), 'utf8');
  assert(inst.includes('--painel-local)'), 'falta a opcao --painel-local');
  assert(inst.includes('${N8N_BIND:-0.0.0.0}:5678:5678'), 'n8n sem N8N_BIND');
  assert(inst.includes('"127.0.0.1:8080:8080"'), 'Evolution deve escutar so em 127.0.0.1');
  assert(inst.includes('postgres:${POSTGRES_VERSION:-15-alpine}'), 'versao do postgres configuravel');
});

console.log(`\n${ok} passaram, ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
