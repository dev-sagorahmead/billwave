const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');

router.use(authenticateToken, enforceTenant);

// Helper function to generate unique Customer ID within company
function generateNextCustomerId(companyId) {
  const comp = db.prepare('SELECT customer_prefix FROM companies WHERE id = ?').get(companyId);
  const prefix = (comp && comp.customer_prefix) ? comp.customer_prefix.toUpperCase() : 'FCN';

  // Find max numeric suffix for this prefix
  const rows = db.prepare(`
    SELECT customer_id 
    FROM customers 
    WHERE company_id = ? AND customer_id LIKE ?
  `).all(companyId, `${prefix}-%`);

  let maxNum = 0;
  for (const r of rows) {
    const parts = r.customer_id.split('-');
    if (parts.length === 2) {
      const n = parseInt(parts[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(6, '0');
  return `${prefix}-${padded}`;
}

// GET /api/customers (Search, filter, paginate)
router.get('/', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const { search, area_id, package_id, status, due_type, sort_by = 'id_desc', limit = 100, page = 1 } = req.query;

  let sql = `
    SELECT 
      c.*,
      a.name as area_name,
      a.code as area_code,
      p.name as package_name,
      p.price as package_price,
      (
        SELECT MAX(payment_date) 
        FROM payments 
        WHERE customer_id = c.id
      ) as last_payment_date,
      (
        SELECT COALESCE(SUM(paid_amount), 0)
        FROM payments
        WHERE customer_id = c.id
      ) as total_paid
    FROM customers c
    LEFT JOIN areas a ON c.area_id = a.id
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE c.company_id = ?
  `;
  const params = [companyId];

  // If collector, strictly restrict to assigned areas
  if (req.user.role === 'collector') {
    if (!req.user.assignedAreaIds || req.user.assignedAreaIds.length === 0) {
      return res.json({ customers: [], total: 0, page: 1, limit: Number(limit) });
    }
    sql += ` AND c.area_id IN (${req.user.assignedAreaIds.map(() => '?').join(',')})`;
    params.push(...req.user.assignedAreaIds);
  }

  // Filter by Area
  if (area_id && area_id !== 'all') {
    sql += ' AND c.area_id = ?';
    params.push(area_id);
  }

  // Filter by Package
  if (package_id && package_id !== 'all') {
    sql += ' AND c.package_id = ?';
    params.push(package_id);
  }

  // Filter by Status (Active, Free, Closed)
  if (status && status !== 'all') {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  // Filter by Due Type
  if (due_type) {
    if (due_type === 'has_due') {
      sql += ' AND c.current_due > 0';
    } else if (due_type === 'zero_due') {
      sql += ' AND c.current_due <= 0';
    } else if (due_type === '1_month') {
      sql += ' AND c.current_due > 0 AND c.current_due <= c.monthly_bill';
    } else if (due_type === '2_months') {
      sql += ' AND c.current_due > c.monthly_bill AND c.current_due <= (c.monthly_bill * 2)';
    } else if (due_type === '3_plus_months') {
      sql += ' AND c.current_due > (c.monthly_bill * 2)';
    } else if (due_type === 'partial_due') {
      sql += ' AND c.current_due > 0 AND (c.current_due % c.monthly_bill != 0)';
    } else if (due_type === 'high_due') {
      sql += ' AND c.current_due >= 500';
    }
  }

  // Global search (Customer ID, Name, Phone, Address, Road/House)
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (c.customer_id LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.road_house_info LIKE ?)';
    params.push(term, term, term, term, term);
  }

  // Sorting
  if (sort_by === 'highest_due') {
    sql += ' ORDER BY c.current_due DESC';
  } else if (sort_by === 'lowest_due') {
    sql += ' ORDER BY c.current_due ASC';
  } else if (sort_by === 'name_asc') {
    sql += ' ORDER BY c.name ASC';
  } else if (sort_by === 'id_asc') {
    sql += ' ORDER BY c.customer_id ASC';
  } else if (sort_by === 'area_asc') {
    sql += ' ORDER BY a.name ASC, c.customer_id ASC';
  } else if (sort_by === 'latest_payment') {
    sql += ' ORDER BY last_payment_date DESC NULLS LAST, c.id DESC';
  } else {
    sql += ' ORDER BY c.id DESC';
  }

  // Count total matching
  const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
  const countStmt = db.prepare(countSql);
  const total = countStmt.get(...params).total;

  // Pagination
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const customers = db.prepare(sql).all(...params);

  res.json({
    customers,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(total / parseInt(limit, 10))
  });
});

// GET /api/customers/:id (Detailed Profile)
router.get('/:id', (req, res) => {
  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;

  const customer = db.prepare(`
    SELECT 
      c.*,
      a.name as area_name,
      a.code as area_code,
      p.name as package_name,
      p.price as package_price
    FROM customers c
    LEFT JOIN areas a ON c.area_id = a.id
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE (c.id = ? OR c.customer_id = ?) AND c.company_id = ?
  `).get(req.params.id, req.params.id, companyId);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Collector area verification
  if (req.user.role === 'collector') {
    if (!req.user.assignedAreaIds.includes(customer.area_id)) {
      return res.status(403).json({ error: 'Access denied: Customer does not belong to your assigned area' });
    }
  }

  // Payment history
  const payments = db.prepare(`
    SELECT 
      p.*,
      u.name as collector_name
    FROM payments p
    LEFT JOIN users u ON p.collector_id = u.id
    WHERE p.customer_id = ?
    ORDER BY p.id DESC
  `).all(customer.id);

  // Billing history
  const bills = db.prepare(`
    SELECT * 
    FROM bills 
    WHERE customer_id = ?
    ORDER BY billing_month DESC
  `).all(customer.id);

  // Total collected and last payment date
  const totalPaid = payments.reduce((acc, curr) => acc + curr.paid_amount, 0);
  const lastPayment = payments[0] || null;

  res.json({
    customer,
    billingSummary: {
      previous_due: customer.previous_due,
      current_due: customer.current_due,
      monthly_bill: customer.monthly_bill,
      total_paid: totalPaid,
      last_payment_date: lastPayment ? lastPayment.payment_date : null,
      last_payment_amount: lastPayment ? lastPayment.paid_amount : null
    },
    payments,
    bills
  });
});

// POST /api/customers (Create new customer)
router.post('/', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const {
    name,
    father_husband_name,
    phone,
    alternative_phone,
    address,
    road_house_info,
    area_id,
    package_id,
    monthly_bill,
    connection_date,
    status = 'Active',
    previous_due = 0,
    notes,
    custom_customer_id
  } = req.body;

  if (!name || !phone || !address || !area_id || !package_id) {
    return res.status(400).json({ error: 'Name, Phone, Address, Area, and Package are required' });
  }

  // Verify area and package belong to company
  const area = db.prepare('SELECT id FROM areas WHERE id = ? AND company_id = ?').get(area_id, companyId);
  if (!area) {
    return res.status(400).json({ error: 'Invalid area selected' });
  }

  const pkg = db.prepare('SELECT id, price FROM packages WHERE id = ? AND company_id = ?').get(package_id, companyId);
  if (!pkg) {
    return res.status(400).json({ error: 'Invalid package selected' });
  }

  const finalBill = monthly_bill !== undefined ? Number(monthly_bill) : pkg.price;
  const initialPrevDue = Number(previous_due) || 0;
  
  // Calculate initial current_due:
  // If customer is Active and not free, they may start with previous due + first month bill or just previous due
  const initialCurrentDue = initialPrevDue;

  const customerId = custom_customer_id ? custom_customer_id.trim().toUpperCase() : generateNextCustomerId(companyId);
  const connDate = connection_date || new Date().toISOString().split('T')[0];

  const createCustTx = db.transaction(() => {
    const insertRes = db.prepare(`
      INSERT INTO customers (
        company_id, customer_id, name, father_husband_name, phone, alternative_phone,
        address, road_house_info, area_id, package_id, monthly_bill, connection_date,
        status, previous_due, current_due, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      companyId, customerId, name.trim(), father_husband_name || '', phone.trim(), alternative_phone || '',
      address.trim(), road_house_info || '', area_id, package_id, finalBill, connDate,
      status, initialPrevDue, initialCurrentDue, notes || ''
    );

    const newCustId = insertRes.lastInsertRowid;

    // Create a customer portal login user
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync('123456', salt); // Default customer password
    const emailRef = `${customerId.toLowerCase()}@customer.dish`;
    db.prepare(`
      INSERT OR IGNORE INTO users (company_id, name, email, phone, password_hash, role, status, customer_id_ref)
      VALUES (?, ?, ?, ?, ?, 'customer', 'Active', ?)
    `).run(companyId, name.trim(), emailRef, phone.trim(), passHash, newCustId);

    return { id: newCustId, customer_id: customerId };
  });

  try {
    const result = createCustTx();
    res.status(201).json({ message: 'Customer created successfully', ...result });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: `Customer ID "${customerId}" already exists in this company` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id (Edit Customer)
router.put('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const {
    name,
    father_husband_name,
    phone,
    alternative_phone,
    address,
    road_house_info,
    area_id,
    package_id,
    monthly_bill,
    connection_date,
    notes,
    current_due,
    previous_due
  } = req.body;

  const existing = db.prepare('SELECT id FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  db.prepare(`
    UPDATE customers
    SET name = COALESCE(?, name),
        father_husband_name = COALESCE(?, father_husband_name),
        phone = COALESCE(?, phone),
        alternative_phone = COALESCE(?, alternative_phone),
        address = COALESCE(?, address),
        road_house_info = COALESCE(?, road_house_info),
        area_id = COALESCE(?, area_id),
        package_id = COALESCE(?, package_id),
        monthly_bill = COALESCE(?, monthly_bill),
        connection_date = COALESCE(?, connection_date),
        notes = COALESCE(?, notes),
        current_due = COALESCE(?, current_due),
        previous_due = COALESCE(?, previous_due)
    WHERE id = ?
  `).run(
    name, father_husband_name, phone, alternative_phone, address, road_house_info,
    area_id, package_id, monthly_bill, connection_date, notes,
    current_due !== undefined ? Number(current_due) : null,
    previous_due !== undefined ? Number(previous_due) : null,
    req.params.id
  );

  res.json({ message: 'Customer updated successfully' });
});

// PATCH /api/customers/:id/status (Change status: Active, Free, Closed)
router.patch('/:id/status', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { status, notes } = req.body;

  if (!['Active', 'Free', 'Closed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Active, Free, or Closed' });
  }

  const cust = db.prepare('SELECT id, status, current_due FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!cust) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Update status while preserving outstanding current_due
  db.prepare(`
    UPDATE customers 
    SET status = ?,
        notes = CASE WHEN ? IS NOT NULL THEN notes || ' | Status changed to ' || ? || ': ' || ? ELSE notes END
    WHERE id = ?
  `).run(status, notes, status, notes, req.params.id);

  res.json({
    message: `Customer status updated to ${status}. Current due of ${cust.current_due} BDT is preserved.`,
    status,
    current_due: cust.current_due
  });
});

// PATCH /api/customers/:id/package (Change Package)
router.patch('/:id/package', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { package_id, monthly_bill } = req.body;

  const pkg = db.prepare('SELECT id, name, price FROM packages WHERE id = ? AND company_id = ?').get(package_id, companyId);
  if (!pkg) {
    return res.status(400).json({ error: 'Invalid package' });
  }

  const finalBill = monthly_bill !== undefined ? Number(monthly_bill) : pkg.price;

  db.prepare(`
    UPDATE customers 
    SET package_id = ?, monthly_bill = ?
    WHERE id = ? AND company_id = ?
  `).run(pkg.id, finalBill, req.params.id, companyId);

  res.json({ message: `Package changed to ${pkg.name} (${finalBill} BDT/month)` });
});

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.query.company_id || 1) : req.user.company_id;
  const cust = db.prepare('SELECT id, name, customer_id FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, companyId);
  if (!cust) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  db.prepare('DELETE FROM customers WHERE id = ?').run(cust.id);
  res.json({ message: `Customer ${cust.name} (${cust.customer_id}) deleted successfully` });
});

// POST /api/customers/import/preview (Validate & preview bulk Excel/CSV rows)
router.post('/import/preview', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { rows } = req.body; // Array of objects

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No data rows provided for import' });
  }

  // Pre-fetch existing areas, packages, and customer IDs for fast validation
  const existingAreas = db.prepare('SELECT id, name, code FROM areas WHERE company_id = ?').all(companyId);
  const existingPackages = db.prepare('SELECT id, name, price FROM packages WHERE company_id = ?').all(companyId);
  const existingCustIds = new Set(
    db.prepare('SELECT customer_id FROM customers WHERE company_id = ?').all(companyId).map(r => r.customer_id.toUpperCase())
  );

  const areaMap = {};
  existingAreas.forEach(a => {
    areaMap[a.name.toLowerCase().trim()] = a.id;
    areaMap[a.code.toLowerCase().trim()] = a.id;
  });

  const packageMap = {};
  existingPackages.forEach(p => {
    packageMap[p.name.toLowerCase().trim()] = { id: p.id, price: p.price };
  });

  const validatedRows = [];
  const errors = [];
  let validCount = 0;
  let invalidCount = 0;

  const seenPhonesInBatch = new Set();
  const seenCustIdsInBatch = new Set();

  rows.forEach((row, index) => {
    const rowErrors = [];
    const rowNum = index + 1;

    // Field extraction (flexible naming support)
    const name = (row.name || row['Customer Name'] || row.customer_name || '').toString().trim();
    const phone = (row.phone || row['Phone'] || row['Phone Number'] || row.phone_number || '').toString().trim();
    const address = (row.address || row['Address'] || '').toString().trim();
    const areaName = (row.area || row['Area'] || row.area_name || '').toString().trim();
    const packageName = (row.package || row['Package'] || row.package_name || '').toString().trim();
    const rawBill = row.monthly_bill || row['Monthly Bill'] || row.bill;
    const rawPrevDue = row.previous_due || row['Previous Due'] || row.due || 0;
    const status = (row.status || row['Status'] || 'Active').toString().trim();
    const connDate = (row.connection_date || row['Connection Date'] || new Date().toISOString().split('T')[0]).toString().trim();
    const customId = (row.customer_id || row['Customer ID'] || '').toString().trim();

    // 1. Validate required fields
    if (!name) rowErrors.push('Missing customer name');
    if (!phone) rowErrors.push('Missing phone number');
    if (!address) rowErrors.push('Missing address');
    if (!areaName) rowErrors.push('Missing area');

    // 2. Validate phone number
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (phone && (cleanPhone.length < 10 || cleanPhone.length > 14)) {
      rowErrors.push(`Invalid phone number: ${phone}`);
    }

    // 3. Validate Area
    let matchedAreaId = null;
    if (areaName) {
      matchedAreaId = areaMap[areaName.toLowerCase()];
      if (!matchedAreaId) {
        rowErrors.push(`Area "${areaName}" not found in system`);
      }
    }

    // 4. Validate Package
    let matchedPkgId = null;
    let pkgPrice = 150;
    if (packageName) {
      const pkgInfo = packageMap[packageName.toLowerCase()];
      if (pkgInfo) {
        matchedPkgId = pkgInfo.id;
        pkgPrice = pkgInfo.price;
      } else {
        rowErrors.push(`Package "${packageName}" not found in system`);
      }
    } else {
      // Default to Regular
      const regularPkg = packageMap['regular'] || Object.values(packageMap)[0];
      if (regularPkg) {
        matchedPkgId = regularPkg.id;
        pkgPrice = regularPkg.price;
      }
    }

    // 5. Validate Customer ID duplicate
    if (customId) {
      if (existingCustIds.has(customId.toUpperCase())) {
        rowErrors.push(`Duplicate Customer ID "${customId}" already exists in system`);
      }
      if (seenCustIdsInBatch.has(customId.toUpperCase())) {
        rowErrors.push(`Duplicate Customer ID "${customId}" repeated in file`);
      }
      seenCustIdsInBatch.add(customId.toUpperCase());
    }

    // 6. Validate Status
    const normalizedStatus = ['Active', 'Free', 'Closed'].find(s => s.toLowerCase() === status.toLowerCase()) || 'Active';

    const monthlyBill = rawBill !== undefined && rawBill !== '' ? Number(rawBill) : pkgPrice;
    const prevDue = Number(rawPrevDue) || 0;

    const item = {
      rowNum,
      customer_id: customId || '',
      name,
      phone,
      address,
      area_id: matchedAreaId,
      area_name: areaName,
      package_id: matchedPkgId,
      package_name: packageName,
      monthly_bill: monthlyBill,
      previous_due: prevDue,
      current_due: prevDue,
      connection_date: connDate,
      status: normalizedStatus,
      isValid: rowErrors.length === 0,
      errors: rowErrors
    };

    if (rowErrors.length > 0) {
      invalidCount++;
      errors.push({ rowNum, name, errors: rowErrors });
    } else {
      validCount++;
    }

    validatedRows.push(item);
  });

  res.json({
    totalRows: rows.length,
    validCount,
    invalidCount,
    errors,
    preview: validatedRows.slice(0, 50),
    allRows: validatedRows
  });
});

// POST /api/customers/import/confirm (Commit validated bulk rows)
router.post('/import/confirm', (req, res) => {
  if (!['company_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Company Admin only' });
  }

  const companyId = req.user.role === 'super_admin' ? (req.body.company_id || 1) : req.user.company_id;
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No validated rows to import' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passHash = bcrypt.hashSync('123456', salt);

  const importTx = db.transaction(() => {
    let imported = 0;
    const insertCustStmt = db.prepare(`
      INSERT INTO customers (
        company_id, customer_id, name, phone, address, area_id, package_id,
        monthly_bill, connection_date, status, previous_due, current_due
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertUserStmt = db.prepare(`
      INSERT OR IGNORE INTO users (company_id, name, email, phone, password_hash, role, status, customer_id_ref)
      VALUES (?, ?, ?, ?, ?, 'customer', 'Active', ?)
    `);

    for (const r of rows) {
      if (!r.isValid) continue;

      const custId = r.customer_id || generateNextCustomerId(companyId);
      const res = insertCustStmt.run(
        companyId, custId, r.name, r.phone, r.address, r.area_id, r.package_id,
        r.monthly_bill, r.connection_date, r.status, r.previous_due, r.current_due
      );

      insertUserStmt.run(
        companyId, r.name, `${custId.toLowerCase()}@customer.dish`, r.phone, passHash, res.lastInsertRowid
      );

      imported++;
    }

    return imported;
  });

  try {
    const totalImported = importTx();
    res.json({ message: `Successfully imported ${totalImported} customer(s)`, count: totalImported });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

module.exports = router;
