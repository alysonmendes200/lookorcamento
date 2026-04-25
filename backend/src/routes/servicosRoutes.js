const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../auth');
const { ServicosProd } = require('../db');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try { res.json(await ServicosProd.all()); } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const s = await ServicosProd.find(req.params.id);
    if (!s) return res.status(404).json({ error: 'Não encontrado' });
    res.json(s);
  } catch(e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nome, tipoCusto, custo, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const novo = await ServicosProd.create({
      id: uuidv4(), nome: nome.trim(),
      tipoCusto: tipoCusto || 'hora',
      custo: parseFloat(custo) || 0,
      descricao: descricao || '',
      criadoEm: new Date().toISOString()
    });
    res.status(201).json(novo);
  } catch(e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nome, tipoCusto, custo, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const updated = await ServicosProd.update(req.params.id, {
      nome: nome.trim(), tipoCusto: tipoCusto || 'hora',
      custo: parseFloat(custo) || 0, descricao: descricao || ''
    });
    res.json(updated);
  } catch(e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try { await ServicosProd.delete(req.params.id); res.json({ ok: true }); }
  catch(e) { next(e); }
});

module.exports = router;
