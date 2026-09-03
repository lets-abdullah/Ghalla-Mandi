import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Printer,
  Users,
  User,
  UserCheck,
  Package,
  X,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Plus,
  Building2,
  LayoutGrid,
  List,
  Wallet,
  Phone,
  MapPin,
  FileText,
  Clock
} from 'lucide-react';
import { useERP, computeLedgerStatement, computeAllCustomersFinancials, computeAllSuppliersFinancials, computeSaleFinancials, computePurchaseFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { SupplierLedgerTimeline } from '../components/SupplierLedgerTimeline';

export const Ledger = () => {
  const toast = useToast();
  const {
    customers = [],
    suppliers = [],
    products = [],
    sales = [],
    purchases = [],
    paymentLogs = [],
    saleReturns = [],
    purchaseReturns = [],
    recordPayment
  } = useERP();

  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Ledger mode: 'Customer' (default) or 'Supplier'
  const typeParam = searchParams.get('type');
  const isSupplier = typeParam && (typeParam.toLowerCase() === 'supplier' || typeParam.toLowerCase() === 'suppliers');
  const customerIdParam = searchParams.get('customerId');

  // Active view: 'All' (Customer List View) OR specific party ID / Name (Customer Complete Ledger View)
  const [selectedPartyId, setSelectedPartyId] = useState(customerIdParam || 'All');

  // Customer List View Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All'); // 'All' | 'Regular Customer' | 'Walk-in Customer'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Receivable' | 'Payable' | 'Settled'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'

  // Single Customer Ledger View Filters
  const [dateFilterType, setDateFilterType] = useState('All'); // 'All' | 'Today' | 'This Week' | 'This Month' | 'Custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('All'); // 'All' | 'Sales' | 'Payments' | 'Returns'
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [statementViewMode, setStatementViewMode] = useState('table'); // Table / columns view strictly enforced

  // Modals state
  const [viewingEntry, setViewingEntry] = useState(null);

  // Sync state with customerId query parameter
  useEffect(() => {
    if (customerIdParam) {
      setSelectedPartyId(customerIdParam);
    }
  }, [customerIdParam]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (viewingEntry) setViewingEntry(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingEntry]);

  // Robust Date Parser helper
  const parseLedgerDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Date Filter matcher
  const matchDate = (dateStr) => {
    if (dateFilterType === 'All') return true;
    const entryDate = parseLedgerDate(dateStr);
    if (!entryDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const day = new Date(entryDate);
    day.setHours(0, 0, 0, 0);

    if (dateFilterType === 'Today') {
      return day.getTime() === today.getTime();
    }
    if (dateFilterType === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      return day >= startOfWeek && day <= new Date();
    }
    if (dateFilterType === 'This Month') {
      return day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth();
    }
    if (dateFilterType === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return day >= start && day <= end;
      } else if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return day >= start;
      } else if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return day <= end;
      }
    }
    return true;
  };

  // Build Chronological Ledger Entries across all data
  const rawLedgerEntries = useMemo(() => {
    const entries = [];

    if (!isSupplier) {
      // 0. Customer Opening Balances (Debit)
      (customers || []).forEach(cust => {
        const opBal = Number(cust.openingBalance !== undefined ? cust.openingBalance : (cust.openingbalance !== undefined ? cust.openingbalance : 0));
        if (opBal > 0) {
          entries.push({
            id: `open-bal-cust-${cust.id}`,
            rawDate: cust.created_at || '2026-01-01',
            date: cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-GB') : 'Opening',
            partyId: String(cust.id),
            partyName: cust.name,
            customerType: cust.customerType || 'Regular Customer',
            ref: 'OPENING',
            txType: 'Opening Balance',
            desc: 'Opening Receivable Balance',
            debit: opBal,
            credit: 0,
            items: [],
            productNames: '',
            notes: 'Opening balance registered for customer'
          });
        }
      });

      // Track payment logs that are already accounted for
      const accountedPosSaleIds = new Set();
      (paymentLogs || []).filter(p => p.type === 'Customer' || p.partyType === 'Customer').forEach(p => {
        if (p.saleId) accountedPosSaleIds.add(String(p.saleId));
      });

      // 1. Customer Sales Invoices (Debit)
      (sales || []).forEach(s => {
        const custObj = customers.find(c => (s.customerId && String(c.id) === String(s.customerId)) || (c.name && s.partyName && c.name.trim().toLowerCase() === s.partyName.trim().toLowerCase() && c.name.trim().toLowerCase() !== 'walk-in customer'));
        const isWalkin = (!custObj && !s.customerId) || (s.partyName || '').toLowerCase().includes('walk-in') || (s.customerType || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';
        const rawParty = (s.partyName || s.customerName || 'Walk-in Customer').trim();
        const partyId = custObj ? String(custObj.id) : (s.customerId ? String(s.customerId) : `walkin-${rawParty}`);
        const partyName = custObj?.name || rawParty;

        const fin = computeSaleFinancials(s, saleReturns, paymentLogs);
        const sGross = fin.grossTotal;
        const sNet = fin.netTotal;
        const sReturn = fin.returnAmount;
        const sPaid = fin.paid;
        const sDue = fin.due;
        const sStatus = fin.status;
        const isPartiallyReturned = sReturn > 0 && sStatus !== 'Returned';
        const isFullyReturned = sStatus === 'Returned' || (sReturn >= sGross && sGross > 0);

        const itemsSummary = Array.isArray(s.cart) && s.cart.length > 0
          ? s.cart.map(i => `${i.name} (${i.qty} ${i.unitName || i.unit || 'KG'})`).join(', ')
          : (typeof s.items === 'string' ? s.items : 'Commodity Sale');

        const descText = sReturn > 0
          ? `Invoice #${s.invoiceNo || s.id}: ${itemsSummary}`
          : `Invoice: ${itemsSummary}`;

        const historyNote = sReturn > 0
          ? `Original Sale: Rs. ${sGross.toLocaleString()} • Returned: Rs. ${sReturn.toLocaleString()} • Net Sale: Rs. ${sNet.toLocaleString()} | Paid: Rs. ${sPaid.toLocaleString()}, Due: Rs. ${sDue.toLocaleString()} (${sStatus})`
          : (s.note || '');

        // Sale Invoice Entry (Debit)
        entries.push({
          id: `sale-${s.id}`,
          rawDate: s.date,
          date: s.date || 'N/A',
          partyId,
          partyName,
          customerType: custType,
          ref: s.invoiceNo || 'SALE',
          txType: 'Sales',
          desc: descText,
          sales: sNet,
          originalGross: sGross,
          netTotal: sNet,
          returnAmount: sReturn,
          paidAmount: sPaid,
          dueAmount: sDue,
          invoiceStatus: sStatus,
          isPartiallyReturned,
          isFullyReturned,
          debit: Number(s.amount ?? s.grandTotal ?? 0),
          credit: 0,
          notes: historyNote
        });

        // Upfront cash paid on POS counter (only if unlogged in paymentLogs)
        const hasSpecificInvoiceLog = (paymentLogs || []).some(p =>
          (p.type === 'Customer' || p.partyType === 'Customer') &&
          (
            (p.saleId && String(p.saleId) === String(s.id)) ||
            (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
          )
        );

        let paidAmt = 0;
        const customerPayments = (paymentLogs || []).filter(p => p.type === 'Customer' || p.partyType === 'Customer');
        if (customerPayments.length === 0) {
          const isMarkedPaid = s.status === 'Paid' || s.paymentStatus === 'Paid';
          const sTotal = Number(s.amount ?? s.grandTotal ?? 0);
          paidAmt = isMarkedPaid ? sTotal : Number(s.cashReceived !== undefined ? s.cashReceived : (s.paidAmount || 0));
        } else if (!hasSpecificInvoiceLog && s.cashReceived !== undefined && Number(s.cashReceived) > 0) {
          paidAmt = Number(s.cashReceived);
        }

        if (paidAmt > 0 && !hasSpecificInvoiceLog) {
          entries.push({
            id: `pay-direct-${s.id}`,
            rawDate: s.date,
            date: s.date || 'N/A',
            partyId,
            partyName,
            customerType: custType,
            ref: `RCP-${s.invoiceNo || s.id}`,
            txType: 'Payments',
            desc: `POS Counter Payment against ${s.invoiceNo || 'Sale'}`,
            debit: 0,
            credit: paidAmt,
            items: s.cart || s.items || [],
            productNames: '',
            notes: s.paymentMode || 'Counter Payment'
          });
        }
      });

      // 2. Standalone Customer Payment Logs (Credit)
      (paymentLogs || []).filter(p => p.type === 'Customer' || p.partyType === 'Customer').forEach(p => {
        const custObj = customers.find(c => (p.partyId && String(c.id) === String(p.partyId)) || (c.name && p.partyName && c.name.trim().toLowerCase() === p.partyName.trim().toLowerCase() && c.name.trim().toLowerCase() !== 'walk-in customer'));
        const isWalkin = (!custObj && !p.partyId) || (p.partyName || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';
        const rawParty = (p.partyName || custObj?.name || 'Customer').trim();
        const partyId = custObj ? String(custObj.id) : (p.partyId ? String(p.partyId) : `walkin-${rawParty}`);
        const partyName = custObj?.name || rawParty;

        entries.push({
          id: `pay-${p.id}`,
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId,
          partyName,
          customerType: custType,
          ref: p.ref || `PAY-${p.id}`,
          txType: 'Payments',
          desc: p.saleId ? `POS Payment for Invoice` : `Payment: ${p.mode || p.paymentMode || 'Cash'}`,
          debit: 0,
          credit: Number(p.amount || 0),
          items: [],
          productNames: '',
          notes: p.note || ''
        });
      });

      // 3. Sale Returns (Only Ledger returns create Khata Credit Notes; Cash returns are non-Khata cash movements)
      (saleReturns || []).forEach(r => {
        const custObj = customers.find(c => (r.customerId && String(c.id) === String(r.customerId)) || (c.name && r.customerName && c.name.trim().toLowerCase() === r.customerName.trim().toLowerCase() && c.name.trim().toLowerCase() !== 'walk-in customer'));
        const isWalkin = (!custObj && !r.customerId) || (r.customerName || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';
        const rawParty = (r.customerName || custObj?.name || 'Customer').trim();
        const partyId = custObj ? String(custObj.id) : (r.customerId ? String(r.customerId) : `walkin-${rawParty}`);
        const partyName = custObj?.name || rawParty;
        const isCashRefund = String(r.refundMode || '').trim().toLowerCase() === 'cash';
        const refAmt = Number(r.refundAmount !== undefined ? r.refundAmount : (r.amount || 0));

        const matchingSale = (sales || []).find(s => (r.saleId && String(s.id) === String(r.saleId)) || (r.invoiceNo && s.invoiceNo && r.invoiceNo === s.invoiceNo));
        const origSaleGross = matchingSale ? Number(matchingSale.amount || matchingSale.grandTotal || 0) : 0;
        const netAfterReturn = origSaleGross > 0 ? Math.max(0, origSaleGross - refAmt) : 0;

        const descText = matchingSale
          ? `Sale Return #${r.returnNo || 'RET'} against Invoice ${matchingSale.invoiceNo}: ${r.reason || 'Goods Return'}`
          : (isCashRefund ? `Cash Return Refund (Direct Counter Cash - No Khata Credit Note)` : `Return Credit Note: ${r.reason || 'Sale Return'}`);

        const historyNote = isCashRefund
          ? (origSaleGross > 0
            ? `Direct counter cash refund of Rs. ${refAmt.toLocaleString()} given to customer. Original Invoice ${matchingSale?.invoiceNo || ''} (Rs. ${origSaleGross.toLocaleString()}) adjusted to Net Rs. ${netAfterReturn.toLocaleString()}.`
            : `Cash refund of Rs. ${refAmt.toLocaleString()} issued directly at counter.`)
          : (origSaleGross > 0
            ? `Khata Credit Note adjusted. Original Invoice ${matchingSale?.invoiceNo || ''} (Rs. ${origSaleGross.toLocaleString()}) adjusted to Net Rs. ${netAfterReturn.toLocaleString()}.`
            : `Credit note of Rs. ${refAmt.toLocaleString()} adjusted against Khata.`);

        entries.push({
          id: `ret-${r.id}`,
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId,
          partyName,
          customerType: custType,
          ref: r.returnNo || `RET-${r.id}`,
          matchingInvoiceNo: matchingSale?.invoiceNo || r.invoiceNo || '',
          originalGross: origSaleGross,
          returnAmount: refAmt,
          netTotal: netAfterReturn,
          refundMode: isCashRefund ? 'Cash' : 'Ledger',
          txType: 'Returns',
          desc: descText,
          sales: 0,
          payment: refAmt,
          debit: 0,
          credit: isCashRefund ? 0 : refAmt,
          paymentMethod: isCashRefund ? 'Cash (Direct Refund)' : 'Khata Credit Note',
          paymentAccount: isCashRefund ? 'Cash in Hand' : 'Customer Khata',
          items: r.items || [],
          productNames: '',
          notes: historyNote
        });
      });
    } else {
      // 0. Supplier Opening Balances (Debit)
      (suppliers || []).forEach(sup => {
        const opBal = Number(sup.openingBalance !== undefined ? sup.openingBalance : (sup.openingbalance !== undefined ? sup.openingbalance : 0));
        if (opBal > 0) {
          entries.push({
            id: `open-bal-sup-${sup.id}`,
            rawDate: sup.created_at || '2026-01-01',
            date: sup.created_at ? new Date(sup.created_at).toLocaleDateString('en-GB') : 'Opening',
            partyId: String(sup.id),
            partyName: sup.name,
            customerType: 'Supplier',
            ref: 'OPENING',
            txType: 'Opening Balance',
            desc: 'Opening Payable Balance',
            debit: opBal,
            credit: 0,
            items: [],
            productNames: '',
            notes: 'Opening balance registered for supplier'
          });
        }
      });

      // Supplier Ledger Transactions
      (purchases || []).forEach(p => {
        const supObj = suppliers.find(s => String(s.id) === String(p.supplierId) || s.name === (p.supplier || p.supplierName));
        const partyId = p.supplierId ? String(p.supplierId) : (supObj?.id ? String(supObj.id) : null);
        const pItems = p.cart || p.items || [];

        const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs);
        const pGross = fin.grossTotal;
        const pNet = fin.netTotal;
        const pReturn = fin.returnAmount;
        const pPaid = fin.paid;
        const pDue = fin.due;
        const pStatus = fin.status;
        const isPartiallyReturned = pReturn > 0 && pStatus !== 'Returned';
        const isFullyReturned = pStatus === 'Returned' || (pReturn >= pGross && pGross > 0);

        const descText = pReturn > 0
          ? `Purchase #${p.purchaseNo || p.id}: Inward stock procurement`
          : `Purchase: Inward stock procurement`;

        const historyNote = pReturn > 0
          ? `Original Bill: Rs. ${pGross.toLocaleString()} • Returned: Rs. ${pReturn.toLocaleString()} • Net Bill: Rs. ${pNet.toLocaleString()} | Paid: Rs. ${pPaid.toLocaleString()}, Due: Rs. ${pDue.toLocaleString()} (${pStatus})`
          : '';

        entries.push({
          id: `pur-${p.id}`,
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId,
          partyName: p.supplier || p.supplierName || 'Supplier',
          customerType: 'Supplier',
          ref: p.purchaseNo || `PUR-${p.id}`,
          txType: 'Purchases',
          desc: descText,
          sales: pNet,
          originalGross: pGross,
          netTotal: pNet,
          returnAmount: pReturn,
          paidAmount: pPaid,
          dueAmount: pDue,
          invoiceStatus: pStatus,
          isPartiallyReturned,
          isFullyReturned,
          debit: Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0),
          credit: 0,
          items: pItems,
          productNames: '',
          notes: historyNote
        });

        // Upfront cash paid on Purchase (only if unlogged in paymentLogs)
        const hasSpecificPurLog = (paymentLogs || []).some(pl =>
          (pl.type === 'Supplier' || pl.partyType === 'Supplier') &&
          (
            (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
            (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
          )
        );

        let pPaidAmt = 0;
        const supplierPayments = (paymentLogs || []).filter(pl => pl.type === 'Supplier' || pl.partyType === 'Supplier');
        if (supplierPayments.length === 0) {
          const isMarkedPaid = p.status === 'Paid' || p.paymentStatus === 'Paid';
          const pTotal = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0);
          pPaidAmt = isMarkedPaid ? pTotal : Number(p.cashPaid !== undefined ? p.cashPaid : (p.paidAmount || 0));
        } else if (!hasSpecificPurLog && p.cashPaid !== undefined && Number(p.cashPaid) > 0) {
          pPaidAmt = Number(p.cashPaid);
        }

        if (pPaidAmt > 0 && !hasSpecificPurLog) {
          entries.push({
            id: `pay-sup-direct-${p.id}`,
            rawDate: p.date,
            date: p.date || 'N/A',
            partyId,
            partyName: p.supplier || p.supplierName || 'Supplier',
            customerType: 'Supplier',
            ref: `PAY-${p.purchaseNo || p.id}`,
            txType: 'Payments',
            desc: `Upfront Payment against ${p.purchaseNo || 'Purchase'}`,
            debit: 0,
            credit: pPaidAmt,
            items: [],
            productNames: '',
            notes: p.paymentMethod || 'Upfront Payment'
          });
        }
      });

      (paymentLogs || []).filter(p => p.type === 'Supplier' || p.partyType === 'Supplier').forEach(p => {
        const supObj = suppliers.find(s => String(s.id) === String(p.partyId) || s.name === p.partyName);
        entries.push({
          id: `pay-sup-${p.id}`,
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId: p.partyId ? String(p.partyId) : (supObj?.id ? String(supObj.id) : null),
          partyName: p.partyName || supObj?.name || 'Supplier',
          customerType: 'Supplier',
          ref: p.ref || `PAY-${p.id}`,
          txType: 'Payments',
          desc: `Supplier Payment Out (${p.mode || p.paymentMode || 'Cash'})`,
          debit: 0,
          credit: Number(p.amount || 0),
          items: [],
          productNames: '',
          notes: p.note || ''
        });
      });

      (purchaseReturns || []).forEach(r => {
        const supObj = suppliers.find(s => String(s.id) === String(r.supplierId) || s.name === r.supplierName);
        const isCashRefund = String(r.refundMode || '').trim().toLowerCase() === 'cash';
        const refAmt = Number(r.refundAmount !== undefined ? r.refundAmount : (r.amount || 0));

        const matchingPurchase = (purchases || []).find(p => (r.purchaseId && String(p.id) === String(r.purchaseId)) || (r.purchaseNo && p.purchaseNo && r.purchaseNo === p.purchaseNo));
        const origPurchaseGross = matchingPurchase ? Number(matchingPurchase.amount || matchingPurchase.grandTotal || 0) : 0;
        const netAfterReturn = origPurchaseGross > 0 ? Math.max(0, origPurchaseGross - refAmt) : 0;

        const descText = matchingPurchase
          ? `Purchase Return #${r.returnNo || 'PR'} against Bill ${matchingPurchase.purchaseNo}: ${r.reason || 'Goods Return'}`
          : (isCashRefund ? `Cash Purchase Return Refund (Received from Supplier - No Khata Debit Note)` : `Purchase Return Debit Note (${r.reason || 'Return'})`);

        const historyNote = isCashRefund
          ? (origPurchaseGross > 0
            ? `Direct counter refund of Rs. ${refAmt.toLocaleString()} received from vendor. Original Bill was Rs. ${origPurchaseGross.toLocaleString()} → Net Bill now Rs. ${netAfterReturn.toLocaleString()}.`
            : `Cash refund of Rs. ${refAmt.toLocaleString()} received directly from supplier.`)
          : (origPurchaseGross > 0
            ? `Khata Debit Note adjusted. Original Bill was Rs. ${origPurchaseGross.toLocaleString()} → Net Bill now Rs. ${netAfterReturn.toLocaleString()}.`
            : `Debit note of Rs. ${refAmt.toLocaleString()} adjusted against Khata.`);

        entries.push({
          id: `pret-${r.id}`,
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId: r.supplierId ? String(r.supplierId) : (supObj?.id ? String(supObj.id) : null),
          partyName: r.supplierName || supObj?.name || 'Supplier',
          customerType: 'Supplier',
          ref: r.returnNo || `PR-${r.id}`,
          matchingInvoiceNo: matchingPurchase?.purchaseNo || r.purchaseNo || '',
          originalGross: origPurchaseGross,
          returnAmount: refAmt,
          netTotal: netAfterReturn,
          refundMode: isCashRefund ? 'Cash' : 'Ledger',
          txType: 'Returns',
          desc: descText,
          sales: 0,
          payment: refAmt,
          debit: 0,
          credit: isCashRefund ? 0 : refAmt,
          paymentMethod: isCashRefund ? 'Cash (Direct Refund)' : 'Khata Debit Note',
          paymentAccount: isCashRefund ? 'Cash in Hand' : 'Supplier Khata',
          items: r.items || [],
          productNames: '',
          notes: historyNote
        });
      });
    }

    // Sort chronologically (oldest to newest)
    entries.sort((a, b) => {
      const da = parseLedgerDate(a.rawDate) || new Date(0);
      const db = parseLedgerDate(b.rawDate) || new Date(0);
      return da - db;
    });

    return entries;
  }, [sales, purchases, paymentLogs, saleReturns, purchaseReturns, customers, suppliers, isSupplier]);

  // Aggregate Customer / Party Entities for the Customer-First List View
  // Universal Financials from Centralized Engine (Single Source of Truth)
  const custFin = useMemo(() => {
    return computeAllCustomersFinancials(customers, sales, paymentLogs, saleReturns);
  }, [customers, sales, paymentLogs, saleReturns]);

  const supFin = useMemo(() => {
    return computeAllSuppliersFinancials(suppliers, purchases, paymentLogs, purchaseReturns);
  }, [suppliers, purchases, paymentLogs, purchaseReturns]);

  const customerEntities = useMemo(() => {
    if (isSupplier) {
      return (supFin.allSuppliers || []).map(s => ({
        id: String(s.id),
        name: s.name || 'Supplier',
        businessName: s.businessName || '',
        phone: s.phone || '',
        city: s.city || 'Local Mandi',
        customerType: 'Supplier',
        isWalkin: false,
        totalDebit: s.totalPurchase || 0,
        totalCredit: s.totalPaid || 0,
        balance: s.payableDue || 0,
        status: (s.payableDue || 0) > 0 ? 'Payable' : 'Settled'
      }));
    }
    return (custFin.allCustomers || []).map(c => ({
      id: String(c.id),
      name: c.name || 'Customer',
      businessName: c.businessName || c.shopName || '',
      phone: c.phone || '',
      city: c.city || 'Local Mandi',
      customerType: c.customerType || 'Regular Customer',
      isWalkin: Boolean(c.isWalkin),
      totalDebit: c.totalSale || 0,
      totalCredit: c.totalPaid || 0,
      balance: c.receivableDue || 0,
      status: (c.receivableDue || 0) > 0 ? 'Receivable' : 'Settled'
    }));
  }, [isSupplier, supFin, custFin]);

  // Aggregate KPI Totals (Synchronized 100% with Khata, Purchases & Customers)
  const totalReceivable = custFin.totalReceivables || 0;
  const totalPayable = supFin.totalPayables || 0;
  const totalDebitSum = isSupplier ? supFin.totalGrossPurchases : custFin.totalGrossSales;
  const totalCreditSum = isSupplier ? supFin.totalPaymentsPaid : custFin.totalPaymentsReceived;
  const settledCount = isSupplier ? supFin.settledCount : custFin.settledCount;
  // Filtered Customer Entities for the Customer List View
  const filteredCustomerEntities = useMemo(() => {
    return customerEntities.filter(c => {
      // Customer Type Filter
      if (customerTypeFilter === 'Regular Customer' && c.isWalkin) return false;
      if (customerTypeFilter === 'Walk-in Customer' && !c.isWalkin) return false;

      // Status Filter
      if (statusFilter === 'Receivable' && c.balance <= 0) return false;
      if (statusFilter === 'Payable' && c.balance <= 0) return false;
      if (statusFilter === 'Settled' && c.balance !== 0) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const shopMatch = (c.businessName || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').toLowerCase().includes(q);
        const cityMatch = (c.city || '').toLowerCase().includes(q);
        if (!nameMatch && !shopMatch && !phoneMatch && !cityMatch) return false;
      }

      return true;
    });
  }, [customerEntities, customerTypeFilter, statusFilter, searchQuery]);

  // Currently Selected Active Customer Object (when viewing complete ledger)
  const activeCustomer = useMemo(() => {
    if (selectedPartyId === 'All') return null;
    const selLower = String(selectedPartyId).trim().toLowerCase();
    return customerEntities.find(c =>
      String(c.id).toLowerCase() === selLower ||
      (c.name || '').trim().toLowerCase() === selLower ||
      `walkin-${(c.name || '').trim().toLowerCase()}` === selLower
    ) || {
      id: selectedPartyId,
      name: selectedPartyId,
      businessName: '',
      phone: '',
      city: 'Local Mandi',
      customerType: isSupplier ? 'Supplier' : 'Party Account',
      balance: 0,
      totalDebit: 0,
      totalCredit: 0,
      status: 'Settled'
    };
  }, [customerEntities, selectedPartyId, isSupplier]);

  // Master Ledger Statement with Deterministic Chronological Sequence & Running Balance
  const statement = useMemo(() => {
    if (selectedPartyId === 'All' || !activeCustomer) return null;
    return computeLedgerStatement(activeCustomer, {
      sales,
      purchases,
      paymentLogs,
      saleReturns,
      purchaseReturns,
      isSupplier
    });
  }, [activeCustomer, sales, purchases, paymentLogs, saleReturns, purchaseReturns, isSupplier, selectedPartyId]);

  // Single Customer Chronological Ledger with Verified Running Balance
  const singleCustomerLedger = useMemo(() => {
    if (!statement) return [];
    return statement.displayEntries.filter(entry => {
      if (!matchDate(entry.rawDate)) return false;
      if (txTypeFilter === 'Sales' && entry.txType !== 'Sales' && entry.txType !== 'Purchases') return false;
      if (txTypeFilter === 'Payments' && entry.txType !== 'Payments') return false;
      if (txTypeFilter === 'Returns' && entry.txType !== 'Returns') return false;
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.toLowerCase().trim();
        const refMatch = (entry.ref || '').toLowerCase().includes(q);
        const descMatch = (entry.desc || '').toLowerCase().includes(q);
        if (!refMatch && !descMatch) return false;
      }
      return true;
    });
  }, [statement, dateFilterType, customStartDate, customEndDate, txTypeFilter, txSearchQuery]);

  // Handle Switching to a Customer's Ledger
  const handleOpenCustomerLedger = (cust) => {
    setSelectedPartyId(String(cust.id));
    setTxTypeFilter('All');
    setDateFilterType('All');
    setTxSearchQuery('');
  };

  // Handle Going Back to Customers List
  const handleBackToCustomers = () => {
    setSelectedPartyId('All');
    setSearchParams(isSupplier ? { type: 'Supplier' } : {});
  };

  // Print Ledger Function
  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACTION BAR (Screen Only) */}
      {/* ========================================================================= */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedPartyId !== 'All' && (
              <button
                type="button"
                onClick={handleBackToCustomers}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Back to Customers"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-brand-500" />
              <span>
                {selectedPartyId === 'All'
                  ? (isSupplier ? 'Supplier Ledger' : 'Customer Ledger')
                  : `${activeCustomer?.name || 'Customer'} — Complete Ledger`}
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {selectedPartyId === 'All'
              ? 'Select any customer entity to view their detailed chronological ledger statement'
              : `Complete statement of all invoices, payments, and running balance for ${activeCustomer?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedPartyId !== 'All' ? (
            <>
              <button
                type="button"
                onClick={handleBackToCustomers}
                className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {isSupplier ? 'Suppliers' : 'Customers'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintLedger}
                className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handlePrintLedger}
              className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print Summary</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: CUSTOMER LIST / ENTITY DIRECTORY (DEFAULT) */}
      {/* ========================================================================= */}
      {selectedPartyId === 'All' ? (
        <div className="space-y-4">
          {/* 3 Financial Condition KPI Cards (Screen Only) */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Total Customer Sales / Purchases */}
            <div
              className={`p-4 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{isSupplier ? 'Total Supplier Purchases' : 'Total Customer Sales'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black mt-1.5 text-blue-600 dark:text-blue-400">
                Rs. {totalDebitSum.toLocaleString()}
              </div>
            </div>

            {/* 2. Total Received / Paid Out */}
            <div
              className={`p-4 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{isSupplier ? 'Total Paid Out' : 'Total Received'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black mt-1.5 text-indigo-600 dark:text-indigo-400">
                Rs. {totalCreditSum.toLocaleString()}
              </div>
            </div>

            {/* 3. Customer Receivables / Supplier Payables */}
            <div
              onClick={() => setStatusFilter(statusFilter === (isSupplier ? 'Payable' : 'Receivable') ? 'All' : (isSupplier ? 'Payable' : 'Receivable'))}
              className={`p-4 rounded-2xl border transition cursor-pointer card-hover card-shadow ${statusFilter === (isSupplier ? 'Payable' : 'Receivable')
                ? (isSupplier ? 'ring-2 ring-rose-500' : 'ring-2 ring-emerald-500')
                : ''
                } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : (isSupplier ? 'bg-gradient-to-b from-rose-50/60 to-white border-rose-200/80' : 'bg-gradient-to-b from-emerald-50/60 to-white border-emerald-200/80')}`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{isSupplier ? 'Supplier Payables' : 'Customer Receivables'}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${isSupplier ? 'bg-rose-500 shadow-xs shadow-rose-500/50' : 'bg-emerald-500 shadow-xs shadow-emerald-500/50'}`}></span>
              </div>
              <div className={`text-xl sm:text-2xl font-mono font-black mt-1.5 ${isSupplier ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                Rs. {(isSupplier ? totalPayable : totalReceivable).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Filter & Search Toolbar (Screen Only) */}
          <div className={`no-print border rounded-3xl p-3.5 sm:p-4 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search customer by name, shop, phone or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold outline-none placeholder:font-normal placeholder-slate-400"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Customer Type Filter */}
              {!isSupplier && (
                <div className="w-full sm:w-44">
                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="All">All Customer Types</option>
                    <option value="Regular Customer">Regular Customers</option>
                    <option value="Walk-in Customer">Walk-in Customers</option>
                  </select>
                </div>
              )}

              {/* Condition / Status Filter */}
              <div className="w-full sm:w-44">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Conditions</option>
                  <option value={isSupplier ? 'Payable' : 'Receivable'}>{isSupplier ? 'Payable' : 'Receivable'}</option>
                  <option value="Settled">Settled</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(customerTypeFilter !== 'All' || statusFilter !== 'All' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerTypeFilter('All');
                    setStatusFilter('All');
                    setSearchQuery('');
                  }}
                  className="h-[38px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-xs font-bold shrink-0 flex items-center justify-center gap-1.5"
                  title="Reset all filters"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRINT-ONLY HEADER (Directory Summary) */}
          {/* ========================================================================= */}
          <PrintHeader
            title={isSupplier ? "Supplier Ledger Statement Summary" : "Customer Ledger Statement Summary"}
            filterSummary={`Condition: ${statusFilter}`}
            stats={[
              { label: isSupplier ? 'Supplier dues deducted' : 'Customer Receivables', value: `Rs. ${(isSupplier ? totalPayable : totalReceivable).toLocaleString()}` },
              { label: isSupplier ? 'Total Purchases' : 'Total Sales', value: `Rs. ${totalDebitSum.toLocaleString()}` },
              { label: isSupplier ? 'Total Paid out' : 'Cash Received', value: `Rs. ${totalCreditSum.toLocaleString()}` }
            ]}
          />

          {/* Customer Entities Directory Table */}
          <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                    <th className="py-3.5 px-4">{isSupplier ? 'Supplier Firm' : 'Customer Entity'}</th>
                    <th className="py-3.5 px-4 text-right">{isSupplier ? 'Total Purchases' : 'Total Sales'}</th>
                    <th className="py-3.5 px-4 text-right">{isSupplier ? 'Total Paid out' : 'Cash Received'}</th>
                    <th className="py-3.5 px-4 text-right">{isSupplier ? 'Supplier dues deducted' : 'Remaining Balance'}</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {filteredCustomerEntities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center">
                        <EmptyState
                          icon={Users}
                          title={isSupplier ? 'No suppliers found' : 'No customers found'}
                          description="No matching party records found for current search/filter."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredCustomerEntities.map(cust => {
                      const bal = Number(cust.balance || 0);
                      const isPos = bal > 0;
                      const isNeg = bal < 0;
                      const isZero = bal === 0;

                      return (
                        <tr
                          key={cust.id}
                          onClick={() => handleOpenCustomerLedger(cust)}
                          className={`transition cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/90'
                            }`}
                        >
                          {/* 1. Customer Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${cust.isWalkin
                                ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                : 'bg-brand-500/10 text-brand-600 border-brand-500/20 dark:text-brand-400'
                                }`}>
                                {cust.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                                {cust.name}
                              </div>
                            </div>
                          </td>

                          {/* 2. Total Debit */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                            {cust.totalDebit > 0 ? `Rs. ${cust.totalDebit.toLocaleString()}` : '—'}
                          </td>

                          {/* 3. Total Credit */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                            {cust.totalCredit > 0 ? `Rs. ${cust.totalCredit.toLocaleString()}` : '—'}
                          </td>

                          {/* 4. Current Balance */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                            <span className={
                              isZero ? 'text-slate-400 font-bold' : 'text-amber-500 font-black'
                            }>
                              Rs. {cust.balance.toLocaleString()}
                            </span>
                          </td>

                          {/* 5. Condition Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-xs font-bold ${isZero ? 'text-slate-500' : 'text-amber-600 dark:text-amber-400'}`}>
                              {isPos ? (isSupplier ? 'Payable' : 'Receivable') : 'Settled'}
                            </span>
                          </td>

                          {/* 6. Action */}
                          <td className="py-3.5 px-4 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenCustomerLedger(cust)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs transition shadow-xs cursor-pointer active:scale-98"
                            >
                              <span>View Ledger</span>
                              <ArrowRight className="w-3.5 h-3.5" />
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

          {/* Print Footer for Directory View */}
          <PrintFooter note="Official Business Record • Ghalla Mandi Ledger Summary" />
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW B: SINGLE CUSTOMER COMPLETE CHRONOLOGICAL LEDGER STATEMENT */
        /* ========================================================================= */
        <div className="space-y-4">
          {statementViewMode === 'timeline' ? (
            <SupplierLedgerTimeline
              supplier={activeCustomer}
              entries={singleCustomerLedger}
              theme={theme}
              isSupplier={isSupplier}
            />
          ) : (
            <>
              {/* Customer Financial Condition Summary Header */}
              <div className={`p-5 rounded-3xl border card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-xs border ${activeCustomer?.isWalkin
                      ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                      : 'bg-gradient-to-br from-brand-500/20 to-brand-600/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                      }`}>
                      {activeCustomer?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black tracking-tight">{activeCustomer?.name}</h2>
                        <span className={`text-xs font-black uppercase tracking-wider ${activeCustomer?.isWalkin
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-brand-600 dark:text-brand-400'
                          }`}>
                          • {activeCustomer?.customerType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-0.5">
                        {activeCustomer?.businessName && <span>{activeCustomer?.businessName}</span>}
                        {activeCustomer?.phone && <span>• Phone: {activeCustomer?.phone}</span>}
                        <span>• City: {activeCustomer?.city || 'Local Mandi'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-2xl text-xs font-black border uppercase tracking-wider flex items-center gap-1.5 ${(activeCustomer?.balance || 0) > 0
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${(activeCustomer?.balance || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}></span>
                      <span>
                        {(activeCustomer?.balance || 0) > 0
                          ? (isSupplier ? 'Status: Payable (Due)' : 'Status: Receivable (Due)')
                          : 'Status: Settled (Cleared)'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 3 Financial Strip Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Total Purchases / Sales */}
                  <div className={`p-3.5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {isSupplier ? 'Total Purchases' : 'Total Sales'}
                    </div>
                    <div className="text-lg font-mono font-black text-blue-600 dark:text-blue-400 mt-1">
                      Rs. {(activeCustomer?.totalDebit || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Total Paid out / Received */}
                  <div className={`p-3.5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {isSupplier ? 'Total Paid out' : 'Cash Received'}
                    </div>
                    <div className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      Rs. {(activeCustomer?.totalCredit || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Remaining Balance */}
                  <div className={`p-3.5 rounded-2xl border ${(activeCustomer?.balance || 0) > 0
                    ? isSupplier
                      ? theme === 'dark' ? 'bg-rose-950/20 border-rose-800/60' : 'bg-rose-50/70 border-rose-200'
                      : theme === 'dark' ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50/70 border-emerald-200'
                    : theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {isSupplier ? 'Supplier dues deducted' : 'Account Balance'}
                    </div>
                    <div className={`text-lg font-mono font-black mt-1 ${(activeCustomer?.balance || 0) < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : (activeCustomer?.balance || 0) > 0
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-slate-400'
                      }`}>
                      {(activeCustomer?.balance || 0) < 0
                        ? `Credit: Rs. ${Math.abs(activeCustomer?.balance || 0).toLocaleString()}`
                        : `Rs. ${(activeCustomer?.balance || 0).toLocaleString()}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statement Transaction Filter Bar (Screen Only) */}
              <div className={`no-print border rounded-3xl p-3.5 card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Voucher search */}
                  <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search voucher # or description..."
                      value={txSearchQuery}
                      onChange={(e) => setTxSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold outline-none placeholder:font-normal placeholder-slate-400"
                    />
                  </div>

                  {/* Date Filter */}
                  <div className="w-full sm:w-44">
                    <select
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    >
                      <option value="All">All Dates</option>
                      <option value="Today">Today</option>
                      <option value="This Week">This Week</option>
                      <option value="This Month">This Month</option>
                      <option value="Custom">Custom Date Range</option>
                    </select>
                  </div>

                  {/* Tx Type Filter */}
                  <div className="w-full sm:w-44">
                    <select
                      value={txTypeFilter}
                      onChange={(e) => setTxTypeFilter(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer h-[38px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    >
                      <option value="All">All Transactions</option>
                      <option value="Sales">{isSupplier ? 'Purchases Only' : 'Sales Only'}</option>
                      <option value="Payments">Payments Only</option>
                      <option value="Returns">Returns Only</option>
                    </select>
                  </div>
                </div>

                {/* Custom Date Pickers */}
                {dateFilterType === 'Custom' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400">Date Range:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                    <span className="text-xs text-slate-400 font-bold">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* PRINT-ONLY HEADER (Single Customer Statement) */}
              {/* ========================================================================= */}
              <PrintHeader
                title={`${activeCustomer?.name || 'Account'} — Statement of Account`}
                filterSummary={`Period: ${dateFilterType} | Type: ${txTypeFilter}`}
                stats={[
                  { label: isSupplier ? 'Total Purchases' : 'Total Sales', value: `Rs. ${(activeCustomer?.totalDebit || 0).toLocaleString()}` },
                  { label: isSupplier ? 'Total Paid out' : 'Cash Received', value: `Rs. ${(activeCustomer?.totalCredit || 0).toLocaleString()}` },
                  { label: isSupplier ? 'Supplier dues deducted' : 'Remaining Balance', value: `Rs. ${(activeCustomer?.balance || 0).toLocaleString()}` }
                ]}
              />

              {/* Complete Chronological Statement Table */}
              <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                    <thead>
                      <tr className={`border-b text-[10px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                        <th className="py-3 px-3.5">Date</th>
                        <th className="py-3 px-3.5">Ref #</th>
                        <th className="py-3 px-3.5">Transaction Details</th>
                        <th className="py-3 px-3 text-right">Original Amount</th>
                        <th className="py-3 px-3 text-right">Return / Adj.</th>
                        <th className="py-3 px-3 text-right">{isSupplier ? 'Net Purchases' : 'Net Sales'}</th>
                        <th className="py-3 px-3 text-right">{isSupplier ? 'Paid to Supplier' : 'Amount Received'}</th>
                        <th className="py-3 px-3 text-center">Payment Method</th>
                        <th className="py-3 px-3.5 text-right font-black">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                      {singleCustomerLedger.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center">
                            <EmptyState
                              icon={BookOpen}
                              title="No transactions recorded"
                              description="No entries found for this party matching the selected date range."
                            />
                          </td>
                        </tr>
                      ) : (
                        singleCustomerLedger.map(entry => {
                          const isBalPos = entry.runningBalance > 0;
                          const isBalNeg = entry.runningBalance < 0;
                          const isZero = entry.runningBalance === 0;

                          // Clean up description and avoid duplicate notes
                          const cleanDesc = (entry.desc || 'Transaction')
                            .replace(/:\s*Purchase Return$/i, '')
                            .replace(/:\s*Sale Return$/i, '')
                            .trim();
                          const hasDistinctNotes = entry.notes && entry.notes.trim() !== '' && entry.notes.trim() !== entry.desc?.trim() && !entry.notes.includes('Original Bill:');

                          // Method styling
                          const rawMethod = entry.paymentMethod || 'Cash';
                          const isCash = rawMethod.toLowerCase().includes('cash');
                          const isAdj = rawMethod.toLowerCase().includes('khata') || rawMethod.toLowerCase().includes('debit') || rawMethod.toLowerCase().includes('credit');
                          const isBank = rawMethod.toLowerCase().includes('bank');

                          const methodLabel = isAdj ? 'Khata Adjustment' : isCash ? 'Cash' : isBank ? 'Bank Transfer' : rawMethod;

                          return (
                            <tr
                              key={entry.id}
                              onClick={() => setViewingEntry(entry)}
                              className={`transition cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                              title="Click to view complete voucher details"
                            >
                              {/* 1. Date */}
                              <td className="py-3.5 px-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {entry.date}
                              </td>

                              {/* 2. Voucher / Ref # */}
                              <td className="py-3.5 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                {entry.ref}
                              </td>

                              {/* 3. Transaction Details */}
                              <td className="py-3.5 px-3.5">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{cleanDesc}</span>
                                  {entry.isPartiallyReturned && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                                      Part Return
                                    </span>
                                  )}
                                  {entry.isFullyReturned && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                                      Returned
                                    </span>
                                  )}
                                </div>
                                {hasDistinctNotes && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{entry.notes}</span>
                                )}
                              </td>

                              {/* 4. Original Amount */}
                              <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {entry.originalGross > 0 ? (
                                  `Rs. ${entry.originalGross.toLocaleString()}`
                                ) : entry.txType === 'Opening Balance' ? (
                                  `Rs. ${entry.debit?.toLocaleString()}`
                                ) : entry.txType === 'Purchases' || entry.txType === 'Sales' ? (
                                  `Rs. ${(entry.debit || entry.sales || 0).toLocaleString()}`
                                ) : (
                                  '—'
                                )}
                              </td>

                              {/* 5. Return / Adjustment */}
                              <td className="py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                {entry.returnAmount > 0 ? (
                                  <span className="text-purple-600 dark:text-purple-400">
                                    -Rs. {entry.returnAmount.toLocaleString()}
                                  </span>
                                ) : entry.txType === 'Returns' && (entry.payment > 0 || entry.credit > 0) ? (
                                  <span className="text-purple-600 dark:text-purple-400">
                                    Rs. {(entry.payment || entry.credit).toLocaleString()}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              {/* 6. Net Purchases / Sales */}
                              <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                                {entry.netTotal !== undefined && entry.netTotal !== null && (entry.txType === 'Purchases' || entry.txType === 'Sales') ? (
                                  `Rs. ${entry.netTotal.toLocaleString()}`
                                ) : (entry.txType === 'Purchases' || entry.txType === 'Sales') && entry.sales > 0 ? (
                                  `Rs. ${entry.sales.toLocaleString()}`
                                ) : entry.txType === 'Opening Balance' ? (
                                  `Rs. ${entry.debit?.toLocaleString()}`
                                ) : (
                                  '—'
                                )}
                              </td>

                              {/* 7. Paid to Supplier / Received */}
                              <td className="py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                {entry.txType === 'Payment' ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                    Rs. {(entry.payment || entry.credit || 0).toLocaleString()}
                                  </span>
                                ) : entry.paidAmount > 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                    Rs. {entry.paidAmount.toLocaleString()}
                                  </span>
                                ) : entry.txType === 'Returns' && entry.refundMode === 'Cash' ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    Rs. {entry.returnAmount.toLocaleString()}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              {/* 8. Payment Method */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${isCash
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : isAdj
                                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                      : isBank
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                  }`}>
                                  {methodLabel}
                                </span>
                              </td>

                              {/* 9. Running Balance */}
                              <td className="py-3.5 px-3.5 text-right font-mono font-black text-xs whitespace-nowrap">
                                {isZero ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    ✓ Rs. 0 (Settled)
                                  </span>
                                ) : isBalPos ? (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    {isSupplier ? 'Payable:' : 'Due:'} Rs. {entry.runningBalance.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    Advance: Rs. {Math.abs(entry.runningBalance).toLocaleString()}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Print Footer for Statement View */}
          <PrintFooter note={`Official Account Statement • ${activeCustomer?.name || 'Party'} • Ghalla Mandi`} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRANSACTION DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingEntry && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setViewingEntry(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Ledger Voucher Details</h3>
                  <p className="text-[11px] text-slate-400 font-bold">{viewingEntry.ref}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 rounded-2xl space-y-2.5 border text-xs ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between items-center text-slate-500">
                <span>Party / Customer:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{viewingEntry.partyName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Date:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingEntry.date}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Transaction Type:</span>
                <span className="font-bold text-brand-600">{viewingEntry.txType}</span>
              </div>
              <div className="flex justify-between items-start text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Description:</span>
                <span className="font-medium text-right max-w-xs text-slate-900 dark:text-white">{viewingEntry.desc}</span>
              </div>

              {/* Complete Return & Payment Lifecycle Breakdown */}
              {viewingEntry.returnAmount > 0 && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-1.5 font-mono text-[11px] my-2">
                  <div className="font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider text-[10px] pb-1 border-b border-purple-200 dark:border-purple-800/40">
                    Transaction Financial Summary
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Original Amount:</span>
                    <span className="font-bold">Rs. {viewingEntry.originalGross?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-purple-700 dark:text-purple-400 font-bold">
                    <span>Returned Amount:</span>
                    <span>- Rs. {viewingEntry.returnAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-black border-t border-purple-200 dark:border-purple-800/40 pt-1">
                    <span>Net Amount:</span>
                    <span>Rs. {viewingEntry.netTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Paid:</span>
                    <span className="font-bold">Rs. {viewingEntry.paidAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-amber-700 dark:text-amber-400">
                    <span>Remaining Due:</span>
                    <span>Rs. {viewingEntry.dueAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-purple-200 dark:border-purple-800/40">
                    <span>Status:</span>
                    <span className="font-black text-brand-600">{viewingEntry.invoiceStatus || viewingEntry.status}</span>
                  </div>
                </div>
              )}

              {viewingEntry.debit > 0 && (
                <div className="flex justify-between items-center text-blue-600 font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Debit Amount:</span>
                  <span className="font-mono text-sm">Rs. {viewingEntry.debit.toLocaleString()}</span>
                </div>
              )}

              {viewingEntry.credit > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Credit Amount:</span>
                  <span className="font-mono text-sm">Rs. {viewingEntry.credit.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Running Balance:</span>
                <span className={`font-mono text-sm ${viewingEntry.runningBalance > 0 ? 'text-emerald-600' :
                  viewingEntry.runningBalance < 0 ? 'text-rose-600' :
                    'text-slate-500'
                  }`}>
                  {viewingEntry.runningBalance < 0 ? `-Rs. ${Math.abs(viewingEntry.runningBalance).toLocaleString()}` : `Rs. ${viewingEntry.runningBalance.toLocaleString()}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingEntry(null)}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Ledger;
