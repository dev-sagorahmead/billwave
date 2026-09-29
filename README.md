# DishBilling Cloud — Mobile-First Dish / Cable TV Billing & Collection Management System

A production-ready, multi-company SaaS platform designed for Cable & Dish TV Network operators. Built with strict multi-tenant data isolation, mobile-first responsiveness for Android devices, 58mm/80mm thermal receipt printing, automated monthly billing with duplicate prevention, partial payment calculations, and 12 operational and revenue reports.

---

## 🌟 Key Architecture & Highlights

- **Multi-Tenant SaaS Isolation**: Super Admin oversees multiple independent companies. Company data (subscribers, collectors, areas, bills, packages, dues, payments) is strictly isolated at both backend middleware and database query levels.
- **Strict Collector Area Restriction**: Bill Collectors are strictly confined to their assigned area(s) (e.g. Kamal Hossain in Mirpur cannot view or collect from Mohammadpur/Dhanmondi).
- **Mobile-First Android UI**: Optimized touch targets (minimum 48-52px), sticky top headers, bottom navigation bar with active indicators, fast drawers, and high-density subscriber cards.
- **Partial Payment & Digital Receipts**:
  - Live calculation: `Previous Due - Paid Amount = Remaining Due`.
  - Overpayment protection safeguard.
  - Immutable audit transaction records (`TXN-...` and `REC-...`).
  - Digital Receipt modal with 58mm/80mm POS thermal printer styling, PDF download via jsPDF, and instant WhatsApp/native sharing.
- **Automated Monthly Billing (Cycle YYYY-MM)**:
  - Automatically adds package tariff to active paid subscribers' current dues.
  - Strict duplicate billing prevention: skips already billed subscribers.
  - Closed / Suspended line protection: existing balances remain frozen and payable; no new monthly bills are added while closed.
  - Free customer protection: complimentary lines (0 BDT) never receive automated monthly bills; old balances remain payable.
- **Bulk Excel/CSV Import**:
  - Drag & drop `.xlsx` / `.csv` upload.
  - Interactive validation table with checks for missing fields, phone format, duplicate IDs, non-existent areas, and invalid packages.
- **12 Comprehensive Reports**:
  1. Daily Collection Report
  2. Monthly Collection Report
  3. Collector-wise Report
  4. Area-wise Report
  5. Customer Due Report
  6. Paid Customer Report
  7. Partial Payment Report
  8. Closed Customer Report
  9. Free Customer Report
  10. Monthly Billing Report
  11. Outstanding Due Report
  12. Payment Method Report (Cash, bKash, Nagad, Bank)
  - Exports to Excel (`.xlsx`) and PDF (`jspdf-autotable`).

---

## 🚀 Quick Start

### 1. Start Server & App (Serves Full Frontend & Backend on Port 5000)
```bash
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser or Android mobile device.

### 2. Run Automated Verification Test Suite
```bash
npm test
```
Runs the end-to-end test suite checking all 24 requirements, tenant isolation, collector territory confinement, partial payments, auto-billing, and report exports.

### 3. Development Mode (Optional)
```bash
# Run server
npm run dev:server

# In separate terminal, run Vite dev server with HMR on port 3000
npm run dev:client
```

---

## 🔑 Pre-Seeded Demo Accounts (One-Click Switchable on Login Screen)

| Role | Name / Company | Email / Identifier | Password | Notes |
|---|---|---|---|---|
| **Super Admin** | System Super Admin | `superadmin@dish.com` | `admin123` | Full SaaS control, manages all companies |
| **Company Admin** | Dhaka Sky Cable Network | `admin@dhakasky.com` | `admin123` | Admin for Dhaka Sky (Mirpur, Uttara, Dhanmondi) |
| **Company Admin** | Chittagong Digital Cable | `admin@ctgdigital.com` | `admin123` | Admin for Chittagong (tests tenant isolation) |
| **Bill Collector** | Kamal Hossain | `kamal@dhakasky.com` | `pass123` | Assigned to **Mirpur Area ONLY** |
| **Bill Collector** | Tariqul Anam | `tariq@dhakasky.com` | `pass123` | Assigned to **Mohammadpur & Dhanmondi** |
| **Customer** | Abdur Rahim | `DSN-000001` or `dsn-000001@customer.dish` | `123456` | Customer self-service portal |

*Tip: The Login screen includes one-click demo badges to immediately log in as any role without typing.*

---

## 📱 User Roles & Capabilities

### 1. Super Admin
- **Global Dashboard**: Total Companies, Active Companies, Total Customers across platform, Active vs Closed counts, Total Outstanding balance, Today's & This Month's collections.
- **Company Management**: Register new company (Company Name, Owner, Phone, Email, Address, Custom Customer Prefix like `DSN`, Admin Email, Admin Password).
- **Actions**: Activate/Deactivate company, Reset company admin password, View per-company subscriber metrics, Delete company.

### 2. Company Admin
- **Dashboard**: Real-time metrics (Active, Free, Closed counts, Total Due, Today/Month Collections), 6-month comparative chart (Billed vs Collected), Collector performance list, Live recent payments.
- **Area Management**: Create/Edit/Delete areas (Mirpur, Mohammadpur, Uttara, Farmgate, Dhanmondi), assign collectors to areas.
- **Collector Management**: Create collectors, assign areas, view individual performance & collection history, reset collector passwords.
- **Customer Management**: Add/Edit/Delete, change package, change area, change status (Active, Free, Closed).
- **Customer Profile**: Previous due, current due, package rate, total lifetime paid, last payment date, call button, complete payment & billing history.
- **Due Management**: Categories (All Due, 1 Month, 2 Months, 3+ Months, Partial Due, High Due >500 BDT) with sorting and quick collection.
- **Automated Monthly Billing**: Select month (`YYYY-MM`), inspect eligible subscribers, duplicate prevention check, generate bills with 1-click.
- **Bulk Import**: Excel/CSV upload with validation preview for missing fields, phone format, duplicates, area/package existence.
- **12 Reports**: Filter, search, and export to Excel and PDF.
- **Company Settings**: Customer ID prefix, support phone on receipts, office address, logo.

### 3. Bill Collector (Mobile-First)
- **Assigned Territory Restriction**: Only sees customers in assigned areas (e.g. Mirpur).
- **Collector Dashboard**: Today's collection, This month's collection, Total assigned customers, Total area due, Today's payments count.
- **Quick Collect**: Instant touch partial payment calculator (`Previous Due - Paid Amount = Remaining Due`), payment method selector (Cash, bKash, Nagad, Bank), overpayment protection.
- **Thermal Receipt**: 58mm/80mm POS receipt layout, print dialog, PDF download, and WhatsApp/Share link.

### 4. Customer
- **Customer Portal**: View balance, monthly package, payment records, digital receipts, and one-tap call office button.
