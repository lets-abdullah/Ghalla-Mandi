import React, { useState, useRef } from 'react';
import { Printer, Download, Truck, X, CheckCircle2, Loader2, Scale } from 'lucide-react';
import { exportReceiptToPDF } from '../utils/pdfExport';
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
      timeStyle: 'medium'
    }),
    supplierName = 'Supplier / Arhati',
    supplierPhone = '',
    supplierCity = '',
    truckNo = '',
    paymentMode = 'Supplier Khata / Credit',
    items = [],
    totalAmount = 0,
    paidAmount = 0,
    note = ''
  } = purchaseData;

  const displaySupplier = supplierName || 'N/A';
  const cleanPurchaseNo = `#${String(purchaseNo).replace(/[^0-9A-Za-z-]/g, '')}`;
  const totalNum = Number(totalAmount || 0);
  const paidNum = Number(paidAmount || 0);
  const dueRemaining = Math.max(0, totalNum - paidNum);
  const shopTitle = shop?.name || 'GHALLA MANDI ERP';
  const mandiTitle = shop?.mandiName || 'COMMISSION AGENTS & GRAIN PROCUREMENT';
  const shopPhone = shop?.businessPhone || shop?.phone || '';

  // Generate standardized A4 HTML document string for Print and PDF Export
  const generateA4HtmlDocument = () => {
    const itemsRowsHtml = items.map((item, idx) => {
      const itemPrice = Number(item.price || item.rate || item.purchasePrice || item.purchaseprice || 0);
      const itemQty = Number(item.qty || item.quantity || 1);
      const itemUnit = item.unit || item.unitName || item.baseUnit || t('kg');
      const lineTotal = Number(item.total) || (itemPrice * itemQty);
      const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

      return `
        <tr style="background: ${bg};">
          <td style="padding: 8px 10px; font-weight: 700; color: #64748b; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 800; color: #064e3b; font-size: 12px; line-height: 1.3;">${item.name || item.productName || 'Produce Commodity'}</div>
            <div style="font-size: 10px; color: #94a3b8; line-height: 1.2;">Inward Ghalla Mandi Arrival</div>
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #334155; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: monospace; white-space: nowrap;">
            Rs. ${itemPrice.toLocaleString()}
          </td>
          <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-size: 12px; white-space: nowrap;">
            ${itemQty} <span style="font-size: 10px; font-weight: normal; color: #64748b;">${itemUnit}</span>
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 900; color: #064e3b; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: monospace; white-space: nowrap;">
            Rs. ${lineTotal.toLocaleString()}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="width: 100%; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border-bottom: 2.5px solid #047857; padding-bottom: 10px;">
          <tr>
            <td style="vertical-align: middle; width: 62%; padding-bottom: 8px;">
              <div style="font-size: 22px; font-weight: 900; color: #064e3b; line-height: 1.1; letter-spacing: -0.5px;">${shopTitle}</div>
              <div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 3px;">${mandiTitle}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px; font-weight: 600;">INWARD PURCHASE VOUCHER & GRAIN RECEIPT (آمد چٹھہ) ${shopPhone ? `• 📞 ${shopPhone}` : ''}</div>
            </td>
            <td style="vertical-align: middle; text-align: right; width: 38%; padding-bottom: 8px;">
              <div style="display: inline-block; background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 8px; padding: 6px 14px; text-align: right;">
                <div style="font-size: 9px; font-weight: 800; color: #047857; text-transform: uppercase;">PURCHASE VOUCHER</div>
                <div style="font-size: 15px; font-weight: 900; color: #064e3b; font-family: monospace; letter-spacing: 0.5px; margin-top: 1px;">${cleanPurchaseNo}</div>
                <div style="font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;">${date}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Meta Box -->
        <table style="width: 100%; border-collapse: collapse; background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; margin-bottom: 14px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding: 10px 14px; border-right: 1px solid #d1fae5;">
              <div style="font-size: 9px; font-weight: 800; color: #047857; text-transform: uppercase;">SUPPLIER / AARTHI:</div>
              <div style="font-size: 13.5px; font-weight: 900; color: #064e3b; margin-top: 3px; line-height: 1.3;">${displaySupplier}</div>
              ${supplierCity ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 City: ${supplierCity}</div>` : ''}
              ${supplierPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">📞 Phone: ${supplierPhone}</div>` : ''}
            </td>
            <td style="width: 50%; vertical-align: top; padding: 10px 14px; text-align: right;">
              <div style="font-size: 9px; font-weight: 800; color: #047857; text-transform: uppercase;">SETTLEMENT MODE:</div>
              <div style="font-size: 13.5px; font-weight: 900; color: #064e3b; margin-top: 3px;">${paymentMode}</div>
              ${truckNo ? `<div style="font-size: 10px; color: #475569; margin-top: 2px; font-weight: 600;">🚛 Truck: ${truckNo}</div>` : ''}
              <div style="font-size: 10px; font-weight: 700; color: #059669; margin-top: 3px;">✓ Scale Verified Inward Procurement</div>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #064e3b; color: #ffffff;">
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 35px; text-align: center;">#</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; text-align: left;">COMMODITY / PROCUREMENT ITEM</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 115px; text-align: right;">RATE (PKR)</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 100px; text-align: center;">QTY / WEIGHT</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 120px; text-align: right;">TOTAL (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <!-- Totals & Terms Section -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 52%; vertical-align: top; padding-right: 14px;">
              <div style="border: 1px solid #d1fae5; border-radius: 8px; padding: 10px 12px; font-size: 10px; color: #065f46; background: #f0fdf4; line-height: 1.5;">
                <div style="font-weight: 800; color: #064e3b; margin-bottom: 2px;">Purchase Terms:</div>
                <div>• Goods inward verified per mandi weighing scale (کنڈا).</div>
                <div>• Purchase voucher credited to supplier account.</div>
                <div>• Official procurement entry in Ghalla Mandi ERP.</div>
                <div style="margin-top: 4px; font-weight: 700; color: #047857;">Authorized & Verified Procurement</div>
              </div>
            </td>
            <td style="width: 48%; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr style="background: #064e3b; color: #ffffff; font-weight: 900; font-size: 12px;">
                  <td style="padding: 7px 8px; border-radius: 4px 0 0 4px;">TOTAL AMOUNT:</td>
                  <td style="padding: 7px 8px; text-align: right; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 13px;">Rs. ${totalNum.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 6px 3px; color: #047857; font-weight: 800;">Paid (Counter):</td>
                  <td style="padding: 5px 6px 3px; text-align: right; font-weight: 800; color: #047857; font-family: monospace;">Rs. ${paidNum.toLocaleString()}</td>
                </tr>
                ${dueRemaining > 0 ? `
                  <tr>
                    <td style="padding: 4px 6px; color: #b45309; font-weight: 800;">Balance Due (Khata):</td>
                    <td style="padding: 4px 6px; text-align: right; font-weight: 900; color: #b45309; font-family: monospace;">Rs. ${dueRemaining.toLocaleString()}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="padding: 4px 6px; color: #047857; font-weight: 700;">Status:</td>
                    <td style="padding: 4px 6px; text-align: right; font-weight: 800; color: #047857;">✓ FULLY SETTLED</td>
                  </tr>
                `}
                ${note ? `
                  <tr>
                    <td colspan="2" style="padding: 4px 6px; font-size: 9.5px; color: #64748b; font-style: italic;">Remarks: ${note}</td>
                  </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        </table>

        <!-- Signatures -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 28px;">
          <tr>
            <td style="width: 50%; vertical-align: bottom;">
              <div style="text-align: center; width: 180px; border-top: 1.5px dashed #94a3b8; padding-top: 5px; font-size: 10px; font-weight: 700; color: #475569;">
                Weigher Signature (تولائی کار)
              </div>
            </td>
            <td style="width: 50%; vertical-align: bottom; text-align: right;">
              <div style="text-align: center; width: 180px; border-top: 1.5px dashed #94a3b8; padding-top: 5px; font-size: 10px; font-weight: 700; color: #475569; margin-left: auto;">
                Receiver / Munshi (دستخط وصول کنندہ)
              </div>
            </td>
          </tr>
        </table>
      </div>
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
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Purchase Voucher - ${cleanPurchaseNo}</title>
            <style>
              @page { size: A4 portrait; margin: 10mm 12mm; }
              * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { background: #ffffff; color: #0f172a; width: 100%; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            </style>
          </head>
          <body>
            ${generateA4HtmlDocument()}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        setTimeout(() => document.body.removeChild(printFrame), 3000);
      }, 250);
    } catch (err) {
      console.error('Printing error:', err);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const targetElement = receiptRef.current || document.getElementById('purchase-voucher-printable-area');
      if (!targetElement) {
        throw new Error('Purchase voucher printable element not found in DOM.');
      }

      const filename = `Purchase_Voucher_${cleanPurchaseNo.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
      await exportReceiptToPDF(targetElement, filename);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Could not generate PDF download. Please try Print (A4).');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-scrollbar print:p-0 print:bg-white print:static"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col my-auto max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        <div className={`px-4 sm:px-6 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-emerald-950/10 border-slate-100'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-white truncate">
              Goods Inward & Purchase Voucher
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden xs:inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
              Standard A4
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-slate-100 dark:bg-slate-900/80 flex justify-center">
          <div 
            ref={receiptRef}
            id="purchase-voucher-printable-area"
            data-receipt-printable="true"
            className="w-full max-w-[794px] bg-white text-slate-900 shadow-md rounded-xl border border-slate-200 p-5 sm:p-7 space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-emerald-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                  <Truck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    {shopTitle}
                  </h2>
                  <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
                    {mandiTitle}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    INWARD PURCHASE VOUCHER & GRAIN RECEIPT (آمد چٹھہ) {shopPhone ? `• 📞 ${shopPhone}` : ''}
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto text-left sm:text-right bg-emerald-50 sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-emerald-100 flex sm:block justify-between items-center">
                <div>
                  <div className="text-[9px] font-extrabold uppercase text-emerald-800">PURCHASE VOUCHER</div>
                  <div className="font-mono font-black text-base sm:text-lg text-emerald-950">{cleanPurchaseNo}</div>
                </div>
                <div className="text-[11px] font-semibold text-slate-500">{date}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="space-y-1 sm:border-r sm:border-slate-200/80 sm:pr-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block">{t('supplierFirmName') || 'Supplier / Aarthi'}:</span>
                <div className="font-black text-sm text-slate-900">{displaySupplier}</div>
                {supplierCity && <div className="text-[11px] text-slate-600 font-medium">📍 City: {supplierCity}</div>}
                {supplierPhone && <div className="text-[11px] text-slate-600 font-medium">📞 Phone: {supplierPhone}</div>}
              </div>

              <div className="space-y-1 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200 sm:pl-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">{t('paymentMethodLabel') || 'Settlement Mode'}:</span>
                <div className="font-black text-sm text-emerald-700">{paymentMode}</div>
                {truckNo && <div className="text-[11px] text-slate-600 font-medium">🚛 Truck: {truckNo}</div>}
                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Scale Verified Inward Procurement
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-900 text-white text-[10px] font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">{t('item') || 'Commodity / Procurement Item'}</th>
                      <th className="py-2.5 px-3 text-right">{t('price') || 'Rate (PKR)'}</th>
                      <th className="py-2.5 px-3 text-center">{t('qty') || 'Qty / Weight'}</th>
                      <th className="py-2.5 px-3 text-right">{t('total') || 'Total (PKR)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {items.map((item, idx) => {
                      const itemPrice = Number(item.price || item.rate || item.purchasePrice || item.purchaseprice || 0);
                      const itemQty = Number(item.qty || item.quantity || 1);
                      const itemUnit = item.unit || item.unitName || item.baseUnit || t('kg');
                      const lineTotal = Number(item.total) || (itemPrice * itemQty);

                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-2.5 px-3 font-bold text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-black text-emerald-950">{item.name || item.productName || 'Produce Commodity'}</div>
                            <div className="text-[10px] text-slate-400">Inward Ghalla Mandi Arrival</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-600">
                            Rs. {itemPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-slate-800 whitespace-nowrap">
                            {itemQty} <span className="text-[10px] text-slate-500 font-normal">{itemUnit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                            Rs. {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="text-[10px] text-emerald-900 space-y-1.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <p className="font-bold text-emerald-950">Purchase Terms & Mandi Verification:</p>
                <p>• Goods inward verified per mandi weighing scale (کنڈا).</p>
                <p>• Purchase voucher credited to supplier account ledger.</p>
                <p>• Official procurement voucher by Ghalla Mandi ERP.</p>
                <p className="font-bold text-emerald-700">Authorized & Verified Procurement</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-900 text-white font-black text-xs sm:text-sm">
                  <span>TOTAL AMOUNT:</span>
                  <span className="font-mono text-sm sm:text-base">
                    Rs. {totalNum.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-emerald-700 font-bold px-1">
                  <span>Paid (Cash On Counter):</span>
                  <span className="font-mono">Rs. {paidNum.toLocaleString()}</span>
                </div>

                {dueRemaining > 0 ? (
                  <div className="flex justify-between items-center text-amber-700 font-extrabold px-1">
                    <span>Balance Due (Khata):</span>
                    <span className="font-mono">Rs. {dueRemaining.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-emerald-700 font-bold px-1 text-[11px]">
                    <span>Status:</span>
                    <span>✓ FULLY SETTLED (صاف)</span>
                  </div>
                )}

                {note && (
                  <div className="pt-1 text-[10px] text-slate-500 italic px-1">
                    <strong>Remarks:</strong> {note}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-5 flex justify-between items-end border-t border-slate-200 text-[10px] text-slate-500 font-bold">
              <div className="text-center w-36 sm:w-44 border-t-2 border-dashed border-slate-300 pt-1.5">
                Weigher Signature (تولائی کار)
              </div>
              <div className="text-center w-36 sm:w-44 border-t-2 border-dashed border-slate-300 pt-1.5">
                Receiver / Munshi (دستخط وصول کنندہ)
              </div>
            </div>
          </div>
        </div>

        <div className={`p-3 sm:p-4 border-t flex items-center justify-between gap-2 sm:gap-3 print:hidden shrink-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
            <span>{t('close')}</span>
          </button>

          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download purchase voucher as standard A4 PDF file"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
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
              className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print standard A4 purchase arrival voucher"
            >
              <Printer className="w-4 h-4" />
              <span>Print (A4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReceiptModal;
