const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

// ─── LISTAR PEDIDOS ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    const pedidos = await Pedidos.all(req.user.role === 'admin' ? null : req.user.username);
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BUSCAR PEDIDO POR ID ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    const pedido = await Pedidos.getById(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CRIAR PEDIDO ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    const { clienteId, clienteNome, items, total, prazoEntrega, obs, orcamentoId, orcamentoNum } = req.body;
    if (!clienteNome) return res.status(400).json({ error: 'Cliente é obrigatório' });
    if (!items || !items.length) return res.status(400).json({ error: 'Adicione pelo menos um item' });

    const pedido = await Pedidos.create({
      id: uuidv4(),
      clienteId: clienteId || null,
      clienteNome,
      items,
      total: total || 0,
      prazoEntrega: prazoEntrega || '',
      obs: obs || '',
      orcamentoId: orcamentoId || null,
      orcamentoNum: orcamentoNum || null,
      status: 'pendente',
      owner: req.user.username,
      ownerNome: req.user.nome,
      criadoEm: new Date().toISOString()
    });
    res.status(201).json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ATUALIZAR STATUS DO PEDIDO ───────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    const { status, prazoEntrega, obs, items, total, clienteNome } = req.body;

    const updated = await Pedidos.update(req.params.id, {
      ...(status && { status }),
      ...(prazoEntrega !== undefined && { prazoEntrega }),
      ...(obs !== undefined && { obs }),
      ...(items && { items }),
      ...(total !== undefined && { total }),
      ...(clienteNome && { clienteNome }),
      atualizadoEm: new Date().toISOString()
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXCLUIR PEDIDO ───────────────────────────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { Pedidos } = require('../db');
    await Pedidos.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
