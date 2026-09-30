const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dish_billing_super_secret_jwt_key_2026';

function generateToken(user, extra = {}) {
  return jwt.sign(
    {
      id: user.id,
      company_id: user.company_id,
      name: user.name,
      email: user.email,
      role: user.role,
      customer_id_ref: user.customer_id_ref,
      ...extra
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch latest user data from DB to ensure status is still active
    const user = db.prepare('SELECT id, company_id, name, email, phone, avatar, role, status, customer_id_ref FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.status !== 'Active') {
      const msg = user && user.role === 'company_admin'
        ? 'আপনার অ্যাকাউন্ট বর্তমানে Deactive আছে। ডেভেলপার এর সাথে যোগাযোগ করুন।'
        : 'আপনার কালেক্টর অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive/Deactive) আছে। এডমিনের সাথে যোগাযোগ করুন।';
      return res.status(403).json({ error: msg });
    }

    // If company user, verify company is active
    if (user.company_id) {
      const company = db.prepare('SELECT id, name, status, customer_prefix, logo, phone, email, address, language FROM companies WHERE id = ?').get(user.company_id);
      if (!company || (company.status !== 'Active' && !decoded.isImpersonated)) {
        const msg = user.role === 'company_admin'
          ? `আপনার কোম্পানি (${company?.name || ''}) বর্তমানে Super Admin কর্তৃক Deactive আছে। ডেভেলপার এর সাথে যোগাযোগ করুন।`
          : `আপনার কোম্পানি (${company?.name || ''}) বর্তমানে Deactive আছে। কোম্পানির এডমিনের সাথে যোগাযোগ করুন।`;
        return res.status(403).json({ error: msg });
      }
      req.company = company;
    }

    // If collector, attach assigned area IDs
    if (user.role === 'collector') {
      const rows = db.prepare('SELECT area_id FROM collector_areas WHERE collector_id = ?').all(user.id);
      user.assignedAreaIds = rows.map(r => r.area_id);
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireRoles
};
