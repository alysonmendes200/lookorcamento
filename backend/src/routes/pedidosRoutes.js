const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

// GET /api/pedidos
router.get('/', async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    const owner = req.user.role === 'admin' ? null : req.user.username;
    res.json(await Pedidos.all(owner));
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pedidos/por-orcamento/:num  — busca orçamento pelo número para vincular
router.get('/por-orcamento/:num', async (req, res) => {
  try {
    const { Orcamentos } = require('../db');
    const orc = await Orcamentos.findByNum(parseInt(req.params.num));
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(orc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pedidos/:id
router.get('/:id', async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    const p = await Pedidos.find(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pedidos
router.post('/', async (req, res) => {
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
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pedidos/:id
router.put('/:id', async (req, res) => {
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
  } catch (err) {
    console.error('Erro ao atualizar pedido:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pedidos/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    await Pedidos.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
