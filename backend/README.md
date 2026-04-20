# Backend — Sistema de Orçamentos

## Tecnologias
- Node.js + Express
- PostgreSQL (via `pg`)
- JWT para autenticação
- bcryptjs para senhas
- multer para upload de arquivos (NF)

## Instalação local (para testar)
```bash
npm install
cp .env.example .env
# Edite o .env com seus dados
npm start
```

## Variáveis de ambiente necessárias (.env)
| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL do PostgreSQL (copie do Render) |
| `JWT_SECRET` | Chave secreta longa e aleatória |
| `FRONTEND_URL` | URL do frontend no Netlify |
| `NODE_ENV` | `production` |
| `PORT` | Porta (Render define automaticamente) |

## Gerar JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Endpoints principais
| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Usuário logado |
| GET | /api/auth/users | Listar usuários (admin) |
| POST | /api/auth/users | Criar usuário (admin) |
| PUT | /api/auth/users/:id | Editar usuário |
| DELETE | /api/auth/users/:id | Excluir usuário (admin) |
| GET | /api/orcamentos | Listar orçamentos |
| POST | /api/orcamentos | Criar orçamento |
| PUT | /api/orcamentos/:id | Editar orçamento |
| DELETE | /api/orcamentos/:id | Excluir orçamento |
| GET | /api/orcamentos/nextnum | Próximo número |
| PUT | /api/orcamentos/nextnum | Definir numeração (admin) |
| POST | /api/orcamentos/:id/nf | Upload nota fiscal |
| GET | /api/orcamentos/:id/nf | Visualizar nota fiscal |
| DELETE | /api/orcamentos/:id/nf | Remover nota fiscal |
| GET | /api/orcamentos/relatorios | Relatórios (admin) |
| GET | /api/health | Health check |

## Credenciais padrão
- **Usuário:** admin
- **Senha:** admin123
- ⚠️ Troque a senha imediatamente após o primeiro login!
