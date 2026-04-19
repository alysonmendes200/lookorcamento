const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Users } = require('../db');
const { authMiddleware, adminOnly } = require('../auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Dados inválidos' });

  const user = Users.findByUsername(username.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, nome: user.nome, username: user.username, role: user.role }
  });
});

// GET /api/auth/me — verifica token
router.get('/me', authMiddleware, (req, res) => {
  const u = req.user;
  res.json({ id: u.id, nome: u.nome, username: u.username, role: u.role });
});

// ---- USUÁRIOS (admin only) ----

// GET /api/auth/users
router.get('/users', authMiddleware, adminOnly, (req, res) => {
  const users = Users.all().map(u => ({
    id: u.id, nome: u.nome, username: u.username, role: u.role, createdAt: u.createdAt
  }));
  res.json(users);
});

// POST /api/auth/users
router.post('/users', authMiddleware, adminOnly, async (req, res) => {
  const { nome, username, password, role } = req.body;
  if (!nome || !username || !password || !role) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (!['admin','user'].includes(role)) return res.status(400).json({ error: 'Perfil inválido' });

  if (Users.findByUsername(username.toLowerCase())) {
    return res.status(409).json({ error: 'Usuário já existe' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = Users.save({
    id: uuidv4(), nome, username: username.toLowerCase(),
    passwordHash, role, createdAt: new Date().toISOString()
  });

  res.status(201).json({ id: user.id, nome: user.nome, username: user.username, role: user.role });
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authMiddleware, adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
  Users.delete(req.params.id);
  res.json({ ok: true });
});

// PUT /api/auth/users/:id — atualizar nome, senha e/ou username (admin ou próprio)
router.put('/users/:id', authMiddleware, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.params.id === req.user.id;
  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Sem permissão' });

  const user = Users.find(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { nome, password, username, role } = req.body;
  if (nome) user.nome = nome;
  if (username && isAdmin) {
    const existing = Users.findByUsername(username.toLowerCase());
    if (existing && existing.id !== user.id) return res.status(409).json({ error: 'Username já em uso' });
    user.username = username.toLowerCase();
  }
  if (password) user.passwordHash = await bcrypt.hash(password, 12);
  if (role && isAdmin) user.role = role;

  Users.save(user);
  res.json({ id: user.id, nome: user.nome, username: user.username, role: user.role });
});

module.exports = router;
