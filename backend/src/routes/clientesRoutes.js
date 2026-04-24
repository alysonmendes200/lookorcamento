const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminOnly } = require('../auth');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try { const { Clientes } = require('../db'); res.json(await Clientes.all()); }
  catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { Clientes } = require('../db');
    const c = await Clientes.find(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(c);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { Clientes } = require('../db');
    const { nome, comercio, telefone, email, endereco, cpfCnpj, obs } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const novo = await Clientes.create({
      id: uuidv4(),
      nome:      nome.trim(),
      comercio:  (comercio  || '').trim(),
      telefone:  (telefone  || '').trim(),
      email:     (email     || '').trim(),
      cpfCnpj:   (cpfCnpj   || '').trim(),
      endereco:  (endereco  || '').trim(),
      obs:       (obs       || '').trim(),
      criadoPor:     req.user.username,
      criadoPorNome: req.user.nome,
      criadoEm:      new Date().toISOString()
    });
    res.status(201).json(novo);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { Clientes } = require('../db');
    const { nome, comercio, telefone, email, endereco, cpfCnpj, obs } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const updated = await Clientes.update(req.params.id, {
      nome:     nome.trim(),
      comercio: (comercio  || '').trim(),
      telefone: (telefone  || '').trim(),
      email:    (email     || '').trim(),
      cpfCnpj:  (cpfCnpj   || '').trim(),
      endereco: (endereco  || '').trim(),
      obs:      (obs       || '').trim(),
      atualizadoEm: new Date().toISOString()
    });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try { const { Clientes } = require('../db'); await Clientes.delete(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
});

module.exports = router;
