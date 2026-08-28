import React, { useState } from 'react';
import { Printer, Download, Wheat, X, CheckCircle2, Loader2, FileText, User, Phone, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';

export const ReceiptModal = ({ isOpen, onClose, orderData }) => {
  const { theme } = useTheme();
  const { t } = useLocale();
  const { shop } = useAuth();
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
  const dueRemaining = Math.max(0, Number(grandTotal || 0) - Number(paidAmount || 0));
  const displayCustomer = !customerName || customerName === 'walkInCustomer' ? (t('walkInCustomer') || 'Walk-in Customer') : customerName;
  const shopTitle = shop?.name || 'GHALLA MANDI ERP';
  const mandiTitle = shop?.mandiName || 'COMMISSION SHOP & GRAIN WHOLESALE MARKET';
  const shopPhone = shop?.businessPhone || shop?.phone || '';

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
              .grand-total-row {
                background: #0f172a;
                color: #ffffff;
                font-size: 15px;
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
                    <div style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${shopTitle}</div>
                    <div style="font-size: 12px; font-weight: 700; color: #16a34a; margin-top: 2px;">${mandiTitle}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">SALES TAX INVOICE & CASH MEMO • GATE PASS ${shopPhone ? `• 📞 ${shopPhone}` : ''}</div>
                  </td>
                  <td style="vertical-align: middle; text-align: right; width: 40%;">
                    <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; text-align: right;">
                      <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">INVOICE NO.</div>
                      <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">${cleanOrderId}</div>
                      <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">${date}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Meta Table -->
              <div class="meta-box">
                <table class="meta-table">
                  <tr>
                    <td style="width: 50%;">
                      <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">BILLED TO (خریدار):</div>
                      <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${displayCustomer}</div>
                      ${customerCity ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 City: ${customerCity}</div>` : ''}
                      ${customerPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">📞 Phone: ${customerPhone}</div>` : ''}
                    </td>
                    <td style="width: 50%; text-align: right;">
                      <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">PAYMENT TERMS:</div>
                      <div style="font-size: 13px; font-weight: 800; color: #16a34a; margin-top: 2px;">${paymentMethod}</div>
                      ${saleNote ? `<div style="font-size: 11px; color: #475569; font-style: italic; margin-top: 2px;">Note: ${saleNote}</div>` : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">#</th>
                    <th style="text-align: left;">COMMODITY / ITEM DESCRIPTION</th>
                    <th style="width: 110px; text-align: right;">RATE (PKR)</th>
                    <th style="width: 100px; text-align: center;">QTY / WEIGHT</th>
                    <th style="width: 120px; text-align: right;">AMOUNT (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${a4ItemsHtml}
                </tbody>
              </table>

              <!-- Totals Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="width: 55%; vertical-align: top; padding-right: 20px;">
                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; color: #64748b; background: #fafafa;">
                      <div style="font-weight: 800; color: #334155; margin-bottom: 4px;">Terms & Conditions:</div>
                      <div>• Goods once sold are subject to standard Ghalla Mandi trade rules.</div>
                      <div>• Official Sales Tax Invoice & Cash Memo.</div>
                      <div>• Computer-generated voucher by Ghalla Mandi ERP.</div>
                    </div>
                  </td>
                  <td style="width: 45%; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                      <tr>
                        <td style="padding: 4px 8px; color: #64748b; font-weight: 600;">Subtotal:</td>
                        <td style="padding: 4px 8px; text-align: right; font-weight: 700; font-family: monospace;">Rs. ${Number(subtotal).toLocaleString()}</td>
                      </tr>
                      ${discount > 0 ? `
                        <tr>
                          <td style="padding: 4px 8px; color: #16a34a; font-weight: 700;">Discount:</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 700; color: #16a34a; font-family: monospace;">- Rs. ${Number(discount).toLocaleString()}</td>
                        </tr>
                      ` : ''}
                      ${tax > 0 ? `
                        <tr>
                          <td style="padding: 4px 8px; color: #d97706; font-weight: 700;">Mandi Tax / GST:</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 700; color: #d97706; font-family: monospace;">+ Rs. ${Number(tax).toLocaleString()}</td>
                        </tr>
                      ` : ''}
                      <tr class="grand-total-row">
                        <td style="border-radius: 6px 0 0 6px;">GRAND TOTAL:</td>
                        <td style="text-align: right; border-radius: 0 6px 6px 0; font-family: monospace;">Rs. ${Number(grandTotal).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 8px 4px; color: #16a34a; font-weight: 800;">Paid Amount:</td>
                        <td style="padding: 6px 8px 4px; text-align: right; font-weight: 800; color: #16a34a; font-family: monospace;">Rs. ${Number(paidAmount).toLocaleString()}</td>
                      </tr>
                      ${dueRemaining > 0 ? `
                        <tr>
                          <td style="padding: 4px 8px; color: #dc2626; font-weight: 800;">Balance Due (Khata):</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 900; color: #dc2626; font-family: monospace;">Rs. ${Number(dueRemaining).toLocaleString()}</td>
                        </tr>
                      ` : `
                        <tr>
                          <td style="padding: 4px 8px; color: #16a34a; font-weight: 700;">Status:</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 800; color: #16a34a;">✓ FULLY PAID</td>
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
                    <div class="sig-box">Customer Signature (دستخط خریدار)</div>
                  </td>
                  <td style="width: 50%; vertical-align: bottom; text-align: right;">
                    <div class="sig-box" style="margin-left: auto;">Authorized Signature & Stamp (مہر منشی)</div>
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

  // Download Receipt as High Quality A4 PDF Document
  const handleDownloadPDF = async () => {
    // Directly trigger high-resolution A4 print / Save as PDF engine
    handlePrint();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
    >
      {/* Modal Container with guaranteed pinned header and footer */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Modal Top Header Bar - Always Pinned */}
        <div className={`px-4 sm:px-6 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <Wheat className="w-5 h-5 text-brand-500 shrink-0" />
            <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-white truncate">
              {t('receiptTaxInvoice') || 'Sales Tax Invoice'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden xs:inline-block px-2.5 py-0.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-[11px] border border-brand-500/20">
              A4 Format
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

        {/* Printable Receipt Body Area - Clean scrollable if content exceeds height, no ugly scrollbars */}
        <div
          className="flex-1 overflow-y-auto no-scrollbar p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 text-slate-800 bg-white"
          id="receipt-printable-area"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b-2 border-slate-900">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-black shrink-0">
                <Wheat className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {shopTitle}
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {mandiTitle}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto text-left sm:text-right bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-100 flex sm:block justify-between items-center">
              <div>
                <div className="text-[9px] font-extrabold uppercase text-slate-400">INVOICE NO.</div>
                <div className="font-mono font-black text-sm sm:text-base text-slate-900">{cleanOrderId}</div>
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500">{date}</div>
            </div>
          </div>

          {/* Customer & Payment Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-0.5 sm:border-r sm:border-slate-200/80 sm:pr-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block">{t('customerLabel') || 'Billed To (خریدار)'}:</span>
              <div className="font-black text-sm text-slate-900">{displayCustomer}</div>
              {customerCity && <div className="text-[11px] text-slate-600 font-medium">📍 {customerCity}</div>}
              {customerPhone && <div className="text-[11px] text-slate-600 font-medium">📞 {customerPhone}</div>}
            </div>

            <div className="space-y-0.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200 sm:pl-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">{t('paymentMethodLabel') || 'Payment Mode'}:</span>
              <div className="font-black text-sm text-brand-600">{paymentMethod}</div>
              {saleNote && <div className="text-[11px] text-slate-500 italic">📝 {saleNote}</div>}
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Counter POS Verified & Dispatched
              </div>
            </div>
          </div>

          {/* Items Table with Horizontal Scroll for Mobile */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[440px] sm:min-w-0">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">{t('item') || 'Item / Commodity'}</th>
                    <th className="py-2.5 px-3 text-right">{t('price') || 'Rate'}</th>
                    <th className="py-2.5 px-3 text-center">{t('qty') || 'Qty / Weight'}</th>
                    <th className="py-2.5 px-3 text-right">{t('total') || 'Total'}</th>
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
                        <td className="py-2.5 px-3 text-center font-black text-slate-800 whitespace-nowrap">
                          {itemQty} <span className="text-[10px] text-slate-500 font-normal">{itemUnit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          Rs. {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations Summary Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="order-2 sm:order-1 text-[10px] text-slate-400 space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-700">Terms & Mandi Conditions:</p>
              <p>• Goods once sold are verified per standard Ghalla Mandi trade rules.</p>
              <p>• Official sales tax invoice & cash memo gate pass.</p>
              <p>• Thank you for your valued business with {shopTitle}!</p>
            </div>

            <div className="order-1 sm:order-2 space-y-1.5 text-xs">
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
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-4 border-t border-slate-100">
            <div className="text-center w-40 sm:w-44 border-t-2 border-dashed border-slate-300 pt-2 text-[10px] font-bold text-slate-500">
              Customer Signature (دستخط خریدار)
            </div>
            <div className="text-center w-40 sm:w-44 border-t-2 border-dashed border-slate-300 pt-2 text-[10px] font-bold text-slate-500">
              Authorized Signature & Stamp (مہر منشی)
            </div>
          </div>
        </div>

        {/* Modal Actions Footer: Close | Download PDF | Print */}
        <div className={`p-3 sm:p-4 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 print:hidden shrink-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
            <span>{t('close')}</span>
          </button>

          <div className="flex flex-1 items-center gap-2">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download official receipt as A4 PDF file"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print A4 Invoice Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-black transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print A4 receipt"
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

export default ReceiptModal;
