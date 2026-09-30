import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Search, PlusCircle, Filter, Phone, Eye, 
  Wallet, AlertCircle, CheckCircle2, XCircle, MoreVertical, 
  ArrowUpDown, Trash2, Edit, Check, ChevronRight, X,
  PowerOff, CheckSquare, Square, MinusSquare,
  Download, FileSpreadsheet, FileText, ChevronDown, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PaymentModal from '../../components/PaymentModal';
import ReceiptModal from '../../components/ReceiptModal';
import { useLanguage } from '../../context/LanguageContext';

export default function CustomerList() {
  const { isBn, formatStatus, formatCurrency } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [areaId, setAreaId] = useState(searchParams.get('area_id') || 'all');
  const [packageId, setPackageId] = useState(searchParams.get('package_id') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [dueType, setDueType] = useState(searchParams.get('due_type') || '');
  const [sortBy, setSortBy] = useState('id_desc');

  // Metadata dropdowns
  const [areas, setAreas] = useState([]);
  const [packages, setPackages] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(searchParams.get('action') === 'new');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [collectCust, setCollectCust] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [statusModalCust, setStatusModalCust] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Add customer form
  const [formData, setFormData] = useState({
    name: '',
    father_husband_name: '',
    phone: '',
    alternative_phone: '',
    address: '',
    road_house_info: '',
    area_id: '',
    package_id: '',
    monthly_bill: 150,
    previous_due: 0,
    connection_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    notes: '',
    custom_customer_id: ''
  });

  const loadMetadata = async () => {
    try {
      const [areasData, pkgsData] = await Promise.all([
        api.getAreas(),
        api.getPackages()
      ]);
      setAreas(areasData);
      setPackages(pkgsData);
      if (areasData.length > 0 && !formData.area_id) {
        setFormData(prev => ({ ...prev, area_id: areasData[0].id }));
      }
      if (pkgsData.length > 0 && !formData.package_id) {
        setFormData(prev => ({ ...prev, package_id: pkgsData[0].id, monthly_bill: pkgsData[0].price }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        area_id: areaId,
        package_id: packageId,
        status,
        due_type: dueType,
        sort_by: sortBy,
        page,
        limit: 50
      }).toString();

      const res = await api.getCustomers(query);
      setCustomers(res.customers);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [areaId, packageId, status, dueType, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handlePackageChangeInForm = (pkgId) => {
    const selectedPkg = packages.find(p => p.id === parseInt(pkgId, 10));
    setFormData(prev => ({
      ...prev,
      package_id: pkgId,
      monthly_bill: selectedPkg ? selectedPkg.price : prev.monthly_bill
    }));
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.createCustomer(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        father_husband_name: '',
        phone: '',
        alternative_phone: '',
        address: '',
        road_house_info: '',
        area_id: areas[0]?.id || '',
        package_id: packages[0]?.id || '',
        monthly_bill: packages[0]?.price || 150,
        previous_due: 0,
        connection_date: new Date().toISOString().split('T')[0],
        status: 'Active',
        notes: '',
        custom_customer_id: ''
      });
      fetchCustomers();
    } catch (err) {
      alert('Error creating customer: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.updateCustomer(editingCustomer.id, editingCustomer);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert('Error updating customer: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      setActionLoading(true);
      await api.changeCustomerStatus(statusModalCust.id, newStatus, statusReason);
      setStatusModalCust(null);
      setStatusReason('');
      fetchCustomers();
    } catch (err) {
      alert('Error changing status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (cust) => {
    if (!confirm(`Are you sure you want to delete customer ${cust.name} (${cust.customer_id})?`)) return;
    try {
      await api.deleteCustomer(cust.id);
      setSelectedIds(prev => prev.filter(id => id !== cust.id));
      fetchCustomers();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Multiple selection helpers
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isAllPageSelected = customers.length > 0 && customers.every(c => selectedIds.includes(c.id));

  const handleSelectAll = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(customers.map(c => c.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...customers.map(c => c.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  // Bulk Deactivate (set to Closed)
  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`আপনি কি নিশ্চিত যে নির্বাচিত ${count} জন গ্রাহককে ডিঅ্যাক্টিভ (Closed / বন্ধ লাইন) করতে চান?\n\n(গ্রাহকদের পূর্বের বকেয়া অক্ষুণ্ণ থাকবে)`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.bulkChangeCustomerStatus(selectedIds, 'Closed', 'Bulk Deactivated by Admin');
      alert(res.message || `${count} জন গ্রাহককে ডিঅ্যাক্টিভ করা হয়েছে`);
      setSelectedIds([]);
      fetchCustomers();
    } catch (err) {
      alert('ডিঅ্যাক্টিভ করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Activate (set to Active)
  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`আপনি কি নিশ্চিত যে নির্বাচিত ${count} জন গ্রাহকের লাইন আবার একটিভ (Active) করতে চান?`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.bulkChangeCustomerStatus(selectedIds, 'Active', 'Bulk Activated by Admin');
      alert(res.message || `${count} জন গ্রাহককে একটিভ করা হয়েছে`);
      setSelectedIds([]);
      fetchCustomers();
    } catch (err) {
      alert('একটিভ করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const msg = `⚠️ সতর্কতা: আপনি কি নিশ্চিত যে নির্বাচিত ${count} জন গ্রাহককে স্থায়ীভাবে ডিলিট (Delete) করতে চান?\n\nতাদের সকল বিল ও পেমেন্ট রেকর্ড স্থায়ীভাবে মুছে যাবে। এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়!`;
    if (!window.confirm(msg)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.bulkDeleteCustomers(selectedIds);
      alert(res.message || `${count} জন গ্রাহককে ডিলিট করা হয়েছে`);
      setSelectedIds([]);
      fetchCustomers();
    } catch (err) {
      alert('ডিলিট করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: Retrieve customers for export (selected or all matching current filters)
  const getCustomersForExport = async (targetScope = 'auto') => {
    // If specific customers are selected and scope is 'selected' or 'auto'
    if ((targetScope === 'selected' || targetScope === 'auto') && selectedIds.length > 0) {
      const localSelected = customers.filter(c => selectedIds.includes(c.id));
      if (localSelected.length === selectedIds.length) {
        return localSelected;
      }
      const res = await api.getCustomers(`ids=${selectedIds.join(',')}&limit=5000`);
      return res.customers || [];
    }

    // Otherwise, fetch all matching customers for current filters
    const query = new URLSearchParams({
      search,
      area_id: areaId,
      package_id: packageId,
      status,
      due_type: dueType,
      sort_by: sortBy,
      limit: 10000,
      page: 1
    }).toString();

    const res = await api.getCustomers(query);
    return res.customers || [];
  };

  // 1. Export Excel (.xlsx)
  const exportToExcel = async (targetScope = 'auto') => {
    try {
      setExportLoading(true);
      setShowExportMenu(false);
      const dataToExport = await getCustomersForExport(targetScope);
      if (!dataToExport || dataToExport.length === 0) {
        alert('এক্সপোর্ট করার মতো কোনো গ্রাহক তথ্য পাওয়া যায়নি');
        return;
      }

      const rows = dataToExport.map((c, idx) => ({
        'ক্রমিক নং': idx + 1,
        'গ্রাহক আইডি': c.customer_id || '',
        'গ্রাহকের নাম': c.name || '',
        'পিতা / স্বামীর নাম': c.father_husband_name || '',
        'মোবাইল নম্বর': c.phone || '',
        'বিকল্প মোবাইল': c.alternative_phone || '',
        'এরিয়া': c.area_name || '',
        'ঠিকানা': c.address || '',
        'রোড / বাসা': c.road_house_info || '',
        'প্যাকেজ': c.package_name || '',
        'মাসিক বিল (টাকা)': Number(c.monthly_bill) || 0,
        'বর্তমান বকেয়া (টাকা)': Number(c.current_due) || 0,
        'লাইন স্ট্যাটাস': c.status === 'Active' ? 'Active (একটিভ)' : c.status === 'Closed' ? 'Closed (বন্ধ)' : 'Free (ফ্রি)',
        'সংযোগের তারিখ': c.connection_date || '',
        'নোট': c.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 },  // SL
        { wch: 15 }, // ID
        { wch: 22 }, // Name
        { wch: 20 }, // Father
        { wch: 15 }, // Phone
        { wch: 15 }, // Alt Phone
        { wch: 16 }, // Area
        { wch: 26 }, // Address
        { wch: 16 }, // Road
        { wch: 15 }, // Package
        { wch: 16 }, // Monthly Bill
        { wch: 18 }, // Current Due
        { wch: 16 }, // Status
        { wch: 16 }, // Connection Date
        { wch: 24 }  // Notes
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      const filename = `Customers_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error(err);
      alert('এক্সেল ফাইল এক্সপোর্ট করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // 2. Export PDF (.pdf)
  const exportToPDF = async (targetScope = 'auto') => {
    try {
      setExportLoading(true);
      setShowExportMenu(false);
      const dataToExport = await getCustomersForExport(targetScope);
      if (!dataToExport || dataToExport.length === 0) {
        alert('এক্সপোর্ট করার মতো কোনো গ্রাহক তথ্য পাওয়া যায়নি');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Title & Header info
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('Dish Cable Network - Customer Directory Report', 14, 14);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleString();
      const statusText = status === 'all' ? 'All Statuses' : status;
      doc.text(`Total Customers: ${dataToExport.length} | Status: ${statusText} | Generated: ${dateStr}`, 14, 20);

      const headers = [
        ['SL', 'Customer ID', 'Name', 'Phone', 'Area', 'Address', 'Package', 'Monthly Bill', 'Due (BDT)', 'Status']
      ];

      const rows = dataToExport.map((c, idx) => [
        idx + 1,
        c.customer_id || '',
        c.name || '',
        c.phone || '',
        c.area_name || '-',
        (c.address || '').slice(0, 32),
        c.package_name || 'Standard',
        `${c.monthly_bill || 0}`,
        `${c.current_due || 0}`,
        c.status || 'Active'
      ]);

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 24,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.2 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 24, fontStyle: 'bold' },
          2: { cellWidth: 36 },
          3: { cellWidth: 26 },
          4: { cellWidth: 26 },
          5: { cellWidth: 55 },
          6: { cellWidth: 24 },
          7: { cellWidth: 22, halign: 'right' },
          8: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 20, halign: 'center' }
        }
      });

      const filename = `Customers_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error(err);
      alert('পিডিএফ ফাইল এক্সপোর্ট করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // 3. Export Word (.doc)
  const exportToWord = async (targetScope = 'auto') => {
    try {
      setExportLoading(true);
      setShowExportMenu(false);
      const dataToExport = await getCustomersForExport(targetScope);
      if (!dataToExport || dataToExport.length === 0) {
        alert('এক্সপোর্ট করার মতো কোনো গ্রাহক তথ্য পাওয়া যায়নি');
        return;
      }

      const totalMonthlyBill = dataToExport.reduce((acc, c) => acc + (Number(c.monthly_bill) || 0), 0);
      const totalDue = dataToExport.reduce((acc, c) => acc + (Number(c.current_due) || 0), 0);

      const html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>গ্রাহক তালিকা (Customer Directory)</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; margin: 20px; }
    h2 { color: #1e3a8a; margin-bottom: 2px; font-size: 16pt; font-weight: bold; }
    .meta { color: #64748b; font-size: 9.5pt; margin-top: 0; margin-bottom: 14px; }
    .summary-box { background-color: #f1f5f9; padding: 10px 14px; border: 1px solid #cbd5e1; margin-bottom: 16px; border-radius: 6px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 9pt; text-align: left; }
    th { background-color: #1e293b; color: #ffffff; font-weight: bold; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .due-positive { color: #dc2626; font-weight: bold; }
    .due-zero { color: #16a34a; font-weight: bold; }
    .status-active { color: #16a34a; font-weight: bold; }
    .status-closed { color: #dc2626; font-weight: bold; }
    .status-free { color: #2563eb; font-weight: bold; }
  </style>
</head>
<body>
  <h2>Dish Cable Network - গ্রাহক তালিকা (Customer Directory)</h2>
  <p class="meta">
    রিপোর্ট প্রকাশের তারিখ: ${new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })} (${new Date().toLocaleTimeString()})
  </p>
  
  <div class="summary-box">
    <b>মোট গ্রাহক সংখ্যা:</b> ${dataToExport.length} জন &nbsp;|&nbsp;
    <b>মোট মাসিক বিল:</b> ${totalMonthlyBill.toLocaleString()} ৳ &nbsp;|&nbsp;
    <b>মোট বকেয়া:</b> ${totalDue.toLocaleString()} ৳
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">ক্র.</th>
        <th style="width: 85px;">গ্রাহক আইডি</th>
        <th>গ্রাহকের নাম</th>
        <th>মোবাইল নম্বর</th>
        <th>এরিয়া</th>
        <th>ঠিকানা ও বাসা</th>
        <th>প্যাকেজ</th>
        <th style="text-align: right; width: 75px;">মাসিক বিল</th>
        <th style="text-align: right; width: 75px;">বর্তমান বকেয়া</th>
        <th style="text-align: center; width: 65px;">স্ট্যাটাস</th>
      </tr>
    </thead>
    <tbody>
      ${dataToExport.map((c, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><b>${c.customer_id}</b></td>
          <td><b>${c.name}</b>${c.father_husband_name ? '<br><small style="color:#64748b;">(' + c.father_husband_name + ')</small>' : ''}</td>
          <td>${c.phone}${c.alternative_phone ? '<br><small>' + c.alternative_phone + '</small>' : ''}</td>
          <td>${c.area_name || '-'}</td>
          <td>${c.address || ''}${c.road_house_info ? '<br><small style="color:#64748b;">বাসা/রোড: ' + c.road_house_info + '</small>' : ''}</td>
          <td>${c.package_name || 'Standard'}</td>
          <td style="text-align: right;">${c.monthly_bill || 0} ৳</td>
          <td style="text-align: right;" class="${Number(c.current_due) > 0 ? 'due-positive' : 'due-zero'}">${c.current_due || 0} ৳</td>
          <td style="text-align: center;" class="${c.status === 'Active' ? 'status-active' : c.status === 'Closed' ? 'status-closed' : 'status-free'}">
            ${c.status === 'Active' ? 'Active' : c.status === 'Closed' ? 'Closed' : 'Free'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
`;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Customers_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('ওয়ার্ড ফাইল এক্সপোর্ট করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            {isBn ? 'গ্রাহক ডিরেক্টরি ও ব্যবস্থাপনা' : 'Customer Directory & Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn ? `মোট ${total} জন নিবন্ধিত গ্রাহক পাওয়া গেছে` : `Total ${total} subscribers found across your network`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              disabled={exportLoading}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isBn ? 'গ্রাহক তালিকা এক্সপোর্ট করুন (Excel, PDF, Word)' : 'Export Customer Directory (Excel, PDF, Word)'}
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-blue-600" />
              )}
              <span>{isBn ? 'এক্সপোর্ট' : 'Export'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in space-y-1">
                  {selectedIds.length > 0 ? (
                    <div className="px-3 py-1.5 mb-1 bg-blue-50 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center justify-between">
                      <span>{isBn ? `সিলেক্টেড: ${selectedIds.length} জন` : `Selected: ${selectedIds.length}`}</span>
                      <span className="text-[10px] bg-blue-200 px-1.5 py-0.5 rounded font-black">{isBn ? 'নির্বাচিত' : 'Selected'}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 mb-1 bg-slate-50 text-slate-600 text-[11px] font-semibold rounded-lg border border-slate-200 flex items-center justify-between">
                      <span>{isBn ? `ফিল্টারকৃত: ${total} জন` : `Filtered: ${total}`}</span>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">{isBn ? 'মোট' : 'Total'}</span>
                    </div>
                  )}

                  <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider">
                    {isBn ? 'ফরম্যাট নির্বাচন করুন' : 'Select Format'}
                  </div>

                  {/* Excel (.xlsx) */}
                  <button
                    type="button"
                    onClick={() => exportToExcel()}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-200 transition-colors">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700">Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-400">{isBn ? 'এক্সেল স্প্রেডশীট ফাইল' : 'Excel Spreadsheet'}</div>
                    </div>
                  </button>

                  {/* PDF (.pdf) */}
                  <button
                    type="button"
                    onClick={() => exportToPDF()}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg group-hover:bg-rose-200 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-rose-700">PDF Document (.pdf)</div>
                      <div className="text-[10px] text-slate-400">{isBn ? 'প্রিন্টযোগ্য পিডিএফ রিপোর্ট' : 'Printable PDF Document'}</div>
                    </div>
                  </button>

                  {/* Word (.doc) */}
                  <button
                    type="button"
                    onClick={() => exportToWord()}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2.5 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-blue-700">Word Document (.doc)</div>
                      <div className="text-[10px] text-slate-400">{isBn ? 'মাইক্রোসফট ওয়ার্ড ফাইল' : 'Microsoft Word Document'}</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isBn ? 'নতুন গ্রাহক যোগ' : 'Add New Customer'}</span>
          </button>
        </div>
      </div>

      {/* Global Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        
        {/* Global Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? 'গ্রাহক আইডি (যেমন DSN-000001), নাম, ফোন নম্বর, এলাকা দিয়ে খুঁজুন...' : 'Search by Customer ID (DSN-000001), Name, Phone, Area, Address...'}
            className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            {isBn ? 'খুঁজুন' : 'Search'}
          </button>
        </form>

        {/* Filter Pills / Dropdowns */}
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          
          {/* Area Filter */}
          <select
            value={areaId}
            onChange={(e) => { setAreaId(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
          >
            <option value="all">{isBn ? 'সকল এলাকা' : 'All Areas'}</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Package Filter */}
          <select
            value={packageId}
            onChange={(e) => { setPackageId(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
          >
            <option value="all">{isBn ? 'সকল প্যাকেজ' : 'All Packages'}</option>
            {packages.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">{isBn ? 'সকল লাইন (All Statuses)' : 'All Statuses'}</option>
            <option value="Active">{isBn ? '🟢 একটিভ লাইন (Active)' : '🟢 Active Lines'}</option>
            <option value="Closed">{isBn ? '🔴 বন্ধ লাইন (Closed)' : '🔴 Closed / Suspended Lines'}</option>
            <option value="Free">{isBn ? '🔵 ফ্রি লাইন (Free Lines)' : '🔵 Free Lines'}</option>
          </select>

          {/* Due filter */}
          <select
            value={dueType}
            onChange={(e) => { setDueType(e.target.value); setPage(1); }}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            <option value="">{isBn ? 'সকল বকেয়া ক্যাটাগরি' : 'All Due Categories'}</option>
            <option value="has_due">{isBn ? 'বকেয়া আছে এমন' : 'Has Outstanding Due'}</option>
            <option value="zero_due">{isBn ? 'পরিশোধিত (০ বকেয়া)' : 'Fully Paid (0 Due)'}</option>
            <option value="1_month">{isBn ? '১ মাসের বকেয়া' : '1 Month Due'}</option>
            <option value="2_months">{isBn ? '২ মাসের বকেয়া' : '2 Months Due'}</option>
            <option value="3_plus_months">{isBn ? '৩+ মাসের বকেয়া' : '3+ Months Due'}</option>
            <option value="partial_due">{isBn ? 'আংশিক বকেয়া' : 'Partial Due'}</option>
            <option value="high_due">{isBn ? 'বেশি বকেয়া (> ৫০০ টাকা)' : 'High Due (> 500 BDT)'}</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 ml-auto cursor-pointer"
          >
            <option value="id_desc">{isBn ? 'নতুন গ্রাহক আগে' : 'Newest First'}</option>
            <option value="highest_due">{isBn ? 'সর্বোচ্চ বকেয়া আগে' : 'Highest Due First'}</option>
            <option value="lowest_due">{isBn ? 'সর্বনিম্ন বকেয়া আগে' : 'Lowest Due First'}</option>
            <option value="name_asc">{isBn ? 'নাম অনুসারে (A-Z)' : 'Name (A-Z)'}</option>
            <option value="id_asc">{isBn ? 'গ্রাহক আইডি অনুসারে' : 'Customer ID (Ascending)'}</option>
            <option value="area_asc">{isBn ? 'এলাকা অনুসারে' : 'Area Wise'}</option>
            <option value="latest_payment">{isBn ? 'সাম্প্রতিক পেমেন্ট আগে' : 'Recent Payment Date'}</option>
          </select>

        </div>

      </div>

      {/* Bulk Action Header Banner (When 1 or more customers are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl font-bold shadow-xs">
              <CheckSquare className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                {isBn ? `${selectedIds.length} জন গ্রাহক নির্বাচন করা হয়েছে` : `${selectedIds.length} customer(s) selected`}
              </span>
              <p className="text-[11px] text-slate-500">
                {isBn 
                  ? 'একসাথে স্ট্যাটাস পরিবর্তন (Active/Deactive) অথবা ডিলেট করতে নিচের বাটনগুলো ব্যবহার করুন।'
                  : 'Use the buttons below to change status (Active/Deactive) or delete selected subscribers.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Export Buttons for Selected Customers */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-200">
              <span className="text-[10px] text-slate-500 px-1 font-bold">{isBn ? 'এক্সপোর্ট:' : 'Export:'}</span>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => exportToExcel('selected')}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title={isBn ? 'সিলেক্ট করা গ্রাহকদের Excel ফাইলে এক্সপোর্ট করুন' : 'Export selected to Excel'}
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>XL</span>
              </button>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => exportToPDF('selected')}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title={isBn ? 'সিলেক্ট করা গ্রাহকদের PDF ফাইলে এক্সপোর্ট করুন' : 'Export selected to PDF'}
              >
                <FileText className="w-3 h-3" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => exportToWord('selected')}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title={isBn ? 'সিলেক্ট করা গ্রাহকদের Word ফাইলে এক্সপোর্ট করুন' : 'Export selected to Word'}
              >
                <FileText className="w-3 h-3" />
                <span>Word</span>
              </button>
            </div>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleBulkDeactivate}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isBn ? 'নির্বাচিত গ্রাহকদের বন্ধ লাইনে স্থানান্তর করুন' : 'Deactivate selected customers'}
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>{isBn ? 'Deactive (বন্ধ)' : 'Deactive'}</span>
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleBulkActivate}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isBn ? 'নির্বাচিত গ্রাহকদের একটিভ লাইনে স্থানান্তর করুন' : 'Activate selected customers'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'Active (একটিভ)' : 'Active'}</span>
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isBn ? 'নির্বাচিত গ্রাহকদের স্থায়ীভাবে মুছে ফেলুন' : 'Delete selected customers'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'ডিলেট' : 'Delete'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              {isBn ? 'আনসিলেক্ট' : 'Deselect'}
            </button>
          </div>
        </div>
      )}

      {/* Customer Mobile Cards & Responsive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Mobile View: High-density touch cards */}
        <div className="block sm:hidden divide-y divide-slate-100">
          
          {/* Mobile Select-All Bar */}
          {customers.length > 0 && (
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={isAllPageSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span>{isBn ? `পেজের সব নির্বাচন (${customers.length})` : `Select all on page (${customers.length})`}</span>
              </label>
              {selectedIds.length > 0 && (
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {isBn ? `${selectedIds.length} জন নির্বাচিত` : `${selectedIds.length} selected`}
                </span>
              )}
            </div>
          )}

          {customers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isBn ? 'ফিল্টারের সাথে মিলে এমন কোনো গ্রাহক পাওয়া যায়নি।' : 'No customers found matching filter.'}
            </div>
          ) : (
            customers.map((cust) => (
              <div 
                key={cust.id} 
                className={`p-4 space-y-3 transition-colors ${
                  selectedIds.includes(cust.id) ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cust.id)}
                      onChange={() => handleToggleSelect(cust.id)}
                      className="w-4 h-4 mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{cust.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {cust.customer_id}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {cust.phone} • {cust.area_name || (isBn ? 'এলাকা নির্ধারিত নেই' : 'No Area')}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {cust.address}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase">{isBn ? 'বকেয়া' : 'Due'}</span>
                    <span className={`text-base font-black font-mono ${cust.current_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(cust.current_due)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatusModalCust(cust)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                        cust.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                        cust.status === 'Free' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}
                      title={isBn ? 'স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন' : 'Click to change status'}
                    >
                      {formatStatus(cust.status)}
                    </button>
                    <span className="text-slate-500 text-[11px]">
                      {cust.package_name || 'Standard'} ({formatCurrency(cust.monthly_bill)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cust.status === 'Closed' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(isBn ? `গ্রাহক "${cust.name}" এর লাইন কি আবার একটিভ করতে চান?` : `Reactivate line for customer "${cust.name}"?`)) {
                            await api.changeCustomerStatus(cust.id, 'Active', 'Reactivated by Admin');
                            fetchCustomers();
                          }
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                      >
                        {isBn ? 'একটিভ করুন' : 'Reactivate'}
                      </button>
                    )}

                    {cust.phone && (
                      <a
                        href={`tel:${cust.phone}`}
                        className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                        title={isBn ? 'কল করুন' : 'Call Customer'}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setCollectCust(cust)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                    >
                      {isBn ? 'আদায়' : 'Collect'}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/customers/${cust.id}`)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                      title={isBn ? 'প্রোফাইল দেখুন' : 'View Profile'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tablet / Desktop View: Full Data Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    title={isBn ? 'বর্তমান পেজের সব গ্রাহক নির্বাচন করুন' : 'Select all on page'}
                  />
                </th>
                <th className="p-3.5">{isBn ? 'গ্রাহক আইডি' : 'Customer ID'}</th>
                <th className="p-3.5">{isBn ? 'গ্রাহকের নাম ও ফোন' : 'Customer Name & Contact'}</th>
                <th className="p-3.5">{isBn ? 'এলাকা ও ঠিকানা' : 'Area & Address'}</th>
                <th className="p-3.5">{isBn ? 'প্যাকেজ' : 'Package'}</th>
                <th className="p-3.5">{isBn ? 'মাসিক বিল' : 'Monthly Bill'}</th>
                <th className="p-3.5">{isBn ? 'বর্তমান বকেয়া' : 'Current Due'}</th>
                <th className="p-3.5">{isBn ? 'সর্বশেষ পেমেন্ট' : 'Last Payment'}</th>
                <th className="p-3.5">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="p-3.5 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400">
                    {isBn ? 'খোঁজার শর্ত অনুযায়ী কোনো গ্রাহক তথ্য পাওয়া যায়নি।' : 'No customers found matching the search criteria.'}
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr 
                    key={cust.id} 
                    className={`transition-colors ${
                      selectedIds.includes(cust.id) 
                        ? 'bg-blue-50/70 font-medium' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cust.id)}
                        onChange={() => handleToggleSelect(cust.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {cust.customer_id}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{cust.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>{cust.phone}</span>
                        {cust.alternative_phone && <span>/ {cust.alternative_phone}</span>}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{cust.area_name || '-'}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{cust.address}</div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {cust.package_name || 'Standard'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {formatCurrency(cust.monthly_bill)}
                    </td>
                    <td className="p-3.5 font-mono font-black">
                      <span className={cust.current_due > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {formatCurrency(cust.current_due)}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-500">
                      {cust.last_payment_date || (isBn ? 'কখনও দেয়নি' : 'Never')}
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => setStatusModalCust(cust)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                          cust.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : cust.status === 'Free'
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title={isBn ? 'ক্লিক করে স্ট্যাটাস পরিবর্তন করুন' : 'Click to change status'}
                      >
                        <span>{formatStatus(cust.status)}</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      {cust.status === 'Closed' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(isBn ? `গ্রাহক "${cust.name}" এর লাইন কি আবার একটিভ করতে চান?` : `Reactivate line for customer "${cust.name}"?`)) {
                              await api.changeCustomerStatus(cust.id, 'Active', 'Reactivated by Admin');
                              fetchCustomers();
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                          title={isBn ? 'লাইন পুনরায় একটিভ করুন' : 'Reactivate Customer'}
                        >
                          {isBn ? 'একটিভ করুন' : 'Reactivate'}
                        </button>
                      )}
                      {cust.phone && (
                        <a
                          href={`tel:${cust.phone}`}
                          className="p-1.5 inline-block text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title={isBn ? 'কল করুন' : 'Call Customer'}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setCollectCust(cust)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                      >
                        {isBn ? 'বিল আদায়' : 'Collect'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/customers/${cust.id}`)}
                        className="p-1.5 inline-block text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title={isBn ? 'প্রোফাইল দেখুন' : 'View Full Profile'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(cust)}
                        className="p-1.5 inline-block text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                        title={isBn ? 'তথ্য এডিট করুন' : 'Edit Details'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cust)}
                        className="p-1.5 inline-block text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title={isBn ? 'গ্রাহক ডিলেট করুন' : 'Delete Customer'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>
              {isBn 
                ? `পৃষ্ঠা ${page} এর ${totalPages} (মোট ${total} জন গ্রাহক)`
                : `Page ${page} of ${totalPages} (${total} customers)`}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-50 cursor-pointer"
              >
                {isBn ? 'পূর্ববর্তী' : 'Previous'}
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded-md disabled:opacity-50 cursor-pointer"
              >
                {isBn ? 'পরবর্তী' : 'Next'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal: Add New Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 my-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>{isBn ? 'নতুন গ্রাহক যোগ করুন' : 'Add New Customer'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'গ্রাহকের নাম *' : 'Customer Name *'}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isBn ? 'যেমন: আব্দুর রহিম' : 'e.g. Abdur Rahim'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'পিতা / স্বামীর নাম' : 'Father / Husband Name'}</label>
                  <input
                    type="text"
                    value={formData.father_husband_name}
                    onChange={(e) => setFormData({ ...formData, father_husband_name: e.target.value })}
                    placeholder={isBn ? 'যেমন: আব্দুল করিম' : 'e.g. Abdul Karim'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'মোবাইল ফোন *' : 'Mobile Phone *'}</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={isBn ? 'যেমন: ০১৭১১২২৩৩৪' : 'e.g. 01711223344'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'বিকল্প মোবাইল নম্বর' : 'Alternative Phone'}</label>
                  <input
                    type="text"
                    value={formData.alternative_phone}
                    onChange={(e) => setFormData({ ...formData, alternative_phone: e.target.value })}
                    placeholder={isBn ? 'যেমন: ০১৮১১২২৩৩৪' : 'e.g. 01811223344'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'নির্ধারিত এলাকা *' : 'Assigned Area *'}</label>
                  <select
                    required
                    value={formData.area_id}
                    onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">{isBn ? 'এলাকা নির্বাচন করুন' : 'Select Area'}</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'প্যাকেজ *' : 'Package *'}</label>
                  <select
                    required
                    value={formData.package_id}
                    onChange={(e) => handlePackageChangeInForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">{isBn ? 'প্যাকেজ নির্বাচন করুন' : 'Select Package'}</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}/{isBn ? 'মাস' : 'mo'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'মাসিক বিল (টাকা)' : 'Monthly Bill (BDT)'}</label>
                  <input
                    type="number"
                    value={formData.monthly_bill}
                    onChange={(e) => setFormData({ ...formData, monthly_bill: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'পূর্বের / প্রারম্ভিক বকেয়া (টাকা)' : 'Previous / Initial Due (BDT)'}</label>
                  <input
                    type="number"
                    value={formData.previous_due}
                    onChange={(e) => setFormData({ ...formData, previous_due: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'সম্পূর্ণ ঠিকানা *' : 'Complete Address *'}</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={isBn ? 'যেমন: বাসা ১৪, রোড ৩, ব্লক বি' : 'e.g. House 14, Road 3, Block B'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'রোড / বাসা / ফ্ল্যাট তথ্য' : 'Road / House / Flat Info'}</label>
                  <input
                    type="text"
                    value={formData.road_house_info}
                    onChange={(e) => setFormData({ ...formData, road_house_info: e.target.value })}
                    placeholder={isBn ? 'যেমন: ফ্ল্যাট ৪বি, ৩য় তলা' : 'e.g. Flat 4B, 3rd Floor'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'সংযোগের তারিখ' : 'Connection Date'}</label>
                  <input
                    type="date"
                    value={formData.connection_date}
                    onChange={(e) => setFormData({ ...formData, connection_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'প্রারম্ভিক স্ট্যাটাস' : 'Initial Status'}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Active">{isBn ? 'সক্রিয় (Active)' : 'Active'}</option>
                    <option value="Free">{isBn ? 'ফ্রি (Free)' : 'Free'}</option>
                    <option value="Closed">{isBn ? 'বন্ধ (Closed)' : 'Closed'}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'কাস্টম গ্রাহক আইডি (ঐচ্ছিক)' : 'Custom Customer ID (Optional)'}</label>
                  <input
                    type="text"
                    value={formData.custom_customer_id}
                    onChange={(e) => setFormData({ ...formData, custom_customer_id: e.target.value })}
                    placeholder={isBn ? 'ফাঁকা রাখলে অটো তৈরি হবে' : 'Auto-generated if blank'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isBn ? 'গ্রাহক সংরক্ষণ করুন' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Customer */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                {isBn ? `গ্রাহক তথ্য সম্পাদন (${editingCustomer.customer_id})` : `Edit Customer (${editingCustomer.customer_id})`}
              </h3>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'গ্রাহকের নাম' : 'Customer Name'}</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'মোবাইল ফোন' : 'Phone'}</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'ঠিকানা' : 'Address'}</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.address}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'এলাকা' : 'Area'}</label>
                  <select
                    value={editingCustomer.area_id || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, area_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white cursor-pointer"
                  >
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{isBn ? 'মাসিক বিল (টাকা)' : 'Monthly Bill (BDT)'}</label>
                  <input
                    type="number"
                    value={editingCustomer.monthly_bill}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, monthly_bill: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 font-semibold text-slate-600 cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {isBn ? 'আপডেট করুন' : 'Update Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Status (Active, Free, Closed) */}
      {statusModalCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              {isBn ? `স্ট্যাটাস পরিবর্তন: ${statusModalCust.name}` : `Change Status: ${statusModalCust.name}`}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn 
                ? <>বর্তমান বকেয়া: <strong className="text-rose-600">{formatCurrency(statusModalCust.current_due)}</strong> সংরক্ষিত থাকবে।</>
                : <>Current Due: <strong className="text-rose-600">{formatCurrency(statusModalCust.current_due)}</strong> will remain preserved.</>}
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">{isBn ? 'কারণ / মন্তব্য' : 'Reason / Notes'}</label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={isBn ? 'যেমন: বিল বকেয়া, সাময়িক বন্ধ, ফ্রি সংযোগ' : 'e.g. Non-payment, user requested, complimentary'}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleChangeStatus('Active')}
                className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center cursor-pointer"
              >
                {isBn ? 'একটিভ' : 'Active'}
              </button>
              <button
                type="button"
                onClick={() => handleChangeStatus('Free')}
                className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center cursor-pointer"
              >
                {isBn ? 'ফ্রি' : 'Free'}
              </button>
              <button
                type="button"
                onClick={() => handleChangeStatus('Closed')}
                className="py-2.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold text-center cursor-pointer"
              >
                {isBn ? 'বন্ধ' : 'Closed'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStatusModalCust(null)}
              className="w-full py-1 text-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Collect Bill Payment Modal */}
      {collectCust && (
        <PaymentModal
          customer={collectCust}
          onSuccess={(receipt) => {
            setCollectCust(null);
            setActiveReceipt(receipt);
            fetchCustomers();
          }}
          onClose={() => setCollectCust(null)}
        />
      )}

      {/* Digital Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Floating Bottom Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-slate-900/95 text-white rounded-2xl shadow-2xl p-3 sm:p-4 border border-slate-700/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-black shadow-xs">
                {selectedIds.length}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-200">
                {isBn ? 'জন গ্রাহক নির্বাচিত' : 'Customer(s) Selected'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 underline sm:ml-2 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isBn ? 'আনসিলেক্ট' : 'Deselect'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Quick Export Group */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 px-1 font-bold">{isBn ? 'এক্সপোর্ট:' : 'Export:'}</span>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => exportToExcel('selected')}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title={isBn ? 'সিলেক্ট করা গ্রাহকদের Excel ফাইলে এক্সপোর্ট করুন' : 'Export selected to Excel'}
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>XL</span>
              </button>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => exportToPDF('selected')}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title={isBn ? 'সিলেক্ট করা গ্রাহকদের PDF ফাইলে এক্সপোর্ট করুন' : 'Export selected to PDF'}
              >
                <FileText className="w-3 h-3" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                disabled={exportLoading}
                onClick={() => exportToWord('selected')}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title={isBn ? 'সিলেক্ট করা গ্রাহকদের Word ফাইলে এক্সপোর্ট করুন' : 'Export selected to Word'}
              >
                <FileText className="w-3 h-3" />
                <span>Word</span>
              </button>
            </div>

            {/* Deactive Button */}
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleBulkDeactivate}
              className="flex-1 sm:flex-none px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isBn ? 'নির্বাচিত গ্রাহকদের লাইন বন্ধ/ডিঅ্যাক্টিভ করুন' : 'Deactivate selected customers'}
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>{isBn ? 'Deactive (বন্ধ)' : 'Deactive'}</span>
            </button>

            {/* Active Button */}
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleBulkActivate}
              className="flex-1 sm:flex-none px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isBn ? 'নির্বাচিত গ্রাহকদের লাইন সক্রিয়/একটিভ করুন' : 'Activate selected customers'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'Active (একটিভ)' : 'Active'}</span>
            </button>

            {/* Delete Button */}
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleBulkDelete}
              className="flex-1 sm:flex-none px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isBn ? 'নির্বাচিত গ্রাহকদের ডিলিট করুন' : 'Delete selected customers'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'ডিলেট' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
