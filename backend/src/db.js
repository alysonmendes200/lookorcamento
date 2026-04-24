/**
 * db.js — Camada de acesso ao PostgreSQL
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PG:', err);
});

async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res;
}

// ══════════════════════════════════════════════
// INIT — cria/atualiza TODAS as tabelas
// ══════════════════════════════════════════════
async function init() {

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      nome          TEXT NOT NULL,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('admin','user')),
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id               TEXT PRIMARY KEY,
      num              INTEGER NOT NULL,
      date_display     TEXT,
      created_at       TIMESTAMP DEFAULT NOW(),
      nome             TEXT NOT NULL,
      comercio         TEXT,
      prazo            TEXT,
      validade         TEXT,
      pagamento        TEXT,
      obs              TEXT DEFAULT '',
      items            JSONB NOT NULL DEFAULT '[]',
      total            NUMERIC(12,2) NOT NULL DEFAULT 0,
      owner            TEXT NOT NULL,
      owner_nome       TEXT,
      nf_status        TEXT DEFAULT 'nao_emitida',
      nf_file          TEXT,
      nf_original_name TEXT,
      nf_uploaded_at   TEXT,
      pago             BOOLEAN DEFAULT FALSE,
      valor_recebido   NUMERIC(12,2) DEFAULT 0,
      edited_at        TEXT,
      edited_by        TEXT
    )
  `);

  /* Upgrade seguro: adiciona obs se coluna não existir ainda */
  await query(`ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS obs TEXT DEFAULT ''`);

  await query(`
    CREATE TABLE IF NOT EXISTS sequence (
      key   TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    )
  `);

  await query(`INSERT INTO sequence (key, value) VALUES ('orc_num', 324) ON CONFLICT DO NOTHING`);

  await query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id              TEXT PRIMARY KEY,
      nome            TEXT NOT NULL,
      comercio        TEXT DEFAULT '',
      telefone        TEXT DEFAULT '',
      email           TEXT DEFAULT '',
      cpfcnpj         TEXT DEFAULT '',
      endereco        TEXT DEFAULT '',
      obs             TEXT DEFAULT '',
      criado_por      TEXT DEFAULT '',
      criado_por_nome TEXT DEFAULT '',
      criado_em       TEXT DEFAULT '',
      atualizado_em   TEXT DEFAULT ''
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id            TEXT PRIMARY KEY,
      cliente_id    TEXT DEFAULT '',
      cliente_nome  TEXT NOT NULL,
      items         JSONB DEFAULT '[]',
      total         NUMERIC(12,2) DEFAULT 0,
      prazo_entrega TEXT DEFAULT '',
      obs           TEXT DEFAULT '',
      orcamento_id  TEXT DEFAULT '',
      orcamento_num INTEGER DEFAULT NULL,
      status        TEXT DEFAULT 'pendente',
      owner         TEXT DEFAULT '',
      owner_nome    TEXT DEFAULT '',
      criado_em     TEXT DEFAULT '',
      atualizado_em TEXT DEFAULT ''
    )
  `);

  await query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS desconto_tipo TEXT DEFAULT 'pct'`);
  await query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS desconto NUMERIC(12,2) DEFAULT 0`);
  await query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS total_bruto NUMERIC(12,2) DEFAULT 0`);
  await query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE`);
  await query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS valor_recebido NUMERIC(12,2) DEFAULT 0`);

  await query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id            TEXT PRIMARY KEY,
      nome          TEXT NOT NULL,
      descricao     TEXT DEFAULT '',
      unidade       TEXT DEFAULT 'un',
      preco         NUMERIC(12,2) DEFAULT 0,
      categoria     TEXT DEFAULT '',
      ativo         BOOLEAN DEFAULT TRUE,
      criado_por    TEXT DEFAULT '',
      criado_em     TEXT DEFAULT '',
      atualizado_em TEXT DEFAULT ''
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS caixa_transacoes (
      id            TEXT PRIMARY KEY,
      data          TEXT NOT NULL,
      descricao     TEXT NOT NULL,
      tipo          TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
      valor         NUMERIC(12,2) NOT NULL DEFAULT 0,
      categoria     TEXT DEFAULT '',
      orcamento_num INTEGER DEFAULT NULL,
      obs           TEXT DEFAULT '',
      criado_por    TEXT DEFAULT '',
      criado_em     TEXT DEFAULT ''
    )
  `);

  console.log('✅ Tabelas do banco inicializadas');
}

// ══════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════
const Users = {
  all: async () => {
    const { rows } = await query('SELECT id, nome, username, password_hash, role, created_at FROM users ORDER BY created_at');
    return rows.map(fromDbUser);
  },
  find: async (id) => {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? fromDbUser(rows[0]) : null;
  },
  findByUsername: async (username) => {
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] ? fromDbUser(rows[0]) : null;
  },
  create: async (user) => {
    await query(
      'INSERT INTO users (id, nome, username, password_hash, role) VALUES ($1,$2,$3,$4,$5)',
      [user.id, user.nome, user.username, user.passwordHash, user.role]
    );
    return user;
  },
  update: async (id, patch) => {
    const fields = []; const values = []; let idx = 1;
    const map = { nome: 'nome', username: 'username', passwordHash: 'password_hash', role: 'role' };
    for (const [k, col] of Object.entries(map)) {
      if (patch[k] !== undefined) { fields.push(`${col} = $${idx++}`); values.push(patch[k]); }
    }
    if (!fields.length) return;
    values.push(id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  },
  delete: async (id) => { await query('DELETE FROM users WHERE id = $1', [id]); }
};

function fromDbUser(r) {
  return { id: r.id, nome: r.nome, username: r.username, passwordHash: r.password_hash, role: r.role, createdAt: r.created_at };
}

// ══════════════════════════════════════════════
// ORCAMENTOS
// ══════════════════════════════════════════════
const Orcamentos = {
  all: async () => {
    const { rows } = await query('SELECT * FROM orcamentos ORDER BY num DESC');
    return rows.map(fromDbOrc);
  },
  byOwner: async (owner) => {
    const { rows } = await query('SELECT * FROM orcamentos WHERE owner = $1 ORDER BY num DESC', [owner]);
    return rows.map(fromDbOrc);
  },
  find: async (id) => {
    const { rows } = await query('SELECT * FROM orcamentos WHERE id = $1', [id]);
    return rows[0] ? fromDbOrc(rows[0]) : null;
  },
  findByNum: async (num) => {
    const { rows } = await query('SELECT * FROM orcamentos WHERE num = $1', [num]);
    return rows[0] ? fromDbOrc(rows[0]) : null;
  },
  create: async (orc) => {
    await query(`
      INSERT INTO orcamentos
        (id, num, date_display, nome, comercio, prazo, validade, pagamento, obs,
         items, total, owner, owner_nome, nf_status, pago, valor_recebido)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `, [
      orc.id, orc.num, orc.date, orc.nome, orc.comercio,
      orc.prazo, orc.validade, orc.pagamento, orc.obs || '',
      JSON.stringify(orc.items), orc.total, orc.owner, orc.ownerNome,
      orc.nfStatus || 'nao_emitida', orc.pago || false, orc.valorRecebido || 0
    ]);
    return orc;
  },
  update: async (id, patch) => {
    const map = {
      nome: 'nome', comercio: 'comercio', prazo: 'prazo', validade: 'validade',
      pagamento: 'pagamento', obs: 'obs', items: 'items', total: 'total',
      nfStatus: 'nf_status', nfFile: 'nf_file', nfOriginalName: 'nf_original_name',
      nfUploadedAt: 'nf_uploaded_at', pago: 'pago', valorRecebido: 'valor_recebido',
      editedAt: 'edited_at', editedBy: 'edited_by'
    };
    const fields = []; const values = []; let idx = 1;
    for (const [k, col] of Object.entries(map)) {
      if (patch[k] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(k === 'items' ? JSON.stringify(patch[k]) : patch[k]);
      }
    }
    if (!fields.length) return;
    values.push(id);
    await query(`UPDATE orcamentos SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  },
  delete: async (id) => { await query('DELETE FROM orcamentos WHERE id = $1', [id]); },
  report: async ({ dataInicio, dataFim, mes, ano }) => {
    let sql = 'SELECT * FROM orcamentos WHERE 1=1';
    const params = [];
    if (dataInicio) { params.push(dataInicio);           sql += ` AND created_at >= $${params.length}`; }
    if (dataFim)    { params.push(dataFim + 'T23:59:59');sql += ` AND created_at <= $${params.length}`; }
    if (ano)        { params.push(parseInt(ano));         sql += ` AND EXTRACT(YEAR  FROM created_at) = $${params.length}`; }
    if (mes)        { params.push(parseInt(mes));         sql += ` AND EXTRACT(MONTH FROM created_at) = $${params.length}`; }
    sql += ' ORDER BY num DESC';
    const { rows } = await query(sql, params);
    return rows.map(fromDbOrc);
  }
};

function fromDbOrc(r) {
  return {
    id: r.id, num: r.num, date: r.date_display, createdAt: r.created_at,
    nome: r.nome, comercio: r.comercio, prazo: r.prazo,
    validade: r.validade, pagamento: r.pagamento, obs: r.obs || '',
    items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
    total: parseFloat(r.total),
    owner: r.owner, ownerNome: r.owner_nome,
    nfStatus: r.nf_status, nfFile: r.nf_file,
    nfOriginalName: r.nf_original_name, nfUploadedAt: r.nf_uploaded_at,
    pago: r.pago, valorRecebido: parseFloat(r.valor_recebido || 0),
    editedAt: r.edited_at, editedBy: r.edited_by
  };
}

// ══════════════════════════════════════════════
// SEQUENCE
// ══════════════════════════════════════════════
const Seq = {
  getNext: async () => {
    const { rows } = await query('SELECT value FROM sequence WHERE key = $1', ['orc_num']);
    return rows[0]?.value || 324;
  },
  setNext: async (n) => {
    await query('UPDATE sequence SET value = $1 WHERE key = $2', [n, 'orc_num']);
  },
  recalcAfterDelete: async () => {
    const { rows } = await query('SELECT MAX(num) AS max_num FROM orcamentos');
    const maxUsed = rows[0]?.max_num;
    if (maxUsed === null || maxUsed === undefined) return;
    const current = await Seq.getNext();
    if (current === maxUsed + 2) await Seq.setNext(maxUsed + 1);
  }
};

// ══════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════
const Clientes = {
  all: async () => {
    const { rows } = await query('SELECT * FROM clientes ORDER BY criado_em DESC');
    return rows.map(fromDbCliente);
  },
  find: async (id) => {
    const { rows } = await query('SELECT * FROM clientes WHERE id = $1', [id]);
    return rows[0] ? fromDbCliente(rows[0]) : null;
  },
  create: async (data) => {
    const { rows } = await query(`
      INSERT INTO clientes
        (id, nome, comercio, telefone, email, cpfcnpj, endereco, obs,
         criado_por, criado_por_nome, criado_em)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [data.id, data.nome, data.comercio, data.telefone, data.email,
        data.cpfCnpj, data.endereco, data.obs,
        data.criadoPor, data.criadoPorNome, data.criadoEm]);
    return fromDbCliente(rows[0]);
  },
  update: async (id, data) => {
    const { rows } = await query(`
      UPDATE clientes
         SET nome=$2, comercio=$3, telefone=$4, email=$5,
             cpfcnpj=$6, endereco=$7, obs=$8, atualizado_em=$9
       WHERE id=$1 RETURNING *
    `, [id, data.nome, data.comercio, data.telefone, data.email,
        data.cpfCnpj, data.endereco, data.obs, data.atualizadoEm]);
    return fromDbCliente(rows[0]);
  },
  delete: async (id) => { await query('DELETE FROM clientes WHERE id = $1', [id]); }
};

function fromDbCliente(r) {
  return {
    id: r.id, nome: r.nome, comercio: r.comercio, telefone: r.telefone,
    email: r.email, cpfCnpj: r.cpfcnpj, endereco: r.endereco, obs: r.obs,
    criadoPor: r.criado_por, criadoPorNome: r.criado_por_nome,
    criadoEm: r.criado_em, atualizadoEm: r.atualizado_em
  };
}

// ══════════════════════════════════════════════
// PEDIDOS
// ══════════════════════════════════════════════
const Pedidos = {
  all: async (owner) => {
    const { rows } = owner
      ? await query('SELECT * FROM pedidos WHERE owner = $1 ORDER BY criado_em DESC', [owner])
      : await query('SELECT * FROM pedidos ORDER BY criado_em DESC');
    return rows.map(fromDbPedido);
  },
  find: async (id) => {
    const { rows } = await query('SELECT * FROM pedidos WHERE id = $1', [id]);
    return rows[0] ? fromDbPedido(rows[0]) : null;
  },
  create: async (data) => {
    const { rows } = await query(`
      INSERT INTO pedidos
        (id, cliente_id, cliente_nome, items, total, total_bruto, desconto_tipo, desconto,
         prazo_entrega, obs, orcamento_id, orcamento_num, status, owner, owner_nome,
         criado_em, pago, valor_recebido)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *
    `, [
      data.id, data.clienteId || '', data.clienteNome,
      JSON.stringify(data.items || []), data.total || 0,
      data.totalBruto || data.total || 0,
      data.descontoTipo || 'pct',
      data.desconto || 0,
      data.prazoEntrega || '', data.obs || '',
      data.orcamentoId || '', data.orcamentoNum || null,
      data.status || 'pendente', data.owner, data.ownerNome, data.criadoEm,
      data.pago || false, data.valorRecebido || 0
    ]);
    return fromDbPedido(rows[0]);
  },
  report: async ({ dataInicio, dataFim, mes, ano }) => {
    let sql = 'SELECT * FROM pedidos WHERE 1=1';
    const params = [];
    if (dataInicio) { params.push(dataInicio);              sql += ` AND criado_em >= $${params.length}`; }
    if (dataFim)    { params.push(dataFim + 'T23:59:59');   sql += ` AND criado_em <= $${params.length}`; }
    if (ano)        { params.push(String(ano));              sql += ` AND SUBSTR(criado_em,1,4) = $${params.length}`; }
    if (mes)        { params.push(String(parseInt(mes)).padStart(2,'0')); sql += ` AND SUBSTR(criado_em,6,2) = $${params.length}`; }
    sql += ' ORDER BY criado_em DESC';
    const { rows } = await query(sql, params);
    return rows.map(fromDbPedido);
  },
  update: async (id, data) => {
    const map = {
      status: 'status', prazoEntrega: 'prazo_entrega', obs: 'obs',
      items: 'items', total: 'total', totalBruto: 'total_bruto',
      descontoTipo: 'desconto_tipo', desconto: 'desconto',
      pago: 'pago', valorRecebido: 'valor_recebido',
      clienteNome: 'cliente_nome', atualizadoEm: 'atualizado_em'
    };
    const fields = []; const values = [id]; let idx = 2;
    for (const [k, col] of Object.entries(map)) {
      if (data[k] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(k === 'items' ? JSON.stringify(data[k]) : data[k]);
      }
    }
    if (!fields.length) return { id };
    const { rows } = await query(
      `UPDATE pedidos SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, values
    );
    return fromDbPedido(rows[0]);
  },
  delete: async (id) => { await query('DELETE FROM pedidos WHERE id = $1', [id]); }
};

function fromDbPedido(r) {
  return {
    id: r.id, clienteId: r.cliente_id, clienteNome: r.cliente_nome,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
    total: parseFloat(r.total) || 0,
    totalBruto: parseFloat(r.total_bruto) || parseFloat(r.total) || 0,
    descontoTipo: r.desconto_tipo || 'pct',
    desconto: parseFloat(r.desconto) || 0,
    pago: r.pago || false,
    valorRecebido: parseFloat(r.valor_recebido) || 0,
    prazoEntrega: r.prazo_entrega, obs: r.obs,
    orcamentoId: r.orcamento_id, orcamentoNum: r.orcamento_num,
    status: r.status, owner: r.owner, ownerNome: r.owner_nome,
    criadoEm: r.criado_em, atualizadoEm: r.atualizado_em
  };
}

// ══════════════════════════════════════════════
// PRODUTOS
// ══════════════════════════════════════════════
const Produtos = {
  all: async () => {
    const { rows } = await query('SELECT * FROM produtos ORDER BY categoria, nome');
    return rows.map(fromDbProduto);
  },
  find: async (id) => {
    const { rows } = await query('SELECT * FROM produtos WHERE id = $1', [id]);
    return rows[0] ? fromDbProduto(rows[0]) : null;
  },
  create: async (data) => {
    const { rows } = await query(`
      INSERT INTO produtos
        (id, nome, descricao, unidade, preco, categoria, ativo, criado_por, criado_em)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [data.id, data.nome, data.descricao, data.unidade,
        data.preco, data.categoria, data.ativo, data.criadoPor, data.criadoEm]);
    return fromDbProduto(rows[0]);
  },
  update: async (id, data) => {
    const { rows } = await query(`
      UPDATE produtos
         SET nome=$2, descricao=$3, unidade=$4, preco=$5,
             categoria=$6, ativo=$7, atualizado_em=$8
       WHERE id=$1 RETURNING *
    `, [id, data.nome, data.descricao, data.unidade,
        data.preco, data.categoria, data.ativo, data.atualizadoEm]);
    return fromDbProduto(rows[0]);
  },
  delete: async (id) => { await query('DELETE FROM produtos WHERE id = $1', [id]); }
};

function fromDbProduto(r) {
  return {
    id: r.id, nome: r.nome, descricao: r.descricao, unidade: r.unidade,
    preco: parseFloat(r.preco) || 0, categoria: r.categoria, ativo: r.ativo,
    criadoPor: r.criado_por, criadoEm: r.criado_em, atualizadoEm: r.atualizado_em
  };
}

// ══════════════════════════════════════════════
// CAIXA
// ══════════════════════════════════════════════
const Caixa = {
  all: async ({ dataInicio, dataFim } = {}) => {
    let sql = 'SELECT * FROM caixa_transacoes WHERE 1=1';
    const params = [];
    if (dataInicio) { params.push(dataInicio); sql += ` AND data >= $${params.length}`; }
    if (dataFim)    { params.push(dataFim);    sql += ` AND data <= $${params.length}`; }
    sql += ' ORDER BY data DESC, criado_em DESC';
    const { rows } = await query(sql, params);
    return rows.map(fromDbCaixa);
  },
  create: async (data) => {
    const { rows } = await query(`
      INSERT INTO caixa_transacoes
        (id, data, descricao, tipo, valor, categoria, orcamento_num, obs, criado_por, criado_em)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [data.id, data.data, data.descricao, data.tipo, data.valor,
        data.categoria || '', data.orcamentoNum || null, data.obs || '',
        data.criadoPor, data.criadoEm]);
    return fromDbCaixa(rows[0]);
  },
  update: async (id, data) => {
    const { rows } = await query(`
      UPDATE caixa_transacoes
         SET data=$2, descricao=$3, tipo=$4, valor=$5,
             categoria=$6, orcamento_num=$7, obs=$8
       WHERE id=$1 RETURNING *
    `, [id, data.data, data.descricao, data.tipo, data.valor,
        data.categoria || '', data.orcamentoNum || null, data.obs || '']);
    return fromDbCaixa(rows[0]);
  },
  delete: async (id) => { await query('DELETE FROM caixa_transacoes WHERE id = $1', [id]); }
};

function fromDbCaixa(r) {
  return {
    id: r.id, data: r.data, descricao: r.descricao, tipo: r.tipo,
    valor: parseFloat(r.valor) || 0, categoria: r.categoria || '',
    orcamentoNum: r.orcamento_num, obs: r.obs || '',
    criadoPor: r.criado_por, criadoEm: r.criado_em
  };
}

module.exports = { pool, query, init, Users, Orcamentos, Clientes, Pedidos, Produtos, Seq, Caixa };
