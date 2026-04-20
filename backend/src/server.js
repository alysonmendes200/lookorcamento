require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { init, Users, Seq } = require('./db');

const app = express();
app.set('trust proxy', 1); // necessário no Render (fica atrás de proxy)

// ─── SEGURANÇA ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — aceita FRONTEND_URL (pode ser múltiplas separadas por vírgula)
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))   // remove barra no final
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Postman / same-origin
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    console.warn(`CORS bloqueado: ${origin}`);
    cb(new Error('Bloqueado por política CORS'));
  },
  credentials: true
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// Rate limit agressivo no login (anti brute-force: 10 tentativas / 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log simples de requisições
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

// Health check — útil para UptimeRobot manter o servidor acordado
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ name: 'API de Orçamentos', status: 'online', versao: '2.0' });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Origem não permitida (CORS)' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' });
});

// ─── SEED: cria admin padrão se banco vazio ───────────────
async function seed() {
  const users = await Users.all();
  if (users.length === 0) {
    const hash = await bcrypt.hash('admin123', 12);
    await Users.create({
      id:           uuidv4(),
      nome:         'Administrador',
      username:     'admin',
      passwordHash: hash,
      role:         'admin'
    });
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅  USUÁRIO ADMIN CRIADO AUTOMATICAMENTE');
    console.log('    Usuário : admin');
    console.log('    Senha   : admin123');
    console.log('    ⚠️   TROQUE A SENHA NO PRIMEIRO LOGIN!');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  }

  // Garante que a numeração começa em 324 (ou onde estava)
  const next = await Seq.getNext();
  if (!next || next < 1) await Seq.setNext(324);
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.error('');
  console.error('❌ ERRO: JWT_SECRET não está configurado!');
  console.error('   Crie o arquivo .env a partir do .env.example');
  console.error('   e defina um valor longo e aleatório para JWT_SECRET.');
  console.error('');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('');
  console.error('❌ ERRO: DATABASE_URL não está configurado!');
  console.error('   Configure a variável de ambiente com a URL do PostgreSQL.');
  console.error('');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔄  Conectando ao banco de dados...');
    await init();   // cria tabelas
    await seed();   // cria admin padrão
    
    // ROTA TEMPORÁRIA PARA CRIAR O PRIMEIRO USUÁRIO
app.get('/setup-inicial', async (req, res) => {
  try {
    const { User } = require('./models'); // Certifique-se que o caminho do seu modelo está certo
    const admin = await User.create({
      nome: 'Administrador',
      username: 'admin',
      password: 'admin123', // O seu sistema deve criptografar isso automaticamente se tiver o hook
      role: 'admin'
    });
    res.send('Usuário Admin criado com sucesso! Agora tente logar.');
  } catch (err) {
    res.status(500).send('Erro ao criar: ' + err.message);
  }
});

    app.listen(PORT, () => {
      console.log(`🚀  Servidor rodando na porta ${PORT}`);
      console.log(`🌐  Origens permitidas: ${allowedOrigins.join(', ') || '(nenhuma — configure FRONTEND_URL)'}`);
      console.log(`📍  Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar o servidor:', err.message);
    process.exit(1);
  }
})();
