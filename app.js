// cPanel & LiteSpeed / Passenger Entry Point
const http = require('http');

console.log('[APP] Starting BillWave on cPanel / LiteSpeed...');

let handler;
try {
  require('dotenv').config();
  console.log('[APP] Testing better-sqlite3 dependency...');
  require('better-sqlite3');
  console.log('[APP] better-sqlite3 is functional! Loading main server...');
  
  handler = require('./server/src/index');
  console.log('[APP] Server loaded successfully!');
} catch (startupErr) {
  console.error('[APP FATAL CRASH]:', startupErr);
  
  // Create fallback HTTP diagnostic responder so 503 is NEVER displayed
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
            LiteSpeed & Node.js সার্ভার চালু হয়েছে, কিন্তু ডিপেনডেন্সি বা মডিউল লোড করার সময় নিচের ত্রুটি হয়েছে:
          </p>
          <pre style="background: #090d16; color: #fca5a5; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 13px; border: 1px solid #334155;">${startupErr.stack || startupErr.message || startupErr}</pre>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;">
          <div style="color: #64748b; font-size: 12px; display: flex; justify-content: space-between;">
            <span>Node Version: ${process.version}</span>
            <span>Platform: ${process.platform} (${process.arch})</span>
          </div>
        </div>
      </body>
      </html>
    `);
  };
}

const server = http.createServer(handler);

// In Phusion Passenger / LiteSpeed: listen(process.env.PORT || 5000) attaches to Passenger hook
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[APP] BillWave server listening on: ${PORT}`);
});

module.exports = server;
