const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dish.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Indices for high performance queries
    CREATE INDEX IF NOT EXISTS idx_customers_company_area ON customers(company_id, area_id);
    CREATE INDEX IF NOT EXISTS idx_customers_company_status ON customers(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_payments_company_date ON payments(company_id, payment_date);
    CREATE INDEX IF NOT EXISTS idx_payments_collector ON payments(collector_id);
    CREATE INDEX IF NOT EXISTS idx_bills_customer_month ON bills(customer_id, billing_month);
  `);
}

initSchema();

module.exports = db;
