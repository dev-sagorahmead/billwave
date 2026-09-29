import React, { useState } from 'react';
import { api } from '../utils/api';
import * as XLSX from 'xlsx';
import { 
  Upload, X, CheckCircle, AlertTriangle, FileSpreadsheet, 
  Download, Loader2, ArrowRight, Check, AlertCircle 
} from 'lucide-react';

export default function ImportCustomerModal({ onSuccess, onClose }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  // Template download for convenience
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Customer Name': 'Tanvir Hossain',
        'Phone': '01711002233',
        'Address': 'House 12, Road 4, Sector 3',
        'Area': 'Mirpur',
        'Package': 'Regular',
        'Monthly Bill': 150,
        'Previous Due': 0,
        'Connection Date': '2026-09-01',
        'Status': 'Active'
      },
      {
        'Customer Name': 'Nusrat Jahan',
        'Phone': '01822334455',
        'Address': 'Apartment 5B, Green Road',
        'Area': 'Dhanmondi',
        'Package': 'Premium',
        'Monthly Bill': 250,
        'Previous Due': 250,
        'Connection Date': '2026-08-15',
        'Status': 'Active'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'Customer_Import_Template.xlsx');
  };

  const handleFileUpload = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
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
          setError('File contains no records');
          setLoading(false);
          return;
        }

        // Send to backend for preview & validation
        const preview = await api.previewImportCustomers(rows);
        setPreviewData(preview);
      } catch (err) {
        setError('Error reading Excel/CSV file: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(selected);
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
      setError(err.message || 'Import failed');
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
              <h2 className="font-bold text-base leading-tight">Bulk Customer Import</h2>
              <p className="text-xs text-slate-400 mt-0.5">Import customers using Excel (.xlsx, .xls) or CSV</p>
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
              <h3 className="text-lg font-bold text-slate-900">Import Completed!</h3>
              <p className="text-sm text-slate-600">{importResult.message}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close & View Customers
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: Upload or Download Template */}
              {!previewData && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div>
                      <h4 className="font-semibold text-xs text-blue-900">Need a sample format?</h4>
                      <p className="text-[11px] text-blue-700 mt-0.5">Download our pre-formatted template with all columns</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Template</span>
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
                      Choose Excel or CSV file
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      Drag and drop your spreadsheet here or click to browse
                    </span>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Validating and inspecting records...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Validation Preview */}
              {previewData && (
                <div className="space-y-4">
                  
                  {/* Validation Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 block">Total Rows</span>
                      <span className="text-lg font-bold text-slate-800">{previewData.totalRows}</span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <span className="text-xs text-emerald-700 block">Valid to Import</span>
                      <span className="text-lg font-bold text-emerald-700">{previewData.validCount}</span>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                      <span className="text-xs text-rose-700 block">Invalid (Will Skip)</span>
                      <span className="text-lg font-bold text-rose-700">{previewData.invalidCount}</span>
                    </div>
                  </div>

                  {/* Errors Alert if any */}
                  {previewData.invalidCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1 max-h-32 overflow-y-auto">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Validation Warnings ({previewData.invalidCount} rows require attention):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900">
                        {previewData.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>
                            Row {err.rowNum} ({err.name || 'Unnamed'}): {err.errors.join(', ')}
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
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Name</th>
                            <th className="p-2.5">Phone</th>
                            <th className="p-2.5">Area</th>
                            <th className="p-2.5">Package</th>
                            <th className="p-2.5">Monthly Bill</th>
                            <th className="p-2.5">Previous Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.preview.map((row, idx) => (
                            <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/60'}>
                              <td className="p-2.5">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full" title={row.errors.join('; ')}>
                                    <AlertTriangle className="w-3 h-3" /> Error
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-medium text-slate-900">{row.name}</td>
                              <td className="p-2.5 font-mono">{row.phone}</td>
                              <td className="p-2.5">{row.area_name}</td>
                              <td className="p-2.5">{row.package_name || 'Regular'}</td>
                              <td className="p-2.5 font-mono">{row.monthly_bill} BDT</td>
                              <td className="p-2.5 font-mono">{row.previous_due} BDT</td>
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
                      Choose Different File
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
                          <span>Importing {previewData.validCount} Customers...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm Import ({previewData.validCount} Customers)</span>
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
