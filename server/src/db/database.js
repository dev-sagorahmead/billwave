const ws = (global && global.writeStatus) || console.log;

ws('DB 1: Loading better-sqlite3 module...');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
ws('DB 2: Checking dataDir: ' + dataDir);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dish.db');
ws('DB 3: Opening SQLite at ' + dbPath);

let db;
try {
  db = new Database(dbPath, { timeout: 7000 });
  ws('DB 4: SQLite connected! Setting pragmas...');
} catch (openErr) {
  ws('DB 4 FATAL: Could not open database file: ' + (openErr.stack || openErr.message || openErr));
  throw openErr;
}

// Enable WAL mode for high concurrency & performance (with fallback for restricted shared hosting)
try {
  db.pragma('journal_mode = WAL');
} catch (walErr) {
  ws('DB 4 WARNING: WAL mode not supported, falling back to DELETE: ' + walErr.message);
  try {
    db.pragma('journal_mode = DELETE');
  } catch (e) {}
}
db.pragma('foreign_keys = ON');
ws('DB 5: Pragmas set.');


function initSchema() {

  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT,
      logo TEXT,
      status TEXT DEFAULT 'Active', -- 'Active' | 'Inactive'
      registration_date TEXT NOT NULL,
      customer_prefix TEXT DEFAULT 'FCN',
      language TEXT DEFAULT 'bn', -- 'bn' | 'en'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL, -- 'super_admin' | 'company_admin' | 'collector' | 'customer'
      avatar TEXT,
      status TEXT DEFAULT 'Active', -- 'Active' | 'Inactive'
      joining_date TEXT,
      customer_id_ref INTEGER, -- if role is customer, link to customers(id)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, code)
    );

    CREATE TABLE IF NOT EXISTS collector_areas (
      collector_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
      PRIMARY KEY (collector_id, area_id)
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 150,
      description TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      father_husband_name TEXT,
      phone TEXT NOT NULL,
      alternative_phone TEXT,
      address TEXT NOT NULL,
      road_house_info TEXT,
      area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
      package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
      monthly_bill REAL NOT NULL DEFAULT 150,
      connection_date TEXT NOT NULL,
      status TEXT DEFAULT 'Active', -- 'Active' | 'Free' | 'Closed'
      previous_due REAL NOT NULL DEFAULT 0,
      current_due REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, customer_id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      billing_month TEXT NOT NULL, -- 'YYYY-MM'
      package_name TEXT NOT NULL,
      amount REAL NOT NULL,
      previous_due REAL NOT NULL,
      total_due REAL NOT NULL,
      status TEXT DEFAULT 'Generated', -- 'Generated' | 'Paid' | 'Partially Paid'
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(customer_id, billing_month)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      collector_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      receipt_number TEXT NOT NULL UNIQUE,
      previous_due REAL NOT NULL,
      paid_amount REAL NOT NULL,
      remaining_due REAL NOT NULL,
      payment_date TEXT NOT NULL, -- 'YYYY-MM-DD'
      payment_time TEXT NOT NULL, -- 'HH:mm:ss'
      payment_method TEXT NOT NULL DEFAULT 'Cash', -- 'Cash' | 'bKash' | 'Nagad' | 'Bank' | 'Other'
      billing_month TEXT, -- e.g. '2026-08' (1 month in arrears)
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_role TEXT NOT NULL, -- 'super_admin' | 'company_admin'
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL, -- 'company' | 'all_companies' | 'collector' | 'all_collectors'
      target_company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'normal', -- 'normal' | 'urgent' | 'warning'
      status TEXT DEFAULT 'Active', -- 'Active' | 'Inactive'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS auto_billing_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billing_month TEXT NOT NULL,
      total_companies INTEGER DEFAULT 0,
      total_bills_generated INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      triggered_by TEXT DEFAULT 'scheduler', -- 'scheduler' | 'manual' | 'startup'
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Success',
      details TEXT
    );

    -- Indices for high performance queries
    CREATE INDEX IF NOT EXISTS idx_customers_company_area ON customers(company_id, area_id);
    CREATE INDEX IF NOT EXISTS idx_customers_company_status ON customers(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_payments_company_date ON payments(company_id, payment_date);
    CREATE INDEX IF NOT EXISTS idx_payments_collector ON payments(collector_id);
    CREATE INDEX IF NOT EXISTS idx_bills_customer_month ON bills(customer_id, billing_month);
    CREATE INDEX IF NOT EXISTS idx_notices_target_company ON notices(target_company_id, status);
    CREATE INDEX IF NOT EXISTS idx_notices_target_user ON notices(target_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_auto_billing_month ON auto_billing_logs(billing_month);
  `);
}

initSchema();
ws('DB 6: initSchema() executed successfully.');

try {
  db.prepare('ALTER TABLE payments ADD COLUMN billing_month TEXT').run();
} catch (e) {
  // column already exists
}

try {
  db.prepare("ALTER TABLE companies ADD COLUMN language TEXT DEFAULT 'bn'").run();
} catch (e) {
  // column already exists
}

// Initialize default platform settings (BillWave login page branding)
const defaultPlatformSettings = [
  ['login_logo', '/uploads/billwave-logo.png'],
  ['login_logo_bg', 'white'],
  ['login_logo_height', '56'],
  ['login_brand_title', 'BillWave'],
  ['login_brand_subtitle', 'Manage. Collect. Grow.'],
  ['login_card_title_bn', 'অ্যাকাউন্টে প্রবেশ করুন'],
  ['login_card_title_en', 'Sign in to your account'],
  ['login_card_subtitle_bn', 'আপনার ইউজারনেম, ইমেইল, মোবাইল বা গ্রাহক আইডি লিখুন'],
  ['login_card_subtitle_en', 'Enter your Username, Email, Phone, or Customer ID'],
  ['login_footer_text', '© 2026 BillWave. All rights reserved.'],
  ['login_bg_theme', 'light']
];

for (const [k, v] of defaultPlatformSettings) {
  try {
    const existing = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get(k);
    if (!existing) {
      db.prepare('INSERT INTO platform_settings (key, value) VALUES (?, ?)').run(k, v);
    }
  } catch (e) {}
}

// Ensure BillWave logo is active
try {
  db.prepare("INSERT INTO platform_settings (key, value) VALUES ('login_logo', '/uploads/billwave-logo.png') ON CONFLICT(key) DO UPDATE SET value = '/uploads/billwave-logo.png'").run();
  db.prepare("INSERT INTO platform_settings (key, value) VALUES ('login_brand_title', 'BillWave') ON CONFLICT(key) DO UPDATE SET value = 'BillWave'").run();
  db.prepare("INSERT INTO platform_settings (key, value) VALUES ('login_brand_subtitle', 'Manage. Collect. Grow.') ON CONFLICT(key) DO UPDATE SET value = 'Manage. Collect. Grow.'").run();
} catch (e) {}

ws('DB 7: database.js fully ready!');

module.exports = db;

