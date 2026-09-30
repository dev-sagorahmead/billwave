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
  try {
    require('dotenv').config();
    writeStatus('STEP 1: dotenv loaded');
  } catch (dotenvErr) {
    writeStatus('STEP 1: dotenv skipped (using production defaults)');
  }

  writeStatus('STEP 2: Loading main Express server & database...');
  handler = require('./server/src/index');
  writeStatus('STEP 2 OK: Express server loaded successfully! System fully operational.');
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
          <p style="background: #334155; padding: 12px; border-radius: 6px; color: #f1f5f9; font-size: 13px;">
            💡 <strong>সমাধান:</strong> cPanel-এ <em>Setup Node.js App</em> পেজে গিয়ে <strong>"Run NPM Install"</strong> বাটনে ক্লিক করে প্যাকেজগুলো ইনস্টল করুন, তারপর <strong>"RESTART"</strong> করুন।
          </p>
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
