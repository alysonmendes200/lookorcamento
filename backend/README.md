# Backend — Sistema de Orçamentos

API REST segura em Node.js + Express. Dados em JSON local (sem banco externo).

## Requisitos
- Node.js 18+
- npm

## Instalação

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com seus valores
```

## Configuração (.env)

```
JWT_SECRET=GERE_UMA_CHAVE_LONGA_ALEATORIA
PORT=3001
FRONTEND_URL=https://seu-app.netlify.app
NODE_ENV=production
```

Gere o JWT_SECRET com:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Adicionar o timbrado (logo)

Coloque o arquivo `timbrado.png` dentro de `backend/assets/timbrado.png`.
Esse arquivo é usado na geração do .docx.

## Iniciar

```bash
npm start
```

## Usuário padrão (criado automaticamente)
- **Usuário:** admin
- **Senha:** admin123
- ⚠️ Troque a senha imediatamente após o primeiro login!

## Deploy recomendado (gratuito)

### Render.com (mais simples)
1. Crie conta em render.com
2. "New Web Service" → conecte seu repositório GitHub
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Adicione as variáveis de ambiente no painel
6. ⚠️ No Render free tier, o disco não é persistente — use o plano pago ou migre para PostgreSQL

### Railway.app
1. Conecte o repositório
2. Configure as env vars
3. Deploy automático

### VPS (mais controle)
```bash
npm install -g pm2
pm2 start src/server.js --name orcamentos
pm2 save && pm2 startup
```

## Estrutura de dados (pasta /data)
Os arquivos JSON são criados automaticamente:
- `data/users.json` — usuários
- `data/orcamentos.json` — orçamentos
- `data/orcamentos_meta.json` — metadados (numeração)

## Endpoints principais
- `POST /api/auth/login` — autenticação
- `GET /api/auth/me` — usuário atual
- `GET /api/orcamentos` — listar orçamentos
- `POST /api/orcamentos` — criar orçamento
- `PUT /api/orcamentos/:id` — editar
- `DELETE /api/orcamentos/:id` — excluir
- `POST /api/orcamentos/:id/nf` — upload nota fiscal
- `GET /api/orcamentos/:id/nf` — visualizar NF
- `GET /api/orcamentos/:id/docx` — baixar .docx
- `GET /api/orcamentos/relatorios` — relatórios (admin)
