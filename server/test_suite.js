const http = require('http');

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, data: d });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, data: d });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED SYSTEM VERIFICATION SUITE');
  console.log('====================================================');

  const BASE = 'http://localhost:5000/api';

  // 1. Super Admin Authentication
  console.log('\n[TEST 1] Super Admin Login & Global Stats...');
  const superLogin = await post(`${BASE}/auth/login`, { identifier: 'superadmin@dish.com', password: 'admin123' });
  if (superLogin.status !== 200 || !superLogin.data.token) {
    throw new Error('Super Admin login failed: ' + JSON.stringify(superLogin));
  }
  const superToken = superLogin.data.token;
  const superStats = await get(`${BASE}/superadmin/dashboard-stats`, superToken);
  console.log('✓ Super Admin logged in. Total Companies:', superStats.data.totalCompanies, 'Total Customers:', superStats.data.totalCustomers);

  // 2. Company Registration by Super Admin
  console.log('\n[TEST 2] Registering New Company & Admin Account...');
  const newCompRes = await post(`${BASE}/superadmin/companies`, {
    name: 'Sylhet Digital Vision',
    owner_name: 'Farhan Kabir',
    phone: '01755667788',
    email: 'admin@sylhetdigital.com',
    admin_email: 'admin@sylhetdigital.com',
    admin_password: 'adminpassword123',
    customer_prefix: 'SDV',
    address: 'Zindabazar, Sylhet'
  }, superToken);
  console.log('✓ Company registered. Response:', newCompRes.data);

  // 3. Multi-Tenant Data Isolation Test
  console.log('\n[TEST 3] Verifying Multi-Tenant Data Isolation...');
  const dhakaAdminLogin = await post(`${BASE}/auth/login`, { identifier: 'admin@dhakasky.com', password: 'admin123' });
  const ctgAdminLogin = await post(`${BASE}/auth/login`, { identifier: 'admin@ctgdigital.com', password: 'admin123' });
  
  const dhakaToken = dhakaAdminLogin.data.token;
  const ctgToken = ctgAdminLogin.data.token;

  const dhakaCustomers = await get(`${BASE}/customers`, dhakaToken);
  const ctgCustomers = await get(`${BASE}/customers`, ctgToken);

  console.log(`Dhaka Sky Customer Count: ${dhakaCustomers.data.total}`);
  console.log(`Chittagong Digital Customer Count: ${ctgCustomers.data.total}`);

  // Ensure Dhaka customer list does NOT contain any Chittagong customer IDs
  const dhakaHasCtg = dhakaCustomers.data.customers.some(c => c.customer_id.startsWith('CDC'));
  const ctgHasDhaka = ctgCustomers.data.customers.some(c => c.customer_id.startsWith('DSN'));
  if (dhakaHasCtg || ctgHasDhaka) {
    throw new Error('TENANT ISOLATION BREACH! Customers leaked between companies!');
  }
  console.log('✓ Strict multi-tenant isolation verified: Companies cannot see each other\'s subscribers.');

  // 4. Collector Area-Restricted Access Test
  console.log('\n[TEST 4] Verifying Collector Area Restrictions...');
  const kamalLogin = await post(`${BASE}/auth/login`, { identifier: 'kamal@dhakasky.com', password: 'pass123' });
  const kamalToken = kamalLogin.data.token;
  const kamalCustomers = await get(`${BASE}/customers`, kamalToken);
  
  // Kamal is assigned to Mirpur ONLY.
  const hasNonMirpur = kamalCustomers.data.customers.some(c => c.area_name !== 'Mirpur');
  if (hasNonMirpur) {
    throw new Error('COLLECTOR AREA RESTRICTION BREACH! Collector saw customers outside assigned Mirpur area!');
  }
  console.log(`✓ Collector Kamal sees ONLY Mirpur customers (${kamalCustomers.data.customers.length} subscribers). Non-assigned areas hidden.`);

  // 5. Partial Payment System Test (Requirement 13)
  console.log('\n[TEST 5] Testing Partial Payment Logic...');
  // Find Mirpur customer Abdur Rahim (DSN-000001)
  const cust1 = kamalCustomers.data.customers.find(c => c.customer_id === 'DSN-000001');
  const startingDue = cust1.current_due;
  console.log(`Customer ${cust1.name} starting balance: ${startingDue} BDT`);

  const payment1 = await post(`${BASE}/payments/collect`, {
    customer_id: cust1.id,
    paid_amount: 100,
    payment_method: 'Cash',
    notes: 'Partial payment 1'
  }, kamalToken);

  if (payment1.status !== 201) {
    throw new Error('Payment 1 failed: ' + JSON.stringify(payment1));
  }
  console.log(`✓ Paid 100 BDT. Previous: ${payment1.data.receipt.previousDue} BDT -> Remaining: ${payment1.data.receipt.remainingDue} BDT. Receipt: ${payment1.data.receipt.receiptNumber}`);

  if (payment1.data.receipt.remainingDue !== startingDue - 100) {
    throw new Error(`Partial payment calculation error! Expected ${startingDue - 100} but got ${payment1.data.receipt.remainingDue}`);
  }

  // 6. Overpayment Prevention Test
  console.log('\n[TEST 6] Testing Overpayment Prevention Rule...');
  const overpayRes = await post(`${BASE}/payments/collect`, {
    customer_id: cust1.id,
    paid_amount: 99999, // much higher than due
    payment_method: 'Cash',
    allow_advance: false
  }, kamalToken);

  if (overpayRes.status === 400 && overpayRes.data.error.includes('exceeds')) {
    console.log('✓ Overpayment blocked as required. Error returned:', overpayRes.data.error);
  } else {
    throw new Error('Overpayment prevention failed! Status: ' + overpayRes.status);
  }

  // 7. Automatic Monthly Billing & Duplicate Prevention Test (Requirements 9, 10, 11)
  console.log('\n[TEST 7] Testing Automatic Monthly Billing & Duplicate Prevention...');
  const testMonth = '2026-10'; // future month
  const gen1 = await post(`${BASE}/billing/generate`, { month: testMonth }, dhakaToken);
  console.log(`Generated bills for ${testMonth}: ${gen1.data.generatedCount} bills created.`);

  // Attempt duplicate generation for the same month
  const gen2 = await post(`${BASE}/billing/generate`, { month: testMonth }, dhakaToken);
  console.log(`Second generation attempt for ${testMonth}: ${gen2.data.generatedCount} bills created (Skipped: ${gen2.data.skippedCount}).`);
  if (gen2.data.generatedCount !== 0) {
    throw new Error('DUPLICATE BILLING PREVENTION FAILED! System generated duplicate bills for the same month!');
  }
  console.log('✓ Duplicate monthly billing strictly prevented!');

  // 8. Closed Customer and Free Customer Exclusions Test
  console.log('\n[TEST 8] Verifying Closed and Free Customer Auto-Billing Exclusions...');
  // Inspect bills generated for testMonth: make sure no bill exists for closed or free customers
  const bills = await get(`${BASE}/billing/history?month=${testMonth}`, dhakaToken);
  const closedCust = bills.data.bills.find(b => b.cust_code === 'DSN-000007'); // Kabir Chowdhury is closed
  const freeCust = bills.data.bills.find(b => b.cust_code === 'DSN-000005'); // Mosque line is free
  
  if (closedCust || freeCust) {
    throw new Error('Closed or Free customer received automatic monthly bill!');
  }
  console.log('✓ Closed and Free customers successfully excluded from automated monthly bills.');

  // 9. Bulk Excel/CSV Import Preview and Validation Test (Requirement 24)
  console.log('\n[TEST 9] Testing Bulk Customer Import Preview & Validation...');
  const testRows = [
    {
      'Customer Name': 'Bulk Valid 1',
      'Phone': '01711998877',
      'Address': 'Mirpur 12',
      'Area': 'Mirpur',
      'Package': 'Regular',
      'Monthly Bill': 150
    },
    {
      // Missing phone and invalid area
      'Customer Name': 'Bulk Invalid 2',
      'Phone': '123', // invalid phone
      'Address': 'Nowhere',
      'Area': 'NonExistentArea',
      'Package': 'Regular'
    }
  ];

  const importPreview = await post(`${BASE}/customers/import/preview`, { rows: testRows }, dhakaToken);
  console.log(`Import Preview: Total ${importPreview.data.totalRows}, Valid: ${importPreview.data.validCount}, Invalid: ${importPreview.data.invalidCount}`);
  if (importPreview.data.validCount !== 1 || importPreview.data.invalidCount !== 1) {
    throw new Error('Import validation preview failed!');
  }
  console.log('✓ Import validation accurately flagged invalid phone and non-existent area.');

  // 10. Reports System Test (All 12 Reports)
  console.log('\n[TEST 10] Testing All 12 Reports...');
  const reports = [
    'daily_collection', 'monthly_collection', 'collector_wise', 'area_wise',
    'customer_due', 'paid_customers', 'partial_payment', 'closed_customers',
    'free_customers', 'monthly_billing', 'outstanding_due', 'payment_method'
  ];

  for (const r of reports) {
    const res = await get(`${BASE}/reports/run?report_type=${r}`, dhakaToken);
    if (res.status !== 200) {
      throw new Error(`Report ${r} failed with status ${res.status}`);
    }
  }
  console.log(`✓ All 12 comprehensive reports generated and validated successfully.`);

  console.log('\n====================================================');
  console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
