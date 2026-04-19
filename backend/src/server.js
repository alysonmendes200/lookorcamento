require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Users, Seq } = require('./db');

const app = express();

// ── Segurança ──────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS bloqueado: origem não permitida'));
  },
  credentials: true
}));

// Rate limiting global
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Rate limiting agressivo no login (anti brute-force)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Seed: cria admin padrão se não existir ─────────────────
async function seed() {
  const users = Users.all();
  if (users.length === 0) {
    const hash = await bcrypt.hash('admin123', 12);
    Users.save({
      id: uuidv4(),
      nome: 'Administrador',
      username: 'admin',
      passwordHash: hash,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Usuário admin criado: admin / admin123 — TROQUE A SENHA!');
  }
  // Garante numeração inicial
  if (!Seq.getNext()) Seq.setNext(324);
}

// ── Rotas ──────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const orcamentosRoutes = require('./routes/orcamentosRoutes');

app.use('/api/auth/login', loginLimiter); // aplica rate limit só no login
app.use('/api/auth', authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);

// Serve arquivos de NF com autenticação (já tratado na rota /:id/nf)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Catch-all 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
seed().then(() => {
  app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
});
