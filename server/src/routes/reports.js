const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

router.use(authenticateToken, enforceTenant);

// GET /api/reports/run?report_type=...
router.get('/run', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const { report_type, start_date, end_date, area_id, collector_id, search } = req.query;

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  let data = [];
  let summary = {};

  switch (report_type) {
    case 'daily_collection': {
      const targetDate = start_date || todayStr;
      data = db.prepare(`
        SELECT 
          p.payment_date,
          p.receipt_number,
          p.paid_amount,
          p.previous_due,
          p.remaining_due,
          p.payment_method,
          p.payment_time,
          c.name as customer_name,
          c.customer_id as cust_code,
          a.name as area_name,
          u.name as collector_name
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN areas a ON c.area_id = a.id
        LEFT JOIN users u ON p.collector_id = u.id
        WHERE p.company_id = ? AND p.payment_date = ?
        ORDER BY p.id DESC
      `).all(companyId, targetDate);

      const total = data.reduce((sum, r) => sum + r.paid_amount, 0);
      summary = { totalAmount: total, count: data.length, date: targetDate };
      break;
    }

    case 'monthly_collection': {
      const monthPrefix = start_date ? start_date.substring(0, 7) : thisMonthStr;
      data = db.prepare(`
        SELECT 
          p.payment_date,
          COUNT(*) as transaction_count,
          SUM(p.paid_amount) as daily_total
        FROM payments p
        WHERE p.company_id = ? AND p.payment_date LIKE ?
        GROUP BY p.payment_date
        ORDER BY p.payment_date ASC
      `).all(companyId, `${monthPrefix}%`);

      const total = data.reduce((sum, r) => sum + r.daily_total, 0);
      summary = { totalAmount: total, totalDays: data.length, month: monthPrefix };
      break;
    }

    case 'collector_wise': {
      data = db.prepare(`
        SELECT 
          u.name as collector_name,
          u.phone as collector_phone,
          COUNT(p.id) as transaction_count,
          COALESCE(SUM(p.paid_amount), 0) as total_collected
        FROM users u
        LEFT JOIN payments p ON p.collector_id = u.id AND p.company_id = ?
        WHERE u.company_id = ? AND u.role = 'collector'
        GROUP BY u.id
        ORDER BY total_collected DESC
      `).all(companyId, companyId);

      const total = data.reduce((sum, r) => sum + r.total_collected, 0);
      summary = { totalCollected: total, collectorCount: data.length };
      break;
    }

    case 'area_wise': {
      data = db.prepare(`
        SELECT 
          a.name as area_name,
          a.code as area_code,
          COUNT(DISTINCT c.id) as total_customers,
          COALESCE(SUM(c.current_due), 0) as total_outstanding,
          (
            SELECT COALESCE(SUM(p.paid_amount), 0)
            FROM payments p
            JOIN customers cust ON p.customer_id = cust.id
            WHERE cust.area_id = a.id
          ) as total_collected
        FROM areas a
        LEFT JOIN customers c ON c.area_id = a.id
        WHERE a.company_id = ?
        GROUP BY a.id
        ORDER BY total_collected DESC
      `).all(companyId);

      summary = {
        totalAreas: data.length,
        totalDue: data.reduce((sum, r) => sum + r.total_outstanding, 0),
        totalCollected: data.reduce((sum, r) => sum + r.total_collected, 0)
      };
      break;
    }

    case 'customer_due': {
      data = db.prepare(`
        SELECT 
          c.customer_id,
          c.name as customer_name,
          c.phone,
          c.address,
          a.name as area_name,
          p.name as package_name,
          c.monthly_bill,
          c.previous_due,
          c.current_due,
          (
            SELECT MAX(payment_date) 
            FROM payments 
            WHERE customer_id = c.id
          ) as last_payment_date
        FROM customers c
        LEFT JOIN areas a ON c.area_id = a.id
        LEFT JOIN packages p ON c.package_id = p.id
        WHERE c.company_id = ? AND c.current_due > 0
        ORDER BY c.current_due DESC
      `).all(companyId);

      const total = data.reduce((sum, r) => sum + r.current_due, 0);
      summary = { totalDueCustomers: data.length, totalDueAmount: total };
      break;
    }

    case 'paid_customers': {
      data = db.prepare(`
        SELECT 
          c.customer_id,
          c.name as customer_name,
          c.phone,
          a.name as area_name,
          p.name as package_name,
          c.monthly_bill,
          c.current_due,
          (
            SELECT MAX(payment_date) 
            FROM payments 
            WHERE customer_id = c.id
          ) as last_payment_date
        FROM customers c
        LEFT JOIN areas a ON c.area_id = a.id
        LEFT JOIN packages p ON c.package_id = p.id
        WHERE c.company_id = ? AND c.status = 'Active' AND c.current_due = 0
        ORDER BY c.name ASC
      `).all(companyId);

      summary = { paidCount: data.length };
      break;
    }

    case 'partial_payment': {
      data = db.prepare(`
        SELECT 
          c.customer_id,
          c.name as customer_name,
          c.phone,
          a.name as area_name,
          c.monthly_bill,
          c.current_due,
          (
            SELECT paid_amount FROM payments WHERE customer_id = c.id ORDER BY id DESC LIMIT 1
          ) as last_paid_amount,
          (
            SELECT payment_date FROM payments WHERE customer_id = c.id ORDER BY id DESC LIMIT 1
          ) as last_payment_date
        FROM customers c
        LEFT JOIN areas a ON c.area_id = a.id
        WHERE c.company_id = ? 
          AND c.current_due > 0 
          AND c.current_due < c.monthly_bill
        ORDER BY c.current_due DESC
      `).all(companyId);

      summary = { partialCount: data.length, totalPartialDue: data.reduce((s, r) => s + r.current_due, 0) };
      break;
    }

    case 'closed_customers': {
      data = db.prepare(`
        SELECT 
          c.customer_id,
          c.name as customer_name,
          c.phone,
          c.address,
          a.name as area_name,
          c.current_due as remaining_due,
          c.connection_date,
          c.notes
        FROM customers c
        LEFT JOIN areas a ON c.area_id = a.id
        WHERE c.company_id = ? AND c.status = 'Closed'
        ORDER BY c.id DESC
      `).all(companyId);

      summary = { closedCount: data.length, totalRemainingDue: data.reduce((s, r) => s + r.remaining_due, 0) };
      break;
    }

    case 'free_customers': {
      data = db.prepare(`
        SELECT 
          c.customer_id,
          c.name as customer_name,
          c.phone,
          c.address,
          a.name as area_name,
          c.current_due as remaining_old_due,
          c.connection_date,
          c.notes
        FROM customers c
        LEFT JOIN areas a ON c.area_id = a.id
        WHERE c.company_id = ? AND (c.status = 'Free' OR c.monthly_bill = 0)
        ORDER BY c.name ASC
      `).all(companyId);

      summary = { freeCount: data.length, totalOldDue: data.reduce((s, r) => s + r.remaining_old_due, 0) };
      break;
    }

    case 'monthly_billing': {
      const monthPrefix = start_date ? start_date.substring(0, 7) : thisMonthStr;
      data = db.prepare(`
        SELECT 
          b.billing_month,
          b.package_name,
          b.amount,
          b.previous_due,
          b.total_due,
          b.status,
          b.generated_at,
          c.customer_id,
          c.name as customer_name,
          c.phone,
          a.name as area_name
        FROM bills b
        JOIN customers c ON b.customer_id = c.id
        LEFT JOIN areas a ON c.area_id = a.id
        WHERE b.company_id = ? AND b.billing_month = ?
        ORDER BY b.id DESC
      `).all(companyId, monthPrefix);

      const totalBilled = data.reduce((sum, r) => sum + r.amount, 0);
      summary = { month: monthPrefix, billCount: data.length, totalBilled };
      break;
    }

    case 'outstanding_due': {
      data = db.prepare(`
        SELECT 
          c.customer_id,
          c.name as customer_name,
          c.phone,
          a.name as area_name,
          c.monthly_bill,
          c.current_due,
          ROUND(c.current_due / NULLIF(c.monthly_bill, 0), 1) as approximate_months_due,
          (SELECT MAX(payment_date) FROM payments WHERE customer_id = c.id) as last_payment_date
        FROM customers c
        LEFT JOIN areas a ON c.area_id = a.id
        WHERE c.company_id = ? AND c.current_due > 0
        ORDER BY c.current_due DESC
      `).all(companyId);

      summary = {
        totalOutstandingDue: data.reduce((sum, r) => sum + r.current_due, 0),
        customersWithDue: data.length
      };
      break;
    }

    case 'payment_method': {
      data = db.prepare(`
        SELECT 
          p.payment_method,
          COUNT(*) as transaction_count,
          SUM(p.paid_amount) as total_amount
        FROM payments p
        WHERE p.company_id = ?
        GROUP BY p.payment_method
        ORDER BY total_amount DESC
      `).all(companyId);

      summary = {
        totalCollected: data.reduce((sum, r) => sum + r.total_amount, 0),
        totalTransactions: data.reduce((sum, r) => sum + r.transaction_count, 0)
      };
      break;
    }

    default:
      return res.status(400).json({ error: `Unknown report type: ${report_type}` });
  }

  res.json({
    report_type,
    generated_at: new Date().toISOString(),
    summary,
    data
  });
});

module.exports = router;
