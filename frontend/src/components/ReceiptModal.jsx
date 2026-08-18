import React, { useState } from 'react';
import { Printer, Download, Wheat, X, CheckCircle2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const ReceiptModal = ({ isOpen, onClose, orderData }) => {
  const { theme } = useTheme();
  const { t } = useLocale();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !orderData) return null;

  const {
    orderId = `GM-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
    date = new Date().toLocaleString('en-PK', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }),
    customerName = t('walkInCustomer'),
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

  const cleanOrderId = `#${String(orderId).replace(/[^0-9]/g, '') || '1786001834582'}`;
  const dueRemaining = Math.max(0, grandTotal - paidAmount);
  const displayCustomer = !customerName || customerName === 'walkInCustomer' ? t('walkInCustomer') : customerName;

  // 100% Reliable Print Function using an isolated printable document
  const handlePrint = () => {
    try {
      const existingFrame = document.getElementById('receipt-print-frame');
      if (existingFrame) {
        existingFrame.remove();
      }

      const printFrame = document.createElement('iframe');
      printFrame.id = 'receipt-print-frame';
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
        const lineTotal = itemPrice * itemQty;
        return `
          <tr>
            <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
              <div style="font-weight: 700; font-size: 12px; color: #0f172a;">${item.name}</div>
              <div style="font-size: 10px; color: #64748b;">Rs. ${itemPrice.toLocaleString()} / ${itemUnit}</div>
            </td>
            <td style="padding: 6px 0; text-align: center; font-weight: 700; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">
              ${itemQty} ${itemUnit}
            </td>
            <td style="padding: 6px 0; text-align: right; font-weight: 800; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">
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
            <title>Receipt - ${cleanOrderId}</title>
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
              .divider { border-top: 1px solid #e2e8f0; margin: 7px 0; }
              .dashed { border-top: 1px dashed #cbd5e1; margin: 8px 0; }
              .double-dashed { border-top: 2px dashed #0f172a; margin: 8px 0; }
              table { width: 100%; border-collapse: collapse; margin: 6px 0; }
              th { text-align: left; padding: 4px 0; border-bottom: 1.5px solid #0f172a; font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <!-- Brand Header -->
            <div class="center" style="margin-bottom: 8px;">
              <h1 style="font-size: 17px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a;">GHALLA MANDI ERP</h1>
              <p style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px;">Official Sales Tax Invoice</p>
            </div>

            <div class="divider"></div>

            <!-- Metadata Details -->
            <div style="font-size: 11px; line-height: 1.5;">
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Date:</span>
                <span style="font-weight: 700;">${date}</span>
              </div>
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Order ID:</span>
                <span style="font-weight: 800;">${cleanOrderId}</span>
              </div>
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Customer:</span>
                <span style="font-weight: 700;">${displayCustomer} ${customerCity ? `(${customerCity})` : ''}</span>
              </div>
              ${customerPhone ? `
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Phone:</span>
                <span style="font-weight: 700;">${customerPhone}</span>
              </div>` : ''}
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Payment Method:</span>
                <span style="font-weight: 800;">${paymentMethod}</span>
              </div>
            </div>

            <div class="divider"></div>

            <!-- Items Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">ITEM</th>
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
              <div class="flex-row">
                <span style="color: #64748b; font-weight: 600;">Subtotal:</span>
                <span style="font-weight: 700;">Rs. ${Number(subtotal).toLocaleString()}</span>
              </div>
              ${discount > 0 ? `
              <div class="flex-row" style="color: #059669; font-weight: 700;">
                <span>Discount:</span>
                <span>- Rs. ${Number(discount).toLocaleString()}</span>
              </div>` : ''}
              ${tax > 0 ? `
              <div class="flex-row" style="color: #d97706; font-weight: 700;">
                <span>Tax (GST):</span>
                <span>+ Rs. ${Number(tax).toLocaleString()}</span>
              </div>` : ''}

              <div class="double-dashed"></div>

              <div class="flex-row" style="font-size: 14px; font-weight: 900; margin-top: 2px;">
                <span>GRAND TOTAL:</span>
                <span>Rs. ${Number(grandTotal).toLocaleString()}</span>
              </div>

              <div class="flex-row" style="color: #047857; font-weight: 800; margin-top: 3px;">
                <span>Paid:</span>
                <span>Rs. ${Number(paidAmount).toLocaleString()}</span>
              </div>

              ${dueRemaining > 0 ? `
              <div class="flex-row" style="color: #b45309; font-weight: 800; margin-top: 2px;">
                <span>Remaining Due:</span>
                <span>Rs. ${Number(dueRemaining).toLocaleString()}</span>
              </div>` : `
              <div class="flex-row" style="color: #047857; font-weight: 700; margin-top: 2px;">
                <span>Status:</span>
                <span>PAID (100% Settled)</span>
              </div>`}

              ${saleNote ? `
              <div style="margin-top: 6px; font-size: 10px; color: #64748b; font-style: italic;">
                <strong>Note:</strong> ${saleNote}
              </div>` : ''}
            </div>

            <div class="dashed"></div>

            <!-- Footer Note -->
            <div class="center" style="margin-top: 8px; font-size: 10px; color: #64748b;">
              <p>Thank you for your business!</p>
              <p style="font-weight: 700; color: #0f172a; margin-top: 2px;">Ghalla Mandi ERP System</p>
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

  // Download Receipt as high-resolution PNG image
  const handleDownload = async () => {
    const receiptElement = document.getElementById('receipt-printable-area');
    if (!receiptElement) return;

    try {
      setIsDownloading(true);

      const canvas = await html2canvas(receiptElement, {
        scale: 3, // High-resolution Retina export
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      const imageURI = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageURI;
      link.download = `Receipt_${cleanOrderId.replace('#', '')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download receipt image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className={`w-full max-w-md rounded-3xl card-shadow border overflow-hidden flex flex-col print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>

        {/* Printable Receipt Body Area */}
        <div
          className="p-6 md:p-8 space-y-5 text-slate-800 bg-white"
          id="receipt-printable-area"
        >
          {/* Circular Logo Emblem & Title */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 border-amber-200/90 bg-amber-50/40 flex items-center justify-center mx-auto shadow-xs">
              <div className="w-11 h-11 rounded-full border border-amber-300/80 flex items-center justify-center bg-white">
                <Wheat className="w-6 h-6 text-brand-500 stroke-[2.2]" />
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2">
              {t('appName')}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              {t('receiptTaxInvoice')}
            </p>
          </div>

          {/* Date & Order ID Section */}
          <div className="space-y-1.5 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <span>{t('dateLabel')}:</span>
              <span className="font-bold text-slate-800">{date}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('orderIdLabel')}:</span>
              <span className="font-bold text-slate-800">{cleanOrderId}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('customerLabel')}:</span>
              <span className="font-bold text-slate-800">{displayCustomer} {customerCity ? `(${customerCity})` : ''}</span>
            </div>
            {customerPhone && (
              <div className="flex justify-between">
                <span>{t('phoneMobile')}:</span>
                <span className="font-bold text-slate-800">{customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('paymentMethodLabel')}:</span>
              <span className="font-bold text-slate-800">{paymentMethod}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1.5 border-b border-slate-100 uppercase">
              <span className="flex-1">{t('item')}</span>
              <span className="w-16 text-center">{t('qty')}</span>
              <span className="w-20 text-right">{t('price')}</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {items.map((item, idx) => {
                const itemPrice = Number(item.price || item.rate || 0);
                const itemQty = Number(item.qty || 1);
                const itemUnit = item.unit || item.unitName || t('kg');
                const lineTotal = itemPrice * itemQty;

                return (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-slate-800 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Rs. {itemPrice.toLocaleString()} / {itemUnit}</div>
                    </div>
                    <div className="w-16 text-center font-bold text-slate-700">
                      {itemQty} {itemUnit}
                    </div>
                    <div className="w-20 text-right font-extrabold text-slate-900">
                      Rs. {lineTotal.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calculations Summary Section */}
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>{t('subtotal')}:</span>
              <span className="font-bold text-slate-800">Rs. {Number(subtotal).toLocaleString()}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 font-bold">
                <span>{t('discount')}:</span>
                <span>- Rs. {Number(discount).toLocaleString()}</span>
              </div>
            )}

            {tax > 0 && (
              <div className="flex justify-between items-center text-amber-600 font-bold">
                <span>{t('taxGST')}:</span>
                <span>+ Rs. {Number(tax).toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-base font-black text-slate-900">{t('grandTotal')}:</span>
              <span className="text-xl font-black text-slate-900">
                Rs. {Number(grandTotal).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-emerald-700 font-bold pt-1">
              <span>{t('paid')}:</span>
              <span>Rs. {Number(paidAmount).toLocaleString()}</span>
            </div>

            {dueRemaining > 0 && (
              <div className="flex justify-between items-center text-amber-700 font-extrabold pt-1">
                <span>{t('remainingDueKhata')}:</span>
                <span>Rs. {Number(dueRemaining).toLocaleString()}</span>
              </div>
            )}

            {saleNote && (
              <div className="pt-2 text-[10px] text-slate-400 italic">
                <strong>Note:</strong> {saleNote}
              </div>
            )}
          </div>

          {/* Footer message */}
          <div className="pt-3 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-400">
            {t('computerGeneratedInvoice')}
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
            title="Download receipt as PNG Image"
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
            className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Print receipt on POS / Thermal printer"
          >
            <Printer className="w-4 h-4" />
            <span>{t('printReceiptBtn')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
