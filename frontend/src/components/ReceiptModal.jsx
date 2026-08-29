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
    try {
      setIsDownloading(true);

      const a4ItemsHtml = items.map((item, idx) => {
        const itemPrice = Number(item.price || item.rate || 0);
        const itemQty = Number(item.qty || 1);
        const itemUnit = item.unit || item.unitName || t('kg');
        const lineTotal = itemPrice * itemQty;
        const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

        return `
          <tr style="background: ${bg};">
            <td style="padding: 8px 10px; font-weight: bold; color: #64748b; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
              <div style="font-weight: bold; color: #0f172a; font-size: 12px; line-height: 1.3;">${item.name}</div>
              <div style="font-size: 10px; color: #94a3b8; line-height: 1.2;">Ghalla Mandi Produce</div>
            </td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #334155; border-bottom: 1px solid #e2e8f0; font-size: 12px; white-space: nowrap;">
              Rs. ${itemPrice.toLocaleString()}
            </td>
            <td style="padding: 8px 10px; text-align: center; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-size: 12px; white-space: nowrap;">
              ${itemQty} <span style="font-size: 10px; font-weight: normal; color: #64748b;">${itemUnit}</span>
            </td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-size: 12px; white-space: nowrap;">
              Rs. ${lineTotal.toLocaleString()}
            </td>
          </tr>
        `;
      }).join('');

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0px';
      container.style.left = '0px';
      container.style.width = '750px';
      container.style.zIndex = '999999';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#0f172a';
      container.style.padding = '24px 28px';
      container.style.boxSizing = 'border-box';
      container.style.fontFamily = 'Arial, Helvetica, sans-serif';

      container.innerHTML = `
        <div style="width: 100%; box-sizing: border-box; background: #ffffff;">
          <!-- Header -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px;">
            <tr>
              <td style="vertical-align: middle; width: 60%; padding-bottom: 8px;">
                <div style="font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1.2;">${shopTitle}</div>
                <div style="font-size: 12px; font-weight: 700; color: #16a34a; margin-top: 3px;">${mandiTitle}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 3px; font-weight: 600;">SALES TAX INVOICE & CASH MEMO • GATE PASS ${shopPhone ? `• 📞 ${shopPhone}` : ''}</div>
              </td>
              <td style="vertical-align: middle; text-align: right; width: 40%; padding-bottom: 8px;">
                <div style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; text-align: right;">
                  <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">INVOICE NO.</div>
                  <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 1px;">${cleanOrderId}</div>
                  <div style="font-size: 10px; font-weight: 600; color: #475569; margin-top: 2px;">${date}</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Meta Box -->
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding: 10px 14px; border-right: 1px solid #e2e8f0;">
                <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">BILLED TO (خریدار):</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 3px; line-height: 1.3;">${displayCustomer}</div>
                ${customerCity ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 City: ${customerCity}</div>` : ''}
                ${customerPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">📞 Phone: ${customerPhone}</div>` : ''}
              </td>
              <td style="width: 50%; vertical-align: top; padding: 10px 14px; text-align: right;">
                <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">PAYMENT METHOD:</div>
                <div style="font-size: 13px; font-weight: 900; color: #16a34a; margin-top: 3px;">${paymentMethod}</div>
                ${saleNote ? `<div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px;">Note: ${saleNote}</div>` : ''}
                <div style="font-size: 10px; font-weight: 700; color: #059669; margin-top: 3px;">✓ Counter POS Verified & Dispatched</div>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 35px; text-align: center;">#</th>
                <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; text-align: left;">COMMODITY / ITEM DESCRIPTION</th>
                <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 110px; text-align: right;">RATE (PKR)</th>
                <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 95px; text-align: center;">QTY / WEIGHT</th>
                <th style="padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 115px; text-align: right;">AMOUNT (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${a4ItemsHtml}
            </tbody>
          </table>

          <!-- Totals Section -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="width: 52%; vertical-align: top; padding-right: 14px;">
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 10px; color: #64748b; background: #f8fafc; line-height: 1.5;">
                  <div style="font-weight: 800; color: #334155; margin-bottom: 2px;">Terms & Conditions:</div>
                  <div>• Goods once sold are verified per standard Ghalla Mandi trade rules.</div>
                  <div>• Official sales tax invoice & cash memo gate pass.</div>
                  <div style="margin-top: 4px; font-weight: 700; color: #16a34a;">Thank you for your valued business!</div>
                </div>
              </td>
              <td style="width: 48%; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  <tr>
                    <td style="padding: 3px 6px; color: #64748b; font-weight: 600;">Gross Subtotal:</td>
                    <td style="padding: 3px 6px; text-align: right; font-weight: bold;">Rs. ${Number(subtotal).toLocaleString()}</td>
                  </tr>
                  ${discount > 0 ? `
                    <tr>
                      <td style="padding: 3px 6px; color: #16a34a; font-weight: bold;">Discount:</td>
                      <td style="padding: 3px 6px; text-align: right; font-weight: bold; color: #16a34a;">- Rs. ${Number(discount).toLocaleString()}</td>
                    </tr>
                  ` : ''}
                  ${tax > 0 ? `
                    <tr>
                      <td style="padding: 3px 6px; color: #d97706; font-weight: bold;">Tax / GST:</td>
                      <td style="padding: 3px 6px; text-align: right; font-weight: bold; color: #d97706;">+ Rs. ${Number(tax).toLocaleString()}</td>
                    </tr>
                  ` : ''}
                  <tr style="background: #0f172a; color: #ffffff; font-weight: 900; font-size: 12px;">
                    <td style="padding: 6px 8px;">GRAND TOTAL:</td>
                    <td style="padding: 6px 8px; text-align: right; font-size: 13px;">Rs. ${Number(grandTotal).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 6px; color: #16a34a; font-weight: bold;">Amount Paid:</td>
                    <td style="padding: 4px 6px; text-align: right; font-weight: bold; color: #16a34a;">Rs. ${Number(paidAmount).toLocaleString()}</td>
                  </tr>
                  ${dueRemaining > 0 ? `
                    <tr>
                      <td style="padding: 4px 6px; color: #dc2626; font-weight: bold;">Balance Due (Khata):</td>
                      <td style="padding: 4px 6px; text-align: right; font-weight: 900; color: #dc2626;">Rs. ${Number(dueRemaining).toLocaleString()}</td>
                    </tr>
                  ` : `
                    <tr>
                      <td style="padding: 4px 6px; color: #16a34a; font-weight: 600;">Status:</td>
                      <td style="padding: 4px 6px; text-align: right; font-weight: bold; color: #16a34a;">✓ FULLY PAID</td>
                    </tr>
                  `}
                </table>
              </td>
            </tr>
          </table>

          <!-- Signatures -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
            <tr>
              <td style="width: 50%; vertical-align: bottom;">
                <div style="text-align: center; width: 170px; border-top: 1px dashed #94a3b8; padding-top: 4px; font-size: 10px; font-weight: bold; color: #475569;">
                  Customer Signature (دستخط خریدار)
                </div>
              </td>
              <td style="width: 50%; vertical-align: bottom; text-align: right;">
                <div style="text-align: center; width: 170px; border-top: 1px dashed #94a3b8; padding-top: 4px; font-size: 10px; font-weight: bold; color: #475569; margin-left: auto;">
                  Authorized Signature & Stamp (مہر منشی)
                </div>
              </td>
            </tr>
          </table>
        </div>
      `;

      document.body.appendChild(container);

      const opt = {
        margin: [6, 6, 6, 6],
        filename: `Invoice_${cleanOrderId.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };

      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);
    } catch (err) {
      console.error('Failed to download receipt PDF:', err);
      alert('Could not generate PDF download. Please try Print (A4).');
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
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col my-auto print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Modal Top Header Bar */}
        <div className={`px-3 sm:px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Wheat className="w-4 h-4 text-brand-500 shrink-0" />
            <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-white truncate">
              {t('receiptTaxInvoice') || 'Sales Tax Invoice'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden xs:inline-block px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-[10px] border border-brand-500/20">
              A4 Format
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

        {/* Printable Compact Receipt Body Area */}
        <div
          className="p-3 sm:p-4 space-y-2 text-slate-800 bg-white"
          id="receipt-printable-area"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-slate-900">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-black shrink-0">
                <Wheat className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  {shopTitle}
                </h2>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  {mandiTitle}
                </p>
              </div>
            </div>

            <div className="text-right bg-slate-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
              <div className="text-[8px] font-extrabold uppercase text-slate-400">INVOICE NO.</div>
              <div className="font-mono font-black text-xs sm:text-sm text-slate-900">{cleanOrderId}</div>
              <div className="text-[9px] font-semibold text-slate-500">{date}</div>
            </div>
          </div>

          {/* Customer & Payment Meta Grid */}
          <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-0.5 border-r border-slate-200/80 pr-2">
              <span className="text-[9px] font-black uppercase text-slate-400 block">{t('customerLabel') || 'Billed To (خریدار)'}:</span>
              <div className="font-black text-xs text-slate-900 truncate">{displayCustomer}</div>
              {(customerCity || customerPhone) && (
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  {customerCity ? `📍 ${customerCity}` : ''} {customerPhone ? `📞 ${customerPhone}` : ''}
                </div>
              )}
            </div>

            <div className="space-y-0.5 pl-1">
              <span className="text-[9px] font-black uppercase text-slate-400 block">{t('paymentMethodLabel') || 'Payment Mode'}:</span>
              <div className="font-black text-xs text-brand-600">{paymentMethod}</div>
              <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Counter POS Verified & Dispatched
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                  <th className="py-1 px-2 w-7 text-center">#</th>
                  <th className="py-1 px-2">{t('item') || 'Item / Commodity'}</th>
                  <th className="py-1 px-2 text-right">{t('price') || 'Rate'}</th>
                  <th className="py-1 px-2 text-center">{t('qty') || 'Qty'}</th>
                  <th className="py-1 px-2 text-right">{t('total') || 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item, idx) => {
                  const itemPrice = Number(item.price || item.rate || 0);
                  const itemQty = Number(item.qty || 1);
                  const itemUnit = item.unit || item.unitName || t('kg');
                  const lineTotal = itemPrice * itemQty;

                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                      <td className="py-1 px-2 font-bold text-slate-400 text-center text-[10px]">{idx + 1}</td>
                      <td className="py-1 px-2">
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-slate-600 text-xs">
                        Rs. {itemPrice.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-center font-bold text-slate-800 text-xs whitespace-nowrap">
                        {itemQty} <span className="text-[9px] text-slate-500 font-normal">{itemUnit}</span>
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                        Rs. {lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary Section */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="text-[8.5px] text-slate-500 space-y-0.5 p-2 rounded-lg bg-slate-50 border border-slate-200 leading-tight">
              <p className="font-bold text-slate-700">Terms & Conditions:</p>
              <p>• Goods once sold are verified per standard Ghalla Mandi trade rules.</p>
              <p>• Official sales tax invoice & cash memo gate pass.</p>
              <p>• Thank you for your business with {shopTitle}!</p>
            </div>

            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 font-semibold px-1 text-[11px]">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-800">Rs. {Number(subtotal).toLocaleString()}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold px-1 text-[11px]">
                  <span>Discount:</span>
                  <span className="font-mono">- Rs. {Number(discount).toLocaleString()}</span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex justify-between items-center text-amber-600 font-bold px-1 text-[11px]">
                  <span>Tax:</span>
                  <span className="font-mono">+ Rs. {Number(tax).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center px-2 py-1 rounded-lg bg-slate-900 text-white font-black text-xs">
                <span>GRAND TOTAL:</span>
                <span className="font-mono text-xs">
                  Rs. {Number(grandTotal).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 font-bold px-1 text-[11px]">
                <span>Paid:</span>
                <span className="font-mono">Rs. {Number(paidAmount).toLocaleString()}</span>
              </div>

              {dueRemaining > 0 ? (
                <div className="flex justify-between items-center text-amber-700 font-bold px-1 text-[11px]">
                  <span>Balance Due:</span>
                  <span className="font-mono font-black">Rs. {Number(dueRemaining).toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-emerald-600 font-bold px-1 text-[10px]">
                  <span>Settlement:</span>
                  <span>✓ FULLY PAID (صاف)</span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-2 flex justify-between items-end border-t border-slate-100 text-[9px] text-slate-500 font-semibold">
            <div className="text-center border-t border-dashed border-slate-300 pt-1 w-32">
              Customer Signature
            </div>
            <div className="text-center border-t border-dashed border-slate-300 pt-1 w-32">
              Authorized Signature & Stamp
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className={`p-2.5 border-t flex items-center justify-between gap-2 print:hidden shrink-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>{t('close')}</span>
          </button>

          <div className="flex flex-1 items-center gap-2">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download official receipt as A4 PDF file directly"
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

            {/* Print A4 Invoice Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print A4 receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (A4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
