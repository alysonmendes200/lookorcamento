/**
 * api.js — Cliente HTTP seguro, sem loop de redirecionamento
 */
const API = (() => {
  const base  = () => CONFIG.API_BASE + '/api';
  const token = () => localStorage.getItem('orcToken');

  let _redirecting = false; // previne loop duplo

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
      throw new Error('Sem conexão com o servidor. Verifique se o backend está online.');
    }

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }

    if (res.status === 401) {
      // Login com credenciais erradas: mostra o erro real do servidor
      if (path === '/auth/login') {
        throw new Error(data.error || 'Usuário ou senha incorretos.');
      }
      // Qualquer outra rota: sessão expirada — limpa e redireciona UMA VEZ
      if (!_redirecting) {
        _redirecting = true;
        localStorage.removeItem('orcToken');
        localStorage.removeItem('orcUser');
        if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
          location.replace('index.html');
        }
      }
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  }

  return {
    get:    (path)       => req('GET',    path),
    post:   (path, body) => req('POST',   path, body),
    put:    (path, body) => req('PUT',    path, body),
    delete: (path)       => req('DELETE', path),
    upload: (path, fd)   => req('POST',   path, fd, true),

    openNF: async (orcId) => {
      const url = `${base()}/orcamentos/${orcId}/nf`;
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token() } });
      if (!res.ok) { alert('Não foi possível abrir a NF.'); return; }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    }
  };
})();
