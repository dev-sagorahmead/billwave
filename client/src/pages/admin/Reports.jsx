import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  FileText, Download, Printer, Filter, Calendar, 
  Search, RefreshCw, ChevronRight, CheckCircle2 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('daily_collection');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reportList = [
    { id: 'daily_collection', name: '1. Daily Collection Report', desc: 'Itemized collections and transactions for a specific day' },
    { id: 'monthly_collection', name: '2. Monthly Collection Report', desc: 'Day-by-day collection breakdown for any month' },
    { id: 'collector_wise', name: '3. Collector-wise Report', desc: 'Recovery totals and performance per bill collector' },
    { id: 'area_wise', name: '4. Area-wise Report', desc: 'Coverage zone customer counts, dues, and revenue' },
    { id: 'customer_due', name: '5. Customer Due Report', desc: 'Subscribers with pending outstanding balances' },
    { id: 'paid_customer', name: '6. Paid Customer Report', desc: 'Subscribers who have fully cleared all dues (0 Due)' },
    { id: 'partial_payment', name: '7. Partial Payment Report', desc: 'Subscribers with fractional or partial balances' },
    { id: 'closed_customers', name: '8. Closed Customer Report', desc: 'Suspended connections with preserved outstanding balances' },
    { id: 'free_customers', name: '9. Free Customer Report', desc: 'Complimentary lines and old balance tracking' },
    { id: 'monthly_billing', name: '10. Monthly Billing Report', desc: 'All bills generated in a billing cycle' },
    { id: 'outstanding_due', name: '11. Outstanding Due Report', desc: 'Aging report of unpaid months' },
    { id: 'payment_method', name: '12. Payment Method Report', desc: 'Cash vs bKash vs Nagad vs Bank breakdown' }
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        report_type: selectedReport,
        start_date: startDate,
        end_date: endDate
      }).toString();

      const res = await api.getReport(query);
      setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, startDate, endDate]);

  const handleExportExcel = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) {
      alert('No data to export');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(reportData.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${selectedReport}_${startDate}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) {
      alert('No data to export');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`Dish Cable SaaS - ${reportList.find(r => r.id === selectedReport)?.name}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated at: ${new Date().toLocaleString()}`, 14, 22);

    const headers = Object.keys(reportData.data[0]);
    const rows = reportData.data.map(obj => Object.values(obj).map(v => String(v ?? '')));

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 26,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`${selectedReport}_${startDate}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Comprehensive Reports & Analytics Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate, filter, and export all 12 operational, revenue, and subscriber audit reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-700 block">Select Report Type:</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
          {reportList.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedReport(r.id)}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                selectedReport === r.id
                  ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs font-bold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="leading-tight truncate">{r.name}</div>
              <div className="text-[10px] text-slate-400 font-normal line-clamp-1 mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600">Target Date / Month:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
          />
          <button
            type="button"
            onClick={fetchReport}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Report Summary Card */}
      {reportData && reportData.summary && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Report Summary Metrics
          </h3>
          <div className="flex flex-wrap gap-4 text-xs font-mono">
            {Object.entries(reportData.summary).map(([k, v]) => (
              <div key={k} className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block uppercase">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-base font-bold text-slate-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Output Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Generating report data...</span>
            </div>
          ) : !reportData || !reportData.data || reportData.data.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No records found for this report and date criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  {Object.keys(reportData.data[0]).map((col) => (
                    <th key={col} className="p-3.5 capitalize">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} className="p-3.5">
                        {typeof val === 'number' ? (
                          <span className="font-mono font-bold">{val}</span>
                        ) : (
                          String(val ?? '-')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
