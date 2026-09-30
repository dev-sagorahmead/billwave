const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize DB and ensure seed is run if empty
require('./db/database');
try {
  require('./db/seed');
} catch (e) {
  console.log('Seed info:', e.message);
}

// Start automatic 1st-of-the-month billing scheduler
const { startAutoBillingScheduler } = require('./services/autoBilling');
startAutoBillingScheduler();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/company', require('./routes/companies'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/collectors', require('./routes/collectors'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notices', require('./routes/notices'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Dish & Cable TV Billing SaaS API'
  });
});

// Serve frontend build in production or fallback
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error: ' + (err.message || err) });
});

if (require.main === module) {
  if (process.env.PORT) {
    app.listen(process.env.PORT, () => {
      console.log(`Dish Cable SaaS Server listening on process.env.PORT: ${process.env.PORT}`);
    });
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`Dish Cable SaaS Server listening on:`);
      console.log(`- Local:   http://localhost:${PORT}`);
      console.log(`- Network: http://192.168.1.4:${PORT}`);
      console.log(`Health check: http://192.168.1.4:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  }
}

module.exports = app;



