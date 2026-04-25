const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Users, logAudit } = require('../db');
const { authMiddleware, adminOnly } = require('../auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Dados inválidos' });

    const user = await Users.findByUsername(username.trim().toLowerCase());
    if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    logAudit({ user: { id: user.id, nome: user.nome, username: user.username } },
      'LOGIN', 'auth', user.id, `Login: ${user.username}`, { ip: req.ip });
    res.json({
      token,
      user: { id: user.id, nome: user.nome, username: user.username, role: user.role }
    });
  } catch(e) { next(e); }
});

// GET /api/auth/me — valida token
router.get('/me', authMiddleware, (req, res) => {
  const u = req.user;
  res.json({ id: u.id, nome: u.nome, username: u.username, role: u.role });
});

// ── USUÁRIOS ──
router.get('/users', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const users = await Users.all();
    res.json(users.map(u => ({ id: u.id, nome: u.nome, username: u.username, role: u.role, createdAt: u.createdAt })));
  } catch(e) { next(e); }
});

router.post('/users', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { nome, username, password, role } = req.body;
    if (!nome || !username || !password || !role) return res.status(400).json({ error: 'Preencha todos os campos' });
    if (!['admin','user'].includes(role)) return res.status(400).json({ error: 'Perfil inválido' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha muito curta (mín. 6 caracteres)' });

    const exists = await Users.findByUsername(username.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Usuário já existe' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(), nome, username: username.toLowerCase(),
      passwordHash, role
    };
    await Users.create(user);
    res.status(201).json({ id: user.id, nome: user.nome, username: user.username, role: user.role });
  } catch(e) { next(e); }
});

router.delete('/users/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
    await Users.delete(req.params.id);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

router.put('/users/:id', authMiddleware, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.params.id === req.user.id;
    if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Sem permissão' });

    const user = await Users.find(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { nome, password, username, role } = req.body;
    const patch = {};

    if (nome) patch.nome = nome;
    if (username && isAdmin) {
      const existing = await Users.findByUsername(username.toLowerCase());
      if (existing && existing.id !== user.id) return res.status(409).json({ error: 'Username já em uso' });
      patch.username = username.toLowerCase();
    }
    if (isSelf && username) patch.username = username.toLowerCase();
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Senha muito curta (mín. 6 caracteres)' });
      patch.passwordHash = await bcrypt.hash(password, 12);
    }
    if (role && isAdmin) patch.role = role;

    await Users.update(user.id, patch);
    const updated = await Users.find(user.id);
    res.json({ id: updated.id, nome: updated.nome, username: updated.username, role: updated.role });
  } catch(e) { next(e); }
});

module.exports = router;
