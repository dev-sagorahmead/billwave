const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { identifier, password } = req.body; // identifier can be email, phone, or customer ID

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please provide identifier (email/phone/ID) and password' });
  }

  // Find user by email, phone, or customer ID ref
  let user = db.prepare(`
    SELECT u.*, c.name as company_name, c.status as company_status, c.customer_prefix
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.id
    WHERE u.email = ? OR u.phone = ?
    LIMIT 1
  `).get(identifier.trim(), identifier.trim());

  // Also check if identifier matches a customer ID (e.g. DSN-000001)
  if (!user) {
    const cust = db.prepare(`SELECT * FROM customers WHERE customer_id = ?`).get(identifier.trim().toUpperCase());
    if (cust) {
      user = db.prepare(`
        SELECT u.*, c.name as company_name, c.status as company_status, c.customer_prefix
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.customer_id_ref = ?
        LIMIT 1
      `).get(cust.id);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  if (user.status !== 'Active') {
    return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
  }

  if (user.company_id && user.company_status !== 'Active') {
    return res.status(403).json({ error: 'Your company subscription or status is deactivated.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  // If collector, attach assigned area info
  let assignedAreas = [];
  if (user.role === 'collector') {
    assignedAreas = db.prepare(`
      SELECT a.id, a.name, a.code 
      FROM collector_areas ca 
      JOIN areas a ON ca.area_id = a.id 
      WHERE ca.collector_id = ?
    `).all(user.id);
  }

  const token = generateToken(user);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      company_id: user.company_id,
      company_name: user.company_name,
      customer_prefix: user.customer_prefix,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      customer_id_ref: user.customer_id_ref,
      assignedAreas
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = req.user;
  let company = req.company || null;
  let assignedAreas = [];

  if (user.role === 'collector') {
    assignedAreas = db.prepare(`
      SELECT a.id, a.name, a.code 
      FROM collector_areas ca 
      JOIN areas a ON ca.area_id = a.id 
      WHERE ca.collector_id = ?
    `).all(user.id);
  }

  let customerDetails = null;
  if (user.role === 'customer' && user.customer_id_ref) {
    customerDetails = db.prepare(`
      SELECT c.*, a.name as area_name, p.name as package_name
      FROM customers c
      LEFT JOIN areas a ON c.area_id = a.id
      LEFT JOIN packages p ON c.package_id = p.id
      WHERE c.id = ?
    `).get(user.customer_id_ref);
  }

  res.json({
    user: {
      ...user,
      assignedAreas,
      customerDetails
    },
    company
  });
});

// POST /api/auth/demo-switch (Quick login to switch between demo roles)
router.post('/demo-switch', (req, res) => {
  const { role, email } = req.body;
  let user = null;

  if (email) {
    user = db.prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`).get(email);
  } else if (role === 'super_admin') {
    user = db.prepare(`SELECT * FROM users WHERE role = 'super_admin' LIMIT 1`).get();
  } else if (role === 'company_admin') {
    user = db.prepare(`SELECT * FROM users WHERE role = 'company_admin' AND email = 'admin@dhakasky.com' LIMIT 1`).get();
  } else if (role === 'collector') {
    user = db.prepare(`SELECT * FROM users WHERE role = 'collector' AND email = 'kamal@dhakasky.com' LIMIT 1`).get();
  } else if (role === 'customer') {
    user = db.prepare(`SELECT * FROM users WHERE role = 'customer' LIMIT 1`).get();
  }

  if (!user) {
    return res.status(404).json({ error: 'Demo user not found' });
  }

  const token = generateToken(user);
  res.json({ token, user });
});

module.exports = router;
