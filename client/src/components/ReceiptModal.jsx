import React, { useRef, useState } from 'react';
import { Printer, Download, Share2, X, CheckCircle, Smartphone } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function ReceiptModal({ receipt, onClose }) {
  const [copied, setCopied] = useState(false);
  const [printFormat, setPrintFormat] = useState('58mm'); // '58mm' or '80mm'
  const receiptRef = useRef(null);

  if (!receipt) return null;

  const {
    receiptNumber,
    transactionId,
    company,
    customer,
    collector,
    previousDue,
    paidAmount,
    remainingDue,
    paymentDate,
    paymentTime,
    paymentMethod,
    notes
  } = receipt;

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
    doc.text(`Remaining Balance:`, 5, y);
    doc.text(`${remainingDue} BDT`, 75, y, { align: 'right' });
    y += 6;

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
    const text = `*${company?.name || 'Cable TV'} Payment Receipt*\nReceipt: ${receiptNumber}\nCustomer: ${customer?.name} (${customer?.customerId})\nPaid: ${paidAmount} BDT\nRemaining Due: ${remainingDue} BDT\nDate: ${paymentDate}\nThank you!`;
    
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden my-8">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Payment Digital Receipt</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable & Screen Receipt Container */}
        <div className="p-6 bg-slate-50 flex justify-center">
          
          <div 
            ref={receiptRef}
            id="thermal-receipt"
            className={`printable-area bg-white p-6 rounded-xl border border-dashed border-slate-300 shadow-sm text-slate-800 ${
              printFormat === '58mm' ? 'thermal-receipt-58mm max-w-[280px]' : 'thermal-receipt-80mm max-w-[340px]'
            } w-full`}
          >
            {/* Company Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-base text-slate-900 uppercase tracking-tight">
                {company?.name || 'Cable TV Network'}
              </h2>
              {company?.phone && <p className="text-xs text-slate-600 mt-0.5">Hotline: {company.phone}</p>}
              {company?.address && <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{company.address}</p>}
              <div className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-xs rounded border border-slate-300">
                MONEY RECEIPT
              </div>
            </div>

            {/* Meta info */}
            <div className="text-xs space-y-1 py-3 border-b border-dashed border-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold text-slate-900">{receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span>{paymentDate} {paymentTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Collector:</span>
                <span className="font-medium">{collector?.name || 'Office'}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="text-xs space-y-1 py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Cust ID:</span>
                <span className="font-bold text-slate-900">{customer?.customerId || customer?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-medium text-slate-800">{customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span>{customer?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Area:</span>
                <span>{customer?.area || '-'}</span>
              </div>
            </div>

            {/* Billing Calculation Breakdown */}
            <div className="text-xs space-y-2 py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-slate-600">
                <span>Previous Due:</span>
                <span className="font-mono">{previousDue} BDT</span>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200">
                <span>Paid ({paymentMethod}):</span>
                <span className="font-mono text-base">{paidAmount} BDT</span>
              </div>

              <div className="flex justify-between text-slate-700 font-semibold pt-1">
                <span>Remaining Due:</span>
                <span className={`font-mono ${remainingDue > 0 ? 'text-amber-700 font-bold' : 'text-emerald-600'}`}>
                  {remainingDue} BDT
                </span>
              </div>
            </div>

            {notes && (
              <div className="text-[11px] text-slate-500 py-2 border-b border-dashed border-slate-300">
                <span className="font-semibold">Note:</span> {notes}
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5">
              <p className="font-medium text-slate-700">Thank you for your payment!</p>
              <p>For inquiries, call {company?.phone || 'our support hotline'}.</p>
              <p className="text-[9px] text-slate-400">Electronic generated receipt. Valid without signature.</p>
            </div>

          </div>

        </div>

        {/* Printer selector & Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 no-print space-y-3">
          
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span>Thermal Format:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrintFormat('58mm')}
                className={`px-2 py-1 rounded text-xs font-medium border ${printFormat === '58mm' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-300 text-slate-600'}`}
              >
                58mm POS
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('80mm')}
                className={`px-2 py-1 rounded text-xs font-medium border ${printFormat === '80mm' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-300 text-slate-600'}`}
              >
                80mm POS
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-xs shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs shadow-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Close Receipt
          </button>
        </div>

      </div>
    </div>
  );
}
