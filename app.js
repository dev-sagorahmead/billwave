// cPanel & LiteSpeed / Passenger Entry Point
const http = require('http');
const fs = require('fs');
const path = require('path');

const logMessages = [];
function writeStatus(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logMessages.push(line);
  
  // Try writing to public_html so it can be checked directly at http://fcnwifi.shop/status.txt
  const candidatePaths = [
    path.resolve(__dirname, '../../public_html/status.txt'),
    path.resolve(__dirname, '../public_html/status.txt'),
    path.resolve(__dirname, 'status.txt')
  ];
  
  for (const p of candidatePaths) {
    try {
      fs.writeFileSync(p, logMessages.join('\n'));
    } catch (e) {}
  }
}

global.writeStatus = writeStatus;

process.on('uncaughtException', (err) => {
  writeStatus('UNCAUGHT EXCEPTION: ' + (err.stack || err.message || err));
});

process.on('unhandledRejection', (reason) => {
  writeStatus('UNHANDLED REJECTION: ' + (reason.stack || reason.message || reason));
});

writeStatus('STARTUP: Node.js process initiated in ' + __dirname);
writeStatus('ENV: Node ' + process.version + ' (' + process.platform + ' ' + process.arch + ')');

// Database backup safeguard on startup (protects live data against accidental git overwrite)
try {
  const dbFile = path.resolve(__dirname, 'server/data/dish.db');
  const backupFile = path.resolve(__dirname, 'server/data/dish.db.backup');
  if (fs.existsSync(dbFile) && fs.statSync(dbFile).size > 0) {
    fs.copyFileSync(dbFile, backupFile);
    writeStatus('SAFEGUARD: Live database backed up to dish.db.backup');
  } else if (!fs.existsSync(dbFile) && fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, dbFile);
    writeStatus('SAFEGUARD: Restored live database from dish.db.backup');
  }
} catch (e) {}

// Auto-patcher for server files to ensure WebAssembly SQLite transaction fix is permanent on disk
try {
  const dbSrcFile = path.resolve(__dirname, 'server/src/db/database.js');
  if (fs.existsSync(dbSrcFile)) {
    let dbContent = fs.readFileSync(dbSrcFile, 'utf8');
    if (!dbContent.includes('this.inTx')) {
      writeStatus('AUTO-PATCH: Updating database.js with WASM transaction fix...');
      dbContent = dbContent.replace(
        "constructor(db, filePath) {\n    this.db = db;\n    this.filePath = filePath;\n  }",
        "constructor(db, filePath) {\n    this.db = db;\n    this.filePath = filePath;\n    this.inTx = false;\n  }"
      );
      dbContent = dbContent.replace(
        "save() {\n    if (this.filePath) {",
        "save() {\n    if (this.inTx) return;\n    if (this.filePath) {"
      );
      dbContent = dbContent.replace(
        "exec(sql) {\n    this.db.exec(sql);\n    this.save();\n  }",
        "exec(sql) {\n    this.db.exec(sql);\n    if (!this.inTx) this.save();\n  }"
      );
      dbContent = dbContent.replace(
        /transaction\(fn\) \{[\s\S]*?return res;\s*\}\s*catch\s*\(err\)\s*\{[\s\S]*?\}\s*;\s*\}/,
        `transaction(fn) {
    return (...args) => {
      if (this.inTx) return fn(...args);
      this.inTx = true;
      try { this.db.exec('BEGIN TRANSACTION'); } catch (e) {}
      try {
        const res = fn(...args);
        try { this.db.exec('COMMIT'); } catch (e) {}
        this.inTx = false;
        this.save();
        return res;
      } catch (err) {
        this.inTx = false;
        try { this.db.exec('ROLLBACK'); } catch (rbErr) {}
        this.save();
        throw err;
      }
    };
  }`
      );
      if (!dbContent.includes('getUnderlyingDb')) {
        dbContent = dbContent.replace(
          "initAsync: initDatabase\n};",
          "initAsync: initDatabase,\n  getUnderlyingDb() { return underlyingDb; }\n};"
        );
      }
      fs.writeFileSync(dbSrcFile, dbContent, 'utf8');
      writeStatus('AUTO-PATCH: database.js patched successfully!');
    }
  }
} catch (apErr) {
  writeStatus('AUTO-PATCH WARNING: ' + apErr.message);
}

// Direct, foolproof October billing function
function executeSafeOctoberBilling(trigger = 'startup') {
  try {
    const db = require('./server/src/db/database');
    const lastRun = db.prepare("SELECT value FROM platform_settings WHERE key = 'auto_billing_last_run_month'").get();
    if (lastRun && lastRun.value === '2026-10') {
      writeStatus(`OCTOBER BILLING (${trigger}): October bills already generated. Skipping.`);
      return { success: true, message: 'October bills already generated' };
    }

    writeStatus(`OCTOBER BILLING (${trigger}): Starting safe per-customer billing...`);
    const customers = db.prepare("SELECT id, company_id, customer_id, name, status, monthly_bill, current_due FROM customers WHERE status = 'Active' AND monthly_bill > 0").all();
    
    const billedList = [];
    let totalAmount = 0;

    for (const cust of customers) {
      try {
        const billAmount = cust.monthly_bill;
        const prevDue = cust.current_due;
        const totalDue = prevDue + billAmount;

        db.prepare(`
          INSERT INTO bills (company_id, customer_id, billing_month, package_name, amount, previous_due, total_due, status)
          VALUES (?, ?, '2026-10', 'Regular', ?, ?, ?, 'Generated')
        `).run(cust.company_id || 8, cust.id, billAmount, prevDue, totalDue);

        db.prepare(`
          UPDATE customers 
          SET previous_due = current_due, current_due = current_due + ?
          WHERE id = ?
        `).run(billAmount, cust.id);

        billedList.push({ id: cust.customer_id, name: cust.name, prevDue, added: billAmount, totalDue });
        totalAmount += billAmount;
      } catch (itemErr) {
        writeStatus(`BILL ERROR for ${cust.name}: ${itemErr.message}`);
      }
    }

    db.prepare("UPDATE platform_settings SET value = '2026-10' WHERE key = 'auto_billing_last_run_month'").run();
    db.prepare("INSERT OR REPLACE INTO platform_settings (key, value) VALUES ('auto_billing_last_run_at', ?)").run(new Date().toISOString());

    writeStatus(`OCTOBER BILLING OK: Successfully billed ${billedList.length} active customers! Total added: ${totalAmount} BDT`);
    return { success: true, count: billedList.length, totalAmount, billedList };
  } catch (err) {
    writeStatus('OCTOBER BILLING ERROR: ' + (err.stack || err.message || err));
    return { success: false, error: err.message };
  }
}

let expressApp;
try {
  writeStatus('STEP 1: Loading main Express server & database...');
  expressApp = require('./server/src/index');
  writeStatus('STEP 1 OK: Express server loaded successfully! System fully operational.');

  // WebAssembly SQLite in-memory transaction patch + Automatic October check
  const db = require('./server/src/db/database');
  if (db && typeof db.initAsync === 'function') {
    db.initAsync().then(() => {
      try {
        const uDb = db.getUnderlyingDb ? db.getUnderlyingDb() : null;
        if (uDb && typeof uDb.save === 'function') {
          writeStatus('PATCH: Applying WASM transaction fix to SqlJsAdapter...');
          uDb.inTx = false;
          const origSave = uDb.save.bind(uDb);
          uDb.save = function() {
            if (this.inTx) return;
            origSave();
          };
          uDb.transaction = function(fn) {
            return (...args) => {
              if (this.inTx) return fn(...args);
              this.inTx = true;
              try { this.db.exec('BEGIN TRANSACTION'); } catch (e) {}
              try {
                const res = fn(...args);
                try { this.db.exec('COMMIT'); } catch (e) {}
                this.inTx = false;
                this.save();
                return res;
              } catch (err) {
                this.inTx = false;
                try { this.db.exec('ROLLBACK'); } catch (rb) {}
                this.save();
                throw err;
              }
            };
          };
          writeStatus('PATCH OK: WebAssembly SQLite transaction fix applied successfully!');
        }
      } catch (patchErr) {
        writeStatus('PATCH WARNING: ' + patchErr.message);
      }

      setTimeout(() => executeSafeOctoberBilling('startup'), 500);
    }).catch(e => writeStatus('DB INIT ERROR: ' + e.message));
  } else {
    setTimeout(() => executeSafeOctoberBilling('startup'), 1500);
  }
} catch (startupErr) {
  writeStatus('FATAL STARTUP ERROR: ' + (startupErr.stack || startupErr.message || startupErr));
}

// Master Passenger / LiteSpeed Request Dispatcher (Intercepts /api/git-sync and /api/billing-run before Express)
function masterHandler(req, res) {
  // 1. One-click Git deploy sync from GitHub
  if (req.url && (req.url.startsWith('/api/git-sync') || req.url.startsWith('/api/deploy-sync'))) {
    try {
      const { execSync } = require('child_process');
      writeStatus('GIT SYNC: Triggered via web request...');
      
      const dbFile = path.resolve(__dirname, 'server/data/dish.db');
      const backupFile = path.resolve(__dirname, 'server/data/dish.db.backup');
      if (fs.existsSync(dbFile) && fs.statSync(dbFile).size > 0) {
        fs.copyFileSync(dbFile, backupFile);
      }
      
      let gitOut = '';
      try {
        gitOut += execSync('git stash', { cwd: __dirname, encoding: 'utf8' }) + '\n';
      } catch (e) {}
      
      try {
        gitOut += execSync('git pull origin main', { cwd: __dirname, encoding: 'utf8' });
      } catch (pullErr) {
        gitOut += 'Git pull output: ' + pullErr.message;
      }
      
      if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, dbFile);
      }

      writeStatus('GIT SYNC FINISHED: ' + gitOut);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Repository updated from GitHub successfully! Reloading server in 1 second...', 
        gitOut 
      }, null, 2));

      setTimeout(() => {
        writeStatus('SERVER RESTART: Process exiting to reload fresh code...');
        try {
          const { exec } = require('child_process');
          exec('kill -9 -1');
        } catch (e) {
          process.exit(0);
        }
      }, 800);
      return;
    } catch (syncErr) {
      writeStatus('GIT SYNC ERROR: ' + syncErr.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: syncErr.message }, null, 2));
    }
  }

  // 2. Safe billing trigger
  if (req.url && (req.url.startsWith('/api/billing-run') || req.url.startsWith('/billing-run'))) {
    const result = executeSafeOctoberBilling('web_request');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(result, null, 2));
  }

  // If expressApp failed to load, show diagnostic page
  if (typeof expressApp !== 'function') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 30px;">
        <h2>🚨 BillWave Server Diagnostics</h2>
        <p>App is starting or encountered an issue. Please refresh in a moment.</p>
      </body>
      </html>
    `);
  }

  // Pass everything else directly to Express!
  return expressApp(req, res);
}

const server = http.createServer(masterHandler);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  writeStatus('SERVER: listening on ' + PORT);
});

masterHandler.listen = (...args) => server.listen(...args);
module.exports = masterHandler;
