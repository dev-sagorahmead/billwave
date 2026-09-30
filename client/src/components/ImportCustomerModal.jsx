import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import * as XLSX from 'xlsx';
import { 
  Upload, X, CheckCircle, AlertTriangle, FileSpreadsheet, 
  Download, Loader2, ArrowRight, Check, AlertCircle, Info 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ImportCustomerModal({ onSuccess, onClose }) {
  const { isBn, formatCurrency, formatStatus } = useLanguage();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  // Line Type: 'Active' (একটিভ লাইন) or 'Closed' (বন্ধ লাইন)
  const [lineType, setLineType] = useState('Active');
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');

  useEffect(() => {
    api.getAreas().then(res => {
      if (Array.isArray(res)) {
        setAreas(res);
        if (res.length > 0) setSelectedAreaId(res[0].id);
      }
    }).catch(console.error);
  }, []);

  // Template download for convenience matching user's format
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'ID': '1000013',
        'Name': 'ইনামুল',
        'Address': 'ইকরামুল',
        'Mobile': '01719919486',
        'Monthly Fee': 150,
        'Due': 6600
      },
      {
        'ID': '1000021',
        'Name': 'নুরুল ইসলাম',
        'Address': 'আজহার',
        'Mobile': '01917831644',
        'Monthly Fee': 150,
        'Due': 400
      },
      {
        'ID': '1000083',
        'Name': 'আজিজুল',
        'Address': 'সাইকেল মিস্তিরি',
        'Mobile': '',
        'Monthly Fee': 150,
        'Due': 150
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `Customer_Import_${lineType}_Lines.xlsx`);
  };

  const processFile = async (selectedFile) => {
    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
          setError(isBn ? 'ফাইলে কোনো গ্রাহক রেকর্ড পাওয়া যায়নি' : 'File contains no customer records');
          setLoading(false);
          return;
        }

        // Send to backend for preview & validation with lineType & area
        const preview = await api.previewImportCustomers(rows, lineType, selectedAreaId);
        setPreviewData(preview);
      } catch (err) {
        setError((isBn ? 'ফাইল রিড করতে ব্যর্থ হয়েছে: ' : 'Failed to read file: ') + err.message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleFileUpload = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    processFile(selected);
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.allRows) return;

    try {
      setImporting(true);
      setError('');
      const res = await api.confirmImportCustomers(previewData.allRows);
      setImportResult(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || (isBn ? 'ইম্পোর্ট ব্যর্থ হয়েছে' : 'Import failed'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl text-blue-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">
                {isBn ? 'একসাথে একাধিক গ্রাহক ইম্পোর্ট' : 'Bulk Customer Import'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBn ? 'এক্সেল (.xlsx, .xls) অথবা CSV ফাইলের মাধ্যমে গ্রাহক তালিকা যুক্ত করুন' : 'Import customers using Excel (.xlsx, .xls) or CSV'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {importResult ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {isBn ? 'ইম্পোর্ট সফলভাবে সম্পন্ন হয়েছে!' : 'Import Completed!'}
              </h3>
              <p className="text-sm text-slate-600">{importResult.message}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                {isBn ? 'বন্ধ করুন ও গ্রাহক দেখুন' : 'Close & View Customers'}
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: Upload or Download Template */}
              {!previewData && (
                <div className="space-y-4">
                  
                  {/* Line Type Selection: Active vs Closed */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      {isBn ? 'গ্রাহক লাইন টাইপ নির্বাচন করুন' : 'Select Customer Line Type'} *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setLineType('Active')}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          lineType === 'Active'
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs sm:text-sm text-emerald-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            {isBn ? 'সক্রিয় লাইন (Active Lines)' : 'Active Lines'}
                          </span>
                          {lineType === 'Active' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {isBn 
                            ? 'স্বাভাবিক সচল সংযোগ। প্রতি মাসে এই গ্রাহকদের জন্য নিয়মিত বিল তৈরি হবে।'
                            : 'Standard active connection. Monthly bills will be generated automatically.'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLineType('Closed')}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          lineType === 'Closed'
                            ? 'border-rose-600 bg-rose-50/70 text-rose-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs sm:text-sm text-rose-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            {isBn ? 'বন্ধ লাইন (Closed Lines)' : 'Closed Lines'}
                          </span>
                          {lineType === 'Closed' && <CheckCircle className="w-4 h-4 text-rose-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {isBn 
                            ? 'সংযোগ সাময়িক বন্ধ। পূর্বের বকেয়া সংরক্ষিত থাকবে, কিন্তু নতুন মাসিক বিল আসবে না।'
                            : 'Temporary disconnected line. Outstanding due is retained, but no new monthly bills generated.'}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Area selection fallback */}
                  {areas.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {isBn ? 'ডিফল্ট এরিয়া' : 'Default Area'}
                        <span className="text-[11px] font-normal text-slate-500 ml-1">
                          {isBn 
                            ? '(ফাইলে এরিয়ার নাম না থাকলে স্বয়ংক্রিয়ভাবে এই এরিয়াতে গ্রাহক যুক্ত হবে)'
                            : '(If area is missing in file, customers will be assigned to this area)'}
                        </span>
                      </label>
                      <select
                        value={selectedAreaId}
                        onChange={(e) => setSelectedAreaId(e.target.value)}
                        className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium"
                      >
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                    <div>
                      <h4 className="font-semibold text-xs text-blue-900">
                        {isBn ? 'নমুনা এক্সেল / CSV ফাইল লাগবে?' : 'Need Sample Excel / CSV Template?'}
                      </h4>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        {isBn ? 'ID, Name, Address, Mobile, Monthly Fee, Due ফরম্যাট ফাইল ডাউনলোড করুন' : 'Download sample template with ID, Name, Address, Mobile, Monthly Fee, Due columns'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isBn ? 'টেমপ্লেট ডাউনলোড' : 'Download Template'}</span>
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <span className="font-semibold text-sm text-slate-700 block">
                      {isBn ? 'এক্সেল (.xlsx, .xls) বা CSV ফাইল নির্বাচন করুন' : 'Select Excel (.xlsx, .xls) or CSV file'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      {isBn ? 'ফাইলটি এখানে ড্র্যাগ করে ছেড়ে দিন অথবা ব্রাউজ করুন' : 'Drag and drop file here or browse from device'}
                    </span>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>{isBn ? 'গ্রাহক ফাইল যাচাই এবং প্রিভিউ তৈরি হচ্ছে...' : 'Validating file and preparing preview...'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Validation Preview */}
              {previewData && (
                <div className="space-y-4">
                  
                  {/* Mode Banner */}
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    lineType === 'Closed' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${lineType === 'Closed' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      {isBn ? 'আপলোড মোড:' : 'Upload Mode:'} {lineType === 'Closed' ? (isBn ? 'বন্ধ লাইন' : 'Closed Lines') : (isBn ? 'সক্রিয় লাইন' : 'Active Lines')}
                    </span>
                    <span className="text-[11px] font-medium">
                      {lineType === 'Closed' 
                        ? (isBn ? 'এই গ্রাহকরা বন্ধ সংযোগ তালিকায় যুক্ত হবে' : 'These customers will be imported into Closed list')
                        : (isBn ? 'এই গ্রাহকরা সচল সংযোগ তালিকায় যুক্ত হবে' : 'These customers will be imported into Active list')}
                    </span>
                  </div>

                  {/* Validation Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 block">{isBn ? 'মোট রেকর্ড' : 'Total Records'}</span>
                      <span className="text-lg font-bold text-slate-800">{previewData.totalRows}</span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <span className="text-xs text-emerald-700 block">{isBn ? 'সঠিক রেকর্ড' : 'Valid Records'}</span>
                      <span className="text-lg font-bold text-emerald-700">{previewData.validCount}</span>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                      <span className="text-xs text-rose-700 block">{isBn ? 'ত্রুটিযুক্ত' : 'Invalid Records'}</span>
                      <span className="text-lg font-bold text-rose-700">{previewData.invalidCount}</span>
                    </div>
                  </div>

                  {/* Errors Alert if any */}
                  {previewData.invalidCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1 max-h-32 overflow-y-auto">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>{isBn ? `সতর্কতা: ${previewData.invalidCount} টি রেকর্ডে সংশোধন প্রয়োজন:` : `Warning: ${previewData.invalidCount} rows require correction:`}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900">
                        {previewData.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>
                            {isBn ? `রো ${err.rowNum} (${err.name || 'নাম নেই'}): ${err.errors.join(', ')}` : `Row ${err.rowNum} (${err.name || 'No name'}): ${err.errors.join(', ')}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="max-h-64 overflow-x-auto overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">{isBn ? 'লাইন স্ট্যাটাস' : 'Line Status'}</th>
                            <th className="p-2.5">{isBn ? 'গ্রাহক আইডি' : 'Customer ID'}</th>
                            <th className="p-2.5">{isBn ? 'নাম' : 'Name'}</th>
                            <th className="p-2.5">{isBn ? 'মোবাইল' : 'Mobile'}</th>
                            <th className="p-2.5">{isBn ? 'ঠিকানা' : 'Address'}</th>
                            <th className="p-2.5">{isBn ? 'এলাকা' : 'Area'}</th>
                            <th className="p-2.5">{isBn ? 'মাসিক বিল' : 'Monthly Bill'}</th>
                            <th className="p-2.5">{isBn ? 'বকেয়া' : 'Due'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.preview.map((row, idx) => (
                            <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/60'}>
                              <td className="p-2.5 whitespace-nowrap">
                                {row.status === 'Active' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                    {formatStatus('Active')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                    {formatStatus('Closed')}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                                {row.customer_id || <span className="text-slate-400 font-normal italic">Auto</span>}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                              <td className="p-2.5 font-mono">{row.phone || <span className="text-slate-400 font-normal">-</span>}</td>
                              <td className="p-2.5 text-slate-500 truncate max-w-xs">{row.address || '-'}</td>
                              <td className="p-2.5">{row.area_name}</td>
                              <td className="p-2.5 font-mono font-bold text-slate-800">{formatCurrency(row.monthly_bill)}</td>
                              <td className="p-2.5 font-mono font-bold text-rose-600">{formatCurrency(row.previous_due)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => { setPreviewData(null); setFile(null); }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      {isBn ? 'অন্য ফাইল নির্বাচন করুন' : 'Choose Different File'}
                    </button>

                    <button
                      type="button"
                      disabled={previewData.validCount === 0 || importing}
                      onClick={handleConfirmImport}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isBn ? `${previewData.validCount} জন গ্রাহক ইম্পোর্ট হচ্ছে...` : `Importing ${previewData.validCount} Customers...`}</span>
                        </>
                      ) : (
                        <>
                          <span>{isBn ? `ইম্পোর্ট নিশ্চিত করুন (${previewData.validCount} জন)` : `Confirm Import (${previewData.validCount} Customers)`}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}
