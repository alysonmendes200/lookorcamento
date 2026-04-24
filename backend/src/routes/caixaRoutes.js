const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const { Caixa } = require('../db');
    const { di, df } = req.query;
    res.json(await Caixa.all({ dataInicio: di || null, dataFim: df || null }));
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { Caixa } = require('../db');
    const { data, descricao, tipo, valor, categoria, orcamentoNum, obs } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ error: 'Descrição é obrigatória' });
    if (!['entrada','saida'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    if (!valor || parseFloat(valor) <= 0) return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    const novo = await Caixa.create({
      id: uuidv4(),
      data: data || new Date().toISOString().split('T')[0],
      descricao: descricao.trim(),
      tipo,
      valor: parseFloat(valor),
      categoria: (categoria || '').trim(),
      orcamentoNum: orcamentoNum ? parseInt(orcamentoNum) : null,
      obs: (obs || '').trim(),
      criadoPor: req.user.username,
      criadoEm: new Date().toISOString()
    });
    res.status(201).json(novo);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { Caixa } = require('../db');
    const { data, descricao, tipo, valor, categoria, orcamentoNum, obs } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ error: 'Descrição é obrigatória' });
    if (!['entrada','saida'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    const updated = await Caixa.update(req.params.id, {
      data, descricao: descricao.trim(), tipo,
      valor: parseFloat(valor), categoria, orcamentoNum, obs
    });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { Caixa } = require('../db');
    await Caixa.delete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
