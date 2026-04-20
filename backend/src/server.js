require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.set('trust proxy', 1);

// ─── SEGURANÇA ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    console.warn(`CORS bloqueado: ${origin}`);
    cb(new Error('Bloqueado por política CORS'));
  },
  credentials: true
}));

app.use(rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const loginLimiter = rateLimit({
  windowMs: 15*60*1000, max: 10,
  message: { error: 'Muitas tentativas. Tente em 15 minutos.' },
  standardHeaders: true, legacyHeaders: false
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── ROTAS ────────────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const orcamentosRoutes = require('./routes/orcamentosRoutes');

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth',       authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ name: 'API de Orçamentos', status: 'online' });
});

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Origem não permitida (CORS)' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

// ─── SEED ────────────────────────────────────────────────
async function seed(Users, Seq) {
  const users = await Users.all();
  if (users.length === 0) {
    const hash = await bcrypt.hash('admin123', 12);
    await Users.create({
      id: uuidv4(), nome: 'Administrador',
      username: 'admin', passwordHash: hash, role: 'admin'
    });
    console.log('✅ Admin criado: admin / admin123 — TROQUE A SENHA!');
  }
  const next = await Seq.getNext();
  if (!next || next < 1) await Seq.setNext(324);
}

// ─── START ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

// Verifica variáveis obrigatórias
const missing = [];
if (!process.env.JWT_SECRET)   missing.push('JWT_SECRET');
if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');

if (missing.length > 0) {
  console.error('');
  console.error('╔═══════════════════════════════════════════════╗');
  console.error('║  ❌  VARIÁVEIS DE AMBIENTE NÃO CONFIGURADAS   ║');
  console.error('╠═══════════════════════════════════════════════╣');
  missing.forEach(v => console.error(`║  → ${v.padEnd(43)}║`));
  console.error('╠═══════════════════════════════════════════════╣');
  console.error('║  Configure no painel do Render:               ║');
  console.error('║  Dashboard → seu serviço → Environment        ║');
  console.error('╚═══════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    const { init, Users, Seq } = require('./db');
    await init();
    await seed(Users, Seq);

    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════╗');
   console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Origens permitidas: ${allowedOrigins.join(', ')}`)
      console.log('╚═══════════════════════════════════════════════╝');
    });
  } catch (err) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════╗');
    console.error('║  ❌  FALHA AO INICIAR O SERVIDOR              ║');
    console.error('╠═══════════════════════════════════════════════╣');
    console.error(`║  Erro: ${err.message.substring(0,39).padEnd(39)}║`);
    console.error('╠═══════════════════════════════════════════════╣');
    console.error('║  Causas mais comuns:                          ║');
    console.error('║  1. DATABASE_URL incorreta                    ║');
    console.error('║  2. Banco PostgreSQL não está acessível       ║');
    console.error('║  3. Região do banco ≠ região do serviço       ║');
    console.error('╚═══════════════════════════════════════════════╝');
    console.error('');
    console.error('Erro completo:', err);
    process.exit(1);
  }
})();
