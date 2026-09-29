const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// All superadmin routes require super_admin role
router.use(authenticateToken, requireRoles('super_admin'));

// GET /api/superadmin/dashboard-stats
router.get('/dashboard-stats', (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // 'YYYY-MM'

  const totalCompanies = db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
  const activeCompanies = db.prepare(`SELECT COUNT(*) as count FROM companies WHERE status = 'Active'`).get().count;
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const activeCustomers = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE status = 'Active'`).get().count;
  const suspendedCustomers = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE status = 'Closed'`).get().count;
  const freeCustomers = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE status = 'Free'`).get().count;
  
  const totalOutstanding = db.prepare('SELECT COALESCE(SUM(current_due), 0) as total FROM customers').get().total;
  
  const todayCollection = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total 
    FROM payments 
    WHERE payment_date = ?
  `).get(todayStr).total;

  const thisMonthCollection = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as total 
    FROM payments 
    WHERE payment_date LIKE ?
  `).get(`${thisMonthStr}%`).total;

  const totalCollectors = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'collector'`).get().count;
  const totalCollectionAllTime = db.prepare('SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments').get().total;

  res.json({
    totalCompanies,
    activeCompanies,
    totalCustomers,
    activeCustomers,
    suspendedCustomers,
    freeCustomers,
    totalOutstanding,
    todayCollection,
    thisMonthCollection,
    totalCollectors,
    totalCollectionAllTime
  });
});

// GET /api/superadmin/companies
router.get('/companies', (req, res) => {
  const { search, status } = req.query;
  let sql = `
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM customers WHERE company_id = c.id) as customer_count,
      (SELECT COUNT(*) FROM customers WHERE company_id = c.id AND status = 'Active') as active_customer_count,
      (SELECT COUNT(*) FROM users WHERE company_id = c.id AND role = 'collector') as collector_count,
      (SELECT COALESCE(SUM(current_due), 0) FROM customers WHERE company_id = c.id) as total_due,
      (SELECT COALESCE(SUM(paid_amount), 0) FROM payments WHERE company_id = c.id) as total_collected,
      u.email as admin_email,
      u.name as admin_name
    FROM companies c
    LEFT JOIN users u ON u.company_id = c.id AND u.role = 'company_admin'
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (c.name LIKE ? OR c.owner_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY c.id DESC';
  const companies = db.prepare(sql).all(...params);
  res.json(companies);
});

// GET /api/superadmin/companies/:id
router.get('/companies/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const admin = db.prepare(`SELECT id, name, email, phone, status FROM users WHERE company_id = ? AND role = 'company_admin' LIMIT 1`).get(company.id);
  const areas = db.prepare('SELECT * FROM areas WHERE company_id = ?').all(company.id);
  const packages = db.prepare('SELECT * FROM packages WHERE company_id = ?').all(company.id);
  const collectors = db.prepare(`SELECT id, name, email, phone, status, joining_date FROM users WHERE company_id = ? AND role = 'collector'`).all(company.id);
  
  const stats = {
    customer_count: db.prepare('SELECT COUNT(*) as count FROM customers WHERE company_id = ?').get(company.id).count,
    active_customers: db.prepare(`SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Active'`).get(company.id).count,
    total_due: db.prepare('SELECT COALESCE(SUM(current_due), 0) as total FROM customers WHERE company_id = ?').get(company.id).total,
    total_collected: db.prepare('SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE company_id = ?').get(company.id).total
  };

  res.json({
    company,
    admin,
    areas,
    packages,
    collectors,
    stats
  });
});

// POST /api/superadmin/companies (Create Company + Admin)
router.post('/companies', (req, res) => {
  const {
    name,
    owner_name,
    phone,
    email,
    address,
    admin_email,
    admin_password,
    logo,
    status = 'Active',
    customer_prefix = 'DSN',
    notes
  } = req.body;

  if (!name || !owner_name || !phone || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Company Name, Owner Name, Phone, Admin Email and Admin Password are required' });
  }

  // Check if admin email is already used
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(admin_email.trim());
  if (existingUser) {
    return res.status(400).json({ error: 'Admin email is already registered in the system' });
  }

  const regDate = new Date().toISOString().split('T')[0];

  const createCompanyTx = db.transaction(() => {
    // 1. Insert Company
    const compRes = db.prepare(`
      INSERT INTO companies (name, owner_name, phone, email, address, logo, status, registration_date, customer_prefix, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      owner_name.trim(),
      phone.trim(),
      (email || admin_email).trim(),
      address || '',
      logo || '',
      status,
      regDate,
      (customer_prefix || 'FCN').toUpperCase().trim(),
      notes || ''
    );
    const companyId = compRes.lastInsertRowid;

    // 2. Insert Company Admin
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(admin_password, salt);
    db.prepare(`
      INSERT INTO users (company_id, name, email, phone, password_hash, role, status, joining_date)
      VALUES (?, ?, ?, ?, ?, 'company_admin', 'Active', ?)
    `).run(
      companyId,
      owner_name.trim() + ' (Admin)',
      admin_email.trim(),
      phone.trim(),
      passwordHash,
      regDate
    );

    // 3. Create default packages (Regular - 150 BDT, Free - 0 BDT)
    db.prepare(`
      INSERT INTO packages (company_id, name, price, description, status)
      VALUES (?, 'Regular', 150, 'Standard Cable TV Package (60+ Channels)', 'Active')
    `).run(companyId);

    db.prepare(`
      INSERT INTO packages (company_id, name, price, description, status)
      VALUES (?, 'Free', 0, 'Complimentary line', 'Active')
    `).run(companyId);

    // 4. Create default area (Main Zone)
    db.prepare(`
      INSERT INTO areas (company_id, name, code, description, status)
      VALUES (?, 'Main Zone', 'MAIN', 'Default Area', 'Active')
    `).run(companyId);

    return companyId;
  });

  try {
    const newCompanyId = createCompanyTx();
    res.status(201).json({ message: 'Company and Admin created successfully', companyId: newCompanyId });
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: 'Failed to create company: ' + err.message });
  }
});

// PUT /api/superadmin/companies/:id
router.put('/companies/:id', (req, res) => {
  const { name, owner_name, phone, email, address, logo, status, customer_prefix, notes } = req.body;
  const companyId = req.params.id;

  const existing = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
  if (!existing) {
    return res.status(404).json({ error: 'Company not found' });
  }

  db.prepare(`
    UPDATE companies
    SET name = COALESCE(?, name),
        owner_name = COALESCE(?, owner_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        logo = COALESCE(?, logo),
        status = COALESCE(?, status),
        customer_prefix = COALESCE(?, customer_prefix),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(name, owner_name, phone, email, address, logo, status, customer_prefix, notes, companyId);

  res.json({ message: 'Company updated successfully' });
});

// PATCH /api/superadmin/companies/:id/status
router.patch('/companies/:id/status', (req, res) => {
  const { status } = req.body; // 'Active' or 'Inactive'
  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.prepare('UPDATE companies SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Company status changed to ${status}` });
});

// POST /api/superadmin/companies/:id/reset-password
router.post('/companies/:id/reset-password', (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(new_password, salt);

  const result = db.prepare(`
    UPDATE users 
    SET password_hash = ? 
    WHERE company_id = ? AND role = 'company_admin'
  `).run(passwordHash, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Company admin not found for this company' });
  }

  res.json({ message: 'Admin password successfully reset' });
});

// DELETE /api/superadmin/companies/:id
router.delete('/companies/:id', (req, res) => {
  const companyId = req.params.id;
  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(companyId);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);
  res.json({ message: `Company "${company.name}" and all associated data permanently deleted` });
});

// GET /api/superadmin/settings
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM platform_settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// POST /api/superadmin/settings
router.post('/settings', (req, res) => {
  const settings = req.body;
  const updateTx = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      db.prepare(`
        INSERT INTO platform_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(key, String(value));
    }
  });

  updateTx();
  res.json({ message: 'Platform settings updated successfully' });
});

module.exports = router;
