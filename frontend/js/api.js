/**
 * api.js — Camada de comunicação com o backend
 */
const API = (() => {
  function base() { return CONFIG.API_BASE + '/api'; }
  function token() { return localStorage.getItem('token'); }

  async function req(method, path, body, isFormData = false) {
    const headers = {};
    if (token()) headers['Authorization'] = 'Bearer ' + token();
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(base() + path, opts);
    } catch(e) {
      throw new Error('Sem conexão com o servidor. Verifique se o backend está online.');
    }

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      window.location.href = 'index.html';
      return;
    }

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }

    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  }

  return {
    get:    (path)        => req('GET',    path),
    post:   (path, body)  => req('POST',   path, body),
    put:    (path, body)  => req('PUT',    path, body),
    delete: (path)        => req('DELETE', path),
    upload: (path, fd)    => req('POST',   path, fd, true),

    // Download binário (docx, pdf)
    async download(path, filename) {
      const res = await fetch(base() + path, {
        headers: { 'Authorization': 'Bearer ' + token() }
      });
      if (!res.ok) throw new Error('Erro ao baixar arquivo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    },

    // Abrir NF em nova aba
    async openNF(orcId) {
      const url = base() + `/orcamentos/${orcId}/nf`;
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token() } });
      if (!res.ok) { alert('Não foi possível abrir a NF.'); return; }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    }
  };
})();
