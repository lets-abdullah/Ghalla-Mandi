import React, { useState, useRef } from 'react';
import { 
  Printer, 
  Download, 
  Wheat, 
  X, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  FileText, 
  User, 
  Phone, 
  ShoppingCart, 
  CreditCard 
} from 'lucide-react';
import { exportSinglePageReceiptPDF } from '../utils/pdfExport';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const ReceiptModal = ({ isOpen, onClose, orderData }) => {
  const { theme } = useTheme();
  const { shop } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef(null);

  if (!isOpen || !orderData) return null;

  const {
    orderId = `SAL-${Math.floor(100000 + Math.random() * 900000)}`,
    date = new Date().toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    customerName = 'Customer',
    customerPhone = '',
    customerCity = '',
    items = [],
    subtotal = 0,
    discount = 0,
    tax = 0,
    grandTotal = 0,
    paidAmount = 0,
    paymentMethod = 'Cash',
    saleNote = ''
  } = orderData;

  const cleanReceiptNo = String(orderId).startsWith('SAL-') || String(orderId).startsWith('GM-') || String(orderId).startsWith('INV-')
    ? String(orderId)
    : `SAL-${String(orderId).replace(/[^0-9A-Za-z]/g, '') || '000456'}`;

  const grandTotalNum = Number(grandTotal || subtotal || 0);
  const paidNum = Number(paidAmount !== undefined ? paidAmount : grandTotalNum);
  const discountNum = Number(discount || 0);
  const calculatedSubtotal = Number(subtotal) > 0 ? Number(subtotal) : (grandTotalNum + discountNum);
  const dueRemaining = Math.max(0, grandTotalNum - paidNum);
  const displayCustomer = !customerName || customerName === 'walkInCustomer' ? 'Walk-in Customer' : customerName;
  const shopTitle = (shop?.name || 'GHALLA MANDI').toUpperCase();

  // Generate clean, isolated single-page print HTML matching reference design
  const generateSinglePagePrintHtml = () => {
    const rowsHtml = items.map((item, idx) => {
      const itemPrice = Number(item.price || item.rate || 0);
      const itemQty = Number(item.qty || 1);
      const lineTotal = itemPrice * itemQty;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
          <td style="padding: 5px 6px; font-weight: 700; color: #0f172a; text-align: left;">${item.name || 'Produce Item'}</td>
          <td style="padding: 5px 6px; text-align: center; font-weight: 800; color: #334155;">${itemQty}</td>
          <td style="padding: 5px 6px; text-align: right; font-family: monospace; color: #475569;">${itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px 6px; text-align: right; font-weight: 800; font-family: monospace; color: #0f172a;">${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sale Receipt - ${cleanReceiptNo}</title>
          <style>
            @page {
              size: auto;
              margin: 5mm;
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
            .receipt-card {
              width: 100%;
              max-width: 420px;
              margin: 0 auto;
              padding: 16px 18px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              background: #ffffff;
            }
            .dashed-sep {
              border-top: 1px dashed #cbd5e1;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <!-- Logo & Brand Header -->
            <div style="text-align: center;">
              <div style="width: 44px; height: 44px; margin: 0 auto; border-radius: 50%; border: 2px solid #059669; background: #ecfdf5; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                🌾
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; margin-top: 6px; text-transform: uppercase;">
                ${shopTitle}
              </div>
              <div style="display: inline-block; background: #064e3b; color: #ffffff; font-size: 10.5px; font-weight: 900; padding: 3px 20px; border-radius: 3px; letter-spacing: 1px; margin-top: 5px; text-transform: uppercase;">
                SALE RECEIPT
              </div>
            </div>

            <!-- Receipt Meta Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 11px;">
              <div>
                <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Receipt No.</div>
                <div style="font-weight: 900; color: #0f172a; font-family: monospace;">${cleanReceiptNo}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Date & Time</div>
                <div style="font-weight: 700; color: #334155;">${date}</div>
              </div>
            </div>

            <div class="dashed-sep"></div>

            <!-- Customer Details -->
            <div>
              <div style="font-size: 10px; font-weight: 900; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">
                👤 CUSTOMER
              </div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px;">
                ${displayCustomer}
              </div>
              ${customerPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">📞 ${customerPhone}</div>` : ''}
              ${customerCity ? `<div style="font-size: 10px; color: #64748b; margin-top: 1px;">📍 ${customerCity}</div>` : ''}
            </div>

            <div class="dashed-sep"></div>

            <!-- Items Table -->
            <div>
              <div style="font-size: 10px; font-weight: 900; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">
                🛒 ITEMS
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
                <thead>
                  <tr style="background: #ecfdf5; border-top: 1px solid #a7f3d0; border-bottom: 1px solid #a7f3d0; color: #064e3b; font-size: 9.5px; font-weight: 900; text-transform: uppercase;">
                    <th style="padding: 4px 6px; text-align: left;">Item</th>
                    <th style="padding: 4px 6px; text-align: center;">Qty</th>
                    <th style="padding: 4px 6px; text-align: right;">Rate (Rs.)</th>
                    <th style="padding: 4px 6px; text-align: right;">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px;">
                <tr>
                  <td style="padding: 3px 6px; color: #475569; font-weight: 700;">Subtotal</td>
                  <td style="padding: 3px 6px; text-align: right; font-weight: 700; font-family: monospace; color: #334155;">Rs. ${calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${discountNum > 0 ? `
                  <tr>
                    <td style="padding: 3px 6px; color: #047857; font-weight: 700;">Discount</td>
                    <td style="padding: 3px 6px; text-align: right; font-weight: 700; font-family: monospace; color: #047857;">- Rs. ${discountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
              </table>

              <!-- Grand Total Banner -->
              <div style="background: #064e3b; color: #ffffff; padding: 7px 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                <span style="font-size: 11px; font-weight: 900; letter-spacing: 0.5px;">GRAND TOTAL</span>
                <span style="font-size: 14px; font-weight: 900; font-family: monospace;">Rs. ${grandTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div class="dashed-sep"></div>

            <!-- Payment Section -->
            <div>
              <div style="font-size: 10px; font-weight: 900; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                💳 PAYMENT
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr>
                  <td style="padding: 2px 6px; color: #475569; font-weight: 700;">Payment Method</td>
                  <td style="padding: 2px 6px; text-align: right; font-weight: 800; color: #0f172a;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 6px; color: #475569; font-weight: 700;">Paid Amount</td>
                  <td style="padding: 2px 6px; text-align: right; font-weight: 900; font-family: monospace; color: #047857;">Rs. ${paidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 6px; color: #475569; font-weight: 700;">Balance</td>
                  <td style="padding: 2px 6px; text-align: right; font-weight: 900; font-family: monospace; color: ${dueRemaining > 0 ? '#b45309' : '#0f172a'};">Rs. ${dueRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </table>

              <!-- Status Badge -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #047857; text-align: center; padding: 6px; border-radius: 6px; font-size: 11.5px; font-weight: 900; margin-top: 7px; letter-spacing: 0.5px;">
                ${dueRemaining === 0 ? '✓ FULLY PAID' : `BALANCE DUE: Rs. ${dueRemaining.toLocaleString()}`}
              </div>
            </div>

            <div class="dashed-sep"></div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 2px;">
              <div style="font-family: Georgia, serif; font-style: italic; font-size: 15px; font-weight: bold; color: #064e3b;">
                — Thank You —
              </div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
                We appreciate your business
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    try {
      const existingFrame = document.getElementById('sale-receipt-print-frame');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'sale-receipt-print-frame';
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
      console.error('Print error:', err);
      window.print();
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const targetElement = receiptRef.current || document.getElementById('sale-receipt-card');
      if (!targetElement) {
        throw new Error('Sale receipt printable element not found in DOM.');
      }

      const filename = `Sale_Receipt_${cleanReceiptNo.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
      await exportSinglePageReceiptPDF(targetElement, filename, { width: 110, margin: 4 });
    } catch (err) {
      console.error('PDF error:', err);
      alert('Could not generate PDF download. Please try Print Receipt.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-1 sm:p-2.5 overflow-hidden print:p-0 print:bg-white print:static"
    >
      {/* Modal Card Container (Compact Height, No Scrollbar) */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col my-auto max-h-[96vh] transition-all ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Modal Top Nav Bar */}
        <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-3 h-3" />
            </div>
            <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-white truncate">
              Sale Receipt
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-[10px]">
              Single Page
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Centered Reference-Styled Receipt */}
        <div className="p-2.5 sm:p-3.5 bg-slate-100 dark:bg-slate-900/70 flex justify-center items-start flex-1 overflow-y-auto">
          <div 
            ref={receiptRef}
            id="sale-receipt-card"
            data-receipt-printable="true"
            className="w-full max-w-[380px] bg-white text-slate-900 shadow-md rounded-xl border border-slate-200/90 p-4 space-y-3"
          >
            {/* Header: Logo, Shop Name, Ribbon */}
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full border-2 border-emerald-600/30 bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
                <Wheat className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wider text-center mt-1.5 leading-tight">
                {shopTitle}
              </h1>
              <div className="inline-block bg-[#064e3b] text-white font-black text-[11px] uppercase tracking-widest px-6 py-0.5 rounded-xs mt-1.5 shadow-xs">
                SALE RECEIPT
              </div>
            </div>

            {/* Receipt No & Date 2-Column Info Bar */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-[9px] font-extrabold uppercase text-slate-400 leading-tight">Receipt No.</div>
                  <div className="font-mono font-black text-slate-900 text-xs leading-tight">{cleanReceiptNo}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-right">
                <div>
                  <div className="text-[9px] font-extrabold uppercase text-slate-400 leading-tight">Date & Time</div>
                  <div className="font-bold text-slate-800 text-[11px] leading-tight">{date}</div>
                </div>
                <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-1" />

            {/* Customer Information */}
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-1 text-[#047857] font-black text-[11px] uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>CUSTOMER</span>
              </div>
              <div className="font-black text-slate-900 text-sm pl-4">
                {displayCustomer}
              </div>
              {customerPhone && (
                <div className="flex items-center gap-1 text-xs text-slate-600 font-medium pl-4">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{customerPhone}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-1" />

            {/* Items Table */}
            <div>
              <div className="flex items-center gap-1 text-[#047857] font-black text-[11px] uppercase tracking-wider mb-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                <span>ITEMS</span>
              </div>

              <div className="border border-emerald-200/80 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#ecfdf5] border-b border-emerald-200/80 text-[#064e3b] text-[9.5px] font-black uppercase">
                      <th className="py-1 px-2 text-left">Item</th>
                      <th className="py-1 px-2 text-center">Qty</th>
                      <th className="py-1 px-2 text-right">Rate (Rs.)</th>
                      <th className="py-1 px-2 text-right">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {items.map((item, idx) => {
                      const itemPrice = Number(item.price || item.rate || 0);
                      const itemQty = Number(item.qty || 1);
                      const lineTotal = itemPrice * itemQty;

                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                          <td className="py-1 px-2 font-bold text-slate-900 truncate max-w-[120px]">
                            {item.name || 'Commodity'}
                          </td>
                          <td className="py-1 px-2 text-center font-black text-slate-700">
                            {itemQty}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-slate-600">
                            {itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-black text-slate-900">
                            {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Subtotal & Discount Rows */}
              <div className="space-y-0.5 text-[11px] pt-1.5 px-1 font-bold">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900">
                    Rs. {calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {discountNum > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span>Discount</span>
                    <span className="font-mono">
                      - Rs. {discountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Prominent Dark Green Grand Total Banner */}
              <div className="bg-[#064e3b] text-white px-3 py-1.5 rounded-sm flex justify-between items-center mt-1.5 shadow-xs">
                <span className="text-[11px] font-black tracking-wider uppercase">GRAND TOTAL</span>
                <span className="font-mono text-sm sm:text-base font-black">
                  Rs. {grandTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-1" />

            {/* Payment Section */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1 text-[#047857] font-black text-[11px] uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span>PAYMENT</span>
              </div>

              <div className="space-y-0.5 text-[11px] px-1 font-bold">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Payment Method</span>
                  <span className="text-slate-900 font-extrabold">{paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Paid Amount</span>
                  <span className="font-mono text-emerald-700 font-black">
                    Rs. {paidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Balance</span>
                  <span className={`font-mono font-black ${dueRemaining > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                    Rs. {dueRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="bg-[#f0fdf4] border border-emerald-200 text-emerald-800 rounded-md py-1.5 px-3 flex items-center justify-center gap-1 text-center font-black text-[11px] tracking-wide mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{dueRemaining === 0 ? 'FULLY PAID' : `BALANCE DUE: Rs. ${dueRemaining.toLocaleString()}`}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-1" />

            {/* Elegant Footer */}
            <div className="text-center pt-0.5">
              <div className="font-serif italic font-bold text-emerald-900 text-sm tracking-wide">
                — Thank You —
              </div>
              <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">
                We appreciate your business
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className={`p-2 sm:p-2.5 border-t flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>

          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-1.5 bg-[#064e3b] hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
