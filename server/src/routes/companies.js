const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

// Configure logo uploads in server/uploads
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
    cb(null, 'company-logo-' + uniqueSuffix + ext);
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

// GET /api/company/dashboard
router.get('/dashboard', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  // Top cards
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers WHERE company_id = ?').get(companyId).count;
  const activeCustomers = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Active'`).get(companyId).count;
  const freeCustomers = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND (status = 'Free' OR monthly_bill = 0)`).get(companyId).count;
  const closedCustomers = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Closed'`).get(companyId).count;

  const totalDue = db.prepare('SELECT COALESCE(SUM(current_due), 0) as total FROM customers WHERE company_id = ?').get(companyId).total;

  const todayCollection = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count 
    FROM payments 
    WHERE company_id = ? AND payment_date = ?
  `).get(companyId, todayStr);

  const thisMonthCollection = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as tx_count 
    FROM payments 
    WHERE company_id = ? AND payment_date LIKE ?
  `).get(companyId, `${thisMonthStr}%`);

  const collectorsCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE company_id = ? AND role = 'collector'`).get(companyId).count;
  const areasCount = db.prepare('SELECT COUNT(*) as count FROM areas WHERE company_id = ?').get(companyId).count;

  // Monthly billing summary
  const monthlyBilling = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_billed,
      COUNT(*) as bills_count
    FROM bills 
    WHERE company_id = ? AND billing_month = ?
  `).get(companyId, thisMonthStr);

  // Collector performance
  const collectors = db.prepare(`
    SELECT id, name, phone, avatar
    FROM users 
    WHERE company_id = ? AND role = 'collector'
  `).all(companyId);

  const collectorPerformance = collectors.map(c => {
    const today = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total 
      FROM payments 
      WHERE collector_id = ? AND payment_date = ?
    `).get(c.id, todayStr).total;

    const month = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total 
      FROM payments 
      WHERE collector_id = ? AND payment_date LIKE ?
    `).get(c.id, `${thisMonthStr}%`).total;

    const assignedAreaIds = db.prepare('SELECT area_id FROM collector_areas WHERE collector_id = ?').all(c.id).map(r => r.area_id);
    let assignedCustCount = 0;
    if (assignedAreaIds.length > 0) {
      assignedCustCount = db.prepare(`
        SELECT COUNT(*) as count FROM customers 
        WHERE company_id = ? AND area_id IN (${assignedAreaIds.map(() => '?').join(',')})
      `).get(companyId, ...assignedAreaIds).count;
    }

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      todayCollection: today,
      monthCollection: month,
      assignedCustomers: assignedCustCount
    };
  });

  // Recent payments
  const recentPayments = db.prepare(`
    SELECT 
      p.id,
      p.receipt_number,
      p.paid_amount,
      p.payment_date,
      p.payment_time,
      p.payment_method,
      c.name as customer_name,
      c.customer_id as cust_code,
      u.name as collector_name
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN users u ON p.collector_id = u.id
    WHERE p.company_id = ?
    ORDER BY p.id DESC
    LIMIT 10
  `).all(companyId);

  // Monthly collection trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mStr = d.toISOString().substring(0, 7);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

    const collected = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total 
      FROM payments 
      WHERE company_id = ? AND payment_date LIKE ?
    `).get(companyId, `${mStr}%`).total;

    const billed = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM bills 
      WHERE company_id = ? AND billing_month = ?
    `).get(companyId, mStr).total;

    monthlyTrend.push({
      month: label,
      monthKey: mStr,
      collected,
      billed
    });
  }

  res.json({
    metrics: {
      totalCustomers,
      activeCustomers,
      freeCustomers,
      closedCustomers,
      totalDue,
      todayCollection: todayCollection.total,
      todayTxCount: todayCollection.tx_count,
      thisMonthCollection: thisMonthCollection.total,
      monthTxCount: thisMonthCollection.tx_count,
      collectorsCount,
      areasCount,
      monthlyBilling
    },
    collectorPerformance,
    recentPayments,
    monthlyTrend
  });
});

// GET /api/company/settings
router.get('/settings', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }
  res.json(company);
});

// POST /api/company/upload-logo
router.post('/upload-logo', upload.single('logo'), (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No logo image file was uploaded' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const logoUrl = `/uploads/${req.file.filename}`;

  db.prepare('UPDATE companies SET logo = ? WHERE id = ?').run(logoUrl, companyId);
  const updatedCompany = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

  res.json({
    message: 'Logo uploaded successfully',
    logoUrl,
    company: updatedCompany
  });
});

// PUT /api/company/settings
router.put('/settings', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { name, owner_name, phone, email, address, logo, customer_prefix, notes, language } = req.body;

  db.prepare(`
    UPDATE companies
    SET name = COALESCE(?, name),
        owner_name = COALESCE(?, owner_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        logo = ?,
        customer_prefix = COALESCE(?, customer_prefix),
        notes = COALESCE(?, notes),
        language = COALESCE(?, language)
    WHERE id = ?
  `).run(
    name,
    owner_name,
    phone,
    email,
    address,
    logo !== undefined ? logo : null,
    customer_prefix ? customer_prefix.toUpperCase().trim() : null,
    notes,
    language ? (language === 'en' ? 'en' : 'bn') : null,
    companyId
  );

  const updatedCompany = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

  res.json({
    message: 'Company settings updated successfully',
    company: updatedCompany
  });
});

module.exports = router;
