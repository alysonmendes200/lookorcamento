const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { auth, adminOnly } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(auth);

// ─── LISTAR CLIENTES ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { Clientes } = require('../db');
    const clientes = await Clientes.all();
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BUSCAR CLIENTE POR ID ────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { Clientes } = require('../db');
    const cliente = await Clientes.getById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CRIAR CLIENTE ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { Clientes } = require('../db');
    const { nome, comercio, telefone, email, endereco, cpfCnpj, obs } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    const cliente = await Clientes.create({
      id: uuidv4(),
      nome: nome.trim(),
      comercio: (comercio || '').trim(),
      telefone: (telefone || '').trim(),
      email: (email || '').trim(),
      endereco: (endereco || '').trim(),
      cpfCnpj: (cpfCnpj || '').trim(),
      obs: (obs || '').trim(),
      criadoPor: req.user.username,
      criadoPorNome: req.user.nome,
      criadoEm: new Date().toISOString()
    });
    res.status(201).json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ATUALIZAR CLIENTE ────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { Clientes } = require('../db');
    const { nome, comercio, telefone, email, endereco, cpfCnpj, obs } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    const updated = await Clientes.update(req.params.id, {
      nome: nome.trim(),
      comercio: (comercio || '').trim(),
      telefone: (telefone || '').trim(),
      email: (email || '').trim(),
      endereco: (endereco || '').trim(),
      cpfCnpj: (cpfCnpj || '').trim(),
      obs: (obs || '').trim(),
      atualizadoEm: new Date().toISOString()
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXCLUIR CLIENTE ──────────────────────────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { Clientes } = require('../db');
    await Clientes.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
