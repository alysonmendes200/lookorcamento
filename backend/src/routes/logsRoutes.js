const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router  = express.Router();
const { authMiddleware, adminOnly } = require('../auth');
const { AuditLogs } = require('../db');

router.use(authMiddleware, adminOnly);

// POST — grava log via frontend (registrarLog())
router.post('/', async (req, res, next) => {
  try {
    const { acao, entidade, entidadeId, label, detalhes } = req.body;
    const u = req.user;
    await AuditLogs.create({
      id: uuidv4(),
      userId:    u.id,
      userNome:  u.nome,
      userLogin: u.username,
      acao:      String(acao || 'INFO').toUpperCase(),
      entidade:  entidade || 'frontend',
      entidadeId: String(entidadeId || ''),
      label:     String(label || ''),
      detalhes:  detalhes || {}
    });
    res.json({ ok: true });
  } catch(e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { busca, acao, entidade, limit = 200, offset = 0 } = req.query;
    const result = await AuditLogs.all({ busca, acao, entidade,
      limit: parseInt(limit) || 200, offset: parseInt(offset) || 0 });
    res.json(result);
  } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const log = await AuditLogs.find(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log não encontrado' });
    res.json(log);
  } catch(e) { next(e); }
});

module.exports = router;
