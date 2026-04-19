/**
 * db.js - Camada de dados usando arquivos JSON
 * Para produção maior, troque por PostgreSQL ou MongoDB
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Garante que o diretório de dados existe
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function dbFile(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readDb(name) {
  const file = dbFile(name);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeDb(name, data) {
  fs.writeFileSync(dbFile(name), JSON.stringify(data, null, 2), 'utf8');
}

function readMeta(name) {
  const file = path.join(DATA_DIR, `${name}_meta.json`);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function writeMeta(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}_meta.json`), JSON.stringify(data, null, 2));
}

// ---- USERS ----
const Users = {
  all: () => readDb('users'),
  find: (id) => readDb('users').find(u => u.id === id),
  findByUsername: (username) => readDb('users').find(u => u.username === username),
  save: (user) => {
    const users = readDb('users');
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    writeDb('users', users);
    return user;
  },
  delete: (id) => {
    const users = readDb('users').filter(u => u.id !== id);
    writeDb('users', users);
  }
};

// ---- ORCAMENTOS ----
const Orcamentos = {
  all: () => readDb('orcamentos'),
  find: (id) => readDb('orcamentos').find(o => o.id === id),
  save: (orc) => {
    const list = readDb('orcamentos');
    const idx = list.findIndex(o => o.id === orc.id);
    if (idx >= 0) list[idx] = orc;
    else list.unshift(orc);
    writeDb('orcamentos', list);
    return orc;
  },
  delete: (id) => {
    const list = readDb('orcamentos').filter(o => o.id !== id);
    writeDb('orcamentos', list);
  },
  byOwner: (username) => readDb('orcamentos').filter(o => o.owner === username)
};

// ---- SEQUENCE (numeração automática) ----
const Seq = {
  getNext: () => {
    const meta = readMeta('orcamentos');
    return meta.nextNum || 324;
  },
  setNext: (n) => {
    const meta = readMeta('orcamentos');
    meta.nextNum = n;
    writeMeta('orcamentos', meta);
  },
  // Recalcula o próximo número baseado nos orçamentos existentes
  recalcAfterDelete: () => {
    const list = readDb('orcamentos');
    const meta = readMeta('orcamentos');
    const currentNext = meta.nextNum || 324;
    if (list.length === 0) return; // mantém o atual

    // Pega o maior número já usado
    const maxUsed = Math.max(...list.map(o => o.num));
    // Só atualiza se o próximo for maior que maxUsed+1 (ou seja, o último foi deletado)
    if (currentNext === maxUsed + 2) {
      // o último orçamento (maxUsed+1) foi deletado, volta para ele
      meta.nextNum = maxUsed + 1;
      writeMeta('orcamentos', meta);
    }
    // Caso contrário: o orçamento deletado não era o último -> não mexe
  }
};

module.exports = { Users, Orcamentos, Seq };
