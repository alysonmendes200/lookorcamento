const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminOnly } = require('../auth'); // ← CORRIGIDO

router.use(authMiddleware); // ← CORRIGIDO

// GET /api/pedidos
router.get('/', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const owner = req.user.role === 'admin' ? null : req.user.username;
    res.json(await Pedidos.all(owner));
  } catch (err) { next(err); }
});

// GET /api/pedidos/por-orcamento/:num  — busca orçamento para vincular ao pedido
router.get('/por-orcamento/:num', async (req, res, next) => {
  try {
    const { Orcamentos } = require('../db');
    const orc = await Orcamentos.findByNum(parseInt(req.params.num));
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(orc);
  } catch (err) { next(err); }
});

// GET /api/pedidos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const p = await Pedidos.find(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(p);
  } catch (err) { next(err); }
});

// POST /api/pedidos
router.post('/', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const { clienteId, clienteNome, items, total, prazoEntrega, obs,
            orcamentoId, orcamentoNum, status } = req.body;
    if (!clienteNome || !clienteNome.trim())
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
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
  } catch (err) { next(err); }
});

// PUT /api/pedidos/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const { status, prazoEntrega, obs, items, total, clienteNome } = req.body;
    const updated = await Pedidos.update(req.params.id, {
      ...(status        !== undefined && { status }),
      ...(prazoEntrega  !== undefined && { prazoEntrega }),
      ...(obs           !== undefined && { obs }),
      ...(items         !== undefined && { items }),
      ...(total         !== undefined && { total }),
      ...(clienteNome   !== undefined && { clienteNome }),
      atualizadoEm: new Date().toISOString()
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/pedidos/:id  (admin only)
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    await Pedidos.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
