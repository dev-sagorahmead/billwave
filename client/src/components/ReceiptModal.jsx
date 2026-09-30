import React, { useRef, useState, useEffect } from 'react';
import { 
  Printer, Download, Share2, X, CheckCircle, Smartphone, 
  Bluetooth, HelpCircle, Check, Loader2, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { formatBillingMonth, getDefaultArrearsMonth } from '../utils/monthHelper';
import { useLanguage } from '../context/LanguageContext';
import { 
  printDirectWebBluetooth, 
  printViaRawBT, 
  isAutoPrintEnabled, 
  setAutoPrintEnabled 
} from '../utils/bluetoothPrinter';

export default function ReceiptModal({ receipt, onClose }) {
  const { isBn, formatCurrency } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [printFormat, setPrintFormat] = useState('58mm'); // '58mm' or '80mm'
  const receiptRef = useRef(null);

  // Bluetooth printing states
  const [bluetoothPrinting, setBluetoothPrinting] = useState(false);
  const [bluetoothSuccess, setBluetoothSuccess] = useState(false);
  const [bluetoothError, setBluetoothError] = useState('');
  const [autoPrintActive, setAutoPrintActive] = useState(isAutoPrintEnabled());
  const [showBluetoothHelp, setShowBluetoothHelp] = useState(false);

  if (!receipt) return null;

  const {
    receiptNumber,
    transactionId,
    company,
    customer,
    collector,
    billingMonth,
    previousDue,
    paidAmount,
    remainingDue,
    isAdvance,
    advanceAmount,
    advanceNotice,
    paymentDate,
    paymentTime,
    paymentMethod,
    notes
  } = receipt;

  // Month formatted in Bengali and English
  const billMonthStr = formatBillingMonth(billingMonth || getDefaultArrearsMonth(), isBn ? 'bengali' : 'english');
  const billMonthEn = formatBillingMonth(billingMonth || getDefaultArrearsMonth(), 'english');
  const billMonthBoth = isBn ? `${billMonthStr} (${billMonthEn})` : billMonthEn;

  // Direct Web Bluetooth Thermal Printing
  const handleBluetoothPrint = async () => {
    setBluetoothError('');
    setBluetoothSuccess(false);
    setBluetoothPrinting(true);

    try {
      if (navigator.bluetooth) {
        await printDirectWebBluetooth(receipt);
        setBluetoothSuccess(true);
        setTimeout(() => setBluetoothSuccess(false), 4000);
      } else {
        // Fallback to RawBT Android Driver
        printViaRawBT(receipt);
      }
    } catch (err) {
      console.warn('Bluetooth print error:', err);
      if (err.name !== 'NotFoundError') { // User didn't just cancel device picker
        setBluetoothError(err.message || (isBn ? 'ব্লুটুথ কানেকশন পাওয়া যায়নি' : 'Bluetooth connection failed'));
      }
    } finally {
      setBluetoothPrinting(false);
    }
  };

  // Fallback to RawBT Android driver
  const handleRawBTPrint = () => {
    try {
      printViaRawBT(receipt);
    } catch (err) {
      alert((isBn ? 'RawBT প্রিন্ট ত্রুটি: ' : 'RawBT Error: ') + err.message);
    }
  };

  // Toggle Auto-Print setting
  const handleToggleAutoPrint = (checked) => {
    setAutoPrintActive(checked);
    setAutoPrintEnabled(checked);
  };

  // Auto-Print on mount if enabled
  useEffect(() => {
    if (isAutoPrintEnabled()) {
      const timer = setTimeout(() => {
        handleBluetoothPrint();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Print receipt via browser native dialog
  const handlePrint = () => {
    window.print();
  };

  // Generate crisp PDF using jsPDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 160] // POS 80mm format
    });

    let y = 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(company?.name || 'Cable TV Network', 40, y, { align: 'center' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (company?.phone) {
      doc.text(`Phone: ${company.phone}`, 40, y, { align: 'center' });
      y += 4;
    }
    if (company?.address) {
      doc.text(company.address, 40, y, { align: 'center' });
      y += 5;
    }

    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y, 75, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('MONEY RECEIPT', 40, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Receipt No: ${receiptNumber}`, 5, y);
    y += 4;
    doc.text(`Bill Month: ${billMonthEn}`, 5, y);
    y += 4;
    doc.text(`Date: ${paymentDate} ${paymentTime || ''}`, 5, y);
    y += 4;
    doc.text(`Collector: ${collector?.name || 'Office'}`, 5, y);
    y += 5;

    doc.line(5, y, 75, y);
    y += 4;

    doc.text(`Customer ID: ${customer?.customerId || customer?.id}`, 5, y);
    y += 4;
    doc.text(`Name: ${customer?.name}`, 5, y);
    y += 4;
    doc.text(`Phone: ${customer?.phone}`, 5, y);
    y += 4;
    doc.text(`Area: ${customer?.area || '-'}`, 5, y);
    y += 5;

    doc.line(5, y, 75, y);
    y += 5;

    doc.text(`Previous Due:`, 5, y);
    doc.text(`${previousDue} BDT`, 75, y, { align: 'right' });
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text(`Amount Paid (${paymentMethod}):`, 5, y);
    doc.text(`${paidAmount} BDT`, 75, y, { align: 'right' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    const displayRem = remainingDue > 0 ? remainingDue : 0;
    doc.text(`Remaining Due:`, 5, y);
    doc.text(`${displayRem} BDT`, 75, y, { align: 'right' });
    y += 4;

    if (isAdvance || remainingDue < 0) {
      const advVal = advanceAmount || Math.abs(remainingDue);
      doc.setFont('helvetica', 'bold');
      doc.text(`Advance Credit:`, 5, y);
      doc.text(`+${advVal} BDT`, 75, y, { align: 'right' });
      y += 4;
    }
    y += 2;

    doc.line(5, y, 75, y);
    y += 6;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Thank you for choosing our digital cable service!', 40, y, { align: 'center' });
    y += 4;
    doc.text('Computer generated receipt. No signature required.', 40, y, { align: 'center' });

    doc.save(`Receipt_${receiptNumber}.pdf`);
  };

  // Mobile Web Share or WhatsApp Share
  const handleShare = async () => {
    const hasAdvance = isAdvance || remainingDue < 0;
    const advVal = advanceAmount || Math.abs(remainingDue);
    const advText = hasAdvance ? (isBn ? `\nঅগ্রিম জমা (Advance): +${advVal} ৳` : `\nAdvance Credit: +${advVal} BDT`) : '';
    const text = isBn
      ? `*${company?.name || 'ক্যাব্‌ল টিভি'} মানি রশিদ*\nরশিদ নং: ${receiptNumber}\nগ্রাহক: ${customer?.name} (${customer?.customerId})\nবিলের মাস: ${billMonthBoth}\nপরিশোধ: ${formatCurrency(paidAmount)}\nঅবশিষ্ট বকেয়া: ${formatCurrency(remainingDue > 0 ? remainingDue : 0)}${advText}\nতারিখ: ${paymentDate}\nধন্যবাদ!`
      : `*${company?.name || 'Cable TV'} Payment Receipt*\nReceipt: ${receiptNumber}\nCustomer: ${customer?.name} (${customer?.customerId})\nBill Month: ${billMonthEn}\nPaid: ${paidAmount} BDT\nRemaining Due: ${remainingDue > 0 ? remainingDue : 0} BDT${advText}\nDate: ${paymentDate}\nThank you!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receiptNumber}`,
          text: text
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden my-4 sm:my-8 border border-slate-100">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">
              {isBn ? 'কালেকশন মানি রশিদ' : 'Payment Money Receipt'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advance Payment Notice Banner */}
        {(isAdvance || remainingDue < 0) && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-2.5 text-emerald-900 shadow-2xs no-print">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-emerald-950">
                {isBn ? '✅ অতিরিক্ত টাকা অগ্রিম (Advance) হিসেবে জমা হয়েছে' : '✅ Excess amount credited as advance payment'}
              </div>
              <div className="text-emerald-800 mt-0.5 leading-snug">
                {advanceNotice || (isBn 
                  ? `গ্রাহকের পূর্বের বকেয়া পরিশোধের পর অতিরিক্ত ${advanceAmount || Math.abs(remainingDue)} টাকা ভবিষ্যৎ বিলের জন্য অগ্রিম হিসেবে জমা রাখা হয়েছে।`
                  : `Remaining excess of ${advanceAmount || Math.abs(remainingDue)} BDT after clearing due balance has been credited as advance for future billing cycles.`)}
              </div>
            </div>
          </div>
        )}

        {/* Printable & Screen Receipt Container */}
        <div className="p-4 sm:p-6 bg-slate-50 flex justify-center">
          
          <div 
            ref={receiptRef}
            id="thermal-receipt"
            className={`printable-area bg-white p-5 sm:p-6 rounded-2xl border border-dashed border-slate-300 shadow-xs text-slate-900 ${
              printFormat === '58mm' ? 'thermal-receipt-58mm max-w-[280px]' : 'thermal-receipt-80mm max-w-[340px]'
            } w-full`}
          >
            {/* Company Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tight">
                {company?.name || 'Cable TV Network'}
              </h2>
              {company?.phone && <p className="text-xs text-slate-600 mt-0.5 font-medium">{isBn ? 'হটলাইন:' : 'Hotline:'} {company.phone}</p>}
              {company?.address && <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{company.address}</p>}
              <div className="inline-block mt-2 px-3 py-0.5 bg-slate-100 text-slate-800 font-extrabold text-xs rounded-full border border-slate-300">
                {isBn ? 'মানি রশিদ' : 'MONEY RECEIPT'}
              </div>
            </div>

            {/* Meta info */}
            <div className="text-xs space-y-1 py-3 border-b border-dashed border-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">{isBn ? 'রশিদ নং:' : 'Receipt No:'}</span>
                <span className="font-black text-slate-900">{receiptNumber}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-600 font-medium">{isBn ? 'বিলের মাস:' : 'Bill Month:'}</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {billMonthStr}
                </span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-500">{isBn ? 'তারিখ ও সময়:' : 'Date & Time:'}</span>
                <span className="font-mono">{paymentDate} {paymentTime}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-500">{isBn ? 'কালেক্টর:' : 'Collector:'}</span>
                <span className="font-medium">{collector?.name || (isBn ? 'অফিস' : 'Office')}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="text-xs space-y-1 py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">{isBn ? 'গ্রাহক আইডি:' : 'Cust ID:'}</span>
                <span className="font-bold text-slate-900 font-mono">{customer?.customerId || customer?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isBn ? 'নাম:' : 'Name:'}</span>
                <span className="font-bold text-slate-900">{customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isBn ? 'মোবাইল:' : 'Phone:'}</span>
                <span className="font-mono font-medium">{customer?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isBn ? 'এলাকা:' : 'Area:'}</span>
                <span>{customer?.area || '-'}</span>
              </div>
            </div>

            {/* Billing Calculation Breakdown */}
            <div className="text-xs space-y-2 py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between items-center text-slate-700 font-medium pb-1.5 border-b border-dotted border-slate-200">
                <span>{isBn ? 'বিলের মাস:' : 'Bill Month:'}</span>
                <span className="font-bold text-slate-900">{billMonthBoth}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>{isBn ? 'পূর্বের বকেয়া:' : 'Previous Due:'}</span>
                <span className="font-mono">{formatCurrency(previousDue)}</span>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-emerald-800 bg-emerald-50 px-2 py-1.5 rounded-xl border border-emerald-200">
                <span>{isBn ? `পরিশোধ (${paymentMethod}):` : `Paid (${paymentMethod}):`}</span>
                <span className="font-mono text-base font-black">+{formatCurrency(paidAmount)}</span>
              </div>

              <div className="flex justify-between text-slate-700 font-semibold pt-1">
                <span>{isBn ? 'অবশিষ্ট বকেয়া:' : 'Remaining Due:'}</span>
                <span className={`font-mono font-bold ${remainingDue > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                  {formatCurrency(remainingDue > 0 ? remainingDue : 0)}
                </span>
              </div>

              {(isAdvance || remainingDue < 0) && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1.5 rounded-xl border border-emerald-200">
                  <span>{isBn ? 'অগ্রিম জমা:' : 'Advance Credit:'}</span>
                  <span className="font-mono text-sm font-black">+{formatCurrency(advanceAmount || Math.abs(remainingDue))}</span>
                </div>
              )}
            </div>

            {notes && (
              <div className="text-[11px] text-slate-500 py-2 border-b border-dashed border-slate-300">
                <span className="font-semibold">{isBn ? 'নোট:' : 'Note:'}</span> {notes}
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5">
              <p className="font-medium text-slate-800">
                {isBn ? 'আমাদের ক্যাবল নেটওয়ার্ক ব্যবহারের জন্য ধন্যবাদ!' : 'Thank you for your payment!'}
              </p>
              <p>
                {isBn ? `যেকোনো তথ্যের জন্য কল করুন: ${company?.phone || 'আমাদের হটলাইনে'}` : `For inquiries, call ${company?.phone || 'our support hotline'}.`}
              </p>
              <p className="text-[9px] text-slate-400">
                {isBn ? 'ইলেকট্রনিক কম্পিউটার জেনারেটেড রশিদ। স্বাক্ষরের প্রয়োজন নেই।' : 'Electronic generated receipt. Valid without signature.'}
              </p>
            </div>

          </div>

        </div>

        {/* Bluetooth Pocket Printer Section & Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 no-print space-y-3">
          
          {/* Bluetooth Feedback Notification */}
          {bluetoothSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? '✅ পকেট প্রিন্টারে রসিদ সফলভাবে প্রিন্ট হয়েছে!' : 'Receipt printed to Bluetooth printer successfully!'}</span>
            </div>
          )}

          {bluetoothError && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{bluetoothError}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRawBTPrint}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] hover:bg-amber-700 transition-colors"
                >
                  RawBT দিয়ে প্রিন্ট করুন
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] hover:bg-slate-300 transition-colors"
                >
                  সিস্টেম প্রিন্ট
                </button>
              </div>
            </div>
          )}

          {/* Primary Action Button: 📱 ব্লুটুথ পকেট প্রিন্টার (Bluetooth Thermal Pocket Print) */}
          <button
            type="button"
            onClick={handleBluetoothPrint}
            disabled={bluetoothPrinting}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {bluetoothPrinting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isBn ? 'ব্লুটুথ প্রিন্টারে পাঠানো হচ্ছে...' : 'Printing to Bluetooth...'}</span>
              </>
            ) : (
              <>
                <Bluetooth className="w-5 h-5" />
                <span>{isBn ? 'ব্লুটুথ পকেট প্রিন্ট (58mm)' : 'Bluetooth Pocket Print (58mm)'}</span>
              </>
            )}
          </button>

          {/* Auto-Print Checkbox & Bluetooth Help */}
          <div className="flex items-center justify-between px-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
              <input 
                type="checkbox"
                checked={autoPrintActive}
                onChange={(e) => handleToggleAutoPrint(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] sm:text-xs">
                {isBn ? 'কালেকশনের পর স্বয়ংক্রিয় প্রিন্ট (Auto-Print)' : 'Auto-print after collection'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => setShowBluetoothHelp(!showBluetoothHelp)}
              className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5 text-[11px] font-medium cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isBn ? 'কীভাবে কানেক্ট করবেন?' : 'How to connect?'}</span>
            </button>
          </div>

          {/* Bluetooth Connection Quick Guide Helper Drawer */}
          {showBluetoothHelp && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1.5 animate-in fade-in">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>{isBn ? 'ব্লুটুথ পকেট প্রিন্টার ব্যবহারের নিয়ম:' : 'Bluetooth Printer Guide:'}</span>
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 leading-relaxed">
                <li>মোবাইলের ব্লুটুথ অন করে প্রিন্টারের সাথে Pair করুন (পিন সাধারণত <code className="bg-slate-200 px-1 rounded font-bold">0000</code> বা <code className="bg-slate-200 px-1 rounded font-bold">1234</code>)।</li>
                <li>গ্রাহকের বিল আদায় করার পর <strong>"ব্লুটুথ পকেট প্রিন্ট"</strong> বাটনে চাপ দিন।</li>
                <li>তালিকা থেকে আপনার প্রিন্টারের নাম সিলেক্ট করলেই রসিদ প্রিন্ট হয়ে বের হবে।</li>
                <li>আপনার ফোনে <strong>RawBT</strong> অ্যাপ থাকলে সেটি দিয়েও ব্যাকগ্রাউন্ডে সুপার-ফাস্ট প্রিন্ট দিতে পারবেন।</li>
              </ol>
            </div>
          )}

          {/* Secondary Action Buttons Grid: System Print, PDF, Share */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>{isBn ? 'সিস্টেম প্রিন্ট' : 'System Print'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>{isBn ? 'পিডিএফ' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? (copied ? 'কপি হয়েছে!' : 'শেয়ার') : (copied ? 'Copied!' : 'Share')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            {isBn ? 'রশিদ বন্ধ করুন' : 'Close Receipt'}
          </button>
        </div>

      </div>
    </div>
  );
}
