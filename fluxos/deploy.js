// Gera o fluxo de monitoramento a partir da planilha de centrais (CSV).
//
// Uso:
//   node fluxos/deploy.js [--csv centrais.csv] [--intervalo 5] [--saida fluxos/freepbx-monitor.json]
//                         [--config config.json] [--id <id-do-fluxo>]
//       Gera o JSON do fluxo. Sem --config, os dados do WhatsApp saem como TROCAR-... (arquivo sem segredos).
//       Com --config (JSON com evo_url, evo_instance, evo_apikey, grupo_jid...), o arquivo gerado TEM segredos:
//       grave-o em local protegido. --id fixa o id do fluxo (para reimportar sobre o mesmo).
//   node fluxos/deploy.js --update <ID-do-fluxo> ...
//       Alem de gerar, atualiza um fluxo ja existente no n8n pela API, PRESERVANDO as credenciais dos nos
//       e os valores ja preenchidos no Config (WhatsApp, limites). Variaveis: N8N_URL e N8N_API_KEY.
//
// Credenciais usadas pelos nos (o instalador kit/monitor/instalar.sh cria exatamente estas):
//   SSH de cada central: id "ssh_<chave>" | ARI: id "ari_central".
const fs = require('fs');
const path = require('path');

const codigoAvaliar = fs.readFileSync(path.join(__dirname, 'avaliar.js'), 'utf8');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const CHECK_CMD = '/usr/local/sbin/check-monitor';

// ---------------------------------------------------------------- planilha
function lerCentrais(arquivo) {
  // aceita o CSV como o Excel salva: BOM no inicio, quebra de linha do Windows e linhas vazias so com ";"
  const todas = fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const linhas = todas.map((l, i) => ({ texto: l.trim(), n: i + 1 }))
    .filter((l) => l.texto && !l.texto.startsWith('#') && l.texto.replace(/[;\s]/g, ''));
  if (linhas.length < 2) throw new Error('A planilha esta sem nenhuma central (so o cabecalho ou vazia): ' + arquivo);
  if (!linhas[0].texto.includes(';') && linhas[0].texto.includes(',')) {
    throw new Error('A planilha esta separada por VIRGULA, e o instalador espera PONTO E VIRGULA (;). Salve de novo como "CSV UTF-8" pelo Excel em portugues, ou veja o guia docs/planilha.md.');
  }
  const cab = linhas[0].texto.split(';').map((c) => c.trim().toLowerCase());
  const exigidas = ['chave', 'nome', 'ip'];
  for (const c of exigidas) if (!cab.includes(c)) throw new Error(`Falta a coluna "${c}" no cabecalho da planilha (colunas encontradas: ${cab.filter(Boolean).join(', ') || 'nenhuma'}). A primeira linha deve ser: chave;nome;ip;porta_ssh;ari;web;troncos;ips_protegidos;grupo_jid`);
  const lista = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
  const sim = (v, padrao) => (v === undefined || v === '' ? padrao : /^(sim|s|1|true)$/i.test(v));
  const vistos = new Set();
  return linhas.slice(1).map((l) => {
    const v = l.texto.split(';').map((x) => x.trim());
    const r = Object.fromEntries(cab.map((c, k) => [c, v[k]]));
    const onde = `linha ${l.n} da planilha`;
    if (!/^[a-z][a-z0-9]*$/.test(r.chave || '')) throw new Error(`${onde}: a "chave" "${r.chave || ''}" nao serve: use so letras minusculas e numeros, sem espaco nem acento (exemplo: filial01)`);
    if (vistos.has(r.chave)) throw new Error(`${onde}: a chave "${r.chave}" esta repetida`);
    vistos.add(r.chave);
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(r.ip || '')) throw new Error(`${onde}: o IP "${r.ip || ''}" nao parece um IP (exemplo: 10.0.1.10)`);
    const porta = Number(r.porta_ssh || 22);
    if (!(porta > 0 && porta < 65536)) throw new Error(`${onde}: a porta_ssh "${r.porta_ssh}" e invalida (normalmente 22)`);
    const protegidos = lista(r.ips_protegidos);
    for (const ip of protegidos) if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) throw new Error(`${onde}: o IP protegido "${ip}" nao parece um IP (separe varios por virgula)`);
    return {
      chave: r.chave, nome: r.nome || r.chave, ip: r.ip, porta_ssh: porta,
      ari: sim(r.ari, false), web: sim(r.web, true),
      troncos: lista(r.troncos), ips_protegidos: protegidos, grupo_jid: r.grupo_jid || '',
    };
  });
}

// ---------------------------------------------------------------- fluxo
function gerar({ centrais, intervalo = 5, config = {}, credSsh = {}, credAri = null }) {
  const set = (id, name, value, type = 'string') => ({ id, name, value, type });
  const cfg = {
    falhas_para_alertar: 2, lembrete_min: 30, disco_max: 90, lembrete_prevencao_h: 24, scanner_min: 3,
    evo_url: 'http://TROCAR-IP-DA-EVOLUTION:8080', evo_instance: 'TROCAR-NOME-DA-INSTANCIA',
    evo_apikey: 'TROCAR-APIKEY', grupo_jid: 'TROCAR-ID-DO-GRUPO@g.us', ...config,
  };
  const cfgRef = (campo) => `={{ $('Config').first().json.${campo} }}`;

  const http = (nome, pos, url, auth) => ({
    parameters: {
      url,
      ...(auth ? { authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth' } : {}),
      options: { timeout: 8000, ...(auth ? {} : { allowUnauthorizedCerts: true }), response: { response: { fullResponse: true, neverError: true } } },
    },
    name: nome, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos,
    ...(auth ? { credentials: { httpBasicAuth: credAri || { id: 'ari_central', name: 'ARI Asterisk' } } } : {}),
    onError: 'continueRegularOutput',
  });
  const ssh = (nome, pos, c) => {
    const cred = credSsh[c.chave] || { sshPrivateKey: { id: 'ssh_' + c.chave, name: 'SSH ' + c.chave } };
    // o no SSH do n8n so usa credencial de chave se "authentication" for privateKey (o padrao e password)
    const authentication = cred.sshPassword ? 'password' : 'privateKey';
    return {
      parameters: { authentication, command: CHECK_CMD, cwd: '/' },
      name: nome, type: 'n8n-nodes-base.ssh', typeVersion: 1, position: pos,
      credentials: cred,
      onError: 'continueRegularOutput',
    };
  };

  const centraisCfg = centrais.map(({ porta_ssh, ...resto }) => resto); // porta so serve para criar a credencial
  const nodes = [
    { parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: intervalo }] } }, name: `A cada ${intervalo} minutos`, type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 200] },
    {
      parameters: {
        assignments: {
          assignments: [
            set('a1', 'falhas_para_alertar', cfg.falhas_para_alertar, 'number'),
            set('a2', 'lembrete_min', cfg.lembrete_min, 'number'),
            set('a3', 'disco_max', cfg.disco_max, 'number'),
            set('a4', 'evo_url', cfg.evo_url),
            set('a5', 'evo_instance', cfg.evo_instance),
            set('a6', 'evo_apikey', cfg.evo_apikey),
            set('a7', 'grupo_jid', cfg.grupo_jid),
            set('a8', 'centrais', JSON.stringify(centraisCfg)),
            set('a9', 'lembrete_prevencao_h', cfg.lembrete_prevencao_h, 'number'),
            set('a10', 'scanner_min', cfg.scanner_min, 'number'),
          ],
        },
        options: {},
      },
      name: 'Config', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [220, 200],
    },
  ];

  const connections = { [nodes[0].name]: { main: [[{ node: 'Config', type: 'main', index: 0 }]] } };
  const ligar = (de, para, idx = 0) => {
    connections[de] = connections[de] || { main: [[]] };
    connections[de].main[0].push({ node: para, type: 'main', index: idx });
  };

  // Uma linha de nos por central: [ARI] -> [Web] -> SSH
  const fimDeCadaCentral = [];
  centrais.forEach((c, i) => {
    const y = 80 + i * 200;
    const nome = cap(c.chave);
    const cadeia = [];
    let x = 460;
    if (c.ari) { cadeia.push(http(`${nome} ARI`, [x, y], `=http://${c.ip}:8088/ari/asterisk/info`, true)); x += 220; }
    if (c.web) { cadeia.push(http(`${nome} Web`, [x, y], `=https://${c.ip}/`, false)); x += 220; }
    cadeia.push(ssh(`${nome} SSH`, [x, y], c));
    nodes.push(...cadeia);
    ligar('Config', cadeia[0].name);
    for (let k = 0; k < cadeia.length - 1; k++) ligar(cadeia[k].name, cadeia[k + 1].name);
    fimDeCadaCentral.push({ nome: cadeia[cadeia.length - 1].name, x });
  });

  // Junta todas as centrais com uma cadeia de Merge de 2 entradas (sem limite de quantidade de centrais)
  const xMerge = Math.max(...fimDeCadaCentral.map((f) => f.x)) + 240;
  let saidaAtual = fimDeCadaCentral[0].nome;
  for (let k = 1; k < fimDeCadaCentral.length; k++) {
    const m = `Juntar ${k}`;
    nodes.push({ parameters: { mode: 'append' }, name: m, type: 'n8n-nodes-base.merge', typeVersion: 3, position: [xMerge + (k - 1) * 200, 200] });
    ligar(saidaAtual, m, 0);
    ligar(fimDeCadaCentral[k].nome, m, 1);
    saidaAtual = m;
  }
  const xAv = xMerge + Math.max(0, fimDeCadaCentral.length - 1) * 200 + 220;
  nodes.push({ parameters: { jsCode: codigoAvaliar }, name: 'Avaliar', type: 'n8n-nodes-base.code', typeVersion: 2, position: [xAv, 200] });
  ligar(saidaAtual, 'Avaliar');
  nodes.push({
    parameters: {
      method: 'POST',
      url: `={{ $('Config').first().json.evo_url }}/message/sendText/{{ $('Config').first().json.evo_instance }}`,
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'apikey', value: cfgRef('evo_apikey') }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ number: $json.destino, text: $json.texto }) }}',
      options: { timeout: 15000 },
    },
    name: 'Avisar no WhatsApp', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [xAv + 220, 200],
    retryOnFail: true, maxTries: 3, waitBetweenTries: 3000,
  });
  ligar('Avaliar', 'Avisar no WhatsApp');

  return {
    name: `FreePBX - Monitor de telefonia (${intervalo} min)`,
    nodes, connections,
    settings: { executionOrder: 'v1', timezone: 'America/Sao_Paulo', executionTimeout: 180 + 20 * centrais.length },
  };
}

module.exports = { lerCentrais, gerar, CHECK_CMD };

// ---------------------------------------------------------------- linha de comando
async function main() {
  const arg = (nome, padrao) => { const i = process.argv.indexOf(nome); return i > -1 ? process.argv[i + 1] : padrao; };
  const raiz = path.join(__dirname, '..');
  const csv = arg('--csv', path.join(raiz, 'centrais.csv'));
  const intervalo = Number(arg('--intervalo', 5));
  const saida = arg('--saida', path.join(__dirname, 'freepbx-monitor.json'));
  const upd = arg('--update', null);
  const cfgArq = arg('--config', null);
  const idFluxo = arg('--id', null);
  if (!fs.existsSync(csv)) throw new Error(`CSV nao encontrado: ${csv}\nCopie centrais.exemplo.csv para centrais.csv e preencha.`);
  const centrais = lerCentrais(csv);
  const configExterna = cfgArq ? JSON.parse(fs.readFileSync(cfgArq, 'utf8')) : {};

  // Sem --config o arquivo nunca tem segredos. Com --config tem (modo 600).
  const wfArquivo = gerar({ centrais, intervalo, config: configExterna });
  if (idFluxo) { wfArquivo.id = idFluxo; wfArquivo.active = false; }
  fs.writeFileSync(saida, JSON.stringify(wfArquivo, null, 2), { mode: cfgArq ? 0o600 : 0o644 });
  console.log(`JSON gerado: ${saida} (${centrais.length} centrais)${cfgArq ? ' [contem segredos]' : ''}`);
  if (!upd) return;

  const base = (process.env.N8N_URL || 'http://localhost:5678').replace(/\/$/, '') + '/api/v1';
  const key = process.env.N8N_API_KEY;
  if (!key) throw new Error('Defina N8N_API_KEY.');
  const api = async (metodo, rota, corpo) => {
    const r = await fetch(base + rota, { method: metodo, headers: { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
    const t = await r.text();
    if (!r.ok) throw new Error(`${metodo} ${rota} -> ${r.status} ${t}`);
    return JSON.parse(t);
  };

  const vivo = await api('GET', '/workflows/' + upd);
  const norm = (s) => s.toLowerCase();
  const porNome = Object.fromEntries(vivo.nodes.map((n) => [norm(n.name), n]));
  const credSsh = {};
  for (const c of centrais) {
    const n = porNome[norm(`${cap(c.chave)} SSH`)];
    if (n && n.credentials) credSsh[c.chave] = n.credentials;
  }
  const noAri = vivo.nodes.find((n) => n.credentials && n.credentials.httpBasicAuth);
  const config = {};
  const cfgVivo = vivo.nodes.find((n) => n.name === 'Config');
  if (cfgVivo) for (const a of cfgVivo.parameters.assignments.assignments) if (a.name !== 'centrais') config[a.name] = a.value;
  const faltam = centrais.filter((c) => !credSsh[c.chave]).map((c) => c.chave);
  if (faltam.length) console.log(`AVISO: sem credencial SSH existente para: ${faltam.join(', ')} (ficam com a credencial ssh_<chave>; ela precisa existir no n8n).`);
  const wf = gerar({ centrais, intervalo, config, credSsh, credAri: noAri ? noAri.credentials.httpBasicAuth : null });
  await api('PUT', '/workflows/' + upd, { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings });
  console.log('Fluxo atualizado:', upd, '(credenciais e Config preservados)');
}

if (require.main === module) main().catch((e) => { console.error('ERRO: ' + e.message); process.exit(1); });
