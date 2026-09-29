const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

router.use(authenticateToken, enforceTenant);

// GET /api/packages
router.get('/', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;

  const packages = db.prepare(`
    SELECT 
      p.*,
      (SELECT COUNT(*) FROM customers WHERE package_id = p.id) as subscriber_count,
      (SELECT COUNT(*) FROM customers WHERE package_id = p.id AND status = 'Active') as active_subscriber_count
    FROM packages p
    WHERE p.company_id = ?
    ORDER BY p.price ASC
  `).all(companyId);

  res.json(packages);
});

// POST /api/packages
router.post('/', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { name, price, description, status = 'Active' } = req.body;

  if (!name || price === undefined || price === null || isNaN(price)) {
    return res.status(400).json({ error: 'Package Name and valid price are required' });
  }

  try {
    const resInsert = db.prepare(`
      INSERT INTO packages (company_id, name, price, description, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(companyId, name.trim(), Number(price), description || '', status);

    res.status(201).json({ message: 'Package created successfully', packageId: resInsert.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/packages/:id
router.put('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { name, price, description, status } = req.body;

  const pkg = db.prepare('SELECT id FROM packages WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  db.prepare(`
    UPDATE packages
    SET name = COALESCE(?, name),
        price = COALESCE(?, price),
        description = COALESCE(?, description),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(name ? name.trim() : null, price !== undefined ? Number(price) : null, description, status, req.params.id);

  res.json({ message: 'Package updated successfully' });
});

// DELETE /api/packages/:id
router.delete('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const pkg = db.prepare('SELECT id FROM packages WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  const count = db.prepare('SELECT COUNT(*) as count FROM customers WHERE package_id = ?').get(req.params.id).count;
  if (count > 0) {
    return res.status(400).json({ error: `Cannot delete package: ${count} customers are assigned to it. Change their package first.` });
  }

  db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
  res.json({ message: 'Package deleted successfully' });
});

module.exports = router;
