const { ipcMain, dialog, shell, app } = require('electron')
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')
const {
  getDb, getDbPath, getBackupDir, hashPassword
} = require('./db')

const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)

function writeLog(username, name, module, action, target, detail) {
  const db = getDb()
  db.prepare(
    `INSERT INTO op_logs (username, name, module, action, target, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(username || '', name || '', module, action, target || '', detail || '', now())
}

function registerIpc() {
  const db = () => getDb()

  /* ---------- 登录 ---------- */
  ipcMain.handle('auth:login', (_, { username, password }) => {
    const row = db()
      .prepare('SELECT * FROM users WHERE username = ? AND status = 1')
      .get(username)
    if (!row) return { ok: false, msg: '工号不存在或已禁用' }
    if (row.password !== hashPassword(password)) return { ok: false, msg: '密码错误' }
    writeLog(row.username, row.name, '账号权限', '登录', '登录系统', '登录成功')
    const { password: _pw, ...safe } = row
    return { ok: true, user: safe }
  })

  ipcMain.handle('auth:changePassword', (_, { username, oldPwd, newPwd }) => {
    const u = db().prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!u) return { ok: false, msg: '用户不存在' }
    if (u.password !== hashPassword(oldPwd)) return { ok: false, msg: '原密码错误' }
    db().prepare('UPDATE users SET password = ? WHERE username = ?')
      .run(hashPassword(newPwd), username)
    writeLog(username, u.name, '账号权限', '修改密码', '修改密码', '用户修改自身密码')
    return { ok: true }
  })

  /* ---------- 用户管理 ---------- */
  ipcMain.handle('user:list', () =>
    db().prepare('SELECT id, username, name, role, status, created_at FROM users ORDER BY id').all()
  )

  ipcMain.handle('user:save', (_, d) => {
    if (d.id) {
      db().prepare('UPDATE users SET name=?, role=?, status=? WHERE id=?')
        .run(d.name, d.role, d.status ?? 1, d.id)
      writeLog(d._op, d._opName, '账号权限', '修改账号', `auth.User ${d.id}`,
        `账号: ${d.username}, 角色: ${d.role}`)
    } else {
      if (!d.username || !d.password) return { ok: false, msg: '工号和密码必填' }
      db().prepare(
        'INSERT INTO users (username, name, password, role, status, created_at) VALUES (?,?,?,?,?,?)'
      ).run(d.username, d.name, hashPassword(d.password), d.role || 'user', 1, now())
      writeLog(d._op, d._opName, '账号权限', '新增账号', d.username, `角色: ${d.role}`)
    }
    return { ok: true }
  })

  ipcMain.handle('user:remove', (_, d) => {
    db().prepare('UPDATE users SET status = 0 WHERE id = ?').run(d.id)
    writeLog(d._op, d._opName, '账号权限', '禁用账号', `auth.User ${d.id}`, '')
    return { ok: true }
  })

  /* ---------- 基础档案 ---------- */
  ipcMain.handle('material:list', (_, q = {}) => {
    let sql = 'SELECT * FROM materials WHERE 1=1'
    const p = []
    if (q.name) { sql += ' AND name LIKE ?'; p.push(`%${q.name}%`) }
    if (q.category) { sql += ' AND category = ?'; p.push(q.category) }
    sql += ' ORDER BY id DESC'
    return db().prepare(sql).all(...p)
  })

  ipcMain.handle('material:save', (_, d) => {
    const fields = ['code', 'name', 'spec', 'manufacturer', 'brand', 'category',
      'unit', 'storage_condition', 'shelf_location', 'price', 'warn_threshold', 'remark']
    if (d.id) {
      const sets = fields.map(f => `${f}=?`).join(',')
      db().prepare(`UPDATE materials SET ${sets} WHERE id=?`)
        .run(...fields.map(f => d[f] ?? null), d.id)
      writeLog(d._op, d._opName, '基础档案', '修改', d.name, '')
    } else {
      db().prepare(
        `INSERT INTO materials (code,name,spec,manufacturer,brand,category,unit,
         storage_condition,shelf_location,price,warn_threshold,remark,status,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)`
      ).run(d.code, d.name, d.spec, d.manufacturer, d.brand, d.category, d.unit,
        d.storage_condition, d.shelf_location, d.price || 0, d.warn_threshold || 1,
        d.remark || '', now())
      writeLog(d._op, d._opName, '基础档案', '新增', d.name, '')
    }
    return { ok: true }
  })

  ipcMain.handle('material:remove', (_, d) => {
    db().prepare('UPDATE materials SET status = 0 WHERE id = ?').run(d.id)
    writeLog(d._op, d._opName, '基础档案', '作废', d.name || '', '')
    return { ok: true }
  })

  /* ---------- 入库 ---------- */
  ipcMain.handle('inbound:list', (_, q = {}) => {
    let sql = `SELECT i.*, m.name AS material_name, m.category, m.spec, m.manufacturer
               FROM inbound i LEFT JOIN materials m ON m.id = i.material_id WHERE 1=1`
    const p = []
    if (q.materialName) { sql += ' AND m.name LIKE ?'; p.push(`%${q.materialName}%`) }
    if (q.start) { sql += ' AND i.in_date >= ?'; p.push(q.start) }
    if (q.end) { sql += ' AND i.in_date <= ?'; p.push(q.end) }
    if (q.handler) { sql += ' AND i.handler LIKE ?'; p.push(`%${q.handler}%`) }
    sql += ' ORDER BY i.id DESC LIMIT 500'
    return db().prepare(sql).all(...p)
  })

  ipcMain.handle('inbound:save', (_, d) => {
    const tx = db().transaction(() => {
      const res = db().prepare(
        `INSERT INTO inbound (material_id,batch_no,expiry_date,quantity,supplier,handler,
          in_date,remark,status,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)`
      ).run(d.material_id, d.batch_no, d.expiry_date, d.quantity, d.supplier || '',
        d.handler || '', d.in_date || today(), d.remark || '', now())

      const existing = db().prepare(
        'SELECT * FROM stock_batches WHERE material_id=? AND batch_no=?'
      ).get(d.material_id, d.batch_no)

      if (existing) {
        db().prepare('UPDATE stock_batches SET quantity = quantity + ? WHERE id = ?')
          .run(d.quantity, existing.id)
      } else {
        db().prepare(
          `INSERT INTO stock_batches (material_id,batch_no,expiry_date,quantity,
            shelf_location,inbound_id,created_at) VALUES (?,?,?,?,?,?,?)`
        ).run(d.material_id, d.batch_no, d.expiry_date, d.quantity,
          d.shelf_location || '', res.lastInsertRowid, now())
      }
    })
    tx()
    writeLog(d._op, d._opName, '入库管理', '新增入库', d.batch_no || '', `数量: ${d.quantity}`)
    return { ok: true }
  })

  ipcMain.handle('inbound:void', (_, d) => {
    const row = db().prepare('SELECT * FROM inbound WHERE id = ?').get(d.id)
    if (!row || row.status === 0) return { ok: false, msg: '记录不存在' }
    const tx = db().transaction(() => {
      db().prepare('UPDATE inbound SET status = 0 WHERE id = ?').run(d.id)
      db().prepare(
        'UPDATE stock_batches SET quantity = MAX(0, quantity - ?) WHERE material_id=? AND batch_no=?'
      ).run(row.quantity, row.material_id, row.batch_no)
    })
    tx()
    writeLog(d._op, d._opName, '入库管理', '作废', row.batch_no, `数量: ${row.quantity}`)
    return { ok: true }
  })

  /* ---------- 出库 ---------- */
  ipcMain.handle('outbound:recommend', (_, { material_id }) => {
    return db().prepare(
      `SELECT * FROM stock_batches
       WHERE material_id = ? AND quantity > 0
       ORDER BY julianday(expiry_date) ASC`
    ).all(material_id)
  })

  ipcMain.handle('outbound:list', (_, q = {}) => {
    let sql = `SELECT o.*, m.name AS material_name, m.category, m.spec, m.manufacturer
               FROM outbound o LEFT JOIN materials m ON m.id = o.material_id WHERE 1=1`
    const p = []
    if (q.materialName) { sql += ' AND m.name LIKE ?'; p.push(`%${q.materialName}%`) }
    if (q.start) { sql += ' AND o.out_date >= ?'; p.push(q.start) }
    if (q.end) { sql += ' AND o.out_date <= ?'; p.push(q.end) }
    if (q.handler) { sql += ' AND o.handler LIKE ?'; p.push(`%${q.handler}%`) }
    sql += ' ORDER BY o.id DESC LIMIT 500'
    return db().prepare(sql).all(...p)
  })

  ipcMain.handle('outbound:save', (_, d) => {
    const batch = db().prepare(
      'SELECT * FROM stock_batches WHERE material_id=? AND batch_no=?'
    ).get(d.material_id, d.batch_no)
    if (!batch || batch.quantity < d.quantity) {
      return { ok: false, msg: '库存不足或批次不存在' }
    }
    const tx = db().transaction(() => {
      db().prepare(
        `INSERT INTO outbound (material_id,batch_no,quantity,handler,checker,out_date,remark,status,created_at)
         VALUES (?,?,?,?,?,?,?,1,?)`
      ).run(d.material_id, d.batch_no, d.quantity, d.handler || '',
        d.checker || '', d.out_date || today(), d.remark || '', now())
      db().prepare(
        'UPDATE stock_batches SET quantity = quantity - ? WHERE material_id=? AND batch_no=?'
      ).run(d.quantity, d.material_id, d.batch_no)
    })
    tx()
    writeLog(d._op, d._opName, '出库领用', '新增出库', d.batch_no, `数量: ${d.quantity}`)
    return { ok: true }
  })

  /* ---------- 实时库存 ---------- */
  ipcMain.handle('stock:list', (_, q = {}) => {
    let sql = `
      SELECT sb.*, m.name AS material_name, m.category, m.unit, m.warn_threshold,
             m.manufacturer, m.spec
      FROM stock_batches sb
      LEFT JOIN materials m ON m.id = sb.material_id
      WHERE sb.quantity >= 0`
    const p = []
    if (q.materialName) { sql += ' AND m.name LIKE ?'; p.push(`%${q.materialName}%`) }
    if (q.category) { sql += ' AND m.category = ?'; p.push(q.category) }
    if (q.status === 'low') sql += ' AND sb.quantity > 0 AND sb.quantity <= m.warn_threshold'
    if (q.status === 'expired') sql += " AND julianday(sb.expiry_date) < julianday('now')"
    sql += ' ORDER BY m.name, julianday(sb.expiry_date)'
    return db().prepare(sql).all(...p)
  })

  ipcMain.handle('stock:summary', () => {
    const dbc = db()
    const totalMaterial = dbc.prepare(
      'SELECT COUNT(*) AS c FROM materials WHERE status = 1'
    ).get().c
    const lowStock = dbc.prepare(
      `SELECT COUNT(*) AS c FROM stock_batches sb
       LEFT JOIN materials m ON m.id = sb.material_id
       WHERE sb.quantity > 0 AND sb.quantity <= m.warn_threshold`
    ).get().c
    const nearExpiry = dbc.prepare(
      `SELECT COUNT(*) AS c FROM stock_batches
       WHERE quantity > 0 AND julianday(expiry_date) - julianday('now') BETWEEN 0 AND 30`
    ).get().c
    const expired = dbc.prepare(
      `SELECT COUNT(*) AS c FROM stock_batches
       WHERE quantity > 0 AND julianday(expiry_date) < julianday('now')`
    ).get().c
    const todayOps = dbc.prepare(
      `SELECT
        (SELECT COUNT(*) FROM inbound WHERE date(in_date) = date('now') AND status = 1) +
        (SELECT COUNT(*) FROM outbound WHERE date(out_date) = date('now') AND status = 1) AS c`
    ).get().c
    return { totalMaterial, lowStock, nearExpiry, expired, todayOps }
  })

  /* ---------- 盘点 ---------- */
  ipcMain.handle('check:list', (_, q = {}) => {
    let sql = `SELECT sc.*, m.name AS material_name, m.category
               FROM stock_check sc LEFT JOIN materials m ON m.id = sc.material_id WHERE 1=1`
    const p = []
    if (q.start) { sql += ' AND sc.check_date >= ?'; p.push(q.start) }
    if (q.end) { sql += ' AND sc.check_date <= ?'; p.push(q.end) }
    sql += ' ORDER BY sc.id DESC LIMIT 500'
    return db().prepare(sql).all(...p)
  })

  ipcMain.handle('check:save', (_, d) => {
    const batch = db().prepare(
      'SELECT * FROM stock_batches WHERE material_id=? AND batch_no=?'
    ).get(d.material_id, d.batch_no)
    if (!batch) return { ok: false, msg: '批次不存在' }
    const book = batch.quantity
    const diff = (d.actual_qty || 0) - book
    const tx = db().transaction(() => {
      db().prepare(
        `INSERT INTO stock_check (material_id,batch_no,book_qty,actual_qty,diff,reason,
          handler,check_date,created_at) VALUES (?,?,?,?,?,?,?,?,?)`
      ).run(d.material_id, d.batch_no, book, d.actual_qty, diff,
        d.reason || '', d.handler || '', d.check_date || today(), now())
      db().prepare(
        'UPDATE stock_batches SET quantity = ? WHERE material_id=? AND batch_no=?'
      ).run(d.actual_qty, d.material_id, d.batch_no)
    })
    tx()
    writeLog(d._op, d._opName, '库存盘点', '盘点修正', d.batch_no, `差异: ${diff}`)
    return { ok: true }
  })

  /* ---------- 查询中心 ---------- */
  ipcMain.handle('query:records', (_, q = {}) => {
    const dbc = db()
    const params = []
    let inSql = `SELECT '入库' AS type, i.in_date AS date, m.name AS material_name,
                 m.category, i.batch_no, i.quantity, m.unit, i.handler AS person,
                 '正常' AS status, i.remark
                 FROM inbound i LEFT JOIN materials m ON m.id=i.material_id
                 WHERE i.status=1`
    let outSql = `SELECT '出库' AS type, o.out_date AS date, m.name AS material_name,
                  m.category, o.batch_no, o.quantity, m.unit, o.handler AS person,
                  '正常' AS status, o.remark
                  FROM outbound o LEFT JOIN materials m ON m.id=o.material_id
                  WHERE o.status=1`
    const conds = []
    if (q.start) { conds.push('date >= ?'); params.push(q.start) }
    if (q.end) { conds.push('date <= ?'); params.push(q.end) }
    if (q.materialName) {
      conds.push('material_name LIKE ?'); params.push(`%${q.materialName}%`)
    }
    if (q.category) { conds.push('category = ?'); params.push(q.category) }
    const where = conds.length ? ' WHERE ' + conds.join(' AND ') : ''
    const sql = `SELECT * FROM (${inSql} UNION ALL ${outSql})${where} ORDER BY date DESC LIMIT 1000`
    return dbc.prepare(sql).all(...params)
  })

  /* ---------- 日志 ---------- */
  ipcMain.handle('log:list', (_, q = {}) => {
    let sql = 'SELECT * FROM op_logs WHERE 1=1'
    const p = []
    if (q.keyword) {
      sql += ' AND (detail LIKE ? OR target LIKE ?)'
      p.push(`%${q.keyword}%`, `%${q.keyword}%`)
    }
    if (q.username) { sql += ' AND username = ?'; p.push(q.username) }
    if (q.module) { sql += ' AND module = ?'; p.push(q.module) }
    if (q.start) { sql += ' AND date(created_at) >= date(?)'; p.push(q.start) }
    if (q.end) { sql += ' AND date(created_at) <= date(?)'; p.push(q.end) }
    sql += ' ORDER BY id DESC LIMIT 500'
    return db().prepare(sql).all(...p)
  })

  ipcMain.handle('log:write', (_, d) => {
    writeLog(d.username, d.name, d.module, d.action, d.target, d.detail)
    return { ok: true }
  })

  /* ---------- 字典 ---------- */
  ipcMain.handle('dict:list', (_, { type } = {}) => {
    if (type)
      return db().prepare('SELECT * FROM dict WHERE type=? ORDER BY sort').all(type)
    return db().prepare('SELECT * FROM dict ORDER BY type, sort').all()
  })

  ipcMain.handle('dict:save', (_, d) => {
    if (d.id) {
      db().prepare('UPDATE dict SET label=?, sort=?, status=? WHERE id=?')
        .run(d.label, d.sort || 0, d.status ?? 1, d.id)
    } else {
      db().prepare('INSERT INTO dict (type, label, sort) VALUES (?,?,?)')
        .run(d.type, d.label, d.sort || 0)
    }
    return { ok: true }
  })

  ipcMain.handle('dict:remove', (_, d) => {
    db().prepare('DELETE FROM dict WHERE id=?').run(d.id)
    return { ok: true }
  })

  /* ---------- 备份恢复 ---------- */
  ipcMain.handle('backup:create', () => {
    const src = getDbPath()
    const name = `db_${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite3`
    const dest = path.join(getBackupDir(), name)
    fs.copyFileSync(src, dest)
    writeLog('system', 'system', '备份恢复', '备份', name, '')
    return { ok: true, file: dest }
  })

  ipcMain.handle('backup:list', () => {
    const dir = getBackupDir()
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir).map(f => {
      const st = fs.statSync(path.join(dir, f))
      return { name: f, size: st.size, mtime: st.mtime.toISOString() }
    }).sort((a, b) => b.mtime.localeCompare(a.mtime))
  })

  ipcMain.handle('backup:restore', (_, { name }) => {
    const src = path.join(getBackupDir(), name)
    if (!fs.existsSync(src)) return { ok: false, msg: '备份文件不存在' }
    getDb().close()
    fs.copyFileSync(src, getDbPath())
    app.relaunch()
    app.exit(0)
  })

  ipcMain.handle('backup:openDir', () => {
    shell.openPath(getBackupDir())
    return { ok: true }
  })

  /* ---------- 报表导出 ---------- */
  ipcMain.handle('report:exportExcel', async (_, { filename, sheets }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出 Excel',
      defaultPath: filename,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (canceled || !filePath) return { ok: false, msg: '已取消' }
    const wb = XLSX.utils.book_new()
    for (const s of sheets) {
      const ws = XLSX.utils.json_to_sheet(s.rows)
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 30))
    }
    XLSX.writeFile(wb, filePath)
    return { ok: true, file: filePath }
  })

  /* ---------- 路径信息 ---------- */
  ipcMain.handle('app:paths', () => ({
    dbPath: getDbPath(),
    backupDir: getBackupDir()
  }))
}

module.exports = registerIpc
