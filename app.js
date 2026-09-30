// cPanel & LiteSpeed / Passenger Entry Point
const fs = require('fs');
const path = require('path');
const http = require('http');

const logFile = path.join(__dirname, 'boot_error.log');

function logError(title, err) {
  const msg = `[${new Date().toISOString()}] ${title}:\n${err && (err.stack || err.message || err)}\n\n`;
  try {
    fs.appendFileSync(logFile, msg);
  } catch (e) {}
  console.error(msg);
}

process.on('uncaughtException', (err) => {
  logError('UNCAUGHT EXCEPTION', err);
});

process.on('unhandledRejection', (reason) => {
  logError('UNHANDLED REJECTION', reason);
});

let app;

try {
  require('dotenv').config();
  app = require('./server/src/index');
} catch (startupError) {
  logError('STARTUP CRASH', startupError);

  // Fallback server so browser displays the EXACT error instead of a generic 503
  app = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <div style="font-family: monospace; padding: 30px; background: #fff1f2; color: #991b1b; border: 2px solid #f87171; border-radius: 8px; margin: 40px auto; max-width: 800px;">
        <h2 style="margin-top:0;">🚨 BillWave Application Startup Error</h2>
        <p>সার্ভার চালু হওয়ার সময় নিচের সমস্যাটি হয়েছে:</p>
        <pre style="background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap;">${startupError.stack || startupError.message || startupError}</pre>
        <p style="margin-bottom:0; color: #64748b; font-size: 13px;">File: repositories/billwave/app.js</p>
      </div>
    `);
  });

  const PORT = process.env.PORT || 5000;
  if (process.env.PORT) {
    app.listen(process.env.PORT);
  } else {
    app.listen(PORT, '0.0.0.0');
  }
}

module.exports = app;
