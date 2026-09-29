const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

router.use(authenticateToken, enforceTenant);

// Helper function to generate monthly bills safely and prevent duplicates
function generateBillsForMonth(companyId, billingMonth) {
  // billingMonth: format 'YYYY-MM' e.g. '2026-09'

  // 1. Fetch eligible customers:
  // MUST BE:
  // - Belongs to company
  // - status = 'Active' (FREE and CLOSED are excluded from auto-billing!)
  // - monthly_bill > 0 (Free packages are 0, so excluded)
  const eligibleCustomers = db.prepare(`
    SELECT c.*, p.name as package_name
    FROM customers c
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE c.company_id = ?
      AND c.status = 'Active'
      AND c.monthly_bill > 0
  `).all(companyId);

  // 2. Fetch existing bills for this month to prevent duplicate generation
  const existingBills = db.prepare(`
    SELECT customer_id FROM bills WHERE company_id = ? AND billing_month = ?
  `).all(companyId, billingMonth);

  const billedCustomerIds = new Set(existingBills.map(b => b.customer_id));

  const insertBillStmt = db.prepare(`
    INSERT INTO bills (company_id, customer_id, billing_month, package_name, amount, previous_due, total_due, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Generated')
  `);

  const updateCustDueStmt = db.prepare(`
    UPDATE customers 
    SET previous_due = current_due,
        current_due = current_due + ?
    WHERE id = ?
  `);

  let generatedCount = 0;
  let totalBilledAmount = 0;
  const skippedCount = billedCustomerIds.size;

  const billingTx = db.transaction(() => {
    for (const cust of eligibleCustomers) {
      if (billedCustomerIds.has(cust.id)) {
        continue; // Already billed this month - skip!
      }

      const billAmount = cust.monthly_bill;
      const prevDue = cust.current_due;
      const totalDue = prevDue + billAmount;

      insertBillStmt.run(
        companyId,
        cust.id,
        billingMonth,
        cust.package_name || 'Standard',
        billAmount,
        prevDue,
        totalDue
      );

      updateCustDueStmt.run(billAmount, cust.id);

      generatedCount++;
      totalBilledAmount += billAmount;
    }
  });

  billingTx();

  return {
    billingMonth,
    eligibleCount: eligibleCustomers.length,
    generatedCount,
    skippedCount,
    totalBilledAmount
  };
}

// GET /api/billing/preview (Check eligible vs already billed for a month)
router.get('/preview', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const month = req.query.month || new Date().toISOString().substring(0, 7);

  const eligibleCustomers = db.prepare(`
    SELECT c.id, c.customer_id, c.name, c.phone, c.status, c.monthly_bill, c.current_due, a.name as area_name, p.name as package_name
    FROM customers c
    LEFT JOIN areas a ON c.area_id = a.id
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE c.company_id = ?
      AND c.status = 'Active'
      AND c.monthly_bill > 0
  `).all(companyId);

  const existingBills = db.prepare(`
    SELECT b.*, c.customer_id as cust_code, c.name as customer_name
    FROM bills b
    JOIN customers c ON b.customer_id = c.id
    WHERE b.company_id = ? AND b.billing_month = ?
  `).all(companyId, month);

  const billedCustomerIds = new Set(existingBills.map(b => b.customer_id));
  const pendingCustomers = eligibleCustomers.filter(c => !billedCustomerIds.has(c.id));

  // Count closed and free customers for transparency
  const closedCount = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND status = 'Closed'`).get(companyId).count;
  const freeCount = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND (status = 'Free' OR monthly_bill = 0)`).get(companyId).count;

  const totalPendingAmount = pendingCustomers.reduce((acc, c) => acc + c.monthly_bill, 0);

  res.json({
    month,
    totalEligible: eligibleCustomers.length,
    alreadyBilledCount: existingBills.length,
    pendingCount: pendingCustomers.length,
    totalPendingAmount,
    closedCustomerCount: closedCount,
    freeCustomerCount: freeCount,
    pendingPreview: pendingCustomers.slice(0, 50),
    existingBillsPreview: existingBills.slice(0, 50)
  });
});

// POST /api/billing/generate (Trigger monthly bill generation)
router.post('/generate', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const month = req.body.month || new Date().toISOString().substring(0, 7);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Month must be in YYYY-MM format' });
  }

  try {
    const result = generateBillsForMonth(companyId, month);
    res.json({
      message: `Successfully generated ${result.generatedCount} bills for month ${month}.`,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate bills: ' + err.message });
  }
});

// GET /api/billing/history (List all generated bills)
router.get('/history', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const { month, customer_id, search, limit = 100, page = 1 } = req.query;

  let sql = `
    SELECT 
      b.*,
      c.customer_id as cust_code,
      c.name as customer_name,
      c.phone as customer_phone,
      a.name as area_name
    FROM bills b
    JOIN customers c ON b.customer_id = c.id
    LEFT JOIN areas a ON c.area_id = a.id
    WHERE b.company_id = ?
  `;
  const params = [companyId];

  // Collector area restriction
  if (req.user.role === 'collector') {
    if (!req.user.assignedAreaIds || req.user.assignedAreaIds.length === 0) {
      return res.json({ bills: [], total: 0 });
    }
    sql += ` AND c.area_id IN (${req.user.assignedAreaIds.map(() => '?').join(',')})`;
    params.push(...req.user.assignedAreaIds);
  }

  if (month && month !== 'all') {
    sql += ' AND b.billing_month = ?';
    params.push(month);
  }

  if (customer_id) {
    sql += ' AND b.customer_id = ?';
    params.push(customer_id);
  }

  if (search) {
    sql += ' AND (c.customer_id LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY b.id DESC';

  const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
  const total = db.prepare(countSql).get(...params).total;

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const bills = db.prepare(sql).all(...params);

  res.json({
    bills,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  });
});

module.exports = router;
