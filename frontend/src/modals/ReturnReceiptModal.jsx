import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Download,
  RotateCcw,
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Hash,
  CreditCard,
  Building2,
  FileText
} from 'lucide-react';
import { exportReceiptToImage, exportReceiptToPDF } from '../utils/pdfExport';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const ReturnReceiptModal = ({ isOpen, onClose, returnData, type = 'SaleReturn' }) => {
  const { theme } = useTheme();
  const { shop } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [paperSize, setPaperSize] = useState('thermal-80'); // 'thermal-80' | 'a4'
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

  const returnNo = returnData.returnNo || (isSale ? `SR-${returnData.id}` : `PR-${returnData.id}`);
  const dateStr = returnData.date || (returnData.created_at ? new Date(returnData.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const partyName = returnData.customerName || returnData.supplierName || returnData.partyName || (isSale ? 'Walk-in Customer' : 'Supplier Vendor');
  const partyPhone = returnData.customerPhone || returnData.supplierPhone || returnData.phone || '';
  const partyCity = returnData.customerCity || returnData.supplierCity || returnData.city || '';
  const refInvoiceNo = returnData.invoiceNo || returnData.purchaseNo || returnData.saleNo || 'N/A';
  const refundMode = returnData.refundMode || returnData.paymentMode || 'Cash';
  const refundAmount = Number(returnData.refundAmount || returnData.amount || 0);
  const reason = returnData.reason || returnData.note || 'Goods Return / Quality Adjustment';

  const items = Array.isArray(returnData.items) && returnData.items.length > 0
    ? returnData.items.map(it => ({
        name: it.name || it.productName || 'Produce Item',
        qty: Number(it.qty || it.returnQty || it.quantity || 1),
        unit: it.unit || it.unitName || 'KG',
        rate: Number(it.rate || it.price || it.refundRate || (refundAmount / Math.max(1, Number(it.qty || 1)))),
        total: Number(it.total || (Number(it.qty || it.returnQty || 1) * Number(it.rate || it.price || 0)) || refundAmount)
      }))
    : [{
        name: returnData.productName || 'Returned Goods',
        qty: Number(returnData.qty || 1),
        unit: returnData.unit || 'KG',
        rate: refundAmount / Math.max(1, Number(returnData.qty || 1)),
        total: refundAmount
      }];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setIsDownloading(true);
      await exportReceiptToPDF(receiptRef.current, `${returnNo}_Voucher.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className={`rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[95vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Top Control Bar (Screen Only) */}
        <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              isSale ? 'bg-orange-500/10 text-orange-500' : 'bg-rose-500/10 text-rose-500'
            }`}>
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">
                {isSale ? 'Sale Return Receipt' : 'Purchase Return Receipt'}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono font-bold">{returnNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs transition cursor-pointer active:scale-98 shadow-xs"
              title="Print Receipt (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Return Voucher Container */}
        <div
          ref={receiptRef}
          className={`p-6 rounded-2xl border font-sans text-slate-800 ${
            theme === 'dark' ? 'bg-white text-slate-900 border-slate-300' : 'bg-white border-slate-200'
          }`}
        >
          {/* Shop Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              {shop?.shopName || shop?.name || 'Gallah Mandi Commission Shop'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {shop?.address || shop?.city || 'Main Grain Market • Ghalla Mandi'}
            </p>
            {shop?.phone && (
              <p className="text-[11px] text-slate-500 font-medium">
                Phone / WhatsApp: {shop.phone}
              </p>
            )}
            <div className="pt-2">
              <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
                isSale ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isSale ? 'SALE RETURN VOUCHER' : 'PURCHASE RETURN VOUCHER'}
              </span>
            </div>
          </div>

          {/* Return Info Grid */}
          <div className="grid grid-cols-2 gap-3 py-3 text-xs border-b border-dashed border-slate-300">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Voucher #</div>
              <div className="font-mono font-bold text-slate-900">{returnNo}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Date</div>
              <div className="font-medium text-slate-900">{dateStr}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">{isSale ? 'Customer' : 'Supplier'}</div>
              <div className="font-bold text-slate-900">{partyName}</div>
              {partyPhone && <div className="text-[10px] text-slate-500">{partyPhone}</div>}
              {partyCity && <div className="text-[10px] text-slate-500">{partyCity}</div>}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Original {isSale ? 'Invoice #' : 'Bill #'}</div>
              <div className="font-mono font-bold text-blue-700">{refInvoiceNo}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Mode: <span className="font-bold text-slate-800">{refundMode === 'Cash' ? 'Cash Refund' : (isSale ? 'Khata Credit' : 'Khata Debit')}</span>
              </div>
            </div>
          </div>

          {/* Returned Items Table */}
          <div className="py-3">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="pb-1.5">Item Description</th>
                  <th className="pb-1.5 text-center">Qty</th>
                  <th className="pb-1.5 text-right">Rate</th>
                  <th className="pb-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className="text-xs">
                    <td className="py-2 font-medium text-slate-900">{it.name}</td>
                    <td className="py-2 text-center font-mono font-bold text-slate-800">
                      {it.qty} {it.unit}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-700">
                      Rs. {it.rate.toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      Rs. {it.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-sm font-black pt-1">
              <span>TOTAL RETURN AMOUNT:</span>
              <span className={`font-mono text-base ${isSale ? 'text-orange-600' : 'text-rose-600'}`}>
                Rs. {refundAmount.toLocaleString()}
              </span>
            </div>

            <div className="pt-2 text-[11px] text-slate-500">
              <span className="font-bold text-slate-700">Reason / Remarks:</span> {reason}
            </div>

            <div className="pt-2 text-[10px] text-slate-400 text-center italic border-t border-slate-100 mt-3">
              This is a system-generated official Mandi Return Voucher.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
