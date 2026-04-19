# Frontend — Sistema de Orçamentos

Interface web para hospedar no **Netlify** (gratuito).

## Arquivos

| Arquivo | Função |
|---------|--------|
| `index.html` | Tela de login |
| `app.html` | Sistema principal (após login) |
| `style.css` | Estilos globais |
| `config.js` | URL do backend ← **ALTERE AQUI** |
| `api.js` | Comunicação com a API |
| `utils.js` | Funções utilitárias |

## Configuração

**Antes de publicar**, edite `config.js`:

```javascript
const CONFIG = {
  API_BASE: 'https://SEU-BACKEND.onrender.com'  // ← URL do seu backend
};
```

## Deploy no Netlify

### Opção 1 — Arraste e solte (mais rápido)
1. Acesse [netlify.com](https://netlify.com) e faça login
2. Na dashboard, arraste a **pasta `frontend`** inteira para a área indicada
3. Aguarde o deploy (< 1 min)
4. Copie a URL gerada (ex: `https://abc123.netlify.app`)

### Opção 2 — Via GitHub (recomendado para atualizações)
1. Suba o repositório completo para o GitHub
2. No Netlify: "Import from Git" → selecione o repo
3. **Build settings:**
   - Publish directory: `frontend`
   - Sem build command necessário
4. Deploy!

## Arquivo netlify.toml (já incluído)
Configura redirects para que o login funcione corretamente.

## Após o deploy
1. Copie a URL do Netlify
2. Cole em `FRONTEND_URL` no `.env` do backend
3. Faça redeploy do backend para atualizar o CORS
