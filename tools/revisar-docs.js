#!/usr/bin/env node
// Verificador de FORMATO da documentacao em docs/*.md. Uso: node tools/revisar-docs.js
// Confere: front matter, links e imagens existentes, imagem com legenda, cada bloco de comando
// seguido de "O que ele faz" e "Como saber que deu certo", e comandos destrutivos sem aviso.
const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'docs');
const PASSO_A_PASSO = new Set(['precisa.md', 'acessar-servidor.md', 'planilha.md', 'instalacao.md', 'whatsapp.md', 'painel-n8n.md', 'ti-filial.md']);
const erros = [];
const avisos = [];
const E = (f, m) => erros.push(`${f}: ${m}`);
const W = (f, m) => avisos.push(`${f}: ${m}`);

for (const f of fs.readdirSync(docs).filter((n) => n.endsWith('.md')).sort()) {
  const t = fs.readFileSync(path.join(docs, f), 'utf8');
  if (!/^---\ntitle: ".+"\n---\n/.test(t)) E(f, 'sem front matter com title (o Jekyll nao renderiza)');
  if (!/^# .+$/m.test(t)) E(f, 'sem titulo de nivel 1');

  // links e imagens locais
  for (const m of t.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    const [, img, texto, alvo] = m;
    if (img && !texto.trim()) E(f, `imagem sem legenda: ${alvo}`);
    if (/^(https?:|#|mailto:)/.test(alvo)) continue;
    const arq = alvo.split('#')[0];
    if (arq && !fs.existsSync(path.join(docs, arq))) E(f, `link quebrado: ${alvo}`);
  }

  // blocos de comando: precisam de explicacao logo depois (nas paginas de passo a passo)
  if (PASSO_A_PASSO.has(f)) {
    const linhas = t.split('\n');
    for (let i = 0; i < linhas.length; i++) {
      if (!/^```(bash|powershell)\s*$/.test(linhas[i])) continue;
      let j = i + 1;
      while (j < linhas.length && !/^```\s*$/.test(linhas[j])) j++;
      const bloco = linhas.slice(i + 1, j).join('\n');
      const depois = linhas.slice(j + 1, j + 40).join('\n');
      if (!/O que ele faz/i.test(depois)) W(f, `linha ${i + 1}: comando sem "O que ele faz": ${bloco.split('\n')[0].slice(0, 60)}`);
      if (!/Como saber que deu certo/i.test(depois)) W(f, `linha ${i + 1}: comando sem "Como saber que deu certo": ${bloco.split('\n')[0].slice(0, 60)}`);
      if (/\brm\s+-rf?\b|\bmkfs\b|\bdd\s+if=|\bdrop\s+database\b|docker compose .* down -v/i.test(bloco)) {
        if (!/apaga|desliga e apaga|irrevers|nao ha volta|n[ãa]o d[aá] para desfazer/i.test(depois)) E(f, `linha ${i + 1}: comando destrutivo sem aviso do que apaga`);
      }
    }
  }

  // vestigios de modelos antigos
  if (/@@\w+@@|\{\{:|\[\[\w+:/.test(t)) E(f, 'sintaxe de wiki ou marcador @@ sobrando');
  if (/\b(wiki|drive)\b/i.test(t)) E(f, 'ainda cita wiki ou Drive');
}

console.log(`Paginas verificadas: ${fs.readdirSync(docs).filter((n) => n.endsWith('.md')).length}`);
avisos.forEach((a) => console.log('AVISO ' + a));
erros.forEach((e) => console.log('ERRO  ' + e));
console.log(`\n${erros.length} erro(s), ${avisos.length} aviso(s).`);
process.exit(erros.length ? 1 : 0);
