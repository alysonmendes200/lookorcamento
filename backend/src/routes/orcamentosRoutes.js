const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminOnly } = require('../auth');
const { Orcamentos, Seq } = require('../db');

const router = express.Router();

// Pasta de uploads
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `nf_${Date.now()}_${uuidv4().slice(0,8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  }
});

// ── Helpers ──
function canAccess(user, orc) {
  return user.role === 'admin' || orc.owner === user.username;
}

// ══════════════════════════════════════════════
// LISTAR
// ══════════════════════════════════════════════
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const list = req.user.role === 'admin'
      ? await Orcamentos.all()
      : await Orcamentos.byOwner(req.user.username);
    res.json(list);
  } catch(e) { next(e); }
});

// Próximo número — GET
router.get('/nextnum', authMiddleware, async (req, res, next) => {
  try { res.json({ nextNum: await Seq.getNext() }); } catch(e) { next(e); }
});

// Definir próximo número — PUT (admin only)
router.put('/nextnum', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { nextNum } = req.body;
    const num = parseInt(nextNum);

    if (!num || isNaN(num) || num < 1) {
      return res.status(400).json({ error: 'Número inválido. Informe um número inteiro positivo.' });
    }

    // Verifica se já existe orçamento com número >= ao informado
    const { rows } = await require('../db').query(
      'SELECT num FROM orcamentos WHERE num >= $1 ORDER BY num ASC LIMIT 1',
      [num]
    );
    if (rows.length > 0) {
      return res.status(409).json({
        error: `Já existe o orçamento N° ${rows[0].num}. Escolha um número maior que o último orçamento gerado.`
      });
    }

    await Seq.setNext(num);
    res.json({ ok: true, nextNum: num });
  } catch(e) { next(e); }
});

// ══════════════════════════════════════════════
// RELATÓRIOS (admin) — antes de /:id !
// ══════════════════════════════════════════════
router.get('/relatorios', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { dataInicio, dataFim, mes, ano } = req.query;
    const list = await Orcamentos.report({ dataInicio, dataFim, mes, ano });

    const total = list.reduce((s, o) => s + o.total, 0);
    const pagos = list.filter(o => o.pago);
    const naoRecebidos = list.filter(o => !o.pago);
    const comNF = list.filter(o => o.nfStatus === 'emitida' && o.nfFile);

    // Por mês
    const porMes = {};
    list.forEach(o => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!porMes[key]) porMes[key] = { key, qtd: 0, total: 0, pagos: 0, totalPago: 0 };
      porMes[key].qtd++;
      porMes[key].total += o.total;
      if (o.pago) { porMes[key].pagos++; porMes[key].totalPago += o.valorRecebido || o.total; }
    });

    // Por operador
    const porOperador = {};
    list.forEach(o => {
      const k = o.ownerNome || o.owner || 'N/A';
      if (!porOperador[k]) porOperador[k] = { nome: k, qtd: 0, total: 0 };
      porOperador[k].qtd++;
      porOperador[k].total += o.total;
    });

    res.json({
      resumo: {
        totalOrcamentos: list.length,
        valorTotal: total,
        totalPagos: pagos.length,
        valorRecebido: pagos.reduce((s, o) => s + (o.valorRecebido || o.total), 0),
        totalFaltaReceber: naoRecebidos.length,
        valorFaltaReceber: naoRecebidos.reduce((s, o) => s + o.total, 0),
        comNF: comNF.length
      },
      porMes: Object.values(porMes).sort((a, b) => a.key.localeCompare(b.key)),
      porOperador: Object.values(porOperador),
      comNF,
      lista: list
    });
  } catch(e) { next(e); }
});

// ══════════════════════════════════════════════
// CRIAR
// ══════════════════════════════════════════════
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { nome, comercio, prazo, validade, pagamento, items } = req.body;
    if (!nome || !items || !items.length) return res.status(400).json({ error: 'Dados incompletos' });

    const num = await Seq.getNext();
    const safeItems = items.map(i => ({
      desc: String(i.desc || ''),
      qty: Number(i.qty) || 0,
      unit: Number(i.unit) || 0,
      total: (Number(i.qty) || 0) * (Number(i.unit) || 0)
    }));
    const total = safeItems.reduce((s, i) => s + i.total, 0);

    const orc = {
      id: uuidv4(),
      num,
      date: new Date().toLocaleDateString('pt-BR'),
      nome: String(nome).trim(),
      comercio: String(comercio || nome).trim(),
      prazo: String(prazo || ''),
      validade: String(validade || ''),
      pagamento: String(pagamento || ''),
      items: safeItems,
      total,
      owner: req.user.username,
      ownerNome: req.user.nome,
      nfStatus: 'nao_emitida',
      pago: false,
      valorRecebido: 0
    };

    await Orcamentos.create(orc);
    await Seq.setNext(num + 1);
    res.status(201).json(orc);
  } catch(e) { next(e); }
});

// ══════════════════════════════════════════════
// EDITAR
// ══════════════════════════════════════════════
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const orc = await Orcamentos.find(req.params.id);
    if (!orc) return res.status(404).json({ error: 'Não encontrado' });
    if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

    const patch = {};
    const { nome, comercio, prazo, validade, pagamento, items, pago, valorRecebido, nfStatus } = req.body;

    if (nome) patch.nome = String(nome).trim();
    if (comercio !== undefined) patch.comercio = String(comercio).trim();
    if (prazo !== undefined) patch.prazo = String(prazo);
    if (validade !== undefined) patch.validade = String(validade);
    if (pagamento !== undefined) patch.pagamento = String(pagamento);

    if (items && items.length) {
      patch.items = items.map(i => ({
        desc: String(i.desc || ''),
        qty: Number(i.qty) || 0,
        unit: Number(i.unit) || 0,
        total: (Number(i.qty) || 0) * (Number(i.unit) || 0)
      }));
      patch.total = patch.items.reduce((s, i) => s + i.total, 0);
    }
    if (pago !== undefined) patch.pago = Boolean(pago);
    if (valorRecebido !== undefined) patch.valorRecebido = Number(valorRecebido) || 0;
    if (nfStatus !== undefined) patch.nfStatus = nfStatus;

    patch.editedAt = new Date().toLocaleDateString('pt-BR');
    patch.editedBy = req.user.username;

    await Orcamentos.update(orc.id, patch);
    const updated = await Orcamentos.find(orc.id);
    res.json(updated);
  } catch(e) { next(e); }
});

// ══════════════════════════════════════════════
// EXCLUIR
// ══════════════════════════════════════════════
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const orc = await Orcamentos.find(req.params.id);
    if (!orc) return res.status(404).json({ error: 'Não encontrado' });
    if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

    // Remove arquivo NF
    if (orc.nfFile) {
      const fp = path.join(UPLOADS_DIR, orc.nfFile);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await Orcamentos.delete(req.params.id);
    await Seq.recalcAfterDelete();

    res.json({ ok: true, nextNum: await Seq.getNext() });
  } catch(e) { next(e); }
});

// ══════════════════════════════════════════════
// UPLOAD DE NOTA FISCAL
// ══════════════════════════════════════════════
router.post('/:id/nf', authMiddleware, upload.single('nf'), async (req, res, next) => {
  try {
    const orc = await Orcamentos.find(req.params.id);
    if (!orc) return res.status(404).json({ error: 'Não encontrado' });
    if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    // Remove anterior
    if (orc.nfFile) {
      const old = path.join(UPLOADS_DIR, orc.nfFile);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    await Orcamentos.update(orc.id, {
      nfFile: req.file.filename,
      nfOriginalName: req.file.originalname,
      nfStatus: 'emitida',
      nfUploadedAt: new Date().toLocaleDateString('pt-BR')
    });

    res.json({ ok: true, nfFile: req.file.filename, nfOriginalName: req.file.originalname });
  } catch(e) { next(e); }
});

// Remover NF
router.delete('/:id/nf', authMiddleware, async (req, res, next) => {
  try {
    const orc = await Orcamentos.find(req.params.id);
    if (!orc) return res.status(404).json({ error: 'Não encontrado' });
    if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

    if (orc.nfFile) {
      const fp = path.join(UPLOADS_DIR, orc.nfFile);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      await Orcamentos.update(orc.id, {
        nfFile: null, nfOriginalName: null, nfStatus: 'nao_emitida'
      });
    }
    res.json({ ok: true });
  } catch(e) { next(e); }
});

// Visualizar NF
router.get('/:id/nf', authMiddleware, async (req, res, next) => {
  try {
    const orc = await Orcamentos.find(req.params.id);
    if (!orc || !orc.nfFile) return res.status(404).json({ error: 'NF não encontrada' });
    if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

    const fp = path.join(UPLOADS_DIR, orc.nfFile);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Arquivo não encontrado' });

    res.setHeader('Content-Disposition', `inline; filename="${orc.nfOriginalName || orc.nfFile}"`);
    res.sendFile(fp);
  } catch(e) { next(e); }
});

module.exports = router;
