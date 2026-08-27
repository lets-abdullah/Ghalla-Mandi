import React, { useState } from 'react';
import { Printer, Download, Truck, X, Building2, CheckCircle2, Loader2, ShieldCheck, Scale } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const PurchaseReceiptModal = ({ isOpen, onClose, purchaseData }) => {
  const { theme } = useTheme();
  const { t } = useLocale();
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
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Commodity Procurement</div>
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
                width: 200px;
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
                    <div style="font-size: 24px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px;">GHALLA MANDI ERP</div>
                    <div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 2px;">COMMISSION AGENTS & GRAIN PROCUREMENT</div>
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

              <!-- Supplier Metadata -->
              <div class="meta-box">
                <table class="meta-table">
                  <tr>
                    <td style="width: 50%; border-right: 1px solid #bbf7d0; padding-right: 16px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #047857; margin-bottom: 4px;">SUPPLIER / GROWER DETAILS (سپلائر / زمیندار):</div>
                      <div style="font-size: 15px; font-weight: 900; color: #0f172a;">${displaySupplier}</div>
                      ${supplierCity ? `<div style="font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px;">📍 City: ${supplierCity}</div>` : ''}
                      ${supplierPhone ? `<div style="font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px;">📞 Phone: ${supplierPhone}</div>` : ''}
                    </td>
                    <td style="width: 50%; padding-left: 16px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #047857; margin-bottom: 4px;">PURCHASE DETAILS:</div>
                      <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Payment: <span style="color: #047857;">${paymentMode}</span></div>
                      ${truckNo ? `<div style="font-size: 12px; color: #0f172a; font-weight: 700; margin-top: 2px;">🚚 Truck / Vehicle: ${truckNo}</div>` : ''}
                      ${gatePassNo ? `<div style="font-size: 11px; color: #64748b;">🎫 Gate Pass: ${gatePassNo}</div>` : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Products Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">#</th>
                    <th style="text-align: left;">COMMODITY / GRAIN DESCRIPTION</th>
                    <th style="width: 130px; text-align: right;">PURCHASE RATE</th>
                    <th style="width: 130px; text-align: center;">QUANTITY / WEIGHT</th>
                    <th style="width: 150px; text-align: right;">TOTAL COST</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRowsHtml}
                </tbody>
              </table>

              <!-- Summary Table -->
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; color: #64748b;">
                      <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">Quality & Mandi Arrival Note:</div>
                      <div>• Goods verified on arrival by quality inspector & weighed at weighbridge.</div>
                      <div>• Inventory updated into system stock.</div>
                    </div>
                  </td>
                  <td style="width: 50%; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; font-weight: 700; color: #64748b;">Subtotal Amount:</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">Rs. ${Number(subtotalAmount || totalNum).toLocaleString()}</td>
                      </tr>
                      ${freightCharges > 0 ? `
                      <tr style="border-bottom: 1px solid #e2e8f0; color: #475569;">
                        <td style="padding: 8px 12px; font-weight: 700;">Freight / Carriage:</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">+ Rs. ${Number(freightCharges).toLocaleString()}</td>
                      </tr>` : ''}
                      <tr class="grand-total-row">
                        <td style="padding: 10px 14px; font-size: 14px; font-weight: 900;">TOTAL PAYABLE:</td>
                        <td style="padding: 10px 14px; text-align: right; font-size: 16px; font-weight: 900; font-family: monospace;">Rs. ${totalNum.toLocaleString()}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0; background: #ecfdf5; color: #047857;">
                        <td style="padding: 8px 12px; font-weight: 800;">Amount Paid (ادا شدہ):</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 900; font-family: monospace; font-size: 13px;">Rs. ${paidNum.toLocaleString()}</td>
                      </tr>
                      ${dueRemaining > 0 ? `
                      <tr style="background: #fffbeb; color: #b45309;">
                        <td style="padding: 8px 12px; font-weight: 800;">Balance Due (واجب الادا کھاتہ):</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 900; font-family: monospace; font-size: 13px;">Rs. ${dueRemaining.toLocaleString()}</td>
                      </tr>` : `
                      <tr style="background: #f0fdf4; color: #15803d;">
                        <td style="padding: 8px 12px; font-weight: 800;">Payment Status:</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 900; font-size: 12px;">✓ FULLY PAID</td>
                      </tr>`}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signatures -->
              <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="sig-box">
                  Supplier / Grower Signature<br />
                  <span style="font-size: 10px; font-weight: 600; color: #94a3b8;">دستخط سپلائر</span>
                </div>
                <div class="sig-box">
                  Authorized Munshi Signature<br />
                  <span style="font-size: 10px; font-weight: 600; color: #94a3b8;">مہر و دستخط منشی</span>
                </div>
              </div>
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

  // Download Purchase Voucher as high-resolution PNG image
  const handleDownload = async () => {
    const voucherElement = document.getElementById('purchase-voucher-printable-area');
    if (!voucherElement) return;

    try {
      setIsDownloading(true);

      const canvas = await html2canvas(voucherElement, {
        scale: 3, // High-resolution export
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      const imageURI = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageURI;
      link.download = `Purchase_Voucher_${cleanPurchaseNo.replace('#', '')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download purchase voucher image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className={`w-full max-w-lg rounded-3xl card-shadow border overflow-hidden flex flex-col print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>

        {/* Printable Purchase Voucher Body Area */}
        <div
          className="p-6 md:p-8 space-y-5 text-slate-800 bg-white"
          id="purchase-voucher-printable-area"
        >
          {/* Header Badge & Procurement Branding */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-black text-lg">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Truck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span>{t('appName')}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
              <Scale className="w-3 h-3" />
              <span>GOODS INWARD & PROCUREMENT VOUCHER</span>
            </div>
            <p className="text-[11px] font-bold text-emerald-700">
              خریداری رسید / مال آمد بل (Mandi Arrival Voucher)
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher No</span>
              <span className="font-black text-emerald-700 text-sm font-mono">{cleanPurchaseNo}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('date')}</span>
              <span className="font-bold text-slate-800">{date}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('supplierFirmName')}</span>
              <span className="font-extrabold text-slate-900">{supplierName} {supplierCity ? `(${supplierCity})` : ''}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('paymentMethodLabel')}</span>
              <span className="font-bold text-slate-800">{paymentMode}</span>
            </div>
          </div>

          {/* Commodities / Inward Goods Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="bg-emerald-900 text-white flex items-center justify-between text-[10px] font-black uppercase tracking-wider px-3.5 py-2">
              <span className="flex-1">COMMODITY / ITEM</span>
              <span className="w-20 text-center">WEIGHT / QTY</span>
              <span className="w-24 text-right">TOTAL (PKR)</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {items.map((item, idx) => {
                const itemPrice = Number(item.price || item.rate || 0);
                const itemQty = Number(item.qty || 1);
                const itemUnit = item.unit || item.unitName || t('kg');
                const lineTotal = Number(item.total) || (itemPrice * itemQty);

                return (
                  <div key={idx} className="flex items-center justify-between p-3">
                    <div className="flex-1 pr-2">
                      <div className="font-extrabold text-emerald-950 text-xs">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Rate: Rs. {itemPrice.toLocaleString()} / {itemUnit}</div>
                    </div>
                    <div className="w-20 text-center font-black text-slate-800">
                      {itemQty} {itemUnit}
                    </div>
                    <div className="w-24 text-right font-black text-emerald-800">
                      Rs. {lineTotal.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calculations Summary Section */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2 text-xs bg-slate-50">
            <div className="flex justify-between items-center text-sm font-black text-slate-900">
              <span>{t('totalAmount')} (PKR):</span>
              <span className="text-base text-emerald-700">Rs. {totalNum.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-700 font-bold">
              <span>{t('paid')} ({t('cashOnCounter')}):</span>
              <span>Rs. {paidNum.toLocaleString()}</span>
            </div>

            {dueRemaining > 0 ? (
              <div className="flex justify-between items-center text-amber-700 font-black pt-1.5 border-t border-slate-200">
                <span>{t('remainingDue')} ({t('mandiLedger')}):</span>
                <span>Rs. {dueRemaining.toLocaleString()}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-emerald-700 font-black pt-1.5 border-t border-slate-200">
                <span>{t('status')}:</span>
                <span>{t('settled')} (100% Paid)</span>
              </div>
            )}

            {note && (
              <div className="pt-2 text-[10px] text-slate-400 italic">
                <strong>Remarks:</strong> {note}
              </div>
            )}
          </div>

          {/* Mandi Weighment Sign-off footer */}
          <div className="border border-dashed border-slate-200 rounded-2xl p-3 flex items-center justify-between text-[10px] text-slate-500">
            <div className="text-center">
              <div className="h-6"></div>
              <div className="border-t border-slate-300 pt-1 font-bold">Weigher (تولائی کار)</div>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Goods Inward Verified</span>
            </div>
            <div className="text-center">
              <div className="h-6"></div>
              <div className="border-t border-slate-300 pt-1 font-bold">Receiver / Munshi</div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer - Hidden during print */}
        <div className={`p-4 border-t flex items-center justify-between gap-2.5 print:hidden shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
          }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
          >
            <X className="w-4 h-4" />
            <span>{t('close')}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Download purchase voucher as PNG Image"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{t('downloadReceiptBtn') || 'Download'}</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Print purchase arrival voucher"
          >
            <Printer className="w-4 h-4" />
            <span>{t('Print Receipt')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default PurchaseReceiptModal;
