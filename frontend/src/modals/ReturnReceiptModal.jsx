import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Download,
  RotateCcw,
  Wheat,
  X,
  CheckCircle2,
  Calendar,
  FileText,
  User,
  Phone,
  CreditCard,
  Building2,
  MapPin,
  Tag,
  Receipt
} from 'lucide-react';
import { exportReceiptToPDF } from '../utils/pdfExport';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const ReturnReceiptModal = ({ isOpen, onClose, returnData, type = 'SaleReturn' }) => {
  const { theme } = useTheme();
  const { shop } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [paperSize, setPaperSize] = useState('thermal-80'); // 'thermal-80' | 'thermal-58' | 'a4' | 'a5'
  const receiptRef = useRef(null);

  const isSale = type === 'SaleReturn';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, paperSize]);

  if (!isOpen || !returnData) return null;

  const returnNo = returnData.returnNo || returnData.returnno || (isSale ? `SR-${returnData.id || '001'}` : `PR-${returnData.id || '001'}`);
  const dateStr = returnData.date || (returnData.created_at ? new Date(returnData.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const partyName = returnData.customerName || returnData.supplierName || returnData.partyName || returnData.customer || returnData.supplier || (isSale ? 'Walk-in Customer' : 'General Supplier');
  const partyPhone = returnData.customerPhone || returnData.supplierPhone || returnData.phone || '';
  const partyCity = returnData.customerCity || returnData.supplierCity || returnData.city || '';
  const refInvoiceNo = returnData.invoiceNo || returnData.invoiceno || returnData.purchaseNo || returnData.purchaseno || returnData.saleNo || 'N/A';
  const refundMode = returnData.refundMode || returnData.paymentMode || 'Cash';
  const refundAmount = Number(returnData.refundAmount || returnData.totalAmount || returnData.amount || 0);
  const reason = returnData.reason || returnData.note || returnData.notes || 'Goods Return / Quality Adjustment';

  const items = Array.isArray(returnData.items) && returnData.items.length > 0
    ? returnData.items.map(it => {
        const qty = Number(it.qty || it.returnQty || it.quantity || 1);
        const rate = Number(it.rate || it.price || it.refundRate || (refundAmount / Math.max(1, qty)));
        const total = Number(it.total || (qty * rate) || refundAmount);
        return {
          name: it.name || it.productName || 'Produce Item',
          qty,
          unit: it.unit || it.unitName || 'KG',
          rate,
          total
        };
      })
    : [{
        name: returnData.productName || 'Returned Produce',
        qty: Number(returnData.qty || returnData.quantity || 1),
        unit: returnData.unit || 'KG',
        rate: refundAmount / Math.max(1, Number(returnData.qty || returnData.quantity || 1)),
        total: refundAmount
      }];

  const shopTitle = (shop?.shopName || shop?.name || 'GHALLA MANDI COMMISSION SHOP').toUpperCase();
  const shopPhone = shop?.phone || shop?.contact || '';
  const shopAddress = shop?.address || shop?.location || shop?.city || 'Main Grain Market • Ghalla Mandi, Punjab';

  // Generate Isolated Print HTML for the exact chosen paper size
  const generatePrintHtml = () => {
    const isA4 = paperSize === 'a4';
    const isA5 = paperSize === 'a5';
    const is58 = paperSize === 'thermal-58';
    const isFullSheet = isA4 || isA5;

    const pageSizeCss = isA4
      ? '@page { size: A4 portrait; margin: 10mm 12mm; }'
      : isA5
        ? '@page { size: A5 portrait; margin: 8mm 10mm; }'
        : is58
          ? '@page { size: 58mm auto; margin: 1.5mm; }'
          : '@page { size: 80mm auto; margin: 2.5mm; }';

    const baseContainerWidth = isA4 ? '100%' : isA5 ? '100%' : is58 ? '48mm' : '72mm';
    const voucherTitle = isSale ? 'SALE RETURN VOUCHER' : 'PURCHASE RETURN VOUCHER';
    const partyLabel = isSale ? 'Customer' : 'Supplier';
    const refDocLabel = isSale ? 'Original Sale Inv #' : 'Original Purchase Bill #';

    const rowsHtml = items.map((item, idx) => {
      const lineTotal = item.total || (item.qty * item.rate);

      if (isFullSheet) {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: ${isA4 ? '12px' : '11px'};">
            <td style="padding: 8px 10px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
            <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${item.name}</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: #334155;">${item.qty} <span style="font-size: 10px; color: #64748b;">${item.unit}</span></td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: #475569;">Rs. ${item.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 800; font-family: monospace; color: #0f172a;">Rs. ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }

      return `
        <tr style="border-bottom: 1px dashed #cbd5e1; font-size: ${is58 ? '9.5px' : '11px'};">
          <td style="padding: 4px 2px; font-weight: 700; color: #0f172a; text-align: left;">${item.name}</td>
          <td style="padding: 4px 2px; text-align: center; font-weight: 800; color: #334155;">${item.qty}</td>
          <td style="padding: 4px 2px; text-align: right; font-family: monospace; color: #475569;">${item.rate.toLocaleString()}</td>
          <td style="padding: 4px 2px; text-align: right; font-weight: 800; font-family: monospace; color: #0f172a;">${lineTotal.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    // Full Sheet (A4 / A5) HTML Template
    if (isFullSheet) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${voucherTitle} - ${returnNo}</title>
            <style>
              ${pageSizeCss}
              * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { background: #ffffff; color: #0f172a; width: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: ${isA4 ? '12px' : '11px'}; line-height: 1.4; }
              .invoice-container { width: 100%; margin: 0 auto; padding: ${isA4 ? '15px' : '10px'}; }
              .bismillah { text-align: center; font-size: 14px; font-weight: 700; color: #064e3b; margin-bottom: 4px; font-family: 'Scheherazade New', serif; }
              .header-grid { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 14px; }
              .info-box { display: flex; justify-content: space-between; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              th { background: #ecfdf5; border-bottom: 2px solid #059669; color: #064e3b; padding: 8px 10px; font-weight: 800; font-size: ${isA4 ? '11px' : '10px'}; text-transform: uppercase; }
              .totals-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; }
              .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
              .sig-line { width: 160px; text-align: center; border-top: 1px solid #94a3b8; font-size: 11px; font-weight: 700; color: #475569; padding-top: 4px; }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
              <div class="header-grid">
                <div>
                  <div style="font-size: ${isA4 ? '22px' : '18px'}; font-weight: 900; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px;">${shopTitle}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${shopAddress}</div>
                  ${shopPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">📞 Phone / WhatsApp: ${shopPhone}</div>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="display: inline-block; background: #064e3b; color: #ffffff; font-weight: 900; font-size: 11px; padding: 3px 12px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
                    ${voucherTitle}
                  </div>
                  <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 6px;">Voucher #: ${returnNo}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${dateStr}</div>
                </div>
              </div>

              <div class="info-box">
                <div>
                  <div style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">${partyLabel} Details:</div>
                  <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${partyName}</div>
                  ${partyPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">Phone: ${partyPhone}</div>` : ''}
                  ${partyCity ? `<div style="font-size: 11px; color: #64748b;">City / Market: ${partyCity}</div>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">Reference Details:</div>
                  <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${refDocLabel}: <span style="font-family: monospace; color: #0284c7;">${refInvoiceNo}</span></div>
                  <div style="font-size: 11px; color: #475569; margin-top: 2px;">Refund Mode: <b style="color: #059669;">${refundMode}</b></div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th style="text-align: left;">Returned Item / Description</th>
                    <th style="width: 90px; text-align: center;">Return Qty</th>
                    <th style="width: 110px; text-align: right;">Return Rate</th>
                    <th style="width: 120px; text-align: right;">Refund Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <div class="totals-section">
                <div style="max-width: 55%; padding-right: 20px;">
                  <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Return Reason / Notes:</div>
                  <div style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #059669;">
                    ${reason}
                  </div>
                  <div style="font-size: 10px; color: #94a3b8; margin-top: 8px; font-style: italic;">
                    Official computer-generated Ghalla Mandi return voucher. Stock and financials adjusted accordingly.
                  </div>
                </div>
                <div style="width: 260px;">
                  <table style="margin-bottom: 0;">
                    <tr style="border-top: 2px solid #059669; background: #f0fdf4;">
                      <td style="padding: 8px 10px; font-weight: 900; font-size: 13px; color: #064e3b;">TOTAL REFUND:</td>
                      <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 900; font-size: 15px; color: #064e3b;">Rs. ${refundAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 10px; font-size: 11px; color: #475569; font-weight: 600;">Refund Status:</td>
                      <td style="padding: 6px 10px; text-align: right; font-size: 11px; font-weight: 800; color: #059669;">PROCESSED (${refundMode})</td>
                    </tr>
                  </table>
                </div>
              </div>

              <div class="signatures">
                <div class="sig-line">${partyLabel} Signature</div>
                <div class="sig-line">Authorized Signatory / Stamp</div>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // Thermal (80mm / 58mm) HTML Template
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${voucherTitle} - ${returnNo}</title>
          <style>
            ${pageSizeCss}
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { background: #ffffff; color: #0f172a; width: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: ${is58 ? '10px' : '11px'}; }
            .receipt-card { width: ${baseContainerWidth}; margin: 0 auto; padding: ${is58 ? '4px' : '8px 10px'}; }
            .dashed-sep { border-top: 1px dashed #94a3b8; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div style="text-align: center;">
              <div style="font-size: 12px; font-weight: 700; color: #064e3b; margin-bottom: 2px;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
              <div style="font-size: ${is58 ? '14px' : '16px'}; font-weight: 900; color: #0f172a; text-transform: uppercase;">${shopTitle}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 1px;">${shopAddress}</div>
              ${shopPhone ? `<div style="font-size: 9px; color: #475569;">📞 ${shopPhone}</div>` : ''}
              <div style="display: inline-block; background: #064e3b; color: #ffffff; font-size: 9.5px; font-weight: 900; padding: 2px 10px; border-radius: 2px; margin-top: 4px; letter-spacing: 0.5px;">
                ${voucherTitle}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 10px;">
              <div><b>Voucher #:</b> <span style="font-family: monospace;">${returnNo}</span></div>
              <div style="color: #475569;">${dateStr}</div>
            </div>

            <div class="dashed-sep"></div>

            <div>
              <div style="font-size: 9px; font-weight: 800; color: #059669; text-transform: uppercase;">${partyLabel}:</div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${partyName}</div>
              ${partyPhone ? `<div style="font-size: 9.5px; color: #475569;">Phone: ${partyPhone}</div>` : ''}
              <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
                ${refDocLabel}: <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${refInvoiceNo}</span>
              </div>
            </div>

            <div class="dashed-sep"></div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
              <thead>
                <tr style="border-bottom: 1px solid #cbd5e1; font-size: 9px; font-weight: 800; color: #064e3b; text-transform: uppercase;">
                  <th style="padding: 2px 0; text-align: left;">Item</th>
                  <th style="padding: 2px 0; text-align: center;">Qty</th>
                  <th style="padding: 2px 0; text-align: right;">Rate</th>
                  <th style="padding: 2px 0; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="dashed-sep"></div>

            <div style="font-size: 11px;">
              <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: ${is58 ? '11px' : '13px'}; color: #064e3b; padding: 4px 0;">
                <span>TOTAL REFUND:</span>
                <span style="font-family: monospace;">Rs. ${refundAmount.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #475569; padding: 1px 0;">
                <span>Refund Mode:</span>
                <span style="font-weight: 700; color: #059669;">${refundMode}</span>
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px; padding-top: 4px; border-top: 1px dotted #cbd5e1;">
                <b>Reason:</b> ${reason}
              </div>
            </div>

            <div class="dashed-sep"></div>

            <div style="text-align: center; margin-top: 6px; font-size: 8.5px; color: #64748b;">
              <div>Official Ghalla Mandi Return Record</div>
              <div style="margin-top: 4px; font-family: monospace; letter-spacing: 2px; font-size: 9px;">*${returnNo}*</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    try {
      const existingFrame = document.getElementById('return-receipt-print-frame');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'return-receipt-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentWindow.document;
      doc.open();
      doc.write(generatePrintHtml());
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
      console.error('Print error:', err);
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const targetElement = receiptRef.current || document.getElementById('return-receipt-card');
      if (!targetElement) throw new Error('Printable element not found in DOM.');

      const filename = `${returnNo.replace(/[^a-zA-Z0-9_-]/g, '')}_Voucher_${paperSize}.pdf`;
      await exportReceiptToPDF(targetElement, filename, paperSize);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Could not download return voucher PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const isFullSheet = paperSize === 'a4' || paperSize === 'a5';
  const voucherTitle = isSale ? 'SALE RETURN VOUCHER' : 'PURCHASE RETURN VOUCHER';
  const partyLabel = isSale ? 'Customer' : 'Supplier';
  const refDocLabel = isSale ? 'Sale Invoice #' : 'Purchase Bill #';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden print:p-0 print:bg-white print:static"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[94vh] rounded-3xl shadow-2xl border overflow-hidden flex flex-col my-auto transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Top Control Bar */}
        <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Title & Document Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 border ${
              isSale
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}>
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                  {isSale ? 'Sale Return Voucher' : 'Purchase Return Voucher'}
                </h3>
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                  • {returnNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold leading-tight">
                Preview & print formatted for any paper size
              </p>
            </div>
          </div>

          {/* Paper Size Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPaperSize('thermal-80')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                paperSize === 'thermal-80'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>80mm POS</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('thermal-58')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                paperSize === 'thermal-58'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>58mm Mini</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('a5')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                paperSize === 'a5'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>A5 Mandi</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('a4')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                paperSize === 'a4'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>A4 Full Page</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
              title="Print Voucher (Ctrl + P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print {paperSize === 'thermal-80' ? 'Receipt' : paperSize === 'thermal-58' ? 'Mini' : paperSize === 'a5' ? 'A5' : 'A4'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Responsive Preview Screen */}
        <div className="p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center items-start flex-1 overflow-y-auto min-h-0">
          {/* ========================================================================= */}
          {/* 1. FULL SHEET PREVIEW (A4 & A5 Layout) */}
          {/* ========================================================================= */}
          {isFullSheet ? (
            <div
              ref={receiptRef}
              id="return-receipt-card"
              data-receipt-printable="true"
              className={`w-full bg-white text-slate-900 shadow-xl rounded-2xl border border-slate-200/90 p-5 sm:p-8 space-y-4 my-auto transition-all ${
                paperSize === 'a4' ? 'max-w-[760px]' : 'max-w-[620px]'
              }`}
            >
              <div className="text-center font-bold text-emerald-800 text-xs tracking-wide font-serif">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>

              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start pb-4 border-b-2 border-emerald-600 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-500/30 text-emerald-700 flex items-center justify-center">
                      <Wheat className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight leading-tight">
                        {shopTitle}
                      </h1>
                      <p className="text-xs text-slate-500 font-semibold">{shopAddress}</p>
                    </div>
                  </div>
                  {shopPhone && (
                    <p className="text-xs text-slate-600 font-bold mt-1">📞 Helpline / Contact: {shopPhone}</p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <div className="inline-block bg-[#064e3b] text-white font-black text-xs uppercase tracking-widest px-3 py-1 rounded-md shadow-xs">
                    {voucherTitle}
                  </div>
                  <div className="font-mono font-black text-sm text-slate-900 mt-1.5">
                    Voucher #: {returnNo}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    Date: {dateStr}
                  </div>
                </div>
              </div>

              {/* Party & Reference 2-Column Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{partyLabel.toUpperCase()} DETAILS</span>
                  </div>
                  <div className="font-black text-sm text-slate-900 mt-1">
                    {partyName}
                  </div>
                  {partyPhone && (
                    <div className="text-slate-600 font-semibold mt-0.5">📞 {partyPhone}</div>
                  )}
                  {partyCity && (
                    <div className="text-slate-500 font-medium">📍 {partyCity}</div>
                  )}
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 sm:border-l sm:pl-4 border-slate-200">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1 sm:justify-end">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>TRANSACTION REFERENCE</span>
                  </div>
                  <div className="text-slate-700 font-bold mt-1">
                    {refDocLabel}: <span className="font-mono font-extrabold text-blue-600">{refInvoiceNo}</span>
                  </div>
                  <div className="font-mono font-black text-sm mt-0.5 text-emerald-700">
                    Refund Mode: {refundMode}
                  </div>
                  <div className="font-bold text-xs text-slate-500">
                    Status: Verified & Settled
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-900 border-b-2 border-emerald-600 uppercase text-[10px] font-black tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Returned Commodity / Item</th>
                      <th className="py-2.5 px-3 text-center w-24">Return Qty</th>
                      <th className="py-2.5 px-3 text-right w-28">Return Rate</th>
                      <th className="py-2.5 px-3 text-right w-32">Refund Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{it.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {it.qty} <span className="text-[10px] text-slate-500 font-normal">{it.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          Rs. {it.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                          Rs. {it.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Reason Block */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-slate-200">
                <div className="flex-1 max-w-md">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Return Reason / Notes:
                  </div>
                  <div className="p-3 bg-slate-50 border-l-4 border-emerald-600 rounded-r-xl text-xs text-slate-700 font-medium">
                    {reason}
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-2">
                    Official Mandi Return Voucher. Stock inventory returned and balance adjusted.
                  </p>
                </div>

                <div className="w-full sm:w-64 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Payment Mode:</span>
                    <span className="font-bold text-slate-900">{refundMode}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between items-center">
                    <span className="font-black text-slate-900 uppercase">TOTAL REFUND:</span>
                    <span className="font-mono text-base font-black text-emerald-700">
                      Rs. {refundAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-center pt-8 border-t border-dashed border-slate-300 text-center text-xs font-bold text-slate-500">
                <div className="w-40 border-t border-slate-400 pt-1">{partyLabel} Signature</div>
                <div className="w-40 border-t border-slate-400 pt-1">Authorized Stamp</div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. THERMAL POS RECEIPT PREVIEW (80mm & 58mm) */
            /* ========================================================================= */
            <div
              ref={receiptRef}
              id="return-receipt-card"
              data-receipt-printable="true"
              className={`w-full bg-white text-slate-900 shadow-xl rounded-2xl border border-slate-200/90 p-4 space-y-3 my-auto transition-all ${
                paperSize === 'thermal-58' ? 'max-w-[280px] text-[11px]' : 'max-w-[360px] text-xs'
              }`}
            >
              {/* Logo & Header */}
              <div className="text-center">
                <div className="text-[11px] font-bold text-emerald-800 font-serif mb-1">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
                <div className="w-9 h-9 mx-auto rounded-full border-2 border-emerald-600/30 bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h1 className="text-base font-black uppercase text-slate-900 tracking-wider text-center mt-1.5 leading-tight">
                  {shopTitle}
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">{shopAddress}</p>
                {shopPhone && <p className="text-[10px] text-slate-600 font-bold">📞 {shopPhone}</p>}
                <div className="inline-block bg-[#064e3b] text-white font-black text-[10px] uppercase tracking-widest px-4 py-0.5 rounded-xs mt-1.5 shadow-2xs">
                  {voucherTitle}
                </div>
              </div>

              {/* Meta Bar */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-400 leading-tight">Voucher #</div>
                  <div className="font-mono font-black text-slate-900 leading-tight">{returnNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black uppercase text-slate-400 leading-tight">Date</div>
                  <div className="font-bold text-slate-800 leading-tight">{dateStr}</div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-1" />

              {/* Party Details */}
              <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{partyLabel.toUpperCase()}</span>
                </div>
                <div className="font-black text-slate-900 text-xs sm:text-sm pl-3.5">
                  {partyName}
                </div>
                {partyPhone && (
                  <div className="text-[10px] text-slate-600 font-medium pl-3.5">📞 {partyPhone}</div>
                )}
                <div className="text-[10px] text-slate-500 font-medium pl-3.5">
                  {refDocLabel}: <span className="font-mono font-bold text-slate-800">{refInvoiceNo}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-1" />

              {/* Items Table */}
              <div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-emerald-800 text-[9.5px] font-black uppercase">
                      <th className="py-1 px-1 text-left">Item</th>
                      <th className="py-1 px-1 text-center">Qty</th>
                      <th className="py-1 px-1 text-right">Rate</th>
                      <th className="py-1 px-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-1 px-1 font-bold text-slate-900 truncate max-w-[110px]">
                          {it.name}
                        </td>
                        <td className="py-1 px-1 text-center font-black text-slate-700">
                          {it.qty}
                        </td>
                        <td className="py-1 px-1 text-right font-mono text-slate-600 font-semibold">
                          {it.rate.toLocaleString()}
                        </td>
                        <td className="py-1 px-1 text-right font-mono font-black text-slate-900">
                          {it.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Grand Refund */}
                <div className="bg-[#064e3b] text-white px-2.5 py-1.5 rounded-sm flex justify-between items-center mt-2 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider">TOTAL REFUND</span>
                  <span className="font-mono text-sm font-black">
                    Rs. {refundAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-1" />

              {/* Refund Info */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-600 px-0.5">
                  <span>Refund Mode:</span>
                  <span className="font-bold text-slate-900">{refundMode}</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-0.5 px-0.5">
                  <b>Reason:</b> {reason}
                </div>
                <div className="bg-[#f0fdf4] border border-emerald-200 text-emerald-800 rounded-md py-1 px-2 flex items-center justify-center gap-1 text-center font-black text-[10px] tracking-wide mt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>REFUND VERIFIED & PROCESSED</span>
                </div>
              </div>

              {/* Barcode & Footer */}
              <div className="text-center pt-2 space-y-1">
                <div className="font-mono text-[9px] tracking-widest text-slate-600 font-bold">
                  *{returnNo}*
                </div>
                <p className="text-[8.5px] text-slate-400 font-medium">
                  Official Ghalla Mandi Return Voucher
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
