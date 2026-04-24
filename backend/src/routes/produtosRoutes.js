const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminOnly } = require('../auth');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try { const { Produtos } = require('../db'); res.json(await Produtos.all()); }
  catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { Produtos } = require('../db');
    const { nome, descricao, unidade, preco, categoria, ativo } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const novo = await Produtos.create({
      id: uuidv4(),
      nome:      nome.trim(),
      descricao: (descricao || '').trim(),
      unidade:   (unidade   || 'un').trim(),
      preco:     parseFloat(preco) || 0,
      categoria: (categoria || '').trim(),
      ativo:     ativo !== false,
      criadoPor: req.user.username,
      criadoEm:  new Date().toISOString()
    });
    res.status(201).json(novo);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { Produtos } = require('../db');
    const { nome, descricao, unidade, preco, categoria, ativo } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const updated = await Produtos.update(req.params.id, {
      nome:      nome.trim(),
      descricao: (descricao || '').trim(),
      unidade:   (unidade   || 'un').trim(),
      preco:     parseFloat(preco) || 0,
      categoria: (categoria || '').trim(),
      ativo:     ativo !== false,
      atualizadoEm: new Date().toISOString()
    });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try { const { Produtos } = require('../db'); await Produtos.delete(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
});

module.exports = router;
