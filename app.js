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
  writeStatus('STEP 1: Loading dotenv...');
  require('dotenv').config();
  writeStatus('STEP 1 OK: dotenv loaded');

  writeStatus('STEP 2: Testing better-sqlite3 module...');
  require('better-sqlite3');
  writeStatus('STEP 2 OK: better-sqlite3 loaded without errors');

  writeStatus('STEP 3: Loading main Express server...');
  handler = require('./server/src/index');
  writeStatus('STEP 3 OK: Express server loaded successfully! System fully operational.');
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
        <div style="max-width: 800px; margin: 0 auto; background: #1e293b; border: 1px solid #ef4444; border-radius: 12px; padding: 24px;">
          <h2 style="color: #ef4444; margin-top: 0;">🚨 BillWave Server Diagnostics</h2>
          <p style="color: #cbd5e1;">LiteSpeed ও Node.js চালু হয়েছে, তবে মডিউল লোড করার সময় সমস্যা হয়েছে:</p>
          <pre style="background: #090d16; color: #fca5a5; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 13px;">${startupErr.stack || startupErr.message || startupErr}</pre>
          <p style="color: #64748b; font-size: 12px;">Node: ${process.version} | Platform: ${process.platform}</p>
        </div>
      </body>
      </html>
    `);
  };
}

const server = http.createServer(handler);

// Attach listen to port or socket
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  writeStatus('SERVER: listening on ' + PORT);
});

// Bind listen to handler and export for Passenger
if (typeof handler === 'function') {
  handler.listen = (...args) => server.listen(...args);
  module.exports = handler;
} else {
  module.exports = server;
}
