const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { app } = require('electron')

const SALT = 'embryology-inventory-2024'
const hashPassword = (pwd) =>
  crypto.createHash('sha256').update(pwd + SALT).digest('hex')

let db = null
let dbPath = ''
let backupDir = ''

function initDatabase() {
  const userDataDir = app.getPath('userData')
  const dataDir = path.join(userDataDir, 'data')
  backupDir = path.join(userDataDir, 'backups')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

  dbPath = path.join(dataDir, 'db.sqlite3')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  createTables()
  seedData()
  return db
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      name TEXT NOT NULL,
      spec TEXT,
      manufacturer TEXT,
      brand TEXT,
      category TEXT,
      unit TEXT,
      storage_condition TEXT,
      shelf_location TEXT,
      price REAL DEFAULT 0,
      warn_threshold INTEGER DEFAULT 1,
      status INTEGER DEFAULT 1,
      remark TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS inbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      batch_no TEXT,
      expiry_date TEXT,
      quantity INTEGER,
      supplier TEXT,
      handler TEXT,
      in_date TEXT,
      remark TEXT,
      status INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS outbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      batch_no TEXT,
      quantity INTEGER,
      handler TEXT,
      checker TEXT,
      out_date TEXT,
      remark TEXT,
      status INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      batch_no TEXT,
      expiry_date TEXT,
      quantity INTEGER DEFAULT 0,
      shelf_location TEXT,
      inbound_id INTEGER,
      created_at TEXT,
      UNIQUE(material_id, batch_no)
    );

    CREATE TABLE IF NOT EXISTS stock_check (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER,
      batch_no TEXT,
      book_qty INTEGER,
      actual_qty INTEGER,
      diff INTEGER,
      reason TEXT,
      handler TEXT,
      check_date TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS op_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      name TEXT,
      module TEXT,
      action TEXT,
      target TEXT,
      detail TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dict (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      label TEXT,
      sort INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1
    );
  `)
}

function seedData() {
  const c = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
  if (c === 0) {
    const ins = db.prepare(
      'INSERT INTO users (username, name, password, role, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    const now = new Date().toISOString()
    ins.run('admin', '系统管理员', hashPassword('admin123'), 'admin', now)
    ins.run('2001', '黎铁娥', hashPassword('123456'), 'user', now)
    ins.run('2002', '刘婕', hashPassword('123456'), 'admin', now)
    ins.run('2003', '朱娜娜', hashPassword('123456'), 'user', now)
  }

  const cd = db.prepare('SELECT COUNT(*) AS c FROM dict').get().c
  if (cd === 0) {
    const ins = db.prepare('INSERT INTO dict (type, label, sort) VALUES (?, ?, ?)')
    const cats = ['培养试剂', '冷冻复苏', '辅助试剂', '培养耗材', '常用耗材', '非常用耗材', '气体', '其他']
    cats.forEach((l, i) => ins.run('category', l, i))
    const stores = ['常温', '冷藏', '冷冻', '液氮', '冰箱']
    stores.forEach((l, i) => ins.run('storage', l, i))
  }
}

const getDb = () => db
const getDbPath = () => dbPath
const getBackupDir = () => backupDir

module.exports = {
  initDatabase, getDb, getDbPath, getBackupDir,
  hashPassword, SALT
}
