const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

router.use(authenticateToken, enforceTenant);

// Helper to generate unique transaction and receipt numbers
function generateReceiptNumber(companyId) {
  const comp = db.prepare('SELECT customer_prefix FROM companies WHERE id = ?').get(companyId);
  const prefix = (comp && comp.customer_prefix) ? comp.customer_prefix : 'REC';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${rand}`;
}

function generateTransactionId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `TXN-${dateStr}-${rand}`;
}

// POST /api/payments/collect (Submit payment - Collectors & Admins)
router.post('/collect', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { customer_id, paid_amount, payment_method = 'Cash', notes, allow_advance = false } = req.body;

  if (!customer_id || paid_amount === undefined || isNaN(paid_amount)) {
    return res.status(400).json({ error: 'Customer ID and valid paid amount are required' });
  }

  const amount = Number(paid_amount);
  if (amount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  // Fetch customer
  const customer = db.prepare(`
    SELECT c.*, a.name as area_name
    FROM customers c
    LEFT JOIN areas a ON c.area_id = a.id
    WHERE (c.id = ? OR c.customer_id = ?) AND c.company_id = ?
  `).get(customer_id, customer_id, companyId);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Collector area isolation check
  if (req.user.role === 'collector') {
    if (!req.user.assignedAreaIds || !req.user.assignedAreaIds.includes(customer.area_id)) {
      return res.status(403).json({ error: 'Access denied: Customer does not belong to your assigned area' });
    }
  }

  // Check overpayment rule (Requirement 13)
  if (!allow_advance && amount > customer.current_due && customer.current_due > 0) {
    return res.status(400).json({
      error: `Payment amount (${amount} BDT) exceeds customer outstanding balance (${customer.current_due} BDT). Overpayment not allowed.`
    });
  }

  const prevDue = customer.current_due;
  const remainingDue = Math.max(0, prevDue - amount);

  const now = new Date();
  const paymentDate = now.toISOString().split('T')[0];
  const paymentTime = now.toTimeString().split(' ')[0]; // 'HH:mm:ss'
  const receiptNum = generateReceiptNumber(companyId);
  const txnId = generateTransactionId();

  const collectorId = req.user.role === 'collector' ? req.user.id : (req.body.collector_id || req.user.id);
  const collector = db.prepare('SELECT name FROM users WHERE id = ?').get(collectorId);
  const collectorName = collector ? collector.name : req.user.name;

  const paymentTx = db.transaction(() => {
    // 1. Insert immutable payment transaction record
    const insertRes = db.prepare(`
      INSERT INTO payments (
        company_id, customer_id, collector_id, transaction_id, receipt_number,
        previous_due, paid_amount, remaining_due, payment_date, payment_time,
        payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      companyId,
      customer.id,
      collectorId,
      txnId,
      receiptNum,
      prevDue,
      amount,
      remainingDue,
      paymentDate,
      paymentTime,
      payment_method,
      notes || ''
    );

    const paymentId = insertRes.lastInsertRowid;

    // 2. Update customer outstanding balance
    db.prepare(`
      UPDATE customers 
      SET previous_due = ?,
          current_due = ?
      WHERE id = ?
    `).run(prevDue, remainingDue, customer.id);

    // 3. Mark relevant generated bills as Paid or Partially Paid
    if (remainingDue === 0) {
      db.prepare(`
        UPDATE bills 
        SET status = 'Paid' 
        WHERE customer_id = ? AND status != 'Paid'
      `).run(customer.id);
    } else {
      db.prepare(`
        UPDATE bills 
        SET status = 'Partially Paid' 
        WHERE customer_id = ? AND status = 'Generated'
      `).run(customer.id);
    }

    return paymentId;
  });

  try {
    const paymentId = paymentTx();

    // Fetch full receipt details
    const company = db.prepare('SELECT name, phone, email, address, logo, customer_prefix FROM companies WHERE id = ?').get(companyId);

    const receipt = {
      paymentId,
      transactionId: txnId,
      receiptNumber: receiptNum,
      company: {
        name: company.name,
        phone: company.phone,
        email: company.email,
        address: company.address,
        logo: company.logo
      },
      customer: {
        id: customer.id,
        customerId: customer.customer_id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        area: customer.area_name
      },
      collector: {
        id: collectorId,
        name: collectorName
      },
      previousDue: prevDue,
      paidAmount: amount,
      remainingDue,
      paymentDate,
      paymentTime,
      paymentMethod: payment_method,
      notes: notes || ''
    };

    res.status(201).json({
      message: 'Payment collected successfully',
      receipt
    });
  } catch (err) {
    console.error('Payment collection error:', err);
    res.status(500).json({ error: 'Payment processing failed: ' + err.message });
  }
});

// GET /api/payments/receipt/:receiptNumber
router.get('/receipt/:receiptNumber', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;

  const payment = db.prepare(`
    SELECT 
      p.*,
      c.name as customer_name,
      c.customer_id as customer_code,
      c.phone as customer_phone,
      c.address as customer_address,
      a.name as area_name,
      u.name as collector_name,
      comp.name as company_name,
      comp.phone as company_phone,
      comp.email as company_email,
      comp.address as company_address,
      comp.logo as company_logo
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN areas a ON c.area_id = a.id
    LEFT JOIN users u ON p.collector_id = u.id
    JOIN companies comp ON p.company_id = comp.id
    WHERE p.receipt_number = ? AND p.company_id = ?
  `).get(req.params.receiptNumber, companyId);

  if (!payment) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  // Collector area check
  if (req.user.role === 'collector') {
    const cust = db.prepare('SELECT area_id FROM customers WHERE id = ?').get(payment.customer_id);
    if (!req.user.assignedAreaIds.includes(cust.area_id)) {
      return res.status(403).json({ error: 'Unauthorized access to this receipt' });
    }
  }

  res.json({
    receiptNumber: payment.receipt_number,
    transactionId: payment.transaction_id,
    company: {
      name: payment.company_name,
      phone: payment.company_phone,
      email: payment.company_email,
      address: payment.company_address,
      logo: payment.company_logo
    },
    customer: {
      id: payment.customer_id,
      customerId: payment.customer_code,
      name: payment.customer_name,
      phone: payment.customer_phone,
      address: payment.customer_address,
      area: payment.area_name
    },
    collector: {
      id: payment.collector_id,
      name: payment.collector_name
    },
    previousDue: payment.previous_due,
    paidAmount: payment.paid_amount,
    remainingDue: payment.remaining_due,
    paymentDate: payment.payment_date,
    paymentTime: payment.payment_time,
    paymentMethod: payment.payment_method,
    notes: payment.notes
  });
});

// GET /api/payments (Collection History & filtering)
router.get('/', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const {
    date_filter = 'all', // 'today', 'yesterday', 'this_week', 'this_month', 'custom'
    start_date,
    end_date,
    collector_id,
    area_id,
    payment_method,
    search,
    limit = 100,
    page = 1
  } = req.query;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let sql = `
    SELECT 
      p.*,
      c.name as customer_name,
      c.customer_id as customer_code,
      c.phone as customer_phone,
      a.name as area_name,
      u.name as collector_name
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN areas a ON c.area_id = a.id
    LEFT JOIN users u ON p.collector_id = u.id
    WHERE p.company_id = ?
  `;
  const params = [companyId];

  // Collector restriction
  if (req.user.role === 'collector') {
    sql += ' AND p.collector_id = ?';
    params.push(req.user.id);
  } else if (collector_id && collector_id !== 'all') {
    sql += ' AND p.collector_id = ?';
    params.push(collector_id);
  }

  // Date filters
  if (date_filter === 'today') {
    sql += ' AND p.payment_date = ?';
    params.push(todayStr);
  } else if (date_filter === 'yesterday') {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];
    sql += ' AND p.payment_date = ?';
    params.push(yestStr);
  } else if (date_filter === 'this_week') {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    sql += ' AND p.payment_date >= ?';
    params.push(weekAgo.toISOString().split('T')[0]);
  } else if (date_filter === 'this_month') {
    const monthStr = todayStr.substring(0, 7);
    sql += ' AND p.payment_date LIKE ?';
    params.push(`${monthStr}%`);
  } else if (date_filter === 'custom' || start_date || end_date) {
    if (start_date) {
      sql += ' AND p.payment_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND p.payment_date <= ?';
      params.push(end_date);
    }
  }

  if (area_id && area_id !== 'all') {
    sql += ' AND c.area_id = ?';
    params.push(area_id);
  }

  if (payment_method && payment_method !== 'all') {
    sql += ' AND p.payment_method = ?';
    params.push(payment_method);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (p.receipt_number LIKE ? OR p.transaction_id LIKE ? OR c.name LIKE ? OR c.customer_id LIKE ? OR c.phone LIKE ?)';
    params.push(term, term, term, term, term);
  }

  // Calculate aggregation summary before pagination
  const summarySql = `
    SELECT 
      COALESCE(SUM(paid_amount), 0) as total_collection,
      COUNT(*) as total_transactions
    FROM (${sql})
  `;
  const summary = db.prepare(summarySql).get(...params);

  // Grouped breakdowns
  const collectorBreakdownSql = `
    SELECT u.name as collector_name, COALESCE(SUM(p.paid_amount), 0) as total, COUNT(*) as tx_count
    FROM (${sql}) sub
    JOIN payments p ON sub.id = p.id
    LEFT JOIN users u ON p.collector_id = u.id
    GROUP BY p.collector_id
    ORDER BY total DESC
  `;
  const collectorBreakdown = db.prepare(collectorBreakdownSql).all(...params);

  const methodBreakdownSql = `
    SELECT p.payment_method, COALESCE(SUM(p.paid_amount), 0) as total, COUNT(*) as tx_count
    FROM (${sql}) sub
    JOIN payments p ON sub.id = p.id
    GROUP BY p.payment_method
    ORDER BY total DESC
  `;
  const methodBreakdown = db.prepare(methodBreakdownSql).all(...params);

  // Pagination
  sql += ' ORDER BY p.id DESC';
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const payments = db.prepare(sql).all(...params);

  res.json({
    payments,
    summary: {
      totalCollection: summary.total_collection,
      totalTransactions: summary.total_transactions
    },
    breakdowns: {
      collector: collectorBreakdown,
      method: methodBreakdown
    },
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  });
});

module.exports = router;
