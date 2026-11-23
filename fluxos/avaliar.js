// Nó "Avaliar" (Code, uma vez para todos os itens).
// Junta os resultados das checagens, decide se há problema e monta as mensagens do WhatsApp.
// O estado (falhas seguidas, se já avisou) fica no staticData do fluxo, só em execuções automáticas.
const cfg = $('Config').first().json;
const sd = $getWorkflowStaticData('global');
sd.estado = sd.estado || {};
const agora = Date.now();

// Lista de centrais vem do Config (campo "centrais", gerado do CSV pelo deploy.js).
// Os nós de cada central se chamam "<Chave> ARI", "<Chave> Web" e "<Chave> SSH".
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const centrais = typeof cfg.centrais === 'string' ? JSON.parse(cfg.centrais) : cfg.centrais;
const hosts = centrais.map((c) => ({
  chave: c.chave,
  nome: c.nome,
  ip: c.ip,
  ari: c.ari ? cap(c.chave) + ' ARI' : null,
  web: c.web ? cap(c.chave) + ' Web' : null,
  ssh: cap(c.chave) + ' SSH',
  grupo: c.grupo_jid || cfg.grupo_jid,
  troncos: c.troncos || [],
  ipsProtegidos: c.ips_protegidos || [],
}));

const get = (n) => { try { return $(n).first().json || {}; } catch (e) { return { error: { message: 'sem resultado' } }; } };
const secao = (txt, nome) => {
  const m = txt.match(new RegExp('##' + nome + '\\n([\\s\\S]*?)(?=\\n##|$)'));
  return m ? m[1] : '';
};
const motivo = (r) => r.statusCode ? 'HTTP ' + r.statusCode : (r.error && (r.error.message || r.error.code)) || 'sem resposta';
const hora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

// ---- leitura das saídas do check-monitor (funções puras) ---------------------------------------
const ipsDe = (txt) => txt.match(/\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?/g) || [];
const ip2n = (ip) => ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
// regra do ignoreip (IP ou CIDR) cobre o IP?
const cobre = (regra, ip) => {
  const [base, bits] = regra.split('/');
  if (bits === undefined) return base === ip;
  const div = Math.pow(2, 32 - Number(bits));
  return Math.floor(ip2n(base) / div) === Math.floor(ip2n(ip) / div);
};
// chan_sip: "sip show peers"
const lerPeersSip = (txt) => {
  const r = [];
  for (const l of txt.split('\n')) {
    const m = l.match(/^(\S+)\s+(\S+)\s.*?\b(OK \(\d+ ms\)|UNREACHABLE|LAGGED \(\d+ ms\)|UNKNOWN|Unmonitored)(?:\s|$)/);
    if (m) r.push({ nome: m[1], host: m[2], status: m[3] });
  }
  return r;
};
// Fail2Ban: "--- jail X", "IP list:", "ignoreip:"
const lerJails = (txt) => {
  const jails = [];
  let j = null;
  for (const l of txt.split('\n')) {
    const mj = l.match(/^--- jail (\S+)/);
    if (mj) { j = { nome: mj[1], banidos: [], ignoreip: [], ignoreipBruto: '' }; jails.push(j); continue; }
    if (!j) continue;
    const mb = l.match(/IP list:\s*(.*)$/);
    if (mb) j.banidos = ipsDe(mb[1]);
    const mi = l.match(/^ignoreip:\s*(.*)$/);
    if (mi) { j.ignoreipBruto = mi[1]; j.ignoreip = ipsDe(mi[1]); }
  }
  return jails;
};
// iptables: regras REJECT/DROP por origem nas cadeias fail2ban-*
const lerRegrasFw = (txt) => {
  const r = [];
  let cadeia = '';
  for (const l of txt.split('\n')) {
    const mc = l.match(/^--- chain (\S+)/);
    if (mc) { cadeia = mc[1]; continue; }
    const m = l.match(/^(REJECT|DROP)\s+\S+\s+--\s+(\d{1,3}(?:\.\d{1,3}){3})/);
    if (m) r.push({ cadeia, ip: m[2], alvo: m[1] });
  }
  return r;
};

const saida = [];
let destinoAtual = cfg.grupo_jid;
const enviar = (texto) => saida.push({ json: { texto, destino: destinoAtual } });

for (const h of hosts) {
  destinoAtual = h.grupo;
  const problemas = [];
  const avisos = [];
  const prevencao = []; // riscos que ainda não derrubaram nada (aviso à parte, sem alarme)
  const dicas = [];     // ação sugerida, só texto (nunca é executada)
  let uptime = null, canais = null, carga = null;

  // 1) Asterisk respondendo na ARI (porta 8088) - só nas centrais com ARI habilitada
  if (h.ari) {
    const ari = get(h.ari);
    if (ari.statusCode !== 200) problemas.push(`Asterisk não responde (ARI: ${motivo(ari)})`);
  }

  // 2) Painel web do FreePBX (Apache)
  if (h.web) {
    const web = get(h.web);
    if (!(web.statusCode >= 200 && web.statusCode < 400)) problemas.push(`Painel do FreePBX fora do ar (${motivo(web)})`);
  }

  // 3) Por dentro: troncos, registros, canais, disco (via SSH)
  const ssh = get(h.ssh);
  if (ssh.error || typeof ssh.stdout !== 'string') {
    avisos.push('Sem acesso SSH: troncos e disco não foram checados');
  } else {
    const out = ssh.stdout;
    const up = secao(out, 'UPTIME');
    const chan = secao(out, 'CHAN');
    if (/Unable to connect|Connection refused|No such file/i.test(up + chan)) {
      problemas.push('Processo do Asterisk parado (asterisk -rx não conecta)');
    } else {
      const mu = up.match(/System uptime:\s*(\d+)/i);
      if (mu) uptime = Number(mu[1]);
      const mc = chan.match(/(\d+)\s+active channel/i);
      if (mc) canais = Number(mc[1]);

      // Troncos IAX: tudo que não for OK / sem monitoramento é problema
      for (const l of secao(out, 'IAX').split('\n')) {
        if (/Name\/Username|iax2 peers \[/i.test(l)) continue;
        const m = l.match(/^(\S+)\s.*?\b((?:OK|UNREACHABLE|LAGGED|UNKNOWN|Unmonitored)\b.*)$/);
        if (m && !/^(OK|Unmonitored)/.test(m[2])) problemas.push(`Tronco IAX ${m[1]}: ${m[2].trim()}`);
      }
      // Registro em operadora (PJSIP)
      for (const l of secao(out, 'PJSIP').split('\n')) {
        const m = l.match(/^\s*(\S+\/sip\S*)\s+\S+\s+(\S+)/i);
        if (m && m[2] !== 'Registered') problemas.push(`Tronco SIP ${m[1]}: ${m[2]}`);
      }
      // Registro em operadora (chan_sip)
      for (const l of secao(out, 'SIPREG').split('\n')) {
        const m = l.match(/^(\S+:\d+)\s+\S+\s+(\S+)\s+\d+\s+(Registered|Unregistered|Rejected|Request Sent|Auth\. Sent|Failed|No Authentication|Waiting for Auth)/i);
        if (m && m[3] !== 'Registered') problemas.push(`Tronco SIP ${m[1]} (${m[2]}): ${m[3]}`);
      }
    }
    // 4) Troncos SIP por IP (chan_sip), Fail2Ban e firewall local.
    //    Caso real: peer UNREACHABLE porque o Fail2Ban baniu o IP da operadora.
    const peers = lerPeersSip(secao(out, 'SIPPEERS'));
    const jails = lerJails(secao(out, 'F2B'));
    const regrasFw = lerRegrasFw(secao(out, 'IPT'));
    const rotulo = {};          // ip -> descrição ("operadora protegida" / "tronco X")
    for (const ip of h.ipsProtegidos) rotulo[ip] = 'da operadora';
    let troncoComProblema = false;

    for (const t of h.troncos) {
      const achados = peers.filter((p) => p.nome === t || p.nome.split('/')[0] === t);
      for (const p of achados) {
        if (/^(UNREACHABLE|LAGGED|UNKNOWN)/.test(p.status)) {
          problemas.push(`Tronco SIP ${p.nome} (${p.host}): ${p.status}`);
          troncoComProblema = true;
        } else if (p.status === 'Unmonitored') {
          avisos.push(`Tronco ${p.nome} sem qualify (não dá para saber se está no ar)`);
        }
        if (/^\d/.test(p.host)) rotulo[p.host] = `do tronco ${p.nome}`;
      }
      if (!achados.length && !new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(secao(out, 'IAX') + secao(out, 'PJSIP')) && !/No such command/i.test(secao(out, 'SIPPEERS'))) {
        avisos.push(`Tronco ${t} não aparece nas listas de peers`);
      }
    }

    // IP da operadora/tronco banido (Fail2Ban) ou barrado (REJECT/DROP no iptables)
    for (const ip of Object.keys(rotulo)) {
      const jb = jails.filter((x) => x.banidos.includes(ip)).map((x) => x.nome);
      const fw = regrasFw.filter((x) => x.ip === ip);
      if (!jb.length && !fw.length) continue;
      const onde = [...jb.map((n) => `Fail2Ban, jail ${n}`), ...fw.map((x) => `iptables ${x.alvo} em ${x.cadeia}`)].join('; ');
      problemas.push(`IP ${ip} ${rotulo[ip]} está BANIDO no firewall local (${onde}): bloqueio da própria central, não é queda da operadora`);
      for (const n of jb) dicas.push(`Se confirmar o bloqueio local, o administrador pode liberar manualmente (a automação não altera nada): fail2ban-client set ${n} unbanip ${ip}`);
      if (!jb.length) dicas.push(`Conferir a regra: iptables -nvL ${fw[0].cadeia} --line-numbers`);
    }
    if (troncoComProblema && !dicas.length) {
      dicas.push('Nenhum bloqueio local detectado: verifique rota/VPN e a operadora (OPTIONS sem resposta?)');
    }

    // Prevenção: ignoreip precisa conter a operadora, e a sintaxe precisa ser reconhecida item a item
    for (const jl of jails.filter((x) => /asterisk|sip/i.test(x.nome))) {
      if (/\d,\s*\d/.test(jl.ignoreipBruto)) {
        prevencao.push(`ignoreip do jail ${jl.nome} está com vírgulas e foi lido como uma entrada só: separe os IPs por espaço e rode fail2ban-client reload`);
      }
      const falta = h.ipsProtegidos.filter((ip) => !jl.ignoreip.some((r) => cobre(r, ip)));
      if (falta.length) prevencao.push(`ignoreip do jail ${jl.nome} não inclui ${falta.join(', ')}: a operadora pode ser banida`);
    }
    // Aviso antecipado: "Friendly Scanner" vindo da operadora (DID sem rota de entrada)
    const minScan = Number(cfg.scanner_min || 3);
    for (const m of secao(out, 'SCANNER').matchAll(/^\s*(\d+)\s+Friendly Scanner from (\d{1,3}(?:\.\d{1,3}){3})/gm)) {
      if (Number(m[1]) >= minScan && rotulo[m[2]]) {
        prevencao.push(`"Friendly Scanner from ${m[2]}" apareceu ${m[1]}x no log recente: chamadas a números sem rota de entrada. O Fail2Ban bane após 3. Confirme os DIDs com a operadora e não crie rota sem confirmar`);
      }
    }

    // Disco cheio derruba o FreePBX
    for (const l of secao(out, 'DISK').split('\n')) {
      const m = l.match(/(\d+)%\s+(\S+)\s*$/);
      if (m && Number(m[1]) >= cfg.disco_max) problemas.push(`Disco ${m[2]} com ${m[1]}% de uso`);
    }
    const ml = secao(out, 'LOAD').match(/^(\S+)/);
    if (ml) carga = ml[1];
  }

  const st = (sd.estado[h.chave] = sd.estado[h.chave] || { falhas: 0, alertado: false, ultimoAlerta: 0, assinatura: '', uptime: null });
  const cabecalho = `*${h.nome}* (${h.ip})`;
  const rodape = `${canais !== null ? `Chamadas/canais ativos: ${canais}\n` : ''}${carga ? `Carga: ${carga}\n` : ''}${avisos.length ? `⚠️ ${avisos.join('; ')}\n` : ''}Verificado em ${hora()}`;

  // Reinício detectado (uptime voltou a zero)
  if (uptime !== null) {
    if (st.uptime !== null && uptime < st.uptime) {
      enviar(`🔄 *Asterisk reiniciou*\n${cabecalho}\nNo ar há ${Math.round(uptime / 60)} min.\n${rodape}`);
    }
    st.uptime = uptime;
  }

  if (problemas.length) {
    st.falhas++;
    const assinatura = problemas.join('|').replace(/\d+/g, '#');
    const passouLembrete = agora - st.ultimoAlerta >= cfg.lembrete_min * 60000;
    if (st.falhas >= cfg.falhas_para_alertar && (!st.alertado || assinatura !== st.assinatura || passouLembrete)) {
      enviar(`🚨 *PROBLEMA NA TELEFONIA*\n${cabecalho}\n${problemas.map((p) => '• ' + p).join('\n')}\n\nPersistindo ${st.falhas} checagens seguidas.\n${dicas.length ? dicas.map((d) => '➡️ ' + d).join('\n') : 'Normalmente resolve com: fwconsole restart'}\n${rodape}`);
      st.alertado = true;
      st.ultimoAlerta = agora;
      st.assinatura = assinatura;
    }
  } else {
    if (st.alertado) enviar(`✅ *Telefonia normalizada*\n${cabecalho}\nTodas as checagens voltaram ao normal.\n${rodape}`);
    st.falhas = 0;
    st.alertado = false;
    st.assinatura = '';
  }

  // Prevenção: avisa quando muda e repete no máximo 1x por dia (padrão), sem acionar o alarme 🚨
  if (prevencao.length) {
    const assPrev = prevencao.join('|').replace(/\d+/g, '#');
    const horas = Number(cfg.lembrete_prevencao_h || 24);
    if (assPrev !== st.prevAssinatura || agora - (st.prevUltimo || 0) >= horas * 3600000) {
      enviar(`⚠️ *ATENÇÃO (prevenção)*\n${cabecalho}\n${prevencao.map((p) => '• ' + p).join('\n')}\n\nNada está fora do ar por isso agora; é um risco de bloqueio.\n${rodape}`);
      st.prevAssinatura = assPrev;
      st.prevUltimo = agora;
    }
  } else {
    st.prevAssinatura = '';
  }
}

return saida;
