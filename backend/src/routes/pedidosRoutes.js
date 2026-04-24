const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminOnly } = require('../auth');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const owner = req.user.role === 'admin' ? null : req.user.username;
    res.json(await Pedidos.all(owner));
  } catch (e) { next(e); }
});

/* Busca orçamento pelo número para vincular ao pedido — DEVE vir ANTES de /:id */
router.get('/por-orcamento/:num', async (req, res, next) => {
  try {
    const { Orcamentos } = require('../db');
    const orc = await Orcamentos.findByNum(parseInt(req.params.num));
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(orc);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const p = await Pedidos.find(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(p);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const { clienteId, clienteNome, items, total, prazoEntrega, obs,
            orcamentoId, orcamentoNum, status } = req.body;
    if (!clienteNome?.trim()) return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    const novo = await Pedidos.create({
      id: uuidv4(),
      clienteId:    clienteId    || '',
      clienteNome:  clienteNome.trim(),
      items:        items        || [],
      total:        total        || 0,
      prazoEntrega: prazoEntrega || '',
      obs:          obs          || '',
      orcamentoId:  orcamentoId  || '',
      orcamentoNum: orcamentoNum || null,
      status:       status       || 'pendente',
      owner:        req.user.username,
      ownerNome:    req.user.nome,
      criadoEm:     new Date().toISOString()
    });
    res.status(201).json(novo);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const { status, prazoEntrega, obs, items, total, clienteNome } = req.body;
    const updated = await Pedidos.update(req.params.id, {
      ...(status       !== undefined && { status }),
      ...(prazoEntrega !== undefined && { prazoEntrega }),
      ...(obs          !== undefined && { obs }),
      ...(items        !== undefined && { items }),
      ...(total        !== undefined && { total }),
      ...(clienteNome  !== undefined && { clienteNome }),
      atualizadoEm: new Date().toISOString()
    });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try { const { Pedidos } = require('../db'); await Pedidos.delete(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
});

module.exports = router;
