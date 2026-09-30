const db = require('./database');

function clearDummyData() {
  console.log('--- Clearing Dummy Data from Database ---');
  
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM bills').run();
    db.prepare('DELETE FROM customers').run();
    db.prepare('DELETE FROM collector_areas').run();
    db.prepare('DELETE FROM areas').run();
    db.prepare('DELETE FROM packages').run();
    db.prepare("DELETE FROM users WHERE role != 'super_admin'").run();
    db.prepare('DELETE FROM companies').run();
  });

  tx();

  const superAdmin = db.prepare("SELECT id, name, email FROM users WHERE role = 'super_admin' LIMIT 1").get();
  console.log('✓ All dummy companies, customers, bills, payments, collectors, and areas have been removed.');
  console.log('✓ Super Admin account preserved:', superAdmin.email);
  console.log('--- Database is 100% clean and ready for real data ---');
}

clearDummyData();
