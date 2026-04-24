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

/* Relatório de pedidos (admin) — DEVE vir ANTES de /:id */
router.get('/relatorios', adminOnly, async (req, res, next) => {
  try {
    const { Pedidos } = require('../db');
    const q = req.query;
    const dataInicio = q.dataInicio || q.di;
    const dataFim    = q.dataFim    || q.df;
    const { mes, ano } = q;
    const list = await Pedidos.report({ dataInicio, dataFim, mes, ano });

    const valorTotal   = list.reduce((s, p) => s + p.total, 0);
    const pagos        = list.filter(p => p.pago);
    const naoRecebidos = list.filter(p => !p.pago && p.status !== 'cancelado');

    const porStatus = {};
    list.forEach(p => {
      if (!porStatus[p.status]) porStatus[p.status] = { status: p.status, qtd: 0, total: 0, totalPago: 0 };
      porStatus[p.status].qtd++;
      porStatus[p.status].total += p.total;
      if (p.pago) porStatus[p.status].totalPago += p.valorRecebido || p.total;
    });

    const porMes = {};
    list.forEach(p => {
      if (!p.criadoEm) return;
      const key = p.criadoEm.substring(0, 7);
      if (!porMes[key]) porMes[key] = { key, qtd: 0, total: 0, pagos: 0, totalPago: 0 };
      porMes[key].qtd++;
      porMes[key].total += p.total;
      if (p.pago) { porMes[key].pagos++; porMes[key].totalPago += p.valorRecebido || p.total; }
    });

    res.json({
      resumo: {
        totalPedidos: list.length,
        valorTotal,
        totalPagos: pagos.length,
        valorRecebido: pagos.reduce((s, p) => s + (p.valorRecebido || p.total), 0),
        totalPendentes: naoRecebidos.length,
        valorPendente: naoRecebidos.reduce((s, p) => s + p.total, 0)
      },
      porStatus: Object.values(porStatus),
      porMes: Object.values(porMes).sort((a, b) => a.key.localeCompare(b.key)),
      lista: list
    });
  } catch(e) { next(e); }
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
    const { clienteId, clienteNome, items, total, totalBruto, prazoEntrega, obs,
            orcamentoId, orcamentoNum, status, desconto, descontoTipo, pago, valorRecebido } = req.body;
    if (!clienteNome?.trim()) return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    const novo = await Pedidos.create({
      id: uuidv4(),
      clienteId:    clienteId    || '',
      clienteNome:  clienteNome.trim(),
      items:        items        || [],
      total:        total        || 0,
      totalBruto:   totalBruto   || total || 0,
      desconto:     desconto     || 0,
      descontoTipo: descontoTipo || 'pct',
      prazoEntrega: prazoEntrega || '',
      obs:          obs          || '',
      orcamentoId:  orcamentoId  || '',
      orcamentoNum: orcamentoNum || null,
      status:       status       || 'pendente',
      pago:         pago         || false,
      valorRecebido:valorRecebido|| 0,
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
    const { status, prazoEntrega, obs, items, total, totalBruto, clienteNome,
            desconto, descontoTipo, pago, valorRecebido } = req.body;
    const updated = await Pedidos.update(req.params.id, {
      ...(status        !== undefined && { status }),
      ...(prazoEntrega  !== undefined && { prazoEntrega }),
      ...(obs           !== undefined && { obs }),
      ...(items         !== undefined && { items }),
      ...(total         !== undefined && { total }),
      ...(totalBruto    !== undefined && { totalBruto }),
      ...(clienteNome   !== undefined && { clienteNome }),
      ...(desconto      !== undefined && { desconto }),
      ...(descontoTipo  !== undefined && { descontoTipo }),
      ...(pago          !== undefined && { pago }),
      ...(valorRecebido !== undefined && { valorRecebido }),
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
