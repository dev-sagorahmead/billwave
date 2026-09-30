const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

router.use(authenticateToken, enforceTenant);

// GET /api/areas
router.get('/', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  
  let sql = `
    SELECT 
      a.*,
      (SELECT COUNT(*) FROM customers WHERE area_id = a.id) as customer_count,
      (SELECT COUNT(*) FROM customers WHERE area_id = a.id AND status = 'Active') as active_customers,
      (SELECT COALESCE(SUM(current_due), 0) FROM customers WHERE area_id = a.id) as total_due,
      (
        SELECT GROUP_CONCAT(u.name, ', ')
        FROM collector_areas ca
        JOIN users u ON ca.collector_id = u.id
        WHERE ca.area_id = a.id
      ) as assigned_collectors
    FROM areas a
    WHERE a.company_id = ?
  `;
  const params = [companyId];

  // If collector, only show assigned areas
  if (req.user.role === 'collector') {
    if (!req.user.assignedAreaIds || req.user.assignedAreaIds.length === 0) {
      return res.json([]);
    }
    sql += ` AND a.id IN (${req.user.assignedAreaIds.map(() => '?').join(',')})`;
    params.push(...req.user.assignedAreaIds);
  }

  sql += ' ORDER BY a.name ASC';
  const areas = db.prepare(sql).all(...params);
  res.json(areas);
});

// POST /api/areas (Company Admin only)
router.post('/', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { name, code, description, status = 'Active' } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Area Name and Code are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO areas (company_id, name, code, description, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(companyId, name.trim(), code.toUpperCase().trim(), description || '', status);

    res.status(201).json({ message: 'Area created successfully', areaId: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'An area with this code already exists in your company' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/areas/:id
router.put('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { name, code, description, status } = req.body;

  const area = db.prepare('SELECT id FROM areas WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!area) {
    return res.status(404).json({ error: 'Area not found or unauthorized' });
  }

  try {
    db.prepare(`
      UPDATE areas
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name ? name.trim() : null, code ? code.toUpperCase().trim() : null, description, status, req.params.id);

    res.json({ message: 'Area updated successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'An area with this code already exists in your company' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/areas/:id
router.delete('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const area = db.prepare('SELECT id FROM areas WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!area) {
    return res.status(404).json({ error: 'Area not found or unauthorized' });
  }

  // Check if any customer belongs to this area
  const custCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE area_id = ?').get(req.params.id).count;
  if (custCount > 0) {
    return res.status(400).json({ error: `Cannot delete area: ${custCount} customer(s) are assigned to this area. Reassign them first.` });
  }

  db.prepare('DELETE FROM areas WHERE id = ?').run(req.params.id);
  res.json({ message: 'Area deleted successfully' });
});

// POST /api/areas/:id/assign-collectors
router.post('/:id/assign-collectors', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { collector_ids } = req.body; // array of collector user ids

  const area = db.prepare('SELECT id FROM areas WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!area) {
    return res.status(404).json({ error: 'Area not found or unauthorized' });
  }

  const assignTx = db.transaction(() => {
    db.prepare('DELETE FROM collector_areas WHERE area_id = ?').run(req.params.id);
    if (Array.isArray(collector_ids)) {
      const insertStmt = db.prepare('INSERT OR IGNORE INTO collector_areas (collector_id, area_id) VALUES (?, ?)');
      for (const colId of collector_ids) {
        // Verify collector belongs to same company
        const col = db.prepare("SELECT id FROM users WHERE id = ? AND company_id = ? AND role = 'collector'").get(colId, companyId);
        if (col) {
          insertStmt.run(colId, req.params.id);
        }
      }
    }
  });

  assignTx();
  res.json({ message: 'Collector assignments updated successfully' });
});

module.exports = router;
