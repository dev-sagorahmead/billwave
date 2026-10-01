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

let handler;
try {
  writeStatus('STEP 1: Loading main Express server & database...');
  handler = require('./server/src/index');
  writeStatus('STEP 1 OK: Express server loaded successfully! System fully operational.');

  // Auto-migration & October 1st Auto-Billing once Database is fully ready
  const db = require('./server/src/db/database');
  const runAutoBillingMigration = () => {
    try {
      const { runAutoBillingForAllCompanies } = require('./server/src/services/autoBilling');
      
      // Clean up any test bills created before October 1st tagged as 2026-10
      db.prepare("DELETE FROM bills WHERE billing_month = '2026-10' AND generated_at < '2026-10-01' AND customer_id IN (SELECT customer_id FROM bills WHERE billing_month = '2026-09')").run();
      db.prepare("UPDATE OR IGNORE bills SET billing_month = '2026-09' WHERE billing_month = '2026-10' AND generated_at < '2026-10-01'").run();
      db.prepare("DELETE FROM bills WHERE billing_month = '2026-10' AND generated_at < '2026-10-01'").run();
      db.prepare("UPDATE platform_settings SET value = '2026-09' WHERE key = 'auto_billing_last_run_month' AND value = '2026-10'").run();

      writeStatus('MIGRATION: Pre-release test bills cleaned. Running October 1st auto-billing now...');
      const res = runAutoBillingForAllCompanies('2026-10', 'auto_migration');
      writeStatus(`MIGRATION OK: Generated ${res.totalBillsGenerated} bills for October 2026 across ${res.totalCompanies} companies! Total BDT: ${res.totalAmount}`);
    } catch (mErr) {
      writeStatus('MIGRATION ERROR: ' + (mErr.stack || mErr.message || mErr));
    }
  };

  if (db && typeof db.initAsync === 'function') {
    db.initAsync().then(() => {
      // Delay slightly so db schema and default settings commit cleanly
      setTimeout(runAutoBillingMigration, 500);
    }).catch(e => writeStatus('DB INIT ERROR: ' + e.message));
  } else {
    setTimeout(runAutoBillingMigration, 1500);
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

// Master request wrapper: handles /billing-run and passes through to Express
const server = http.createServer((req, res) => {
  if (req.url && (req.url.startsWith('/api/billing-run') || req.url.startsWith('/billing-run'))) {
    try {
      const db = require('./server/src/db/database');
      const { runAutoBillingForAllCompanies, getAutoBillingStatus } = require('./server/src/services/autoBilling');
      
      db.prepare("DELETE FROM bills WHERE billing_month = '2026-10' AND generated_at < '2026-10-01' AND customer_id IN (SELECT customer_id FROM bills WHERE billing_month = '2026-09')").run();
      db.prepare("UPDATE OR IGNORE bills SET billing_month = '2026-09' WHERE billing_month = '2026-10' AND generated_at < '2026-10-01'").run();
      db.prepare("DELETE FROM bills WHERE billing_month = '2026-10' AND generated_at < '2026-10-01'").run();
      db.prepare("UPDATE platform_settings SET value = '2026-09' WHERE key = 'auto_billing_last_run_month' AND value = '2026-10'").run();
      
      const result = runAutoBillingForAllCompanies('2026-10', 'manual_web_trigger');
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        message: `October 2026 bills generated successfully! Generated ${result.totalBillsGenerated} bills across ${result.totalCompanies} companies. Total: ${result.totalAmount} BDT`,
        result,
        status: getAutoBillingStatus()
      }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: err.message }, null, 2));
    }
  }

  handler(req, res);
});

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
