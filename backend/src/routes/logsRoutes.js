const express = require('express');
const router  = express.Router();
const { authMiddleware, adminOnly } = require('../auth');
const { AuditLogs } = require('../db');

router.use(authMiddleware, adminOnly);

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
