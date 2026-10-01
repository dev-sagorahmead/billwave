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

let handler;
try {
  writeStatus('STEP 1: Loading main Express server & database...');
  handler = require('./server/src/index');
  writeStatus('STEP 1 OK: Express server loaded successfully! System fully operational.');

  // Express middleware to handle /api/billing-run and /api/git-sync directly
  if (handler && typeof handler.use === 'function') {
    handler.use((req, res, next) => {
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
          
          gitOut += execSync('git pull origin main', { cwd: __dirname, encoding: 'utf8' });
          
          if (fs.existsSync(backupFile)) {
            fs.copyFileSync(backupFile, dbFile);
          }

          writeStatus('GIT SYNC OK: ' + gitOut);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Repository updated from GitHub successfully! Reloading server in 1 second...', 
            gitOut 
          }, null, 2));

          setTimeout(() => {
            writeStatus('SERVER RESTART: Process exiting to reload fresh code...');
            process.exit(0);
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
      next();
    });
  }

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
  
  handler = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BillWave Diagnostic</title>
      </head>
      <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; margin: 0;">
        <div style="max-width: 800px; margin: 0 auto; background: #1e293b; border: 1px solid #ef4444; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <h2 style="color: #ef4444; margin-top: 0; display: flex; align-items: center; gap: 8px;">
            <span>🚨</span> BillWave Server Diagnostics
          </h2>
          <p style="color: #cbd5e1; font-size: 15px;">
            LiteSpeed ও Node.js চালু হয়েছে, তবে মডিউল লোড করার সময় সমস্যা হয়েছে:
          </p>
          <pre style="background: #090d16; color: #fca5a5; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 13px; border: 1px solid #334155;">${startupErr.stack || startupErr.message || startupErr}</pre>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;">
          <div style="color: #64748b; font-size: 12px; display: flex; justify-content: space-between;">
            <span>Node: ${process.version}</span>
            <span>Platform: ${process.platform}</span>
          </div>
        </div>
      </body>
      </html>
    `);
  };
}

const server = http.createServer(handler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  writeStatus('SERVER: listening on ' + PORT);
});

if (typeof handler === 'function') {
  handler.listen = (...args) => server.listen(...args);
  module.exports = handler;
} else {
  module.exports = server;
}
