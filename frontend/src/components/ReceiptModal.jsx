import React, { useState } from 'react';
import { Printer, Download, Wheat, X, CheckCircle2, Loader2, FileText } from 'lucide-react';
import html2pdf from 'html2pdf.js';
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

  const cleanOrderId = `#${String(orderId).replace(/[^0-9A-Za-z-]/g, '') || '1786001834582'}`;
  const dueRemaining = Math.max(0, grandTotal - paidAmount);
  const displayCustomer = !customerName || customerName === 'walkInCustomer' ? (t('walkInCustomer') || 'Walk-in Customer') : customerName;

  // 100% Reliable A4 Print Function via isolated iframe
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

      // FULL WIDTH A4 ENTERPRISE INVOICE FORMAT
      const a4ItemsHtml = items.map((item, idx) => {
        const itemPrice = Number(item.price || item.rate || 0);
        const itemQty = Number(item.qty || 1);
        const itemUnit = item.unit || item.unitName || t('kg');
        const lineTotal = itemPrice * itemQty;
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
            <td style="padding: 10px 12px; font-weight: 700; color: #64748b; text-align: center; width: 45px;">${idx + 1}</td>
            <td style="padding: 10px 12px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${item.name}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Commodity / Product</div>
            </td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 700; font-size: 13px; color: #334155; font-family: monospace;">
              Rs. ${itemPrice.toLocaleString()}
            </td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 800; font-size: 13px; color: #1e293b;">
              ${itemQty} <span style="font-size: 11px; color: #64748b; font-weight: 600;">${itemUnit}</span>
            </td>
            <td style="padding: 10px 14px; text-align: right; font-weight: 900; font-size: 14px; color: #0f172a; font-family: monospace;">
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
            <title>Sales Invoice - ${cleanOrderId}</title>
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
                border: 1.5px solid #cbd5e1;
                border-radius: 12px;
                overflow: hidden;
                padding: 24px;
              }
              .header-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 2px solid #0f172a;
              }
              .meta-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
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
                background: #0f172a;
                color: #ffffff;
                padding: 10px 12px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .summary-table {
                width: 100%;
                border-collapse: collapse;
              }
              .grand-total-row {
                background: #0f172a;
                color: #ffffff;
                font-size: 16px;
                font-weight: 900;
              }
              .grand-total-row td {
                padding: 10px 14px;
              }
              .signature-section {
                margin-top: 40px;
                width: 100%;
                display: flex;
                justify-content: space-between;
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
                    <div style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">GHALLA MANDI ERP</div>
                    <div style="font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px;">COMMISSION SHOP & GRAIN WHOLESALE MARKET</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Official Sales Tax Invoice / کیش میمو و سیلز بل</div>
                  </td>
                  <td style="vertical-align: middle; text-align: right; width: 40%;">
                    <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; text-align: right;">
                      <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">INVOICE NUMBER</div>
                      <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">${cleanOrderId}</div>
                      <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">${date}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Customer and Billing Metadata -->
              <div class="meta-box">
                <table class="meta-table">
                  <tr>
                    <td style="width: 50%; border-right: 1px solid #e2e8f0; padding-right: 16px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">CUSTOMER DETAILS (خریدار):</div>
                      <div style="font-size: 15px; font-weight: 900; color: #0f172a;">${displayCustomer}</div>
                      ${customerCity ? `<div style="font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px;">📍 City / Market: ${customerCity}</div>` : ''}
                      ${customerPhone ? `<div style="font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px;">📞 Phone: ${customerPhone}</div>` : ''}
                    </td>
                    <td style="width: 50%; padding-left: 16px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">PAYMENT & ORDER INFO:</div>
                      <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Mode: <span style="color: #2563eb;">${paymentMethod}</span></div>
                      ${saleNote ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">📝 Remarks: ${saleNote}</div>` : ''}
                      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Counter POS Dispatch</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Products Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">#</th>
                    <th style="text-align: left;">ITEM / COMMODITY DESCRIPTION</th>
                    <th style="width: 130px; text-align: right;">RATE (PKR)</th>
                    <th style="width: 130px; text-align: center;">QTY / WEIGHT</th>
                    <th style="width: 150px; text-align: right;">TOTAL AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  ${a4ItemsHtml}
                </tbody>
              </table>

              <!-- Summary Table -->
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; color: #64748b;">
                      <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">Terms & Conditions:</div>
                      <div>• Goods once sold are verified per standard Ghalla Mandi trade rules.</div>
                      <div>• Computer generated official sale invoice & gate pass.</div>
                      <div>• Thank you for your valued business with Ghalla Mandi ERP!</div>
                    </div>
                  </td>
                  <td style="width: 50%; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; font-weight: 700; color: #64748b;">Gross Subtotal:</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">Rs. ${Number(subtotal).toLocaleString()}</td>
                      </tr>
                      ${discount > 0 ? `
                      <tr style="border-bottom: 1px solid #e2e8f0; color: #059669;">
                        <td style="padding: 8px 12px; font-weight: 700;">Discount:</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">- Rs. ${Number(discount).toLocaleString()}</td>
                      </tr>` : ''}
                      ${tax > 0 ? `
                      <tr style="border-bottom: 1px solid #e2e8f0; color: #d97706;">
                        <td style="padding: 8px 12px; font-weight: 700;">Mandi Tax / GST:</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">+ Rs. ${Number(tax).toLocaleString()}</td>
                      </tr>` : ''}
                      <tr class="grand-total-row">
                        <td style="padding: 10px 14px; font-size: 14px; font-weight: 900;">GRAND TOTAL:</td>
                        <td style="padding: 10px 14px; text-align: right; font-size: 16px; font-weight: 900; font-family: monospace;">Rs. ${Number(grandTotal).toLocaleString()}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0; background: #ecfdf5; color: #047857;">
                        <td style="padding: 8px 12px; font-weight: 800;">Amount Paid (وصول):</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 900; font-family: monospace; font-size: 13px;">Rs. ${Number(paidAmount).toLocaleString()}</td>
                      </tr>
                      ${dueRemaining > 0 ? `
                      <tr style="background: #fffbeb; color: #b45309;">
                        <td style="padding: 8px 12px; font-weight: 800;">Balance Due (ادھار / کھاتہ):</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 900; font-family: monospace; font-size: 13px;">Rs. ${Number(dueRemaining).toLocaleString()}</td>
                      </tr>` : `
                      <tr style="background: #f0fdf4; color: #15803d;">
                        <td style="padding: 8px 12px; font-weight: 800;">Settlement Status:</td>
                        <td style="padding: 8px 12px; text-align: right; font-weight: 900; font-size: 12px;">✓ FULLY PAID (صاف)</td>
                      </tr>`}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signatures -->
              <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="sig-box">
                  Customer Signature<br />
                  <span style="font-size: 10px; font-weight: 600; color: #94a3b8;">دستخط خریدار</span>
                </div>
                <div class="sig-box">
                  Authorized Signature & Stamp<br />
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

  // Download Receipt as High Quality A4 PDF Document
  const handleDownloadPDF = async () => {
    const receiptElement = document.getElementById('receipt-printable-area');
    if (!receiptElement) return;

    try {
      setIsDownloading(true);

      const opt = {
        margin: [10, 10, 10, 10], // top, left, bottom, right in mm
        filename: `Invoice_${cleanOrderId.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`,
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

      await html2pdf().set(opt).from(receiptElement).save();
    } catch (err) {
      console.error('Failed to download receipt PDF:', err);
      alert('Failed to generate PDF. Please try using the Print button to Save as PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Container - Full A4 View */}
      <div className={`w-full max-w-3xl rounded-3xl card-shadow border overflow-hidden flex flex-col my-6 print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>

        {/* Modal Top Header Bar */}
        <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-3 ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <Wheat className="w-5 h-5 text-brand-500" />
            <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-white">
              {t('receiptTaxInvoice') || 'Sales Tax Invoice'} (Full Page A4)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-[11px] border border-brand-500/20">
              A4 Format
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body Area (A4 Layout) */}
        <div
          className="p-6 md:p-8 space-y-5 text-slate-800 bg-white"
          id="receipt-printable-area"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-black">
                  <Wheat className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                    GHALLA MANDI ERP
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                    COMMISSION SHOP & GRAIN WHOLESALE MARKET • SALES TAX INVOICE
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-extrabold uppercase text-slate-400">INVOICE NO.</div>
              <div className="font-mono font-black text-lg text-slate-900">{cleanOrderId}</div>
              <div className="text-[11px] font-semibold text-slate-500">{date}</div>
            </div>
          </div>

          {/* Customer & Payment Meta Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1 border-r border-slate-200/80 pr-3">
              <span className="text-[10px] font-black uppercase text-slate-400 block">{t('customerLabel') || 'Billed To (خریدار)'}:</span>
              <div className="font-black text-sm text-slate-900">{displayCustomer}</div>
              {customerCity && <div className="text-[11px] text-slate-600 font-medium">📍 {customerCity}</div>}
              {customerPhone && <div className="text-[11px] text-slate-600 font-medium">📞 {customerPhone}</div>}
            </div>

            <div className="space-y-1 pl-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">{t('paymentMethodLabel') || 'Payment Mode'}:</span>
              <div className="font-black text-sm text-brand-600">{paymentMethod}</div>
              {saleNote && <div className="text-[11px] text-slate-500 italic">📝 {saleNote}</div>}
              <div className="text-[10px] text-emerald-600 font-bold">✓ Counter POS Verified & Dispatched</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">{t('item') || 'Item / Commodity Description'}</th>
                  <th className="py-2.5 px-3 text-right">{t('price') || 'Rate (PKR)'}</th>
                  <th className="py-2.5 px-3 text-center">{t('qty') || 'Qty / Weight'}</th>
                  <th className="py-2.5 px-3 text-right">{t('total') || 'Total Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item, idx) => {
                  const itemPrice = Number(item.price || item.rate || 0);
                  const itemQty = Number(item.qty || 1);
                  const itemUnit = item.unit || item.unitName || t('kg');
                  const lineTotal = itemPrice * itemQty;

                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="py-2.5 px-3 font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-black text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400">Commodity Produce</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-600">
                        Rs. {itemPrice.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-800">
                        {itemQty} <span className="text-[10px] text-slate-500 font-normal">{itemUnit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        Rs. {lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary Section */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="text-[10px] text-slate-400 space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-700">Terms & Mandi Conditions:</p>
              <p>• Goods once sold are verified per standard Ghalla Mandi trade rules.</p>
              <p>• Official sales tax invoice & cash memo gate pass.</p>
              <p>• Thank you for your valued business with Ghalla Mandi ERP!</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>{t('subtotal') || 'Gross Subtotal'}:</span>
                <span className="font-bold font-mono text-slate-800">Rs. {Number(subtotal).toLocaleString()}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>{t('discount') || 'Discount'}:</span>
                  <span className="font-mono">- Rs. {Number(discount).toLocaleString()}</span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex justify-between items-center text-amber-600 font-bold">
                  <span>{t('taxGST') || 'Mandi Tax / GST'}:</span>
                  <span className="font-mono">+ Rs. {Number(tax).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 text-white font-black text-sm">
                <span>{t('grandTotal') || 'GRAND TOTAL'}:</span>
                <span className="font-mono text-base">
                  Rs. {Number(grandTotal).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 font-bold px-1">
                <span>{t('paid') || 'Amount Paid (وصول)'}:</span>
                <span className="font-mono">Rs. {Number(paidAmount).toLocaleString()}</span>
              </div>

              {dueRemaining > 0 ? (
                <div className="flex justify-between items-center text-amber-700 font-extrabold px-1">
                  <span>{t('remainingDueKhata') || 'Balance Due (ادھار / کھاتہ)'}:</span>
                  <span className="font-mono">Rs. {Number(dueRemaining).toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-emerald-600 font-bold px-1 text-[11px]">
                  <span>Settlement Status:</span>
                  <span>✓ FULLY PAID (صاف)</span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 flex justify-between items-end border-t border-slate-100">
            <div className="text-center w-44 border-t-2 border-dashed border-slate-300 pt-2 text-[10px] font-bold text-slate-500">
              Customer Signature (دستخط خریدار)
            </div>
            <div className="text-center w-44 border-t-2 border-dashed border-slate-300 pt-2 text-[10px] font-bold text-slate-500">
              Authorized Signature & Stamp (مہر منشی)
            </div>
          </div>
        </div>

        {/* Modal Actions Footer: Close | Download PDF | Print */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 print:hidden shrink-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
            <span>{t('close')}</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Download official receipt as A4 PDF file"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF (A4)</span>
              </>
            )}
          </button>

          {/* Print A4 Invoice Button */}
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-black transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Print A4 receipt"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice (A4)</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
