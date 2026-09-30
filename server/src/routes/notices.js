const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// All notice routes require authentication
router.use(authenticateToken);

// GET /api/notices/active - Get notices to display in top marquee for the logged-in user
router.get('/active', (req, res) => {
  const user = req.user;
  let activeNotices = [];

  try {
    if (user.role === 'super_admin') {
      // Super admin sees recent active broadcasts sent to companies
      activeNotices = db.prepare(`
        SELECT n.*, c.name as target_company_name
        FROM notices n
        LEFT JOIN companies c ON n.target_company_id = c.id
        WHERE n.sender_role = 'super_admin' AND n.status = 'Active'
        ORDER BY n.id DESC
        LIMIT 5
      `).all();
    } else if (user.role === 'company_admin') {
      // Company Admin sees notices from Super Admin targeted to their company or all companies
      activeNotices = db.prepare(`
        SELECT n.*, u.name as sender_name
        FROM notices n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.sender_role = 'super_admin'
          AND (n.target_type = 'all_companies' OR n.target_company_id = ?)
          AND n.status = 'Active'
        ORDER BY n.id DESC
      `).all(user.company_id);
    } else if (user.role === 'collector') {
      // Collector sees notices from Company Admin targeted to them or all collectors
      activeNotices = db.prepare(`
        SELECT n.*, u.name as sender_name
        FROM notices n
        LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.sender_role = 'company_admin'
          AND n.company_id = ?
          AND (n.target_type = 'all_collectors' OR n.target_user_id = ?)
          AND n.status = 'Active'
        ORDER BY n.id DESC
      `).all(user.company_id, user.id);
    } else if (user.role === 'customer') {
      // Customer sees notices for their company
      activeNotices = db.prepare(`
        SELECT n.*
        FROM notices n
        WHERE n.company_id = ? AND n.status = 'Active' AND n.target_type IN ('all_customers', 'all')
        ORDER BY n.id DESC
      `).all(user.company_id);
    }

    res.json({ notices: activeNotices });
  } catch (err) {
    console.error('Error fetching active notices:', err);
    res.status(500).json({ error: 'Failed to fetch active notices: ' + err.message });
  }
});

// ==========================================
// SUPER ADMIN NOTICES (To Companies)
// ==========================================

// GET /api/notices/superadmin - List all notices created by superadmin
router.get('/superadmin', requireRoles('super_admin'), (req, res) => {
  try {
    const list = db.prepare(`
      SELECT n.*, c.name as target_company_name, u.name as sender_name
      FROM notices n
      LEFT JOIN companies c ON n.target_company_id = c.id
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.sender_role = 'super_admin'
      ORDER BY n.id DESC
    `).all();
    res.json({ notices: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notices/superadmin - Create new notice for company
router.post('/superadmin', requireRoles('super_admin'), (req, res) => {
  const { target_type = 'company', target_company_id, title, message, priority = 'normal', status = 'Active' } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Notice message is required' });
  }

  if (target_type === 'company' && !target_company_id) {
    return res.status(400).json({ error: 'Please select a target company' });
  }

  try {
    const insertRes = db.prepare(`
      INSERT INTO notices (sender_role, sender_id, target_type, target_company_id, title, message, priority, status)
      VALUES ('super_admin', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      target_type,
      target_type === 'company' ? Number(target_company_id) : null,
      (title || '').trim(),
      message.trim(),
      priority,
      status
    );

    res.status(201).json({ message: 'Notice broadcasted successfully', noticeId: insertRes.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notice: ' + err.message });
  }
});

// PATCH /api/notices/superadmin/:id/status
router.patch('/superadmin/:id/status', requireRoles('super_admin'), (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Active or Inactive' });
  }

  try {
    db.prepare("UPDATE notices SET status = ? WHERE id = ? AND sender_role = 'super_admin'").run(status, req.params.id);
    res.json({ message: `Notice status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notices/superadmin/:id
router.delete('/superadmin/:id', requireRoles('super_admin'), (req, res) => {
  try {
    db.prepare("DELETE FROM notices WHERE id = ? AND sender_role = 'super_admin'").run(req.params.id);
    res.json({ message: 'Notice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// COMPANY ADMIN NOTICES (To Collectors)
// ==========================================

// GET /api/notices/company - List notices created by this company
router.get('/company', requireRoles('company_admin', 'super_admin'), (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;

  try {
    const list = db.prepare(`
      SELECT n.*, u.name as target_collector_name, s.name as sender_name
      FROM notices n
      LEFT JOIN users u ON n.target_user_id = u.id
      LEFT JOIN users s ON n.sender_id = s.id
      WHERE n.sender_role = 'company_admin' AND n.company_id = ?
      ORDER BY n.id DESC
    `).all(companyId);

    res.json({ notices: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notices/company - Create notice for collectors
router.post('/company', requireRoles('company_admin', 'super_admin'), (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { target_type = 'all_collectors', target_user_id, title, message, priority = 'normal', status = 'Active' } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Notice message is required' });
  }

  if (target_type === 'collector' && !target_user_id) {
    return res.status(400).json({ error: 'Please select a target collector' });
  }

  try {
    const insertRes = db.prepare(`
      INSERT INTO notices (sender_role, sender_id, company_id, target_type, target_user_id, title, message, priority, status)
      VALUES ('company_admin', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      companyId,
      target_type,
      target_type === 'collector' ? Number(target_user_id) : null,
      (title || '').trim(),
      message.trim(),
      priority,
      status
    );

    res.status(201).json({ message: 'Collector notice created successfully', noticeId: insertRes.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create collector notice: ' + err.message });
  }
});

// PATCH /api/notices/company/:id/status
router.patch('/company/:id/status', requireRoles('company_admin', 'super_admin'), (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { status } = req.body;

  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Active or Inactive' });
  }

  try {
    db.prepare("UPDATE notices SET status = ? WHERE id = ? AND sender_role = 'company_admin' AND company_id = ?").run(status, req.params.id, companyId);
    res.json({ message: `Notice status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notices/company/:id
router.delete('/company/:id', requireRoles('company_admin', 'super_admin'), (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;

  try {
    db.prepare("DELETE FROM notices WHERE id = ? AND sender_role = 'company_admin' AND company_id = ?").run(req.params.id, companyId);
    res.json({ message: 'Notice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
