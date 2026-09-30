const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

// Configure collector avatar uploads in server/uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'collector-avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, JPEG, WEBP, SVG) are allowed'), false);
    }
  }
});

router.use(authenticateToken, enforceTenant);

// POST /api/collectors/upload-avatar (Upload collector avatar)
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No avatar image file was uploaded' });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;
  res.json({
    message: 'Avatar uploaded successfully',
    avatarUrl
  });
});

// GET /api/collectors (List collectors for the company with stats)
router.get('/', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  const collectors = db.prepare(`
    SELECT id, name, email, phone, avatar, status, joining_date, created_at
    FROM users
    WHERE company_id = ? AND role = 'collector'
    ORDER BY name ASC
  `).all(companyId);

  // Attach metrics and areas to each collector
  const result = collectors.map(col => {
    // Assigned areas
    const areas = db.prepare(`
      SELECT a.id, a.name, a.code
      FROM collector_areas ca
      JOIN areas a ON ca.area_id = a.id
      WHERE ca.collector_id = ?
    `).all(col.id);

    const areaIds = areas.map(a => a.id);

    // Total assigned customers & outstanding
    let assignedCustomers = 0;
    let activeCustomers = 0;
    let closedCustomers = 0;
    let totalDue = 0;
    if (areaIds.length > 0) {
      const custStats = db.prepare(`
        SELECT 
          COUNT(*) as count, 
          COALESCE(SUM(current_due), 0) as due,
          SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed_count
        FROM customers
        WHERE company_id = ? AND area_id IN (${areaIds.map(() => '?').join(',')})
      `).get(companyId, ...areaIds);
      assignedCustomers = custStats.count || 0;
      totalDue = custStats.due || 0;
      activeCustomers = custStats.active_count || 0;
      closedCustomers = custStats.closed_count || 0;
    }

    // Today's collection
    const todayColl = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count
      FROM payments
      WHERE company_id = ? AND collector_id = ? AND payment_date = ?
    `).get(companyId, col.id, todayStr);

    // Month's collection
    const monthColl = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count
      FROM payments
      WHERE company_id = ? AND collector_id = ? AND payment_date LIKE ?
    `).get(companyId, col.id, `${thisMonthStr}%`);

    // Total all time collection
    const allTimeColl = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count
      FROM payments
      WHERE company_id = ? AND collector_id = ?
    `).get(companyId, col.id);

    return {
      ...col,
      areas,
      assignedCustomers,
      activeCustomers,
      closedCustomers,
      totalDue,
      todayCollection: todayColl.total,
      todayTxCount: todayColl.tx_count,
      monthCollection: monthColl.total,
      monthTxCount: monthColl.tx_count,
      totalCollection: allTimeColl.total,
      totalTxCount: allTimeColl.tx_count
    };
  });

  res.json(result);
});

// GET /api/collectors/:id (Detailed Profile and Performance)
router.get('/:id', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const collector = db.prepare(`
    SELECT id, name, email, phone, avatar, status, joining_date, created_at
    FROM users
    WHERE id = ? AND company_id = ? AND role = 'collector'
  `).get(req.params.id, companyId);

  if (!collector) {
    return res.status(404).json({ error: 'Collector not found' });
  }

  const areas = db.prepare(`
    SELECT a.id, a.name, a.code
    FROM collector_areas ca
    JOIN areas a ON ca.area_id = a.id
    WHERE ca.collector_id = ?
  `).all(collector.id);

  const areaIds = areas.map(a => a.id);
  let assignedCustomers = 0;
  let activeCustomers = 0;
  let closedCustomers = 0;
  let totalDue = 0;
  if (areaIds.length > 0) {
    const custStats = db.prepare(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(current_due), 0) as due,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed_count
      FROM customers
      WHERE company_id = ? AND area_id IN (${areaIds.map(() => '?').join(',')})
    `).get(companyId, ...areaIds);
    assignedCustomers = custStats.count || 0;
    totalDue = custStats.due || 0;
    activeCustomers = custStats.active_count || 0;
    closedCustomers = custStats.closed_count || 0;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  const todayColl = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count
    FROM payments
    WHERE collector_id = ? AND payment_date = ?
  `).get(collector.id, todayStr);

  const monthColl = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count
    FROM payments
    WHERE collector_id = ? AND payment_date LIKE ?
  `).get(collector.id, `${thisMonthStr}%`);

  const allTimeColl = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count
    FROM payments
    WHERE collector_id = ?
  `).get(collector.id);

  res.json({
    collector,
    areas,
    stats: {
      assignedCustomers,
      activeCustomers,
      closedCustomers,
      totalDue,
      todayCollection: todayColl.total,
      todayTxCount: todayColl.tx_count,
      monthCollection: monthColl.total,
      monthTxCount: monthColl.tx_count,
      totalCollection: allTimeColl.total,
      totalTxCount: allTimeColl.tx_count
    }
  });
});

// POST /api/collectors (Create Collector)
router.post('/', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { name, email, phone, password, area_ids, status = 'Active', joining_date, avatar } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'Name, Email, Phone, and Password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'Email address already registered' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const joinDate = joining_date || new Date().toISOString().split('T')[0];

  const createCollectorTx = db.transaction(() => {
    const userRes = db.prepare(`
      INSERT INTO users (company_id, name, email, phone, password_hash, role, avatar, status, joining_date)
      VALUES (?, ?, ?, ?, ?, 'collector', ?, ?, ?)
    `).run(companyId, name.trim(), email.trim(), phone.trim(), passwordHash, avatar || '', status, joinDate);

    const collectorId = userRes.lastInsertRowid;

    if (Array.isArray(area_ids)) {
      const insertArea = db.prepare('INSERT OR IGNORE INTO collector_areas (collector_id, area_id) VALUES (?, ?)');
      for (const areaId of area_ids) {
        insertArea.run(collectorId, areaId);
      }
    }

    return collectorId;
  });

  try {
    const collectorId = createCollectorTx();
    res.status(201).json({ message: 'Collector created successfully', collectorId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/collectors/:id (Edit Collector)
router.put('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { name, email, phone, area_ids, status, joining_date, avatar } = req.body;

  const collector = db.prepare("SELECT id, avatar FROM users WHERE id = ? AND company_id = ? AND role = 'collector'").get(req.params.id, companyId);
  if (!collector) {
    return res.status(404).json({ error: 'Collector not found' });
  }

  const newAvatar = avatar !== undefined ? avatar : collector.avatar;

  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          joining_date = COALESCE(?, joining_date),
          avatar = ?
      WHERE id = ?
    `).run(name, email, phone, status, joining_date, newAvatar, req.params.id);

    if (Array.isArray(area_ids)) {
      db.prepare('DELETE FROM collector_areas WHERE collector_id = ?').run(req.params.id);
      const insertArea = db.prepare('INSERT OR IGNORE INTO collector_areas (collector_id, area_id) VALUES (?, ?)');
      for (const areaId of area_ids) {
        insertArea.run(req.params.id, areaId);
      }
    }
  });

  try {
    updateTx();
    res.json({ message: 'Collector updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/collectors/:id/reset-password
router.post('/:id/reset-password', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(new_password, salt);

  const result = db.prepare(`
    UPDATE users SET password_hash = ?
    WHERE id = ? AND company_id = ? AND role = 'collector'
  `).run(passwordHash, req.params.id, companyId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Collector not found' });
  }

  res.json({ message: 'Collector password reset successfully' });
});

// PATCH /api/collectors/:id/status
router.patch('/:id/status', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { status } = req.body;

  db.prepare(`
    UPDATE users SET status = ?
    WHERE id = ? AND company_id = ? AND role = 'collector'
  `).run(status, req.params.id, companyId);

  res.json({ message: `Collector status updated to ${status}` });
});

// DELETE /api/collectors/:id
router.delete('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  db.prepare("DELETE FROM users WHERE id = ? AND company_id = ? AND role = 'collector'").run(req.params.id, companyId);
  res.json({ message: 'Collector deleted successfully' });
});

// GET /api/collectors/:id/history (Collection History with date filtering)
router.get('/:id/history', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT 
      p.*,
      c.name as customer_name,
      c.customer_id as customer_code,
      c.phone as customer_phone,
      a.name as area_name
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN areas a ON c.area_id = a.id
    WHERE p.collector_id = ? AND p.company_id = ?
  `;
  const params = [req.params.id, companyId];

  if (start_date) {
    sql += ' AND p.payment_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND p.payment_date <= ?';
    params.push(end_date);
  }

  sql += ' ORDER BY p.id DESC';
  const payments = db.prepare(sql).all(...params);
  res.json(payments);
});

module.exports = router;
