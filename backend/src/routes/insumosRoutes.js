const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../auth');
const { Insumos } = require('../db');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try { res.json(await Insumos.all()); } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const i = await Insumos.find(req.params.id);
    if (!i) return res.status(404).json({ error: 'Não encontrado' });
    res.json(i);
  } catch(e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nome, unidade, custo, categoria, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const novo = await Insumos.create({
      id: uuidv4(), nome: nome.trim(),
      unidade: unidade || 'un',
      custo: parseFloat(custo) || 0,
      categoria: categoria || '',
      descricao: descricao || '',
      criadoEm: new Date().toISOString()
    });
    res.status(201).json(novo);
  } catch(e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nome, unidade, custo, categoria, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const updated = await Insumos.update(req.params.id, {
      nome: nome.trim(), unidade: unidade || 'un',
      custo: parseFloat(custo) || 0,
      categoria: categoria || '', descricao: descricao || ''
    });
    res.json(updated);
  } catch(e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try { await Insumos.delete(req.params.id); res.json({ ok: true }); }
  catch(e) { next(e); }
});

module.exports = router;
