/**
 * utils.js — Utilitários (chaves de storage atualizadas para evitar conflito com versão antiga)
 */

// ─── Storage keys (novos nomes para limpar cache da versão antiga) ───
const STORAGE_TOKEN = 'orcToken';
const STORAGE_USER  = 'orcUser';

// ─── Formatação ──────────────────────────────────────────
function fBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function pBRL(s) {
  return parseFloat(String(s).replace(/[R$\s.]/g,'').replace(',','.')) || 0;
}

// ─── Valor por extenso ───────────────────────────────────
function valorExtenso(v) {
  const inteiro = Math.floor(v);
  const cents   = Math.round((v - inteiro) * 100);
  const un  = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dez = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const cen = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function g(n) {
    if (!n) return '';
    if (n===100) return 'cem';
    const c=Math.floor(n/100), r=n%100, d=Math.floor(r/10), u=r%10;
    let t = c ? cen[c] : '';
    if (r && c) t += ' e ';
    if (r < 20) t += un[r]; else { t += dez[d]; if (u) t += ' e ' + un[u]; }
    return t;
  }
  function montar(n) {
    if (!n) return 'zero';
    let t = '';
    const bi=Math.floor(n/1e9), mi=Math.floor((n%1e9)/1e6), mil=Math.floor((n%1e6)/1e3), c=n%1e3;
    if (bi)  { t += g(bi)  + (bi===1 ?' bilhão':' bilhões'); }
    if (mi)  { if(t) t+=' e '; t += g(mi)  + (mi===1 ?' milhão':' milhões'); }
    if (mil) { if(t) t+=' e '; t += mil===1 ?'mil': g(mil)+' mil'; }
    if (c)   { if(t) t+=' e '; t += g(c); }
    return t;
  }
  let r = montar(inteiro) + (inteiro===1?' real':' reais');
  if (cents) r += ' e ' + montar(cents) + (cents===1?' centavo':' centavos');
  return r;
}

// ─── Toast ────────────────────────────────────────────────
function toast(msg, type='') {
  let el = document.getElementById('_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast';
    document.body.appendChild(el);
  }
  // Sempre reaplica o CSS completo — garante que display:none do HTML não persista
  el.style.cssText = 'position:fixed;bottom:22px;right:22px;z-index:9999;max-width:320px;padding:12px 18px;border-radius:10px;font-size:13px;font-family:var(--font,sans-serif);box-shadow:0 8px 28px rgba(0,0,0,.4);transition:opacity .28s ease,transform .28s ease;transform:translateY(0);opacity:1;pointer-events:none;';
  el.textContent = msg;
  el.style.background  = type==='success'?'#d1fae5': type==='error'?'#fee2e2': type==='info'?'#dbeafe':'#fff';
  el.style.border      = type==='success'?'1.5px solid #198754': type==='error'?'1.5px solid #dc3545': type==='info'?'1.5px solid #4a9ad4':'1.5px solid #c8d8f0';
  el.style.color       = type==='success'?'#155724': type==='error'?'#842029': type==='info'?'#1e40af':'#1a1a2e';
  el.style.fontWeight  = type==='error'?'600':'400';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(70px)'; }, 3500);
}

// ─── Sessão ──────────────────────────────────────────────
function getUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_USER) || '{}'); } catch { return {}; }
}

function requireAuth() {
  // Limpa tokens velhos da versão anterior do sistema
  if (localStorage.getItem('token') && !localStorage.getItem(STORAGE_TOKEN)) {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  }
  const u = getUser();
  if (!u.id || !localStorage.getItem(STORAGE_TOKEN)) {
    if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
      location.replace('index.html');
    }
    return null;
  }
  return u;
}

function isAdmin() { return getUser().role === 'admin'; }

// ─── Escape HTML ─────────────────────────────────────────
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Dados bancários e texto NF ──────────────────────────
const BANCO_INFO = 'Banco: 077 - Banco Inter | Agência: 0001 | Conta: 184720184 | CNPJ: 44.954.986/0001-04 | Pix - Chave: 44.954.986/0001-04';

function gerarTextoNF(orc) {
  let txt = '';
  (orc.items||[]).forEach((item, i) => {
    txt += `${i+1}. ${item.desc} #QTD: ${item.qty} | V. UNIT.: ${fBRL(item.unit)} | V.TOTAL.: ${fBRL(item.total)}\n`;
  });
  txt += `\n######################### VALOR TOTAL: ${fBRL(orc.total)} (${valorExtenso(orc.total)}) ######################### ${BANCO_INFO}`;
  return txt;
}
