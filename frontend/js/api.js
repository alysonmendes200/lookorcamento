/**
 * api.js — Cliente HTTP para o backend
 */
const API = (() => {
  const base  = () => CONFIG.API_BASE + '/api';
  const token = () => localStorage.getItem('token');

  async function req(method, path, body, isFormData = false) {
    const headers = {};
    if (token()) headers['Authorization'] = 'Bearer ' + token();
    if (!isFormData && body) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(base() + path, opts);
    } catch (e) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão ou se o backend está online.');
    }

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
        location.href = 'index.html';
      }
      return;
    }

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }

    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  }

  return {
    get:    (path)       => req('GET', path),
    post:   (path, body) => req('POST', path, body),
    put:    (path, body) => req('PUT', path, body),
    delete: (path)       => req('DELETE', path),
    upload: (path, fd)   => req('POST', path, fd, true),

    nfUrl: (orcId) => `${base()}/orcamentos/${orcId}/nf?token=${encodeURIComponent(token())}`,

    openNF: (orcId) => {
      window.open(API.nfUrl(orcId), '_blank');
    }
  };
})();
