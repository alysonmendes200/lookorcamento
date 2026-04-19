const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminOnly } = require('../auth');
const { Orcamentos, Seq } = require('../db');
const { gerarDocx } = require('../docxGenerator');

const router = express.Router();

// Upload de notas fiscais
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `nf_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  }
});

// ---- HELPERS ----
function canAccess(user, orc) {
  return user.role === 'admin' || orc.owner === user.username;
}

function sanitize(orc) {
  // remove campo interno
  const { _raw, ...rest } = orc;
  return rest;
}

// ---- ROUTES ----

// GET /api/orcamentos — lista (admin vê todos, user vê os seus)
router.get('/', authMiddleware, (req, res) => {
  let list = Orcamentos.all();
  if (req.user.role !== 'admin') {
    list = list.filter(o => o.owner === req.user.username);
  }
  res.json(list.map(sanitize));
});

// GET /api/orcamentos/nextnum
router.get('/nextnum', authMiddleware, (req, res) => {
  res.json({ nextNum: Seq.getNext() });
});

// POST /api/orcamentos — criar
router.post('/', authMiddleware, (req, res) => {
  const { nome, comercio, prazo, validade, pagamento, items } = req.body;
  if (!nome || !items || !items.length) return res.status(400).json({ error: 'Dados incompletos' });

  const num = Seq.getNext();
  const total = items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit)), 0);

  const orc = Orcamentos.save({
    id: uuidv4(),
    num,
    date: new Date().toLocaleDateString('pt-BR'),
    createdAt: new Date().toISOString(),
    nome, comercio: comercio || nome, prazo, validade, pagamento,
    items: items.map(i => ({
      desc: i.desc,
      qty: Number(i.qty),
      unit: Number(i.unit),
      total: Number(i.qty) * Number(i.unit)
    })),
    total,
    owner: req.user.username,
    ownerNome: req.user.nome,
    nfStatus: 'nao_emitida',
    nfFile: null,
    pago: false,
    valorRecebido: 0
  });

  Seq.setNext(num + 1);
  res.status(201).json(sanitize(orc));
});

// PUT /api/orcamentos/:id — editar
router.put('/:id', authMiddleware, (req, res) => {
  const orc = Orcamentos.find(req.params.id);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

  const { nome, comercio, prazo, validade, pagamento, items, pago, valorRecebido, nfStatus } = req.body;
  if (nome) orc.nome = nome;
  if (comercio !== undefined) orc.comercio = comercio;
  if (prazo !== undefined) orc.prazo = prazo;
  if (validade !== undefined) orc.validade = validade;
  if (pagamento !== undefined) orc.pagamento = pagamento;
  if (items && items.length) {
    orc.items = items.map(i => ({
      desc: i.desc, qty: Number(i.qty), unit: Number(i.unit), total: Number(i.qty)*Number(i.unit)
    }));
    orc.total = orc.items.reduce((s, i) => s + i.total, 0);
  }
  if (pago !== undefined) orc.pago = Boolean(pago);
  if (valorRecebido !== undefined) orc.valorRecebido = Number(valorRecebido);
  if (nfStatus !== undefined) orc.nfStatus = nfStatus;

  orc.editedAt = new Date().toLocaleDateString('pt-BR');
  orc.editedBy = req.user.username;

  Orcamentos.save(orc);
  res.json(sanitize(orc));
});

// DELETE /api/orcamentos/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const orc = Orcamentos.find(req.params.id);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

  // Remove arquivo de NF se existir
  if (orc.nfFile) {
    const fp = path.join(UPLOADS_DIR, orc.nfFile);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  Orcamentos.delete(req.params.id);

  // Recalcula numeração automática
  Seq.recalcAfterDelete();

  res.json({ ok: true, nextNum: Seq.getNext() });
});

// POST /api/orcamentos/:id/nf — upload nota fiscal
router.post('/:id/nf', authMiddleware, upload.single('nf'), (req, res) => {
  const orc = Orcamentos.find(req.params.id);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

  // Remove arquivo anterior
  if (orc.nfFile) {
    const old = path.join(UPLOADS_DIR, orc.nfFile);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  orc.nfFile = req.file.filename;
  orc.nfOriginalName = req.file.originalname;
  orc.nfStatus = 'emitida';
  orc.nfUploadedAt = new Date().toLocaleDateString('pt-BR');
  Orcamentos.save(orc);

  res.json({ ok: true, nfFile: req.file.filename, nfOriginalName: req.file.originalname });
});

// DELETE /api/orcamentos/:id/nf — remove nota fiscal
router.delete('/:id/nf', authMiddleware, (req, res) => {
  const orc = Orcamentos.find(req.params.id);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

  if (orc.nfFile) {
    const fp = path.join(UPLOADS_DIR, orc.nfFile);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    orc.nfFile = null;
    orc.nfOriginalName = null;
    orc.nfStatus = 'nao_emitida';
    Orcamentos.save(orc);
  }
  res.json({ ok: true });
});

// GET /api/orcamentos/:id/nf — download/visualização da NF
router.get('/:id/nf', authMiddleware, (req, res) => {
  const orc = Orcamentos.find(req.params.id);
  if (!orc || !orc.nfFile) return res.status(404).json({ error: 'NF não encontrada' });
  if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

  const fp = path.join(UPLOADS_DIR, orc.nfFile);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Arquivo não encontrado' });

  res.setHeader('Content-Disposition', `inline; filename="${orc.nfOriginalName || orc.nfFile}"`);
  res.sendFile(fp);
});

// GET /api/orcamentos/:id/docx — gerar DOCX
router.get('/:id/docx', authMiddleware, async (req, res) => {
  const orc = Orcamentos.find(req.params.id);
  if (!orc) return res.status(404).json({ error: 'Não encontrado' });
  if (!canAccess(req.user, orc)) return res.status(403).json({ error: 'Sem permissão' });

  try {
    const buffer = await gerarDocx(orc);
    const filename = `Orcamento_${String(orc.num).padStart(3,'0')}_${orc.nome.replace(/\s+/g,'_')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch(e) {
    console.error('Erro ao gerar DOCX:', e);
    res.status(500).json({ error: 'Erro ao gerar documento' });
  }
});

// ---- RELATÓRIOS (admin only) ----
router.get('/relatorios', authMiddleware, adminOnly, (req, res) => {
  const { dataInicio, dataFim, mes, ano } = req.query;
  let list = Orcamentos.all();

  // Filtro por período
  if (dataInicio || dataFim || mes || ano) {
    list = list.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      if (ano && d.getFullYear() !== parseInt(ano)) return false;
      if (mes && (d.getMonth() + 1) !== parseInt(mes)) return false;
      if (dataInicio && d < new Date(dataInicio)) return false;
      if (dataFim && d > new Date(dataFim + 'T23:59:59')) return false;
      return true;
    });
  }

  const total = list.reduce((s, o) => s + o.total, 0);
  const pagos = list.filter(o => o.pago);
  const naoRecebidos = list.filter(o => !o.pago);
  const comNF = list.filter(o => o.nfStatus === 'emitida' && o.nfFile);

  // Agrupamento por mês
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

  // Agrupamento por operador
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
    comNF: comNF.map(sanitize),
    lista: list.map(sanitize)
  });
});

module.exports = router;
