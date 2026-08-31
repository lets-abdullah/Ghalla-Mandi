import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Download,
  Loader2,
  Wheat,
  X,
  CheckCircle2,
  Calendar,
  FileText,
  User,
  Phone,
  Truck,
  CreditCard
} from 'lucide-react';
import { exportReceiptToImage, exportReceiptToPDF } from '../utils/pdfExport';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const PurchaseReceiptModal = ({ isOpen, onClose, purchaseData }) => {
  const { theme } = useTheme();
  const { shop } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [paperSize, setPaperSize] = useState('thermal-80'); // 'thermal-80' | 'thermal-58' | 'a4' | 'a5'
  const receiptRef = useRef(null);

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

  if (!isOpen || !purchaseData) return null;

  const {
    purchaseNo = `PUR-${Math.floor(100000 + Math.random() * 900000)}`,
    date = new Date().toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    supplierName = 'Supplier',
    supplierPhone = '',
    supplierCity = '',
    truckNo = '',
    paymentMode = 'Cash on Counter',
    items = [],
    totalAmount = 0,
    paidAmount = 0,
    adjustment = 0,
    discount = 0,
    note = ''
  } = purchaseData;

  const cleanReceiptNo = String(purchaseNo).startsWith('PUR-') || String(purchaseNo).startsWith('GM-') || String(purchaseNo).startsWith('INV-')
    ? String(purchaseNo)
    : `PUR-${String(purchaseNo).replace(/[^0-9A-Za-z]/g, '') || '000123'}`;

  const grandTotalNum = Number(totalAmount || 0);
  const paidNum = Number(paidAmount !== undefined && paidAmount !== null ? paidAmount : 0);
  const adjustmentNum = Number(adjustment || discount || 0);
  const calculatedSubtotal = grandTotalNum + adjustmentNum;
  const dueRemaining = Math.max(0, grandTotalNum - paidNum);
  const displaySupplier = supplierName || 'Walk-in Supplier';
  const shopTitle = (shop?.name || 'GHALLA MANDI').toUpperCase();
  const shopPhone = shop?.phone || shop?.contact || '';
  const shopAddress = shop?.address || shop?.location || 'Gallah Mandi, Punjab, Pakistan';

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

    const rowsHtml = items.map((item, idx) => {
      const itemPrice = Number(item.price || item.rate || item.purchasePrice || item.purchaseprice || 0);
      const itemQty = Number(item.qty || item.quantity || 1);
      const itemUnit = item.unit || 'KG';
      const lineTotal = Number(item.total) || (itemPrice * itemQty);

      if (isFullSheet) {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: ${isA4 ? '12px' : '11px'};">
            <td style="padding: 8px 10px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
            <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${item.name || item.productName || 'Procured Commodity'}</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: #334155;">${itemQty} <span style="font-size: 10px; color: #64748b;">${itemUnit}</span></td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: #475569;">Rs. ${itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 800; font-family: monospace; color: #0f172a;">Rs. ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }

      return `
        <tr style="border-bottom: 1px dashed #cbd5e1; font-size: ${is58 ? '9.5px' : '11px'};">
          <td style="padding: 4px 2px; font-weight: 700; color: #0f172a; text-align: left;">${item.name || item.productName || 'Procured Item'}</td>
          <td style="padding: 4px 2px; text-align: center; font-weight: 800; color: #334155;">${itemQty}</td>
          <td style="padding: 4px 2px; text-align: right; font-family: monospace; color: #475569;">${itemPrice.toLocaleString()}</td>
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
            <title>Purchase Bill - ${cleanReceiptNo}</title>
            <style>
              ${pageSizeCss}
              * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { background: #ffffff; color: #0f172a; width: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: ${isA4 ? '12px' : '11px'}; line-height: 1.4; }
              .invoice-container { width: 100%; max-width: ${isA4 ? '100%' : '100%'}; margin: 0 auto; padding: ${isA4 ? '15px' : '10px'}; }
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
              <div class="header-grid">
                <div>
                  <div style="font-size: ${isA4 ? '22px' : '18px'}; font-weight: 900; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px;">${shopTitle}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${shopAddress}</div>
                  ${shopPhone ? `<div style="font-size: 11px; color: #475569; font-weight: 600;">Phone: ${shopPhone}</div>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="display: inline-block; background: #064e3b; color: #ffffff; font-size: 12px; font-weight: 900; padding: 4px 14px; border-radius: 4px; letter-spacing: 1px;">PURCHASE BILL & VOUCHER</div>
                  <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace;">Bill #: ${cleanReceiptNo}</div>
                  <div style="font-size: 11px; color: #64748b;">Date: ${date}</div>
                </div>
              </div>

              <div class="info-box">
                <div>
                  <div style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">Procured From / Supplier:</div>
                  <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${displaySupplier}</div>
                  ${supplierPhone ? `<div style="font-size: 11px; color: #475569;">Contact: ${supplierPhone}</div>` : ''}
                  ${supplierCity ? `<div style="font-size: 11px; color: #64748b;">City/Location: ${supplierCity}</div>` : ''}
                  ${truckNo ? `<div style="font-size: 11px; color: #059669; font-weight: 700;">🚚 Vehicle / Truck #: ${truckNo}</div>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">Settlement Status:</div>
                  <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px;">Mode: <b>${paymentMode}</b></div>
                  <div style="font-size: 12px; font-weight: 800; color: ${dueRemaining === 0 ? '#059669' : '#b45309'}; margin-top: 2px;">
                    ${dueRemaining === 0 ? 'Status: SETTLED (Paid)' : `Status: PAYABLE (Rs. ${dueRemaining.toLocaleString()})`}
                  </div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th style="text-align: left;">Item Description</th>
                    <th style="text-align: center; width: 80px;">Qty</th>
                    <th style="text-align: right; width: 110px;">Rate (Rs.)</th>
                    <th style="text-align: right; width: 120px;">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <div class="totals-section">
                <div style="width: 50%; padding-right: 15px;">
                  ${note ? `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; font-size: 10.5px;">
                      <b>Note / Remarks:</b> ${note}
                    </div>
                  ` : ''}
                  <div style="font-size: 10px; color: #64748b; margin-top: 6px;">
                    Official Mandi Procurement Voucher. Subject to weighbridge verification.
                  </div>
                </div>

                <div style="width: 45%;">
                  <table style="margin-bottom: 0;">
                    <tr>
                      <td style="padding: 4px 8px; color: #475569; font-weight: 600;">Subtotal:</td>
                      <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: 700;">Rs. ${calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    ${adjustmentNum > 0 ? `
                      <tr>
                        <td style="padding: 4px 8px; color: #059669; font-weight: 600;">Adjustment / Disc:</td>
                        <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #059669;">- Rs. ${adjustmentNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ` : ''}
                    <tr style="background: #064e3b; color: #ffffff;">
                      <td style="padding: 6px 8px; font-weight: 900; font-size: 13px;">Total Purchase Cost:</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 900; font-size: 14px;">Rs. ${grandTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 8px; color: #475569; font-weight: 600;">Amount Paid to Supplier:</td>
                      <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: 800; color: #059669;">Rs. ${paidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 8px; color: #475569; font-weight: 600;">Balance to Pay:</td>
                      <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: 800; color: ${dueRemaining > 0 ? '#b45309' : '#0f172a'};">Rs. ${dueRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <div class="signatures">
                <div class="sig-line">Supplier / Driver Signature</div>
                <div class="sig-line">Mandi Authorized Officer</div>
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
          <title>Purchase Receipt - ${cleanReceiptNo}</title>
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
              <div style="font-size: ${is58 ? '14px' : '16px'}; font-weight: 900; color: #0f172a; text-transform: uppercase;">${shopTitle}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 1px;">${shopAddress}</div>
              ${shopPhone ? `<div style="font-size: 9px; color: #475569;">📞 ${shopPhone}</div>` : ''}
              <div style="display: inline-block; background: #064e3b; color: #ffffff; font-size: 9.5px; font-weight: 900; padding: 2px 12px; border-radius: 2px; margin-top: 4px; letter-spacing: 0.5px;">
                PURCHASE RECEIPT
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 10px;">
              <div><b>Bill #:</b> <span style="font-family: monospace;">${cleanReceiptNo}</span></div>
              <div style="color: #475569;">${date}</div>
            </div>

            <div class="dashed-sep"></div>

            <div>
              <div style="font-size: 9px; font-weight: 800; color: #059669; text-transform: uppercase;">Supplier:</div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${displaySupplier}</div>
              ${supplierPhone ? `<div style="font-size: 9.5px; color: #475569;">Phone: ${supplierPhone}</div>` : ''}
              ${truckNo ? `<div style="font-size: 9.5px; color: #059669; font-weight: 700;">🚚 Vehicle: ${truckNo}</div>` : ''}
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

            <div style="font-size: 10px; margin-top: 4px;">
              <div style="display: flex; justify-content: space-between; padding: 1px 0;">
                <span style="color: #475569;">Subtotal:</span>
                <span style="font-family: monospace; font-weight: 700;">Rs. ${calculatedSubtotal.toLocaleString()}</span>
              </div>
              ${adjustmentNum > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 1px 0; color: #059669;">
                  <span>Adjustment / Disc:</span>
                  <span style="font-family: monospace; font-weight: 700;">- Rs. ${adjustmentNum.toLocaleString()}</span>
                </div>
              ` : ''}
              <div style="background: #064e3b; color: #ffffff; padding: 4px 6px; border-radius: 2px; display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-weight: 900;">
                <span>TOTAL PURCHASE</span>
                <span style="font-family: monospace; font-size: 12px;">Rs. ${grandTotalNum.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 2px 0; margin-top: 3px;">
                <span style="color: #475569;">Paid to Supplier:</span>
                <span style="font-family: monospace; font-weight: 800; color: #059669;">Rs. ${paidNum.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                <span style="color: #475569;">Remaining to Pay:</span>
                <span style="font-family: monospace; font-weight: 900; color: ${dueRemaining > 0 ? '#b45309' : '#0f172a'};">Rs. ${dueRemaining.toLocaleString()}</span>
              </div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #047857; text-align: center; padding: 4px; border-radius: 4px; font-size: 10px; font-weight: 900; margin-top: 6px;">
              ${dueRemaining === 0 ? '✓ SETTLED (PAID)' : `REMAINING TO PAY: Rs. ${dueRemaining.toLocaleString()}`}
            </div>

            <div class="dashed-sep"></div>

            <div style="text-align: center; padding: 4px 0;">
              <div style="font-family: Georgia, serif; font-style: italic; font-size: 12px; font-weight: bold; color: #064e3b;">— Ghalla Mandi —</div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">Official Procurement Voucher</div>
            </div>
          </div>
        </body>
      </html>
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
      const targetElement = receiptRef.current || document.getElementById('purchase-receipt-card');
      if (!targetElement) throw new Error('Printable element not found in DOM.');

      const filename = `Purchase_Bill_${cleanReceiptNo.replace(/[^a-zA-Z0-9_-]/g, '')}_${paperSize}.pdf`;
      await exportReceiptToPDF(targetElement, filename, paperSize);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Could not download bill PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const isFullSheet = paperSize === 'a4' || paperSize === 'a5';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden print:p-0 print:bg-white print:static"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[94vh] rounded-3xl shadow-2xl border overflow-hidden flex flex-col my-auto transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
      >
        {/* Modal Top Control Bar */}
        <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
          {/* Title & Document Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0 border border-blue-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                  Purchase Bill & Voucher
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono font-bold text-[10px]">
                  {cleanReceiptNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold leading-tight">
                Preview & print formatted for any paper size
              </p>
            </div>
          </div>

          {/* Paper Size Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPaperSize('thermal-80')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${paperSize === 'thermal-80'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>80mm</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('thermal-58')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${paperSize === 'thermal-58'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>58mm</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('a5')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${paperSize === 'a5'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>A5</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('a4')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${paperSize === 'a4'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>A4 Full Page</span>
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
              id="purchase-receipt-card"
              data-receipt-printable="true"
              className={`w-full bg-white text-slate-900 shadow-xl rounded-2xl border border-slate-200/90 p-5 sm:p-8 space-y-4 my-auto transition-all ${paperSize === 'a4' ? 'max-w-[760px]' : 'max-w-[620px]'
                }`}
            >
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
                    PURCHASE BILL & VOUCHER
                  </div>
                  <div className="font-mono font-black text-sm text-slate-900 mt-1.5">
                    Bill #: {cleanReceiptNo}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    Date: {date}
                  </div>
                </div>
              </div>

              {/* Supplier & Settlement 2-Column Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>SUPPLIER / VENDOR DETAILS</span>
                  </div>
                  <div className="font-black text-sm text-slate-900 mt-1">
                    {displaySupplier}
                  </div>
                  {supplierPhone && (
                    <div className="text-slate-600 font-semibold mt-0.5">📞 {supplierPhone}</div>
                  )}
                  {supplierCity && (
                    <div className="text-slate-500 font-medium">📍 {supplierCity}</div>
                  )}
                  {truckNo && (
                    <div className="text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span>Vehicle / Truck #: {truckNo}</span>
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 sm:border-l sm:pl-4 border-slate-200">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1 sm:justify-end">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>SETTLEMENT SUMMARY</span>
                  </div>
                  <div className="text-slate-700 font-bold mt-1">
                    Mode: <span className="font-extrabold text-slate-900">{paymentMode}</span>
                  </div>
                  <div className="font-mono font-black text-sm mt-0.5 text-emerald-700">
                    Paid: Rs. {paidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`font-mono font-black text-xs ${dueRemaining > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {dueRemaining > 0 ? `Remaining to Pay: Rs. ${dueRemaining.toLocaleString()}` : 'Payment Status: Settled'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 border-b border-emerald-200/80 text-emerald-900 text-[10.5px] font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center w-24">Qty</th>
                      <th className="py-2.5 px-3 text-right w-28">Rate (Rs.)</th>
                      <th className="py-2.5 px-3 text-right w-32">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {items.map((item, idx) => {
                      const itemPrice = Number(item.price || item.rate || item.purchasePrice || item.purchaseprice || 0);
                      const itemQty = Number(item.qty || item.quantity || 1);
                      const lineTotal = Number(item.total) || (itemPrice * itemQty);

                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                          <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {item.name || item.productName || 'Commodity'}
                          </td>
                          <td className="py-2 px-3 text-center font-black text-slate-800">
                            {itemQty} <span className="text-[10px] text-slate-500 font-medium">{item.unit || 'KG'}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-600">
                            {itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                            {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-1">
                <div className="w-full sm:w-1/2 space-y-2 text-xs">
                  {note && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-600">
                      <span className="font-bold text-slate-900">Remarks:</span> {note}
                    </div>
                  )}
                  <p className="text-[10.5px] text-slate-400 font-medium">
                    Official Mandi Procurement Record. Subject to gate pass and weighbridge confirmation.
                  </p>
                </div>

                <div className="w-full sm:w-2/5 space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between items-center text-slate-600 px-1">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-900">
                      Rs. {calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {adjustmentNum > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 px-1">
                      <span>Adjustment / Disc:</span>
                      <span className="font-mono">
                        - Rs. {adjustmentNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="bg-[#064e3b] text-white p-2.5 rounded-lg flex justify-between items-center shadow-xs">
                    <span className="text-xs font-black uppercase tracking-wider">Total Purchase Cost</span>
                    <span className="font-mono text-base font-black">
                      Rs. {grandTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 px-1 pt-0.5">
                    <span>Paid to Supplier:</span>
                    <span className="font-mono text-emerald-700 font-black">
                      Rs. {paidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 px-1">
                    <span>Remaining to Pay:</span>
                    <span className={`font-mono font-black ${dueRemaining > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                      Rs. {dueRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-center pt-8 border-t border-dashed border-slate-300 text-center text-xs font-bold text-slate-500">
                <div className="w-40 border-t border-slate-400 pt-1">Supplier / Driver Sign</div>
                <div className="w-40 border-t border-slate-400 pt-1">Mandi Authorized Officer</div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. THERMAL POS RECEIPT PREVIEW (80mm & 58mm) */
            /* ========================================================================= */
            <div
              ref={receiptRef}
              id="purchase-receipt-card"
              data-receipt-printable="true"
              className={`w-full bg-white text-slate-900 shadow-xl rounded-2xl border border-slate-200/90 p-4 space-y-3 my-auto transition-all ${paperSize === 'thermal-58' ? 'max-w-[280px] text-[11px]' : 'max-w-[360px] text-xs'
                }`}
            >
              {/* Logo & Header */}
              <div className="text-center">
                <div className="w-9 h-9 mx-auto rounded-full border-2 border-emerald-600/30 bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <Wheat className="w-4 h-4" />
                </div>
                <h1 className="text-base font-black uppercase text-slate-900 tracking-wider text-center mt-1.5 leading-tight">
                  {shopTitle}
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">{shopAddress}</p>
                {shopPhone && <p className="text-[10px] text-slate-600 font-bold">📞 {shopPhone}</p>}
                <div className="inline-block bg-[#064e3b] text-white font-black text-[10px] uppercase tracking-widest px-4 py-0.5 rounded-xs mt-1.5 shadow-2xs">
                  PURCHASE RECEIPT
                </div>
              </div>

              {/* Meta Bar */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-400 leading-tight">Bill #</div>
                  <div className="font-mono font-black text-slate-900 leading-tight">{cleanReceiptNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black uppercase text-slate-400 leading-tight">Date & Time</div>
                  <div className="font-bold text-slate-800 leading-tight">{date}</div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-1" />

              {/* Supplier */}
              <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>SUPPLIER</span>
                </div>
                <div className="font-black text-slate-900 text-xs sm:text-sm pl-3.5">
                  {displaySupplier}
                </div>
                {supplierPhone && (
                  <div className="text-[10px] text-slate-600 font-medium pl-3.5">📞 {supplierPhone}</div>
                )}
                {truckNo && (
                  <div className="text-[10px] text-emerald-700 font-bold pl-3.5">🚚 {truckNo}</div>
                )}
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
                    {items.map((item, idx) => {
                      const itemPrice = Number(item.price || item.rate || item.purchasePrice || item.purchaseprice || 0);
                      const itemQty = Number(item.qty || item.quantity || 1);
                      const lineTotal = Number(item.total) || (itemPrice * itemQty);

                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-1 px-1 font-bold text-slate-900 truncate max-w-[110px]">
                            {item.name || item.productName || 'Procured'}
                          </td>
                          <td className="py-1 px-1 text-center font-black text-slate-700">
                            {itemQty}
                          </td>
                          <td className="py-1 px-1 text-right font-mono text-slate-600 font-semibold">
                            {itemPrice.toLocaleString()}
                          </td>
                          <td className="py-1 px-1 text-right font-mono font-black text-slate-900">
                            {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Subtotal & Discount */}
                <div className="space-y-0.5 pt-1.5 px-0.5 font-bold text-[11px]">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-900">Rs. {calculatedSubtotal.toLocaleString()}</span>
                  </div>
                  {adjustmentNum > 0 && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span>Adjustment / Disc:</span>
                      <span className="font-mono">- Rs. {adjustmentNum.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="bg-[#064e3b] text-white px-2.5 py-1.5 rounded-sm flex justify-between items-center mt-1.5 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider">TOTAL PURCHASE</span>
                  <span className="font-mono text-sm font-black">
                    Rs. {grandTotalNum.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-1" />

              {/* Payment Info */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-600 px-0.5">
                  <span>Paid to Supplier:</span>
                  <span className="font-mono text-emerald-700 font-black">Rs. {paidNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-600 px-0.5">
                  <span>Remaining to Pay:</span>
                  <span className={`font-mono font-black ${dueRemaining > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    Rs. {dueRemaining.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#f0fdf4] border border-emerald-200 text-emerald-800 rounded-md py-1 px-2 flex items-center justify-center gap-1 text-center font-black text-[10px] tracking-wide mt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>{dueRemaining === 0 ? '✓ SETTLED (PAID)' : `REMAINING TO PAY: Rs. ${dueRemaining.toLocaleString()}`}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-1" />

              {/* Footer */}
              <div className="text-center pt-0.5">
                <div className="font-serif italic font-bold text-emerald-900 text-xs">
                  — Ghalla Mandi —
                </div>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  Official Procurement Voucher
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
          <div className="text-xs text-slate-400 font-semibold">
            Mode: <b className="text-slate-700 dark:text-slate-200 uppercase">{paperSize}</b>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print {paperSize.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReceiptModal;
