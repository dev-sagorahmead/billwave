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

  const trimmed = identifier.trim();

  // Find candidates by email/username, phone, or superadmin alias
  let candidates = db.prepare(`
    SELECT u.*, c.name as company_name, c.status as company_status, c.customer_prefix
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.id
    WHERE LOWER(u.email) = LOWER(?) 
       OR u.phone = ?
       OR (u.role = 'super_admin' AND LOWER(?) IN ('sagor@superadmin', 'sagor', 'sagor@superadmin.com'))
  `).all(trimmed, trimmed, trimmed);

  // Also check if identifier matches a customer ID (e.g. DSN-000001)
  if (candidates.length === 0) {
    const cust = db.prepare(`SELECT * FROM customers WHERE customer_id = ?`).get(trimmed.toUpperCase());
    if (cust) {
      const custUser = db.prepare(`
        SELECT u.*, c.name as company_name, c.status as company_status, c.customer_prefix
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.customer_id_ref = ?
        LIMIT 1
      `).get(cust.id);
      if (custUser) candidates.push(custUser);
    }
  }

  if (candidates.length === 0) {
    return res.status(401).json({ error: 'ব্যবহারকারী পাওয়া যায়নি (User not found)। দয়া করে সঠিক আইডি, ইমেইল বা ফোন নম্বর দিন।' });
  }

  // Find the candidate whose password matches (handles cases where phone is shared between accounts)
  let user = candidates.find(c => bcrypt.compareSync(password, c.password_hash));
  if (!user) {
    return res.status(401).json({ error: 'ভুল পাসওয়ার্ড (Invalid password)। দয়া করে সঠিক পাসওয়ার্ড দিন।' });
  }

  // Check if company is deactivated
  const isCompanyDeactive = user.company_id && user.company_status && user.company_status !== 'Active';
  if (isCompanyDeactive) {
    if (user.role === 'company_admin') {
      return res.status(403).json({ error: `আপনার কোম্পানি (${user.company_name || ''}) বর্তমানে Super Admin কর্তৃক Deactive আছে। ডেভেলপার এর সাথে যোগাযোগ করুন।` });
    } else {
      return res.status(403).json({ error: `আপনার কোম্পানি (${user.company_name || ''}) বর্তমানে Deactive আছে। কোম্পানির এডমিনের সাথে যোগাযোগ করুন।` });
    }
  }

  // Check if user account itself is deactivated
  const isUserDeactive = user.status && user.status !== 'Active';
  if (isUserDeactive) {
    if (user.role === 'company_admin') {
      return res.status(403).json({ error: 'আপনার অ্যাকাউন্ট বর্তমানে Deactive আছে। ডেভেলপার এর সাথে যোগাযোগ করুন।' });
    } else if (user.role === 'collector') {
      return res.status(403).json({ error: 'আপনার কালেক্টর অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive/Deactive) আছে। এডমিনের সাথে যোগাযোগ করুন।' });
    } else {
      return res.status(403).json({ error: 'আপনার অ্যাকাউন্ট বর্তমানে Deactive আছে। এডমিনের সাথে যোগাযোগ করুন।' });
    }
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
      avatar: user.avatar,
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
  }
  if (!user && role) {
    user = db.prepare(`SELECT * FROM users WHERE role = ? LIMIT 1`).get(role);
  }

  if (!user) {
    return res.status(404).json({ error: 'User for this role not found in the database. Please create a company/user first.' });
  }

  const token = generateToken(user);
  res.json({ token, user });
});

// GET /api/auth/login-settings (Public endpoint for login page branding)
router.get('/login-settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM platform_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    res.json({
      logo: settings.login_logo || '/uploads/billwave-logo.png',
      logoBg: settings.login_logo_bg || 'white',
      logoHeight: settings.login_logo_height || '56',
      brandTitle: settings.login_brand_title || 'BillWave',
      brandSubtitle: settings.login_brand_subtitle || 'Manage. Collect. Grow.',
      cardTitleBn: settings.login_card_title_bn || 'অ্যাকাউন্টে প্রবেশ করুন',
      cardTitleEn: settings.login_card_title_en || 'Sign in to your account',
      cardSubtitleBn: settings.login_card_subtitle_bn || 'আপনার ইউজারনেম, ইমেইল, মোবাইল বা গ্রাহক আইডি লিখুন',
      cardSubtitleEn: settings.login_card_subtitle_en || 'Enter your Username, Email, Phone, or Customer ID',
      footerText: settings.login_footer_text || '© 2026 BillWave. All rights reserved.',
      bgTheme: settings.login_bg_theme || 'light'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get login settings: ' + err.message });
  }
});

module.exports = router;
