/**
 * db.js — Camada de acesso ao PostgreSQL
 */
const { Pool } = require('pg');

// Pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PG:', err);
});

// Query helper
async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res;
}

// ══════════════════════════════════════════════
// INIT — Cria tabelas automaticamente
// ══════════════════════════════════════════════
async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','user')),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id TEXT PRIMARY KEY,
      num INTEGER NOT NULL,
      date_display TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      nome TEXT NOT NULL,
      comercio TEXT,
      prazo TEXT,
      validade TEXT,
      pagamento TEXT,
      items JSONB NOT NULL,
      total NUMERIC(12,2) NOT NULL,
      owner TEXT NOT NULL,
      owner_nome TEXT,
      nf_status TEXT DEFAULT 'nao_emitida',
      nf_file TEXT,
      nf_original_name TEXT,
      nf_uploaded_at TEXT,
      pago BOOLEAN DEFAULT FALSE,
      valor_recebido NUMERIC(12,2) DEFAULT 0,
      edited_at TEXT,
      edited_by TEXT
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sequence (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `);

  // Inicia numeração em 324 se não existir
  await query(`INSERT INTO sequence (key, value) VALUES ('orc_num', 324) ON CONFLICT DO NOTHING;`);

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
      'INSERT INTO users (id, nome, username, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.nome, user.username, user.passwordHash, user.role]
    );
    return user;
  },
  update: async (id, patch) => {
    const fields = [];
    const values = [];
    let idx = 1;
    const map = { nome:'nome', username:'username', passwordHash:'password_hash', role:'role' };
    for (const [k, col] of Object.entries(map)) {
      if (patch[k] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(patch[k]);
      }
    }
    if (!fields.length) return;
    values.push(id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  },
  delete: async (id) => {
    await query('DELETE FROM users WHERE id = $1', [id]);
  }
};

function fromDbUser(r) {
  return {
    id: r.id, nome: r.nome, username: r.username,
    passwordHash: r.password_hash, role: r.role,
    createdAt: r.created_at
  };
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
  create: async (orc) => {
    await query(`
      INSERT INTO orcamentos (
        id, num, date_display, nome, comercio, prazo, validade, pagamento,
        items, total, owner, owner_nome, nf_status, pago, valor_recebido
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `, [
      orc.id, orc.num, orc.date, orc.nome, orc.comercio, orc.prazo, orc.validade, orc.pagamento,
      JSON.stringify(orc.items), orc.total, orc.owner, orc.ownerNome,
      orc.nfStatus || 'nao_emitida', orc.pago || false, orc.valorRecebido || 0
    ]);
    return orc;
  },
  update: async (id, patch) => {
    const map = {
      nome: 'nome', comercio: 'comercio', prazo: 'prazo', validade: 'validade',
      pagamento: 'pagamento', items: 'items', total: 'total',
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
  delete: async (id) => {
    await query('DELETE FROM orcamentos WHERE id = $1', [id]);
  },
  // busca com filtros para relatórios
  report: async ({ dataInicio, dataFim, mes, ano }) => {
    let sql = 'SELECT * FROM orcamentos WHERE 1=1';
    const params = [];
    if (dataInicio) { params.push(dataInicio); sql += ` AND created_at >= $${params.length}`; }
    if (dataFim)    { params.push(dataFim + 'T23:59:59'); sql += ` AND created_at <= $${params.length}`; }
    if (ano)        { params.push(parseInt(ano)); sql += ` AND EXTRACT(YEAR FROM created_at) = $${params.length}`; }
    if (mes)        { params.push(parseInt(mes)); sql += ` AND EXTRACT(MONTH FROM created_at) = $${params.length}`; }
    sql += ' ORDER BY num DESC';
    const { rows } = await query(sql, params);
    return rows.map(fromDbOrc);
  }
};

function fromDbOrc(r) {
  return {
    id: r.id, num: r.num, date: r.date_display,
    createdAt: r.created_at,
    nome: r.nome, comercio: r.comercio, prazo: r.prazo,
    validade: r.validade, pagamento: r.pagamento,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
    total: parseFloat(r.total),
    owner: r.owner, ownerNome: r.owner_nome,
    nfStatus: r.nf_status, nfFile: r.nf_file, nfOriginalName: r.nf_original_name, nfUploadedAt: r.nf_uploaded_at,
    pago: r.pago, valorRecebido: parseFloat(r.valor_recebido || 0),
    editedAt: r.edited_at, editedBy: r.edited_by
  };
}

// ══════════════════════════════════════════════
// SEQUENCE (numeração automática)
// ══════════════════════════════════════════════
const Seq = {
  getNext: async () => {
    const { rows } = await query('SELECT value FROM sequence WHERE key = $1', ['orc_num']);
    return rows[0]?.value || 324;
  },
  setNext: async (n) => {
    await query('UPDATE sequence SET value = $1 WHERE key = $2', [n, 'orc_num']);
  },
  // Lógica: só decrementa se o deletado for o último criado
  recalcAfterDelete: async () => {
    const { rows } = await query('SELECT MAX(num) AS max_num FROM orcamentos');
    const maxUsed = rows[0]?.max_num;
    if (maxUsed === null || maxUsed === undefined) return; // banco vazio, mantém

    const current = await Seq.getNext();
    // Se current === maxUsed + 2, significa que o último (maxUsed+1) foi deletado
    if (current === maxUsed + 2) {
      await Seq.setNext(maxUsed + 1);
    }
    // Caso contrário (deletou um do meio), não mexe
  }
};

module.exports = { pool, query, init, Users, Orcamentos, Seq };
