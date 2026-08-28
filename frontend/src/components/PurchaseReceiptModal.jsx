import React, { useState } from 'react';
import { Printer, Download, Truck, X, Building2, CheckCircle2, Loader2, ShieldCheck, Scale } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';

export const PurchaseReceiptModal = ({ isOpen, onClose, purchaseData }) => {
  const { theme } = useTheme();
  const { t } = useLocale();
  const { shop } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

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
    gatePassNo = '',
    items = [],
    subtotalAmount = 0,
    freightCharges = 0,
    totalAmount = 0,
    paidAmount = 0,
    paymentMode = 'Supplier Khata / Credit',
    supplierBalance = 0,
    note = ''
  } = purchaseData;

  const displaySupplier = supplierName || 'N/A';
  const cleanPurchaseNo = `#${String(purchaseNo).replace(/[^0-9A-Za-z-]/g, '')}`;
  const totalNum = Number(totalAmount || 0);
  const paidNum = Number(paidAmount || 0);
  const dueRemaining = Math.max(0, totalNum - paidNum);
  const shopTitle = shop?.name || 'GHALLA MANDI ERP';
  const mandiTitle = shop?.mandiName || 'COMMISSION AGENTS & GRAIN PROCUREMENT';

  // High Quality Isolated Print - Full Width A4 & Thermal
  const handlePrint = () => {
    try {
      const existingFrame = document.getElementById('purchase-receipt-print-frame');
      if (existingFrame) {
        existingFrame.remove();
      }

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

      const itemsRowsHtml = items.map((item, idx) => {
        const itemPrice = Number(item.price || item.rate || 0);
        const itemQty = Number(item.qty || 1);
        const itemUnit = item.unit || item.unitName || t('kg');
        const lineTotal = Number(item.total) || (itemPrice * itemQty);
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
            <td style="padding: 10px 12px; font-weight: 700; color: #64748b; text-align: center; width: 45px;">${idx + 1}</td>
            <td style="padding: 10px 12px;">
              <div style="font-weight: 800; font-size: 13px; color: #064e3b;">📦 ${item.name}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Purchase Item</div>
            </td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 700; font-size: 13px; color: #334155; font-family: monospace;">
              Rs. ${itemPrice.toLocaleString()}
            </td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 800; font-size: 13px; color: #1e293b;">
              ${itemQty} <span style="font-size: 11px; color: #64748b; font-weight: 600;">${itemUnit}</span>
            </td>
            <td style="padding: 10px 14px; text-align: right; font-weight: 900; font-size: 14px; color: #064e3b; font-family: monospace;">
              Rs. ${lineTotal.toLocaleString()}
            </td>
          </tr>
        `;
      }).join('');

      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Purchase Voucher - ${cleanPurchaseNo}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                background: #ffffff;
                color: #0f172a;
                width: 100%;
                margin: 0;
                padding: 0;
                font-size: 12px;
                line-height: 1.4;
              }
              .invoice-container {
                width: 100%;
                border: 1.5px solid #064e3b;
                border-radius: 12px;
                overflow: hidden;
                padding: 24px;
              }
              .header-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 2px solid #064e3b;
              }
              .meta-box {
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
              }
              .meta-table {
                width: 100%;
                border-collapse: collapse;
              }
              .meta-table td {
                padding: 4px 8px;
                vertical-align: top;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                overflow: hidden;
              }
              .items-table th {
                background: #064e3b;
                color: #ffffff;
                padding: 10px 12px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .grand-total-row {
                background: #064e3b;
                color: #ffffff;
                font-size: 16px;
                font-weight: 900;
              }
              .grand-total-row td {
                padding: 10px 14px;
              }
              .sig-box {
                text-align: center;
                width: 180px;
                border-top: 1.5px dashed #94a3b8;
                padding-top: 6px;
                font-size: 11px;
                font-weight: 700;
                color: #475569;
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <!-- Header -->
              <table class="header-table">
                <tr>
                  <td style="vertical-align: middle; width: 60%;">
                    <div style="font-size: 24px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px;">${shopTitle}</div>
                    <div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 2px;">${mandiTitle}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Inward Purchase Voucher & Grain Receipt (آمد چٹھہ)</div>
                  </td>
                  <td style="vertical-align: middle; text-align: right; width: 40%;">
                    <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 14px; text-align: right;">
                      <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase;">PURCHASE VOUCHER</div>
                      <div style="font-size: 18px; font-weight: 900; color: #064e3b; font-family: monospace;">${cleanPurchaseNo}</div>
                      <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">${date}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Meta -->
              <div class="meta-box">
                <table class="meta-table">
                  <tr>
                    <td style="width: 50%;">
                      <div style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase;">SUPPLIER / AARTHI:</div>
                      <div style="font-size: 14px; font-weight: 900; color: #064e3b; margin-top: 2px;">${displaySupplier}</div>
                      ${supplierCity ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 City: ${supplierCity}</div>` : ''}
                      ${supplierPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">📞 Phone: ${supplierPhone}</div>` : ''}
                    </td>
                    <td style="width: 50%; text-align: right;">
                      <div style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase;">SETTLEMENT MODE:</div>
                      <div style="font-size: 13px; font-weight: 800; color: #064e3b; margin-top: 2px;">${paymentMode}</div>
                      ${truckNo ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">🚛 Truck: ${truckNo}</div>` : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">#</th>
                    <th style="text-align: left;">COMMODITY / PROCUREMENT ITEM</th>
                    <th style="width: 110px; text-align: right;">RATE (PKR)</th>
                    <th style="width: 100px; text-align: center;">QTY / WEIGHT</th>
                    <th style="width: 120px; text-align: right;">TOTAL (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRowsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="width: 55%; vertical-align: top; padding-right: 20px;">
                    <div style="border: 1px solid #d1fae5; border-radius: 8px; padding: 12px; font-size: 11px; color: #065f46; background: #f0fdf4;">
                      <div style="font-weight: 800; margin-bottom: 4px;">Purchase Terms:</div>
                      <div>• Goods inward verified per mandi weighing scale (کنڈا).</div>
                      <div>• Purchase voucher credited to supplier account.</div>
                      <div>• Authorized and stamped by Ghalla Mandi ERP.</div>
                    </div>
                  </td>
                  <td style="width: 45%; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                      <tr class="grand-total-row">
                        <td style="border-radius: 6px 0 0 6px;">TOTAL AMOUNT:</td>
                        <td style="text-align: right; border-radius: 0 6px 6px 0; font-family: monospace;">Rs. ${totalNum.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 8px 4px; color: #047857; font-weight: 800;">Paid (Counter):</td>
                        <td style="padding: 6px 8px 4px; text-align: right; font-weight: 800; color: #047857; font-family: monospace;">Rs. ${paidNum.toLocaleString()}</td>
                      </tr>
                      ${dueRemaining > 0 ? `
                        <tr>
                          <td style="padding: 4px 8px; color: #b45309; font-weight: 800;">Balance Due (Khata):</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 900; color: #b45309; font-family: monospace;">Rs. ${dueRemaining.toLocaleString()}</td>
                        </tr>
                      ` : `
                        <tr>
                          <td style="padding: 4px 8px; color: #047857; font-weight: 700;">Status:</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 800; color: #047857;">✓ FULLY SETTLED</td>
                        </tr>
                      `}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signatures -->
              <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                <tr>
                  <td style="width: 50%; vertical-align: bottom;">
                    <div class="sig-box">Weigher Signature (تولائی کار)</div>
                  </td>
                  <td style="width: 50%; vertical-align: bottom; text-align: right;">
                    <div class="sig-box" style="margin-left: auto;">Receiver / Munshi (دستخط وصول کنندہ)</div>
                  </td>
                </tr>
              </table>
            </div>
          </body>
        </html>
      `);

      doc.close();

      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 3000);
      }, 250);
    } catch (err) {
      console.error('Printing error:', err);
      window.print();
    }
  };

  // Download Purchase Voucher as High Quality A4 PDF Document
  const handleDownloadPDF = async () => {
    const voucherElement = document.getElementById('purchase-voucher-printable-area');
    if (!voucherElement) return;

    try {
      setIsDownloading(true);

      const opt = {
        margin: [6, 6, 6, 6],
        filename: `Purchase_Voucher_${cleanPurchaseNo.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };

      await html2pdf().set(opt).from(voucherElement).save();
    } catch (err) {
      console.error('Failed to download purchase voucher PDF:', err);
      alert('Could not generate PDF download. Please try Print Receipt.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static overflow-y-auto no-scrollbar"
    >
      {/* Modal Container */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col my-auto print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Modal Top Header Bar */}
        <div className={`px-3 sm:px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-emerald-950/10 border-slate-100'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-white truncate">
              Goods Inward & Purchase Voucher
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Compact Purchase Voucher Body Area */}
        <div
          className="p-3 sm:p-4 space-y-2 text-slate-800 bg-white"
          id="purchase-voucher-printable-area"
        >
          {/* Header Badge & Procurement Branding */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-sm sm:text-base">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Truck className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="truncate">{shopTitle}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.2 bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-xs">
              <Scale className="w-2.5 h-2.5" />
              <span>GOODS INWARD & PROCUREMENT VOUCHER</span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 border border-slate-100 rounded-xl p-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Voucher No</span>
              <span className="font-black text-emerald-700 text-xs font-mono">{cleanPurchaseNo}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{t('date')}</span>
              <span className="font-bold text-slate-800 text-xs">{date}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{t('supplierFirmName')}</span>
              <span className="font-bold text-slate-900 text-xs truncate block">{displaySupplier}</span>
              {(supplierCity || supplierPhone) && (
                <div className="text-[10px] text-slate-500 font-mono">
                  {supplierCity ? `📍 ${supplierCity}` : ''} {supplierPhone ? `📞 ${supplierPhone}` : ''}
                </div>
              )}
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{t('paymentMethodLabel')}</span>
              <span className="font-bold text-slate-800 text-xs">{paymentMode}</span>
              {truckNo && <div className="text-[10px] text-slate-500 font-medium">🚛 Truck: {truckNo}</div>}
            </div>
          </div>

          {/* Commodities / Inward Goods Table */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-900 text-white text-[9px] font-black uppercase tracking-wider">
                  <th className="py-1 px-2">COMMODITY / ITEM</th>
                  <th className="py-1 px-2 text-center w-20">QTY</th>
                  <th className="py-1 px-2 text-right w-24">TOTAL (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item, idx) => {
                  const itemPrice = Number(item.price || item.rate || 0);
                  const itemQty = Number(item.qty || 1);
                  const itemUnit = item.unit || item.unitName || t('kg');
                  const lineTotal = Number(item.total) || (itemPrice * itemQty);

                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                      <td className="py-1 px-2">
                        <div className="font-bold text-emerald-950 text-xs">{item.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono">Rate: Rs. {itemPrice.toLocaleString()} / {itemUnit}</div>
                      </td>
                      <td className="py-1 px-2 text-center font-bold text-slate-800 text-xs whitespace-nowrap">
                        {itemQty} {itemUnit}
                      </td>
                      <td className="py-1 px-2 text-right font-bold text-emerald-800 font-mono text-xs whitespace-nowrap">
                        Rs. {lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary Section */}
          <div className="border border-slate-200 rounded-xl p-2.5 space-y-1 text-xs bg-slate-50">
            <div className="flex justify-between items-center text-xs font-black text-slate-900">
              <span>{t('totalAmount')} (PKR):</span>
              <span className="text-sm text-emerald-700 font-mono">Rs. {totalNum.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-700 font-bold text-[11px]">
              <span>{t('paid')} ({t('cashOnCounter')}):</span>
              <span className="font-mono">Rs. {paidNum.toLocaleString()}</span>
            </div>

            {dueRemaining > 0 ? (
              <div className="flex justify-between items-center text-amber-700 font-bold pt-1 border-t border-slate-200 text-[11px]">
                <span>{t('remainingDue')}:</span>
                <span className="font-mono font-black">Rs. {dueRemaining.toLocaleString()}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-emerald-700 font-bold pt-1 border-t border-slate-200 text-[10px]">
                <span>{t('status')}:</span>
                <span>{t('settled')} (100% Paid)</span>
              </div>
            )}

            {note && (
              <div className="pt-1 text-[9px] text-slate-400 italic">
                <strong>Remarks:</strong> {note}
              </div>
            )}
          </div>

          {/* Mandi Weighment Sign-off footer */}
          <div className="border border-dashed border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2 text-[9px] text-slate-500">
            <div className="text-center w-28 border-t border-slate-300 pt-0.5 font-bold">
              Weigher (تولائی کار)
            </div>
            <div className="flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck className="w-3 h-3" />
              <span>Scale Verified</span>
            </div>
            <div className="text-center w-28 border-t border-slate-300 pt-0.5 font-bold">
              Receiver / Munshi
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className={`p-2.5 border-t flex items-center justify-between gap-2 print:hidden shrink-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>{t('close')}</span>
          </button>

          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download purchase voucher as A4 PDF file directly"
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
              className="flex-1 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print purchase arrival voucher"
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

export default PurchaseReceiptModal;
