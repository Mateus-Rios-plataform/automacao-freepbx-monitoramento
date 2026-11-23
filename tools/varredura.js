#!/usr/bin/env node
// Varredura antes de publicar: procura segredos e dados internos nos arquivos do repositorio.
// Uso: node tools/varredura.js   (sai com codigo 1 se achar algo)
// Procura nos arquivos versionados (git ls-files) ou, sem git, em todos os arquivos de texto.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const PROIBIDOS = [
  // dados internos de quem originou o projeto (nunca devem aparecer)
  [/\bABC\b/, 'nome interno (ABC)'],
  [/associa[cç][aã]o/i, 'termo interno (associação)'],
  [/col[eé]gio/i, 'termo interno (colégio)'],
  [/\bescolas?\b/i, 'termo interno (escola); use "filial"'],
  [/algar/i, 'nome de operadora real'],
  [/drive\.google\.com/i, 'link do Google Drive'],
  [/dokuwiki/i, 'referencia a DokuWiki'],
  [/192\.168\.194\./, 'IP do laboratorio'],
  [/172\.28\./, 'IP do laboratorio'],
  [/10\.142\./, 'IP do laboratorio'],
  [/1203\d{9,}@g\.us/, 'ID real de grupo de WhatsApp'],
];
const SEGREDOS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chave privada'],
  [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'token JWT'],
  [/\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/, 'token do GitHub'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'chave AWS'],
  [/(?:apikey|api_key|password|senha|secret|token)["']?\s*[:=]\s*["'][A-Za-z0-9+\/_-]{16,}["']/i, 'possivel segredo atribuido'],
];
// os proprios padroes desta ferramenta nao contam
const IGNORAR = new Set(['tools/varredura.js']);
const BINARIOS = /\.(png|jpe?g|gif|xlsx|zip|gz|ico|pdf)$/i;

function arquivos() {
  try {
    const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: raiz, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch (e) {
    const lista = [];
    (function anda(d) {
      for (const n of fs.readdirSync(path.join(raiz, d))) {
        if (n === '.git' || n === 'node_modules') continue;
        const rel = path.join(d, n).replace(/\\/g, '/');
        fs.statSync(path.join(raiz, rel)).isDirectory() ? anda(rel) : lista.push(rel);
      }
    })('.');
    return lista.map((f) => f.replace(/^\.\//, ''));
  }
}

let achados = 0;
for (const rel of arquivos()) {
  if (IGNORAR.has(rel)) continue;
  const p = path.join(raiz, rel);
  if (!fs.existsSync(p)) continue;
  if (BINARIOS.test(rel)) {
    // xlsx e zip: o texto fica comprimido; checa so os nomes
    if (/\.(xlsx)$/i.test(rel)) {
      try {
        const txt = execFileSync('python', ['-I', '-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(" ".join(z.read(n).decode("utf8","ignore") for n in z.namelist()))', p], { encoding: 'utf8', maxBuffer: 1 << 26 });
        for (const [re, motivo] of [...PROIBIDOS, ...SEGREDOS]) if (re.test(txt)) { console.log(`${rel}: ${motivo}`); achados++; }
      } catch (e) { console.log(`${rel}: (nao consegui abrir para varrer)`); }
    }
    continue;
  }
  const linhas = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  linhas.forEach((l, i) => {
    for (const [re, motivo] of [...PROIBIDOS, ...SEGREDOS]) {
      if (re.test(l)) { console.log(`${rel}:${i + 1}: ${motivo}`); achados++; }
    }
  });
}
console.log(achados ? `\n${achados} achado(s). Corrija antes de publicar.` : 'Varredura limpa: nenhum segredo nem dado interno encontrado.');
process.exit(achados ? 1 : 0);
