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
    items = [],
    totalAmount = 0,
    paidAmount = 0,
    paymentMode = 'Supplier Khata / Credit',
    supplierBalance = 0,
    note = ''
  } = purchaseData;

  const cleanPurchaseNo = `#${String(purchaseNo).replace(/[^0-9A-Za-z-]/g, '')}`;
  const totalNum = Number(totalAmount || 0);
  const paidNum = Number(paidAmount || 0);
  const dueRemaining = Math.max(0, totalNum - paidNum);

  // High Quality Isolated Print
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

      const itemsRowsHtml = items.map((item) => {
        const itemPrice = Number(item.price || item.rate || 0);
        const itemQty = Number(item.qty || 1);
        const itemUnit = item.unit || item.unitName || t('kg');
        const lineTotal = Number(item.total) || (itemPrice * itemQty);
        return `
          <tr>
            <td style="padding: 7px 0; border-bottom: 1px solid #e2e8f0;">
              <div style="font-weight: 800; font-size: 12px; color: #064e3b;">📦 ${item.name}</div>
              <div style="font-size: 10px; color: #64748b;">Rate: Rs. ${itemPrice.toLocaleString()} / ${itemUnit}</div>
            </td>
            <td style="padding: 7px 0; text-align: center; font-weight: 800; font-size: 11px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
              ${itemQty} ${itemUnit}
            </td>
            <td style="padding: 7px 0; text-align: right; font-weight: 800; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #064e3b;">
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
                size: 80mm auto;
                margin: 4mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                background: #ffffff;
                color: #0f172a;
                width: 100%;
                max-width: 320px;
                margin: 0 auto;
                padding: 6px 4px;
                font-size: 11px;
                line-height: 1.35;
              }
              .center { text-align: center; }
              .flex-row { display: flex; justify-content: space-between; align-items: center; }
              .divider { border-top: 1px solid #cbd5e1; margin: 7px 0; }
              .dashed { border-top: 1px dashed #94a3b8; margin: 8px 0; }
              .double-dashed { border-top: 2px dashed #064e3b; margin: 8px 0; }
              .badge {
                display: inline-block;
                padding: 3px 8px;
                background: #ecfdf5;
                color: #047857;
                border: 1px solid #a7f3d0;
                font-size: 9px;
                font-weight: 800;
                border-radius: 4px;
                text-transform: uppercase;
                margin-top: 3px;
              }
              table { width: 100%; border-collapse: collapse; margin: 6px 0; }
              th { text-align: left; padding: 4px 0; border-bottom: 1.5px solid #064e3b; font-size: 9.5px; font-weight: 800; color: #065f46; text-transform: uppercase; }
              .stamp-box {
                border: 1px dashed #cbd5e1;
                border-radius: 6px;
                padding: 8px;
                margin-top: 10px;
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                color: #475569;
              }
              .stamp-line {
                border-top: 1px solid #94a3b8;
                width: 100px;
                margin-top: 24px;
                text-align: center;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <!-- Procurement Brand Header -->
            <div class="center" style="margin-bottom: 6px;">
              <h1 style="font-size: 16px; font-weight: 900; letter-spacing: -0.5px; color: #064e3b;">GHALLA MANDI ERP</h1>
              <div class="badge">GOODS INWARD & PROCUREMENT VOUCHER</div>
              <p style="font-size: 9.5px; color: #64748b; margin-top: 2px;">خریداری رسید / مال آمد بل</p>
            </div>

            <div class="divider"></div>

            <!-- Metadata Details -->
            <div style="font-size: 10.5px; line-height: 1.5;">
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Voucher No:</span>
                <span style="font-weight: 800; color: #064e3b;">${cleanPurchaseNo}</span>
              </div>
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Arrival Date:</span>
                <span style="font-weight: 700;">${date}</span>
              </div>
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Supplier / Party:</span>
                <span style="font-weight: 800;">${supplierName} ${supplierCity ? `(${supplierCity})` : ''}</span>
              </div>
              ${supplierPhone ? `
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Phone:</span>
                <span style="font-weight: 700;">${supplierPhone}</span>
              </div>` : ''}
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Payment Mode:</span>
                <span style="font-weight: 700;">${paymentMode}</span>
              </div>
            </div>

            <div class="divider"></div>

            <!-- Inward Items Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">COMMODITY</th>
                  <th style="width: 22%; text-align: center;">QTY</th>
                  <th style="width: 28%; text-align: right;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>

            <div class="divider"></div>

            <!-- Financial Calculations Summary -->
            <div style="font-size: 11px; line-height: 1.55;">
              <div class="flex-row" style="font-size: 13px; font-weight: 900; color: #064e3b;">
                <span>PURCHASE TOTAL:</span>
                <span>Rs. ${totalNum.toLocaleString()}</span>
              </div>

              <div class="flex-row" style="color: #047857; font-weight: 700; margin-top: 3px;">
                <span>Paid on Delivery:</span>
                <span>Rs. ${paidNum.toLocaleString()}</span>
              </div>

              ${dueRemaining > 0 ? `
              <div class="flex-row" style="color: #b45309; font-weight: 800; margin-top: 2px;">
                <span>Supplier Credit (Payable):</span>
                <span>Rs. ${dueRemaining.toLocaleString()}</span>
              </div>` : `
              <div class="flex-row" style="color: #047857; font-weight: 700; margin-top: 2px;">
                <span>Payment Status:</span>
                <span>PAID (100% Settled)</span>
              </div>`}

              ${supplierBalance > 0 ? `
              <div class="flex-row" style="color: #475569; font-size: 10px; font-weight: 700; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
                <span>Supplier Total Balance:</span>
                <span>Rs. ${Number(supplierBalance).toLocaleString()}</span>
              </div>` : ''}

              ${note ? `
              <div style="margin-top: 6px; font-size: 10px; color: #64748b; font-style: italic;">
                <strong>Remarks:</strong> ${note}
              </div>` : ''}
            </div>

            <!-- Signatures verification -->
            <div class="stamp-box">
              <div>
                <div class="stamp-line">Weigher (تولائی کار)</div>
              </div>
              <div>
                <div class="stamp-line">Receiver / Munshi</div>
              </div>
            </div>

            <div class="dashed"></div>

            <!-- Footer Note -->
            <div class="center" style="margin-top: 6px; font-size: 9px; color: #64748b;">
              <p>Certified Inward Arrival & Weighment Record</p>
              <p style="font-weight: 700; color: #064e3b; margin-top: 2px;">Ghalla Mandi ERP Procurement</p>
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
