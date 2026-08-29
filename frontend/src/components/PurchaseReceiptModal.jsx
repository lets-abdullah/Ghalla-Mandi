import React, { useState, useRef } from 'react';
import { Printer, Download, Truck, X, CheckCircle2, Loader2, Wheat } from 'lucide-react';
import { exportSinglePageReceiptPDF } from '../utils/pdfExport';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';

export const PurchaseReceiptModal = ({ isOpen, onClose, purchaseData }) => {
  const { theme } = useTheme();
  const { t } = useLocale();
  const { shop } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef(null);

  if (!isOpen || !purchaseData) return null;

  const {
    purchaseNo = `PUR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    date = new Date().toLocaleString('en-PK', {
      dateStyle: 'short',
      timeStyle: 'short'
    }),
    supplierName = 'Supplier / Party',
    supplierPhone = '',
    supplierCity = '',
    truckNo = '',
    paymentMode = 'Cash on Counter',
    items = [],
    totalAmount = 0,
    paidAmount = 0,
    discount = 0,
    note = ''
  } = purchaseData;

  const displaySupplier = supplierName || 'Walk-in Supplier';
  const cleanPurchaseNo = `#${String(purchaseNo).replace(/[^0-9A-Za-z-]/g, '')}`;
  const totalNum = Number(totalAmount || 0);
  const paidNum = Number(paidAmount || 0);
  const dueRemaining = Math.max(0, totalNum - paidNum);
  const shopTitle = shop?.name || 'GHALLA MANDI ERP';
  const mandiTitle = shop?.mandiName || 'Grain Wholesale Market';
  const shopPhone = shop?.businessPhone || shop?.phone || '';

  // Generate clean, isolated single-page print HTML
  const generateSinglePagePrintHtml = () => {
    const rowsHtml = items.map((item, idx) => {
      const itemPrice = Number(item.price || item.rate || item.purchasePrice || item.purchaseprice || 0);
      const itemQty = Number(item.qty || item.quantity || 1);
      const itemUnit = item.unit || item.unitName || item.baseUnit || 'kg';
      const lineTotal = Number(item.total) || (itemPrice * itemQty);
      const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

      return `
        <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; font-weight: 700; color: #64748b; text-align: center; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 800; color: #064e3b; font-size: 11px;">${item.name || item.productName || 'Produce Commodity'}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #334155; font-size: 11px; font-family: monospace;">Rs. ${itemPrice.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #0f172a; font-size: 11px;">${itemQty} <span style="font-size: 10px; color: #64748b;">${itemUnit}</span></td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 900; color: #064e3b; font-size: 11px; font-family: monospace;">Rs. ${lineTotal.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Purchase Receipt - ${cleanPurchaseNo}</title>
          <style>
            @page {
              size: auto;
              margin: 6mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              background: #ffffff;
              color: #0f172a;
              width: 100%;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .receipt-box {
              width: 100%;
              max-width: 440px;
              margin: 0 auto;
              padding: 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #064e3b; padding-bottom: 8px; margin-bottom: 10px;">
              <div style="font-size: 17px; font-weight: 900; color: #064e3b; letter-spacing: -0.3px;">${shopTitle}</div>
              <div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase;">${mandiTitle}</div>
              ${shopPhone ? `<div style="font-size: 10px; color: #64748b; margin-top: 1px;">Phone: ${shopPhone}</div>` : ''}
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding: 4px 6px; background: #f0fdf4; border-radius: 6px;">
                <span style="background: #064e3b; color: #ffffff; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">PURCHASE RECEIPT</span>
                <span style="font-family: monospace; font-size: 12px; font-weight: 900; color: #064e3b;">${cleanPurchaseNo}</span>
                <span style="font-size: 10px; font-weight: 600; color: #64748b;">${date}</span>
              </div>
            </div>

            <!-- Supplier & Settlement Meta -->
            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 10px; font-size: 11px;">
              <tr>
                <td style="width: 50%; padding: 6px 8px; vertical-align: top; border-right: 1px solid #e2e8f0;">
                  <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">SUPPLIER:</div>
                  <div style="font-size: 12px; font-weight: 900; color: #0f172a;">${displaySupplier}</div>
                  ${supplierCity ? `<div style="font-size: 10px; color: #64748b;">City: ${supplierCity}</div>` : ''}
                  ${supplierPhone ? `<div style="font-size: 10px; color: #64748b;">Phone: ${supplierPhone}</div>` : ''}
                </td>
                <td style="width: 50%; padding: 6px 8px; vertical-align: top; text-align: right;">
                  <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">PAYMENT METHOD:</div>
                  <div style="font-size: 12px; font-weight: 900; color: #047857;">${paymentMode}</div>
                  ${truckNo ? `<div style="font-size: 10px; color: #64748b;">Truck: ${truckNo}</div>` : ''}
                </td>
              </tr>
            </table>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #064e3b; color: #ffffff;">
                  <th style="padding: 5px 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; width: 25px; text-align: center;">#</th>
                  <th style="padding: 5px 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: left;">ITEM</th>
                  <th style="padding: 5px 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: right;">RATE</th>
                  <th style="padding: 5px 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: center;">QTY</th>
                  <th style="padding: 5px 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Totals & Payment Summary -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr style="background: #064e3b; color: #ffffff; font-weight: 900;">
                  <td style="padding: 6px 8px; border-radius: 4px 0 0 4px; font-size: 11px;">GRAND TOTAL:</td>
                  <td style="padding: 6px 8px; text-align: right; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 13px;">Rs. ${totalNum.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 6px 2px; color: #047857; font-weight: 800;">Paid Amount:</td>
                  <td style="padding: 4px 6px 2px; text-align: right; font-weight: 800; color: #047857; font-family: monospace;">Rs. ${paidNum.toLocaleString()}</td>
                </tr>
                ${dueRemaining > 0 ? `
                  <tr>
                    <td style="padding: 3px 6px; color: #b45309; font-weight: 800;">Balance Due (Khata):</td>
                    <td style="padding: 3px 6px; text-align: right; font-weight: 900; color: #b45309; font-family: monospace;">Rs. ${dueRemaining.toLocaleString()}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="padding: 3px 6px; color: #047857; font-weight: 700;">Status:</td>
                    <td style="padding: 3px 6px; text-align: right; font-weight: 800; color: #047857;">✓ FULLY SETTLED</td>
                  </tr>
                `}
              </table>
            </div>

            <!-- Clean Single-Line Footer -->
            <div style="text-align: center; font-size: 9px; color: #94a3b8; padding-top: 4px;">
              Thank you for your business • Computer Generated Purchase Receipt
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    try {
      const existingFrame = document.getElementById('purchase-receipt-print-frame');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'purchase-receipt-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentWindow.document;
      doc.open();
      doc.write(generateSinglePagePrintHtml());
      doc.close();

      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 3000);
      }, 200);
    } catch (err) {
      console.error('Printing error:', err);
      window.print();
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const targetElement = receiptRef.current || document.getElementById('purchase-receipt-compact-card');
      if (!targetElement) {
        throw new Error('Purchase receipt printable element not found in DOM.');
      }

      const filename = `Purchase_Receipt_${cleanPurchaseNo.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
      await exportSinglePageReceiptPDF(targetElement, filename, { width: 115, margin: 5 });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF download. Please try Print Receipt.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-scrollbar print:p-0 print:bg-white print:static"
    >
      {/* Modal Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col my-auto transition-all ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-4 sm:px-5 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-white truncate">
              Purchase Receipt
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-[10px]">
              Single Page POS
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Compact, Single-Page Viewable Receipt Slip */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-900/70 flex justify-center">
          <div 
            ref={receiptRef}
            id="purchase-receipt-compact-card"
            data-receipt-printable="true"
            className="w-full max-w-[420px] bg-white text-slate-900 shadow-md rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3"
          >
            {/* Header: Business & Mandi Identity */}
            <div className="text-center pb-2.5 border-b-2 border-emerald-800">
              <div className="flex items-center justify-center gap-1.5">
                <Wheat className="w-4 h-4 text-emerald-700" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {shopTitle}
                </h2>
              </div>
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">
                {mandiTitle}
              </p>
              {shopPhone && (
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Phone: {shopPhone}
                </p>
              )}

              {/* Receipt Title Strip */}
              <div className="flex items-center justify-between mt-2.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80">
                <span className="bg-emerald-900 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                  Purchase Receipt
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-emerald-950">
                  {cleanPurchaseNo}
                </span>
                <span className="text-[10px] font-semibold text-slate-600">
                  {date}
                </span>
              </div>
            </div>

            {/* Supplier & Settlement Meta Grid */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="space-y-0.5 border-r border-slate-200 pr-2">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                  Supplier:
                </span>
                <div className="font-black text-xs text-slate-900 truncate">
                  {displaySupplier}
                </div>
                {supplierCity && (
                  <div className="text-[10px] text-slate-600 font-medium truncate">
                    City: {supplierCity}
                  </div>
                )}
                {supplierPhone && (
                  <div className="text-[10px] text-slate-600 font-medium truncate">
                    Phone: {supplierPhone}
                  </div>
                )}
              </div>

              <div className="space-y-0.5 pl-1 text-right">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                  Payment Method:
                </span>
                <div className="font-black text-xs text-emerald-700 truncate">
                  {paymentMode}
                </div>
                {truckNo && (
                  <div className="text-[10px] text-slate-600 font-medium truncate">
                    Truck: {truckNo}
                  </div>
                )}
                <div className="text-[9px] text-emerald-600 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Scale Verified
                </div>
              </div>
            </div>

            {/* Compact Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-900 text-white text-[9px] font-black uppercase tracking-wider">
                    <th className="py-2 px-2.5 w-7 text-center">#</th>
                    <th className="py-2 px-2.5">Item</th>
                    <th className="py-2 px-2.5 text-right">Rate</th>
                    <th className="py-2 px-2.5 text-center">Qty</th>
                    <th className="py-2 px-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item, idx) => {
                    const itemPrice = Number(item.price || item.rate || item.purchasePrice || item.purchaseprice || 0);
                    const itemQty = Number(item.qty || item.quantity || 1);
                    const itemUnit = item.unit || item.unitName || item.baseUnit || 'kg';
                    const lineTotal = Number(item.total) || (itemPrice * itemQty);

                    return (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-1.5 px-2.5 font-bold text-slate-400 text-center text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <div className="font-black text-slate-900 text-xs leading-tight">
                            {item.name || item.productName || 'Produce Commodity'}
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-600 text-xs whitespace-nowrap">
                          Rs. {itemPrice.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-black text-slate-800 text-xs whitespace-nowrap">
                          {itemQty} <span className="text-[10px] text-slate-500 font-normal">{itemUnit}</span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-black text-emerald-800 text-xs whitespace-nowrap">
                          Rs. {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & Payment Summary Card */}
            <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              {/* Grand Total Banner */}
              <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-emerald-900 text-white font-black text-xs sm:text-sm shadow-xs">
                <span className="uppercase tracking-wider text-[11px]">GRAND TOTAL:</span>
                <span className="font-mono text-sm sm:text-base font-black">
                  Rs. {totalNum.toLocaleString()}
                </span>
              </div>

              {/* Paid Amount */}
              <div className="flex justify-between items-center text-emerald-700 font-bold px-1 pt-1">
                <span>Paid (Cash on Counter):</span>
                <span className="font-mono font-black">Rs. {paidNum.toLocaleString()}</span>
              </div>

              {/* Remaining Balance or Settled Status */}
              {dueRemaining > 0 ? (
                <div className="flex justify-between items-center text-amber-700 font-extrabold px-1">
                  <span>Balance Due (Khata):</span>
                  <span className="font-mono font-black text-amber-700">Rs. {dueRemaining.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-emerald-700 font-bold px-1 text-[11px]">
                  <span>Payment Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-black text-[10px]">
                    ✓ FULLY SETTLED
                  </span>
                </div>
              )}

              {note && (
                <div className="pt-1 text-[10px] text-slate-500 italic px-1 border-t border-slate-200/60 mt-1">
                  <strong>Note:</strong> {note}
                </div>
              )}
            </div>

            {/* Single Line Simple Footer */}
            <div className="text-center text-[9px] text-slate-400 font-medium pt-1">
              Thank you for your business • Computer Generated Purchase Receipt
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className={`p-3 sm:p-4 border-t flex items-center justify-between gap-2 sm:gap-3 shrink-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>

          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download compact single-page purchase receipt"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print single-page receipt"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReceiptModal;
