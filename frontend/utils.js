/**
 * utils.js — Funções utilitárias compartilhadas
 */

// ── Formatação ──────────────────────────────────────────────
function fBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pBRL(s) {
  return parseFloat(String(s).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

function fDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

// ── Valor por extenso (pt-BR) ───────────────────────────────
function valorExtenso(v) {
  const inteiro = Math.floor(v);
  const cents = Math.round((v - inteiro) * 100);
  const un = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dez = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const cen = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function g(n) {
    if (!n) return '';
    const c = Math.floor(n/100), resto = n%100, d2 = Math.floor(resto/10), u2 = resto%10;
    if (n===100) return 'cem';
    let t = c ? cen[c] : '';
    if (resto && c) t += ' e ';
    if (resto < 20) t += un[resto];
    else { t += dez[d2]; if (u2) t += ' e ' + un[u2]; }
    return t;
  }
  function montar(n) {
    if (!n) return 'zero';
    let t = '';
    const bi = Math.floor(n/1e9), mim = Math.floor((n%1e9)/1e6), mil = Math.floor((n%1e6)/1e3), c2 = n%1e3;
    if (bi)  { t += g(bi)  + (bi===1?' bilhão':' bilhões'); }
    if (mim) { if(t) t+=' e '; t += g(mim) + (mim===1?' milhão':' milhões'); }
    if (mil) { if(t) t+=' e '; t += (mil===1?'mil':g(mil)+' mil'); }
    if (c2)  { if(t) t+=' e '; t += g(c2); }
    return t;
  }
  let r = montar(inteiro) + (inteiro===1?' real':' reais');
  if (cents) r += ' e ' + montar(cents) + (cents===1?' centavo':' centavos');
  return r;
}

// ── Toast ───────────────────────────────────────────────────
function toast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Usuário logado ──────────────────────────────────────────
function getUser() {
  try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch { return {}; }
}
function requireAuth() {
  const u = getUser();
  if (!u.id || !localStorage.getItem('token')) {
    window.location.href = 'index.html';
    return null;
  }
  return u;
}
function isAdmin() { return getUser().role === 'admin'; }

// ── Nota Fiscal texto ───────────────────────────────────────
const BANCO_INFO = 'Banco: 077 - Banco Inter | Agência: 0001 | Conta: 184720184 | CNPJ: 44.954.986/0001-04 | Pix - Chave: 44.954.986/0001-04';

function gerarTextoNF(orc) {
  let txt = '';
  orc.items.forEach((item, i) => {
    txt += `${i+1}. ${item.desc} #QTD: ${item.qty} | V. UNIT.: ${fBRL(item.unit)} | V.TOTAL.: ${fBRL(item.total)}\n`;
  });
  const ext = valorExtenso(orc.total);
  txt += `\n######################### VALOR TOTAL: ${fBRL(orc.total)} (${ext}) ######################### ${BANCO_INFO}`;
  return txt;
}
