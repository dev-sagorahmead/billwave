const db = require('../db/database');

/**
 * Returns current Date adjusted to Bangladesh Standard Time (UTC+6)
 */
function getBangladeshDate() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcMs + (6 * 3600000));
}

/**
 * Returns YYYY-MM string for a given date in Bangladesh time
 */
function getBangladeshYearMonth(d = getBangladeshDate()) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${yr}-${mo}`;
}

/**
 * Calculate the next 1st of the month date string
 */
function getNextFirstOfMonthString() {
  const bd = getBangladeshDate();
  const nextMonthDate = new Date(bd.getFullYear(), bd.getMonth() + 1, 1);
  const yr = nextMonthDate.getFullYear();
  const mo = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
  return `${yr}-${mo}-01`;
}

/**
 * Core billing function for a single company for a given month.
 * Safe, idempotent, prevents duplicates, only bills Active customers with monthly_bill > 0.
 */
function generateBillsForCompany(companyId, billingMonth) {
  // 1. Fetch eligible customers:
  // - Belongs to company
  // - status = 'Active' (Closed/Inactive and Free are excluded from auto-billing!)
  // - monthly_bill > 0
  const eligibleCustomers = db.prepare(`
    SELECT c.*, p.name as package_name
    FROM customers c
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE c.company_id = ?
      AND c.status = 'Active'
      AND c.monthly_bill > 0
  `).all(companyId);

  // 2. Fetch existing bills for this month to strictly prevent duplicates
  const existingBills = db.prepare(`
    SELECT customer_id FROM bills WHERE company_id = ? AND billing_month = ?
  `).all(companyId, billingMonth);

  const billedCustomerIds = new Set(existingBills.map(b => b.customer_id));

  const insertBillStmt = db.prepare(`
    INSERT INTO bills (company_id, customer_id, billing_month, package_name, amount, previous_due, total_due, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Generated')
  `);

  const updateCustDueStmt = db.prepare(`
    UPDATE customers 
    SET previous_due = current_due,
        current_due = current_due + ?
    WHERE id = ?
  `);

  let generatedCount = 0;
  let totalBilledAmount = 0;

  const billingTx = db.transaction(() => {
    for (const cust of eligibleCustomers) {
      if (billedCustomerIds.has(cust.id)) {
        continue; // Already billed this month - skip!
      }

      const billAmount = cust.monthly_bill;
      const prevDue = cust.current_due;
      const totalDue = prevDue + billAmount;

      insertBillStmt.run(
        companyId,
        cust.id,
        billingMonth,
        cust.package_name || 'Standard',
        billAmount,
        prevDue,
        totalDue
      );

      updateCustDueStmt.run(billAmount, cust.id);

      generatedCount++;
      totalBilledAmount += billAmount;
    }
  });

  billingTx();

  return {
    companyId,
    billingMonth,
    eligibleCount: eligibleCustomers.length,
    generatedCount,
    skippedCount: billedCustomerIds.size,
    totalBilledAmount
  };
}

/**
 * Generate bills for all active companies for a given month.
 */
function runAutoBillingForAllCompanies(billingMonth, triggeredBy = 'scheduler') {
  const targetMonth = billingMonth || getBangladeshYearMonth();
  
  const activeCompanies = db.prepare(`
    SELECT id, name FROM companies WHERE status = 'Active'
  `).all();

  let totalBillsGenerated = 0;
  let totalAmount = 0;
  const companyResults = [];

  for (const comp of activeCompanies) {
    try {
      const res = generateBillsForCompany(comp.id, targetMonth);
      companyResults.push({
        companyId: comp.id,
        companyName: comp.name,
        ...res
      });
      totalBillsGenerated += res.generatedCount;
      totalAmount += res.totalBilledAmount;
    } catch (err) {
      console.error(`[AutoBilling] Error billing company ${comp.id} (${comp.name}):`, err);
      companyResults.push({
        companyId: comp.id,
        companyName: comp.name,
        error: err.message
      });
    }
  }

  // Record execution in auto_billing_logs
  try {
    db.prepare(`
      INSERT INTO auto_billing_logs (
        billing_month, total_companies, total_bills_generated, total_amount, triggered_by, status, details
      ) VALUES (?, ?, ?, ?, ?, 'Success', ?)
    `).run(
      targetMonth,
      activeCompanies.length,
      totalBillsGenerated,
      totalAmount,
      triggeredBy,
      JSON.stringify(companyResults)
    );

    // Save platform setting for last run
    db.prepare(`
      INSERT OR REPLACE INTO platform_settings (key, value) VALUES ('auto_billing_last_run_month', ?)
    `).run(targetMonth);

    db.prepare(`
      INSERT OR REPLACE INTO platform_settings (key, value) VALUES ('auto_billing_last_run_at', ?)
    `).run(new Date().toISOString());

  } catch (logErr) {
    console.error('[AutoBilling] Failed to save log:', logErr);
  }

  console.log(`[AutoBilling] Completed for month ${targetMonth} (Trigger: ${triggeredBy}). Generated ${totalBillsGenerated} bills across ${activeCompanies.length} companies. Total BDT: ${totalAmount}`);

  return {
    billingMonth: targetMonth,
    totalCompanies: activeCompanies.length,
    totalBillsGenerated,
    totalAmount,
    companyResults
  };
}

/**
 * Checks if today is the 1st of the month and auto-billing hasn't been executed yet.
 */
function checkAndRunScheduledAutoBilling() {
  const bdDate = getBangladeshDate();
  const day = bdDate.getDate();
  const currentMonth = getBangladeshYearMonth(bdDate);

  // Requirement: Bills auto-generate on the 1st of every month (30/31 ends -> 1st begins)
  if (day === 1) {
    const lastRunSetting = db.prepare(`
      SELECT value FROM platform_settings WHERE key = 'auto_billing_last_run_month'
    `).get();

    const lastRunMonth = lastRunSetting ? lastRunSetting.value : null;

    if (lastRunMonth !== currentMonth) {
      console.log(`[AutoBilling Scheduler] Today is the 1st of the month (${currentMonth}). Triggering automatic bill generation for all active companies...`);
      runAutoBillingForAllCompanies(currentMonth, 'scheduler');
    }
  }
}

/**
 * Get the current auto-billing configuration, status and logs
 */
function getAutoBillingStatus(companyId = null) {
  const bdDate = getBangladeshDate();
  const currentMonth = getBangladeshYearMonth(bdDate);
  const nextRunDate = getNextFirstOfMonthString();

  const lastRunMonthSetting = db.prepare(`SELECT value FROM platform_settings WHERE key = 'auto_billing_last_run_month'`).get();
  const lastRunAtSetting = db.prepare(`SELECT value FROM platform_settings WHERE key = 'auto_billing_last_run_at'`).get();

  const logs = db.prepare(`
    SELECT * FROM auto_billing_logs 
    ORDER BY id DESC 
    LIMIT 10
  `).all();

  return {
    enabled: true,
    rule: 'প্রতি মাসের ১ তারিখে সকল সক্রিয় (Active) গ্রাহকের মাসিক প্যাকেজ অনুযায়ী স্বয়ংক্রিয়ভাবে বিল তৈরি হবে।',
    currentDateBD: bdDate.toISOString().split('T')[0],
    currentMonth,
    dayOfMonth: bdDate.getDate(),
    isFirstDayOfMonth: bdDate.getDate() === 1,
    nextRunDate,
    lastRunMonth: lastRunMonthSetting ? lastRunMonthSetting.value : null,
    lastRunAt: lastRunAtSetting ? lastRunAtSetting.value : null,
    recentLogs: logs
  };
}

/**
 * Start the background scheduler
 */
let schedulerInterval = null;

function startAutoBillingScheduler() {
  if (schedulerInterval) return;

  console.log('-------------------------------------------------------');
  console.log('[AutoBilling Scheduler] Initialized.');
  console.log(`[AutoBilling Scheduler] Rule: Active customers get auto-billed on the 1st of every month.`);
  console.log(`[AutoBilling Scheduler] Next 1st of month: ${getNextFirstOfMonthString()}`);
  console.log('-------------------------------------------------------');

  // 1. Run immediate check on startup
  try {
    checkAndRunScheduledAutoBilling();
  } catch (err) {
    console.error('[AutoBilling Scheduler] Startup check error:', err);
  }

  // 2. Check every 5 minutes (300,000 ms) so that when midnight strikes on the 1st, bills generate promptly
  schedulerInterval = setInterval(() => {
    try {
      checkAndRunScheduledAutoBilling();
    } catch (err) {
      console.error('[AutoBilling Scheduler] Interval check error:', err);
    }
  }, 5 * 60 * 1000);
}

module.exports = {
  getBangladeshDate,
  getBangladeshYearMonth,
  getNextFirstOfMonthString,
  generateBillsForCompany,
  runAutoBillingForAllCompanies,
  checkAndRunScheduledAutoBilling,
  getAutoBillingStatus,
  startAutoBillingScheduler
};
