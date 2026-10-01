const ws = (global && global.writeStatus) || console.log;
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o777 });
}
const dbPath = path.join(dataDir, 'dish.db');

let underlyingDb = null;
let isReady = false;

// -------------------------------------------------------------
// WebAssembly (sql.js) Drop-in Adapter
// -------------------------------------------------------------
class SqlJsAdapter {
  constructor(db, filePath) {
    this.db = db;
    this.filePath = filePath;
    this.inTx = false;
  }

  save() {
    if (this.inTx) return; // Never export database while a transaction is in progress!
    if (this.filePath) {
      try {
        const data = this.db.export();
        fs.writeFileSync(this.filePath, Buffer.from(data));
      } catch (err) {
        console.error('[WASM SQLite] Failed to persist dish.db:', err.message);
      }
    }
  }

  exec(sql) {
    this.db.exec(sql);
    if (!this.inTx) {
      this.save();
    }
  }

  pragma(sql) {
    try {
      return this.db.exec(`PRAGMA ${sql}`);
    } catch (e) {
      return null;
    }
  }

  transaction(fn) {
    return (...args) => {
      if (this.inTx) {
        return fn(...args);
      }
      this.inTx = true;
      try {
        this.db.exec('BEGIN TRANSACTION');
      } catch (e) {}
      try {
        const res = fn(...args);
        try {
          this.db.exec('COMMIT');
        } catch (e) {}
        this.inTx = false;
        this.save();
        return res;
      } catch (err) {
        this.inTx = false;
        try {
          this.db.exec('ROLLBACK');
        } catch (rbErr) {}
        this.save();
        throw err;
      }
    };
  }

  prepare(sql) {
    const adapter = this;
    return {
      all(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        try {
          if (flatParams.length > 0) stmt.bind(flatParams);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          return rows;
        } finally {
          stmt.free();
        }
      },

      get(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        try {
          if (flatParams.length > 0) stmt.bind(flatParams);
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      run(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        adapter.db.run(sql, flatParams);

        let lastInsertRowid = 0;
        let changes = 0;
        try {
          const lastIdRes = adapter.db.exec('SELECT last_insert_rowid() as id');
          lastInsertRowid = (lastIdRes[0] && lastIdRes[0].values[0] && lastIdRes[0].values[0][0]) || 0;

          const changesRes = adapter.db.exec('SELECT changes() as chg');
          changes = (changesRes[0] && changesRes[0].values[0] && changesRes[0].values[0][0]) || 0;
        } catch (e) {}

        adapter.save();
        return { lastInsertRowid, changes };
      }
    };
  }
}

// -------------------------------------------------------------
// Database Initialization
// -------------------------------------------------------------
async function initDatabase() {
  if (isReady && underlyingDb) return underlyingDb;

  ws('DB INIT: Initializing database engine...');

  // Strategy 1: On Windows, use native better-sqlite3 if functional
  if (process.platform === 'win32') {
    try {
      ws('DB INIT: Using native better-sqlite3 (Windows dev)...');
      const Database = require('better-sqlite3');
      underlyingDb = new Database(dbPath, { timeout: 7000 });
      try { underlyingDb.pragma('journal_mode = WAL'); } catch (e) {}
      underlyingDb.pragma('foreign_keys = ON');
      isReady = true;
      initSchemaAndDefaults(underlyingDb);
      ws('DB INIT: Native better-sqlite3 active.');
      return underlyingDb;
    } catch (winErr) {
      ws('DB INIT: better-sqlite3 on Windows fallback: ' + winErr.message);
    }
  }

  // Strategy 2: WebAssembly SQLite (sql.js) - 100% immune to Linux segfaults and C++ compiler missing
  ws('DB INIT: Launching WebAssembly SQLite (sql.js)...');
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0) {
    ws('DB INIT: Loading existing database from ' + dbPath + ' (' + fs.statSync(dbPath).size + ' bytes)');
    const buf = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buf);
  } else {
    ws('DB INIT: Creating fresh database at ' + dbPath);
    sqlDb = new SQL.Database();
  }

  underlyingDb = new SqlJsAdapter(sqlDb, dbPath);
  isReady = true;
  ws('DB INIT: WebAssembly SQLite successfully initialized!');

  initSchemaAndDefaults(underlyingDb);
  return underlyingDb;
}

// -------------------------------------------------------------
// Schema and Platform Defaults
// -------------------------------------------------------------
function initSchemaAndDefaults(targetDb) {
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT,
      logo TEXT,
      status TEXT DEFAULT 'Active',
      registration_date TEXT NOT NULL,
      customer_prefix TEXT DEFAULT 'FCN',
      language TEXT DEFAULT 'bn',
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
      role TEXT NOT NULL,
      avatar TEXT,
      status TEXT DEFAULT 'Active',
      joining_date TEXT,
      customer_id_ref INTEGER,
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
      status TEXT DEFAULT 'Active',
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
      billing_month TEXT NOT NULL,
      package_name TEXT NOT NULL,
      amount REAL NOT NULL,
      previous_due REAL NOT NULL,
      total_due REAL NOT NULL,
      status TEXT DEFAULT 'Generated',
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
      payment_date TEXT NOT NULL,
      payment_time TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      billing_month TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_role TEXT NOT NULL,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS auto_billing_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billing_month TEXT NOT NULL,
      total_companies INTEGER DEFAULT 0,
      total_bills_generated INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      triggered_by TEXT DEFAULT 'scheduler',
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Success',
      details TEXT
    );

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

  try {
    targetDb.prepare('ALTER TABLE payments ADD COLUMN billing_month TEXT').run();
  } catch (e) {}

  try {
    targetDb.prepare("ALTER TABLE companies ADD COLUMN language TEXT DEFAULT 'bn'").run();
  } catch (e) {}

  // BillWave default branding
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
      const existing = targetDb.prepare('SELECT value FROM platform_settings WHERE key = ?').get(k);
      if (!existing) {
        targetDb.prepare('INSERT INTO platform_settings (key, value) VALUES (?, ?)').run(k, v);
      }
    } catch (e) {}
  }

  try {
    targetDb.prepare("INSERT INTO platform_settings (key, value) VALUES ('login_logo', '/uploads/billwave-logo.png') ON CONFLICT(key) DO UPDATE SET value = '/uploads/billwave-logo.png'").run();
    targetDb.prepare("INSERT INTO platform_settings (key, value) VALUES ('login_brand_title', 'BillWave') ON CONFLICT(key) DO UPDATE SET value = 'BillWave'").run();
    targetDb.prepare("INSERT INTO platform_settings (key, value) VALUES ('login_brand_subtitle', 'Manage. Collect. Grow.') ON CONFLICT(key) DO UPDATE SET value = 'Manage. Collect. Grow.'").run();
  } catch (e) {}

  ws('DB INIT: Schema, indices, and platform defaults are ready.');
}

// -------------------------------------------------------------
// Synchronous Proxy Export for seamless route compatibility
// -------------------------------------------------------------
const dbProxy = {
  prepare(sql) {
    if (!underlyingDb) throw new Error('Database is still initializing. Please retry in a moment.');
    return underlyingDb.prepare(sql);
  },
  exec(sql) {
    if (!underlyingDb) throw new Error('Database is still initializing. Please retry in a moment.');
    return underlyingDb.exec(sql);
  },
  transaction(fn) {
    if (!underlyingDb) throw new Error('Database is still initializing. Please retry in a moment.');
    return underlyingDb.transaction(fn);
  },
  pragma(sql) {
    if (!underlyingDb) return null;
    return underlyingDb.pragma(sql);
  },
  initAsync: initDatabase,
  getUnderlyingDb() { return underlyingDb; }
};

// Immediate background initialization
initDatabase().catch(err => {
  ws('FATAL DATABASE INITIALIZATION FAILURE: ' + (err.stack || err.message || err));
});

module.exports = dbProxy;
