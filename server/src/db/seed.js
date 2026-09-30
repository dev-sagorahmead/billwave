const db = require('./database');
const bcrypt = require('bcryptjs');

function seed() {
  console.log('--- Starting Database Seeding ---');

  // Check if superadmin already exists
  const existingSuper = db.prepare(`SELECT * FROM users WHERE role = 'super_admin' LIMIT 1`).get();
  if (existingSuper) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('sagor5902', salt);
  const collectorHash = bcrypt.hashSync('pass123', salt);
  const customerHash = bcrypt.hashSync('123456', salt);

  // 1. Super Admin
  db.prepare(`
    INSERT INTO users (name, email, phone, password_hash, role, status, joining_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('Sagor (Super Admin)', 'sagor@superadmin', '01700000000', adminHash, 'super_admin', 'Active', '2025-01-01');

  // 2. Company 1: Dhaka Sky Cable Network
  const comp1Result = db.prepare(`
    INSERT INTO companies (name, owner_name, phone, email, address, logo, status, registration_date, customer_prefix, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Dhaka Sky Cable Network',
    'Rafiqul Islam',
    '01811223344',
    'support@dhakasky.com',
    'House 42, Road 11, Sector 4, Uttara, Dhaka',
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
    'Active',
    '2025-01-15',
    'DSN',
    'Leading digital cable provider in Uttara & Mirpur zone'
  );
  const comp1Id = comp1Result.lastInsertRowid;

  // Company 1 Admin
  db.prepare(`
    INSERT INTO users (company_id, name, email, phone, password_hash, role, status, joining_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(comp1Id, 'Rafiqul Islam (Admin)', 'admin@dhakasky.com', '01811223344', adminHash, 'company_admin', 'Active', '2025-01-15');

  // 3. Company 2: Chittagong Digital Cable
  const comp2Result = db.prepare(`
    INSERT INTO companies (name, owner_name, phone, email, address, logo, status, registration_date, customer_prefix, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Chittagong Digital Cable',
    'Mohiuddin Ahmed',
    '01922334455',
    'contact@ctgdigital.com',
    'CDA Avenue, GEC Circle, Chittagong',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
    'Active',
    '2025-02-01',
    'CDC',
    'Premier Dish Network in Port City'
  );
  const comp2Id = comp2Result.lastInsertRowid;

  // Company 2 Admin
  db.prepare(`
    INSERT INTO users (company_id, name, email, phone, password_hash, role, status, joining_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(comp2Id, 'Mohiuddin Ahmed (Admin)', 'admin@ctgdigital.com', '01922334455', adminHash, 'company_admin', 'Active', '2025-02-01');

  // Company 1 Areas
  const areasC1 = [
    { name: 'Mirpur', code: 'MIR', desc: 'Mirpur Sections 1 to 14' },
    { name: 'Mohammadpur', code: 'MOH', desc: 'Mohammadpur, Ring Road, Iqbal Road' },
    { name: 'Uttara', code: 'UTT', desc: 'Uttara Sectors 1 through 14' },
    { name: 'Farmgate', code: 'FAR', desc: 'Tejgaon & Farmgate commercial & residential' },
    { name: 'Dhanmondi', code: 'DHA', desc: 'Dhanmondi Residential Area' }
  ];

  const areaMapC1 = {};
  for (const a of areasC1) {
    const res = db.prepare(`
      INSERT INTO areas (company_id, name, code, description, status)
      VALUES (?, ?, ?, ?, 'Active')
    `).run(comp1Id, a.name, a.code, a.desc);
    areaMapC1[a.name] = res.lastInsertRowid;
  }

  // Company 2 Areas
  const areasC2 = [
    { name: 'Agrabad', code: 'AGR', desc: 'Commercial area Agrabad' },
    { name: 'GEC Circle', code: 'GEC', desc: 'Central Chittagong' }
  ];
  const areaMapC2 = {};
  for (const a of areasC2) {
    const res = db.prepare(`
      INSERT INTO areas (company_id, name, code, description, status)
      VALUES (?, ?, ?, ?, 'Active')
    `).run(comp2Id, a.name, a.code, a.desc);
    areaMapC2[a.name] = res.lastInsertRowid;
  }

  // Company 1 Packages
  const packagesC1 = [
    { name: 'Regular', price: 150, desc: '60+ Standard SD/HD channels' },
    { name: 'Premium', price: 250, desc: '120+ All HD & Sports Channels' },
    { name: 'Basic', price: 100, desc: '40+ Essential channels' },
    { name: 'Free', price: 0, desc: 'Complimentary/Internal lines' }
  ];
  const pkgMapC1 = {};
  for (const p of packagesC1) {
    const res = db.prepare(`
      INSERT INTO packages (company_id, name, price, description, status)
      VALUES (?, ?, ?, ?, 'Active')
    `).run(comp1Id, p.name, p.price, p.desc);
    pkgMapC1[p.name] = res.lastInsertRowid;
  }

  // Company 2 Packages
  const pkgMapC2 = {};
  const resPkgC2 = db.prepare(`
    INSERT INTO packages (company_id, name, price, description, status)
    VALUES (?, 'Standard Digital', 200, 'Standard Digital Bundle', 'Active')
  `).run(comp2Id);
  pkgMapC2['Standard'] = resPkgC2.lastInsertRowid;

  // Company 1 Collectors
  // Collector 1: Kamal Hossain (assigned to Mirpur)
  const col1Res = db.prepare(`
    INSERT INTO users (company_id, name, email, phone, password_hash, role, status, joining_date)
    VALUES (?, ?, ?, ?, ?, 'collector', 'Active', '2025-02-01')
  `).run(comp1Id, 'Kamal Hossain (Collector)', 'kamal@dhakasky.com', '01711223344', collectorHash);
  const col1Id = col1Res.lastInsertRowid;
  db.prepare(`INSERT INTO collector_areas (collector_id, area_id) VALUES (?, ?)`).run(col1Id, areaMapC1['Mirpur']);

  // Collector 2: Tariqul Anam (assigned to Mohammadpur and Dhanmondi)
  const col2Res = db.prepare(`
    INSERT INTO users (company_id, name, email, phone, password_hash, role, status, joining_date)
    VALUES (?, ?, ?, ?, ?, 'collector', 'Active', '2025-02-10')
  `).run(comp1Id, 'Tariqul Anam (Collector)', 'tariq@dhakasky.com', '01722334455', collectorHash);
  const col2Id = col2Res.lastInsertRowid;
  db.prepare(`INSERT INTO collector_areas (collector_id, area_id) VALUES (?, ?)`).run(col2Id, areaMapC1['Mohammadpur']);
  db.prepare(`INSERT INTO collector_areas (collector_id, area_id) VALUES (?, ?)`).run(col2Id, areaMapC1['Dhanmondi']);

  // Company 2 Collector
  const colC2Res = db.prepare(`
    INSERT INTO users (company_id, name, email, phone, password_hash, role, status, joining_date)
    VALUES (?, ?, ?, ?, ?, 'collector', 'Active', '2025-02-15')
  `).run(comp2Id, 'Zakir Hussain (Collector)', 'zakir@ctgdigital.com', '01733445566', collectorHash);
  db.prepare(`INSERT INTO collector_areas (collector_id, area_id) VALUES (?, ?)`).run(colC2Res.lastInsertRowid, areaMapC2['Agrabad']);

  // Company 1 Sample Customers
  const sampleCustomers = [
    {
      cid: 'DSN-000001',
      name: 'Abdur Rahim',
      father: 'Abdul Karim',
      phone: '01710111222',
      alt_phone: '01810111222',
      address: 'House 14, Road 3, Block B, Mirpur-1',
      road_house: 'Flat 4B, 3rd Floor',
      area_id: areaMapC1['Mirpur'],
      pkg_id: pkgMapC1['Regular'],
      bill: 150,
      conn_date: '2025-01-20',
      status: 'Active',
      prev_due: 300,
      current_due: 450,
      notes: 'Long-time customer, pays middle of month'
    },
    {
      cid: 'DSN-000002',
      name: 'Salma Khatun',
      father: 'Nazrul Islam',
      phone: '01710333444',
      alt_phone: '',
      address: 'House 8, Road 5, Mirpur-2',
      road_house: 'Building 2, Ground Floor',
      area_id: areaMapC1['Mirpur'],
      pkg_id: pkgMapC1['Premium'],
      bill: 250,
      conn_date: '2025-02-01',
      status: 'Active',
      prev_due: 0,
      current_due: 250,
      notes: 'Prefer bKash payment'
    },
    {
      cid: 'DSN-000003',
      name: 'Nasir Uddin',
      father: 'Motiur Rahman',
      phone: '01710555666',
      alt_phone: '',
      address: 'House 120, Noorjahan Road, Mohammadpur',
      road_house: 'Apartment 3A',
      area_id: areaMapC1['Mohammadpur'],
      pkg_id: pkgMapC1['Regular'],
      bill: 150,
      conn_date: '2025-01-10',
      status: 'Active',
      prev_due: 150,
      current_due: 300,
      notes: ''
    },
    {
      cid: 'DSN-000004',
      name: 'Mehedi Hasan',
      father: 'Golam Kibria',
      phone: '01710777888',
      alt_phone: '',
      address: 'House 4, Road 8/A, Dhanmondi',
      road_house: 'Flat 5C',
      area_id: areaMapC1['Dhanmondi'],
      pkg_id: pkgMapC1['Premium'],
      bill: 250,
      conn_date: '2025-02-15',
      status: 'Active',
      prev_due: 0,
      current_due: 0,
      notes: 'Fully paid up'
    },
    {
      cid: 'DSN-000005',
      name: 'Community Mosque Line',
      father: '',
      phone: '01710999000',
      alt_phone: '',
      address: 'Mirpur-10 Main Mosque',
      road_house: 'Office Room',
      area_id: areaMapC1['Mirpur'],
      pkg_id: pkgMapC1['Free'],
      bill: 0,
      conn_date: '2025-01-01',
      status: 'Free',
      prev_due: 0,
      current_due: 0,
      notes: 'Religious institution - Free line'
    },
    {
      cid: 'DSN-000006',
      name: 'Faruk Hossain (Old Balance Free)',
      father: 'Anwar Hossain',
      phone: '01710123456',
      alt_phone: '',
      address: 'Block C, Road 2, Mirpur-11',
      road_house: 'Shop 3',
      area_id: areaMapC1['Mirpur'],
      pkg_id: pkgMapC1['Free'],
      bill: 0,
      conn_date: '2025-01-12',
      status: 'Free',
      prev_due: 300,
      current_due: 300,
      notes: 'Converted to free line but has 300 BDT previous due'
    },
    {
      cid: 'DSN-000007',
      name: 'Kabir Chowdhury (Closed Customer)',
      father: 'Aziz Chowdhury',
      phone: '01710987654',
      alt_phone: '',
      address: 'House 55, Road 9, Mohammadpur',
      road_house: 'Flat 1A',
      area_id: areaMapC1['Mohammadpur'],
      pkg_id: pkgMapC1['Regular'],
      bill: 150,
      conn_date: '2025-01-05',
      status: 'Closed',
      prev_due: 450,
      current_due: 450,
      notes: 'Suspended connection for non-payment, 450 BDT remains due'
    },
    {
      cid: 'DSN-000008',
      name: 'Tanvir Ahmed',
      father: 'Mustafizur Rahman',
      phone: '01710444555',
      alt_phone: '',
      address: 'House 19, Sector 7, Uttara',
      road_house: '2nd Floor',
      area_id: areaMapC1['Uttara'],
      pkg_id: pkgMapC1['Regular'],
      bill: 150,
      conn_date: '2025-02-20',
      status: 'Active',
      prev_due: 600,
      current_due: 750,
      notes: 'High due customer (4+ months)'
    }
  ];

  const custMapC1 = {};
  for (const c of sampleCustomers) {
    const res = db.prepare(`
      INSERT INTO customers (
        company_id, customer_id, name, father_husband_name, phone, alternative_phone,
        address, road_house_info, area_id, package_id, monthly_bill, connection_date,
        status, previous_due, current_due, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      comp1Id, c.cid, c.name, c.father, c.phone, c.alt_phone,
      c.address, c.road_house, c.area_id, c.pkg_id, c.bill, c.conn_date,
      c.status, c.prev_due, c.current_due, c.notes
    );
    custMapC1[c.cid] = res.lastInsertRowid;

    // Create customer portal login user
    db.prepare(`
      INSERT INTO users (company_id, name, email, phone, password_hash, role, status, customer_id_ref)
      VALUES (?, ?, ?, ?, ?, 'customer', 'Active', ?)
    `).run(comp1Id, c.name, `${c.cid.toLowerCase()}@customer.dish`, c.phone, customerHash, res.lastInsertRowid);
  }

  // Company 2 Customer
  db.prepare(`
    INSERT INTO customers (
      company_id, customer_id, name, phone, address, area_id, package_id, monthly_bill,
      connection_date, status, previous_due, current_due, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    comp2Id, 'CDC-000001', 'Jahangir Alam', '01799887766', 'Agrabad Commercial Area',
    areaMapC2['Agrabad'], pkgMapC2['Standard'], 200, '2025-02-15', 'Active', 0, 200, 'Ctg customer'
  );

  // Billing records for DSN-000001
  const c1Id = custMapC1['DSN-000001'];
  db.prepare(`
    INSERT INTO bills (company_id, customer_id, billing_month, package_name, amount, previous_due, total_due, status)
    VALUES (?, ?, '2026-07', 'Regular', 150, 0, 150, 'Paid')
  `).run(comp1Id, c1Id);
  db.prepare(`
    INSERT INTO bills (company_id, customer_id, billing_month, package_name, amount, previous_due, total_due, status)
    VALUES (?, ?, '2026-08', 'Regular', 150, 150, 300, 'Partially Paid')
  `).run(comp1Id, c1Id);
  db.prepare(`
    INSERT INTO bills (company_id, customer_id, billing_month, package_name, amount, previous_due, total_due, status)
    VALUES (?, ?, '2026-09', 'Regular', 150, 300, 450, 'Generated')
  `).run(comp1Id, c1Id);

  // Sample Payments for DSN-000001 collected by Kamal Hossain
  db.prepare(`
    INSERT INTO payments (
      company_id, customer_id, collector_id, transaction_id, receipt_number,
      previous_due, paid_amount, remaining_due, payment_date, payment_time, payment_method, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    comp1Id, c1Id, col1Id, 'TXN-20260715-001', 'REC-202607-001',
    150, 150, 0, '2026-07-15', '11:30:00', 'Cash', 'Full payment July'
  );

  // Sample Payment for DSN-000002 collected by Kamal Hossain today
  const todayStr = new Date().toISOString().split('T')[0];
  const c2Id = custMapC1['DSN-000002'];
  db.prepare(`
    INSERT INTO payments (
      company_id, customer_id, collector_id, transaction_id, receipt_number,
      previous_due, paid_amount, remaining_due, payment_date, payment_time, payment_method, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    comp1Id, c2Id, col1Id, 'TXN-TODAY-001', 'REC-TODAY-001',
    250, 250, 0, todayStr, '09:45:00', 'bKash', 'Monthly bill paid'
  );

  // Sample Payment for DSN-000004 collected by Tariqul Anam
  const c4Id = custMapC1['DSN-000004'];
  db.prepare(`
    INSERT INTO payments (
      company_id, customer_id, collector_id, transaction_id, receipt_number,
      previous_due, paid_amount, remaining_due, payment_date, payment_time, payment_method, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    comp1Id, c4Id, col2Id, 'TXN-TODAY-002', 'REC-TODAY-002',
    250, 250, 0, todayStr, '10:15:00', 'Cash', 'Paid in advance for this cycle'
  );

  console.log('--- Database Seeding Completed Successfully ---');
}

seed();
