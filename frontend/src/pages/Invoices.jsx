import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Search, Printer, ArrowUpRight, ArrowDownLeft, DollarSign, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { ReceiptModal } from '../components/ReceiptModal';
import { PurchaseReceiptModal } from '../components/PurchaseReceiptModal';

export const Invoices = () => {
  const { sales, purchases, suppliers } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const typeParam = searchParams.get('type');
  const [search, setSearch] = useState('');
  const [selectedSaleReceipt, setSelectedSaleReceipt] = useState(null);
  const [selectedPurchaseReceipt, setSelectedPurchaseReceipt] = useState(null);

  const salesInvoices = (sales || []).map(s => {
    const rawAmt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : (s.grandtotal !== undefined ? s.grandtotal : 0)));
    const paidAmt = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount !== undefined ? s.paidamount : (s.status === 'Paid' ? rawAmt : 0)));
    return {
      id: s.id,
      invoiceNo: s.invoiceNo || s.invoiceno || '',
      partyName: s.partyName || s.partyname || s.customerName || 'Customer',
      date: s.date || 'N/A',
      amountNum: rawAmt,
      amount: rawAmt,
      paidAmount: paidAmt,
      paymentMode: s.paymentMode || (paidAmt >= rawAmt ? 'Cash' : paidAmt > 0 ? 'Partial Cash' : 'Khata (Udhaar)'),
      status: s.status || (paidAmt >= rawAmt && rawAmt > 0 ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Pending'),
      itemsCount: s.itemsCount || (s.cart ? s.cart.length : 1),
      cart: s.cart,
      type: 'Sale'
    };
  });

  const purchaseInvoices = (purchases || []).map(p => {
    const rawAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : (p.grandtotal !== undefined ? p.grandtotal : 0)));
    const paidAmt = Number(p.paidAmount !== undefined ? p.paidAmount : (p.paidamount !== undefined ? p.paidamount : ((p.status || p.paymentStatus) === 'Paid' ? rawAmt : 0)));
    const supObj = suppliers.find(s => s.name === (p.supplier || p.supplierName) || s.id === p.supplierId);
    
    const itemsList = Array.isArray(p.cart) && p.cart.length > 0 ? p.cart : (Array.isArray(p.items) && p.items.length > 0 ? p.items : []);
    const firstItem = itemsList[0] || {};
    const itemUnit = firstItem.unit || firstItem.unitName || firstItem.enteredUnit || p.unit || p.unitName || t('kg');
    const productName = firstItem.name || firstItem.productName || (typeof p.items === 'string' ? p.items : (p.productName || t('products')));
    const qty = Number(firstItem.qty || firstItem.enteredQty || p.qty || 1);
    const rate = Number(firstItem.rate || firstItem.price || firstItem.ratePerEnteredUnit || p.rate || p.purchasePrice || (qty ? Math.round(rawAmt / qty) : rawAmt));

    return {
      id: p.id,
      invoiceNo: p.purchaseNo || p.purchaseno || '',
      partyName: p.supplier || p.supplierName || p.suppliername || 'Supplier',
      supplierPhone: supObj?.phone || '',
      supplierCity: supObj?.city || '',
      supplierBalance: Number(supObj?.balance || 0),
      productName,
      qty,
      unit: itemUnit,
      rate,
      date: p.date || 'N/A',
      amountNum: rawAmt,
      amount: rawAmt,
      paidAmount: paidAmt,
      paymentMode: p.paymentMode || (paidAmt >= rawAmt ? 'Cash' : paidAmt > 0 ? 'Partial Cash' : 'Supplier Credit (Khata)'),
      status: p.status || p.paymentStatus || (paidAmt >= rawAmt && rawAmt > 0 ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Pending'),
      itemsCount: itemsList.length || 1,
      cart: itemsList.length > 0 ? itemsList.map(it => ({
        name: it.name || it.productName || 'Commodity Item',
        qty: Number(it.qty || it.enteredQty || 1),
        unit: it.unit || it.unitName || it.enteredUnit || itemUnit,
        unitName: it.unitName || it.unit || it.enteredUnit || itemUnit,
        rate: Number(it.rate || it.price || it.ratePerEnteredUnit || 0),
        price: Number(it.price || it.rate || it.ratePerEnteredUnit || 0),
        total: Number(it.total || it.totalAmount || 0)
      })) : null,
      type: 'Purchase'
    };
  });

  const isPurchases = typeParam && typeParam.toLowerCase() === 'purchases';
  const activeTab = isPurchases ? 'Purchases' : 'Sales';

  const totalSalesInvoiced = salesInvoices.reduce((acc, i) => acc + i.amountNum, 0);
  const totalSalesPaid = salesInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const totalPurchasesInvoiced = purchaseInvoices.reduce((acc, i) => acc + i.amountNum, 0);
  const totalPurchasesPaid = purchaseInvoices.reduce((acc, i) => acc + i.paidAmount, 0);

  const list = isPurchases ? purchaseInvoices : salesInvoices;

  const filtered = list.filter(item =>
    item.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
    item.partyName.toLowerCase().includes(search.toLowerCase())
  );

  const openReceiptModal = (inv) => {
    if (inv.type === 'Sale') {
      setSelectedSaleReceipt({
        orderId: inv.invoiceNo,
        date: inv.date,
        customerName: inv.partyName,
        items: inv.cart && inv.cart.length > 0 ? inv.cart.map(item => ({
          name: item.name,
          qty: item.qty,
          unit: item.unitName || item.unit || t('kg'),
          price: Number(item.rate || item.price || 0)
        })) : [{
          name: inv.items || t('products'),
          qty: inv.itemsCount || 1,
          unit: t('item'),
          price: Number(inv.amount || 0)
        }],
        subtotal: Number(inv.amount || 0),
        discount: 0,
        tax: 0,
        grandTotal: Number(inv.amount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        paymentMethod: inv.paymentMode || 'Cash',
        saleNote: 'Sales Tax Invoice'
      });
    } else {
      const purchaseReceiptItems = inv.cart && Array.isArray(inv.cart) && inv.cart.length > 0 ? inv.cart.map(item => ({
        name: item.name || item.productName || inv.productName || t('products'),
        qty: Number(item.qty || item.enteredQty || 1),
        unit: item.unit || item.unitName || item.enteredUnit || inv.unit || t('kg'),
        price: Number(item.rate || item.price || item.ratePerEnteredUnit || inv.rate || 0),
        total: Number(item.total || item.totalAmount || (Number(item.rate || inv.rate || 0) * Number(item.qty || 1)) || inv.amount || 0)
      })) : [{
        name: inv.productName || t('products'),
        qty: inv.qty || 1,
        unit: inv.unit || t('kg'),
        price: Number(inv.rate || inv.amount || 0),
        total: Number(inv.amount || 0)
      }];

      setSelectedPurchaseReceipt({
        purchaseNo: inv.invoiceNo,
        date: inv.date,
        supplierName: inv.partyName,
        supplierPhone: inv.supplierPhone,
        supplierCity: inv.supplierCity,
        items: purchaseReceiptItems,
        totalAmount: Number(inv.amount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        paymentMode: inv.paymentMode || 'Supplier Credit (Khata)',
        supplierBalance: inv.supplierBalance,
        note: 'Official Purchase Goods Inward Voucher'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            {isPurchases ? (
              <ShoppingCart className="w-6 h-6 text-brand-500" />
            ) : (
              <FileText className="w-6 h-6 text-brand-500" />
            )}
            {isPurchases ? (t('purchaseInvoices') || 'Purchase Invoices') : (t('saleInvoices') || 'Sale Invoices')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isPurchases
              ? (t('purchasesInvoicesSubtitle') || 'View, search and print procurement invoices and supplier inward receipts')
              : (t('salesInvoicesSubtitle') || 'View, search and print customer sales tax invoices and counter receipts')}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
        >
          <Printer className="w-4 h-4" /> {t('Print Receipt')}
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`border rounded-2xl p-5 card-shadow card-hover transition-all ${
          theme === 'dark'
            ? isPurchases ? 'bg-slate-800 border-blue-500/30' : 'bg-slate-800 border-emerald-500/30'
            : isPurchases ? 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200/60' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
        }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            {isPurchases ? <ShoppingCart className="w-4 h-4 text-blue-600" /> : <ShoppingBag className="w-4 h-4 text-emerald-600" />}
            {isPurchases ? t('totalPurchasesVolume') : t('totalSalesVolume')}
          </div>
          <div className={`text-2xl font-black mt-1.5 font-mono ${isPurchases ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Rs. {(isPurchases ? totalPurchasesInvoiced : totalSalesInvoiced).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            {(isPurchases ? purchaseInvoices.length : salesInvoices.length)} {t('invoices')}
          </div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow card-hover transition-all ${
          theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
        }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            {isPurchases ? (t('totalPaidOut') || 'Total Paid to Suppliers') : (t('totalReceivedPayment') || 'Total Cash Received')}
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-emerald-600 dark:text-emerald-400">
            Rs. {(isPurchases ? totalPurchasesPaid : totalSalesPaid).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">
            {t('paid')}
          </div>
        </div>

        <div className={`border rounded-2xl p-5 card-shadow card-hover transition-all ${
          theme === 'dark' ? 'bg-slate-800 border-blue-500/30' : 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200/60'
        }`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" /> {t('totalInvoicesCount') || 'Total Invoices'}
          </div>
          <div className="text-2xl font-black mt-1.5 font-mono text-blue-600 dark:text-blue-400">
            {(isPurchases ? purchaseInvoices.length : salesInvoices.length)} {t('invoices')}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-1">
            Billed Records
          </div>
        </div>
      </div>

      {/* Search Header Container */}
      <div className={`border rounded-2xl p-4 card-shadow flex flex-col md:flex-row gap-4 justify-between items-center transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="text-xs font-black text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500"></span>
          <span>{isPurchases ? 'All Purchase Procurement Invoices' : 'All Customer Sales Tax Invoices'} ({filtered.length})</span>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isPurchases ? "Filter invoice no or supplier firm..." : "Filter invoice no or customer party..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none transition focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                <th className="py-3.5 px-4">{t('invoiceNo')}</th>
                <th className="py-3.5 px-4">{activeTab === 'Sales' ? t('customerParty') : t('supplierFirmName')}</th>
                <th className="py-3.5 px-4">{activeTab === 'Sales' ? t('itemsSold') : t('product')}</th>
                <th className="py-3.5 px-4">{t('date')}</th>
                <th className="py-3.5 px-4 text-right">{t('totalAmount')}</th>
                <th className="py-3.5 px-4 text-right">{t('remainingDue')}</th>
                <th className="py-3.5 px-4 text-center">{t('status')}</th>
                <th className="py-3.5 px-4 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
              }`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    {t('noInvoicesFound')}
                  </td>
                </tr>
              ) : (
                filtered.map(inv => {
                  const paid = Number(inv.paidAmount !== undefined ? inv.paidAmount : (inv.status === 'Paid' ? inv.amount : 0));
                  const total = Number(inv.amount || 0);
                  const due = Math.max(0, total - paid);

                  return (
                    <tr key={inv.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                      }`}>
                      <td className="py-3.5 px-4 font-mono font-black text-brand-500">{inv.invoiceNo}</td>
                      <td className="py-3.5 px-4 font-extrabold text-xs">{inv.partyName}</td>
                      <td className="py-3.5 px-4">
                        {inv.cart && inv.cart.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {inv.cart.map((item, idx) => (
                              <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-extrabold text-xs border border-brand-500/20 whitespace-nowrap w-fit">
                                <span>📦 {item.name}</span>
                                <span className="text-[10px] opacity-80">({item.qty} {item.unitName || item.unit || t('kg')} @ Rs. {(item.rate || item.price || 0).toLocaleString()})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold">{inv.productName || (typeof inv.items === 'string' ? inv.items : (Array.isArray(inv.items) ? inv.items.map(i => i.name || i.productName).join(', ') : t('products')))}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{inv.date}</td>
                      <td className="py-3.5 px-4 text-right font-black text-xs">Rs. {total.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-xs">
                        <span className={due > 0 ? 'text-rose-500 font-black' : 'text-slate-400'}>
                          Rs. {due.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap border ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                          inv.status === 'Partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' :
                            'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}>
                          {inv.status === 'Paid' ? t('paid') : inv.status === 'Partial' ? t('partial') : t('pending')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openReceiptModal(inv)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-2xs ${activeTab === 'Sales'
                            ? theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-brand-400 border border-slate-600'
                              : 'bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-200'
                            : theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-slate-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          title={t('Print Receipt')}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('Print Receipt')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Receipt Modal */}
      {selectedSaleReceipt && (
        <ReceiptModal
          isOpen={!!selectedSaleReceipt}
          onClose={() => setSelectedSaleReceipt(null)}
          orderData={selectedSaleReceipt}
        />
      )}

      {/* Purchase Voucher Modal */}
      {selectedPurchaseReceipt && (
        <PurchaseReceiptModal
          isOpen={!!selectedPurchaseReceipt}
          onClose={() => setSelectedPurchaseReceipt(null)}
          purchaseData={selectedPurchaseReceipt}
        />
      )}
    </div>
  );
};

export default Invoices;

