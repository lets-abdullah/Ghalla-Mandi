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
  FileText
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const Ledger = () => {
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

        const itemsSummary = Array.isArray(s.cart) && s.cart.length > 0
          ? s.cart.map(i => `${i.name} (${i.qty} ${i.unitName || i.unit || 'KG'})`).join(', ')
          : (typeof s.items === 'string' ? s.items : 'Commodity Sale');

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
          desc: `Invoice: ${itemsSummary}`,
          debit: Number(s.amount ?? s.grandTotal ?? 0),
          credit: 0,
          notes: s.note || ''
        });

        // Upfront cash paid on POS counter or marked Paid invoice
        const isMarkedPaid = s.status === 'Paid' || s.paymentStatus === 'Paid';
        const sTotal = Number(s.amount ?? s.grandTotal ?? 0);
        const paidAmt = isMarkedPaid ? sTotal : Number(s.paidAmount || 0);

        // Check if there is a payment log recorded specifically for this invoice
        const hasSpecificInvoiceLog = (paymentLogs || []).some(p =>
          (p.type === 'Customer' || p.partyType === 'Customer') &&
          (
            (p.saleId && String(p.saleId) === String(s.id)) ||
            (s.invoiceNo && p.ref && p.ref.includes(s.invoiceNo))
          )
        );

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

      // 3. Sale Returns (Credit)
      (saleReturns || []).forEach(r => {
        const custObj = customers.find(c => (r.customerId && String(c.id) === String(r.customerId)) || (c.name && r.customerName && c.name.trim().toLowerCase() === r.customerName.trim().toLowerCase() && c.name.trim().toLowerCase() !== 'walk-in customer'));
        const isWalkin = (!custObj && !r.customerId) || (r.customerName || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';
        const rawParty = (r.customerName || custObj?.name || 'Customer').trim();
        const partyId = custObj ? String(custObj.id) : (r.customerId ? String(r.customerId) : `walkin-${rawParty}`);
        const partyName = custObj?.name || rawParty;

        entries.push({
          id: `ret-${r.id}`,
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId,
          partyName,
          customerType: custType,
          ref: r.returnNo || `RET-${r.id}`,
          txType: 'Returns',
          desc: `Return: ${r.reason || 'Sale Return Credit'}`,
          debit: 0,
          credit: Number(r.refundAmount || 0),
          items: r.items || [],
          productNames: '',
          notes: r.reason || ''
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

        entries.push({
          id: `pur-${p.id}`,
          rawDate: p.date,
          date: p.date || 'N/A',
          partyId,
          partyName: p.supplier || p.supplierName || 'Supplier',
          customerType: 'Supplier',
          ref: p.purchaseNo || `PUR-${p.id}`,
          txType: 'Purchases',
          desc: `Purchase: Inward stock procurement`,
          debit: Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0),
          credit: 0,
          items: pItems,
          productNames: '',
          notes: ''
        });

        // Upfront cash paid on Purchase or marked Paid invoice
        const isMarkedPaid = p.status === 'Paid' || p.paymentStatus === 'Paid';
        const pTotal = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? 0);
        const pPaidAmt = isMarkedPaid ? pTotal : Number(p.paidAmount || 0);

        const hasSpecificPurLog = (paymentLogs || []).some(pl =>
          (pl.type === 'Supplier' || pl.partyType === 'Supplier') &&
          (
            (pl.purchaseId && String(pl.purchaseId) === String(p.id)) ||
            (p.purchaseNo && pl.ref && pl.ref.includes(p.purchaseNo))
          )
        );

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
        entries.push({
          id: `pret-${r.id}`,
          rawDate: r.date,
          date: r.date || 'N/A',
          partyId: r.supplierId ? String(r.supplierId) : (supObj?.id ? String(supObj.id) : null),
          partyName: r.supplierName || supObj?.name || 'Supplier',
          customerType: 'Supplier',
          ref: r.returnNo || `PR-${r.id}`,
          txType: 'Returns',
          desc: `Purchase Return (${r.refundMode || 'Ledger'})`,
          debit: 0,
          credit: Number(r.refundAmount || 0),
          items: r.items || [],
          productNames: '',
          notes: r.reason || ''
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
  const customerEntities = useMemo(() => {
    const map = new Map();

    // 1. Initialize registered entities
    if (!isSupplier) {
      (customers || []).forEach(cust => {
        const isWalkin = (cust.customerType || '').toLowerCase().includes('walk-in');
        const custType = isWalkin ? 'Walk-in Customer' : 'Regular Customer';
        const key = String(cust.id);
        map.set(key, {
          id: key,
          name: cust.name,
          businessName: cust.businessName || cust.shopName || '',
          phone: cust.phone || '',
          city: cust.city || 'Local Mandi',
          customerType: custType,
          isWalkin,
          totalDebit: 0,
          totalCredit: 0,
          txCount: 0,
          lastTxDate: null
        });
      });
    } else {
      (suppliers || []).forEach(sup => {
        const key = String(sup.id);
        map.set(key, {
          id: key,
          name: sup.name,
          businessName: sup.businessName || '',
          phone: sup.phone || '',
          city: sup.city || 'Local Mandi',
          customerType: 'Supplier',
          isWalkin: false,
          totalDebit: 0,
          totalCredit: 0,
          txCount: 0,
          lastTxDate: null
        });
      });
    }

    // 2. Aggregate transactions from rawLedgerEntries
    rawLedgerEntries.forEach(entry => {
      let key = String(entry.partyId || '').trim();
      if (!key || key === 'null' || key === 'undefined') {
        key = `walkin-${(entry.partyName || 'Walk-in Customer').trim()}`;
      }

      if (!map.has(key)) {
        // Look up by matching name
        const matchKey = Array.from(map.keys()).find(k => (map.get(k).name || '').trim().toLowerCase() === (entry.partyName || '').trim().toLowerCase());
        if (matchKey) {
          key = matchKey;
        } else {
          const isWalkin = (entry.customerType || '').toLowerCase().includes('walk-in') || !isSupplier;
          map.set(key, {
            id: key,
            name: entry.partyName || 'Walk-in Customer',
            businessName: isWalkin ? 'Walk-in Party' : '',
            phone: '',
            city: 'Local Mandi',
            customerType: entry.customerType || (isSupplier ? 'Supplier' : 'Walk-in Customer'),
            isWalkin,
            totalDebit: 0,
            totalCredit: 0,
            txCount: 0,
            lastTxDate: null
          });
        }
      }

      const entity = map.get(key);
      entity.totalDebit += Number(entry.debit || 0);
      entity.totalCredit += Number(entry.credit || 0);
      entity.txCount += 1;
      if (entry.date && entry.date !== 'N/A') {
        entity.lastTxDate = entry.date;
      }
    });

    // 3. Compute final balance & status for each party entity
    const list = Array.from(map.values()).map(entity => {
      let balance = entity.totalDebit - entity.totalCredit;
      let status = 'Settled';
      let displayCredit = entity.totalCredit;

      if (!isSupplier) {
        // Customers: Debit (Invoices) - Credit (Payments + Returns). Negative means Customer Credit/Advance
        status = balance > 0 ? 'Receivable' : (balance < 0 ? 'Advance' : 'Settled');
      } else {
        // Suppliers: Debit (Purchases) - Credit (Payments + Returns). Negative means Mandi Advance/Overpayment
        status = balance > 0 ? 'Payable' : (balance < 0 ? 'Advance' : 'Settled');
      }

      return {
        ...entity,
        totalCredit: displayCredit,
        balance,
        status
      };
    });

    // Sort by largest financial activity first
    return list.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [customers, suppliers, rawLedgerEntries, isSupplier]);

  // Filtered Customer Entities for the Customer List View
  const filteredCustomerEntities = useMemo(() => {
    return customerEntities.filter(c => {
      // Customer Type Filter
      if (customerTypeFilter === 'Regular Customer' && c.isWalkin) return false;
      if (customerTypeFilter === 'Walk-in Customer' && !c.isWalkin) return false;

      // Status Filter
      if (statusFilter === 'Receivable' && c.balance <= 0) return false;
      if (statusFilter === 'Payable' && c.balance >= 0) return false;
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

  // Customer List Aggregate KPI Totals
  const totalReceivable = useMemo(() => {
    return customerEntities.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  }, [customerEntities]);

  const totalPayable = useMemo(() => {
    return customerEntities.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  }, [customerEntities]);

  const totalDebitSum = useMemo(() => {
    return customerEntities.reduce((sum, c) => sum + (c.totalDebit || 0), 0);
  }, [customerEntities]);

  const totalCreditSum = useMemo(() => {
    return customerEntities.reduce((sum, c) => sum + (c.totalCredit || 0), 0);
  }, [customerEntities]);

  const settledCount = useMemo(() => {
    return customerEntities.filter(c => c.balance === 0).length;
  }, [customerEntities]);

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
      customerType: 'Party Account',
      balance: 0,
      totalDebit: 0,
      totalCredit: 0,
      status: 'Settled'
    };
  }, [customerEntities, selectedPartyId]);

  // Single Customer Chronological Ledger with Running Balance
  const singleCustomerLedger = useMemo(() => {
    if (selectedPartyId === 'All') return [];
    const selLower = String(selectedPartyId).trim().toLowerCase();

    // 1. Filter transactions belonging to this customer
    const partyEntries = rawLedgerEntries.filter(entry => {
      const entryIdLower = String(entry.partyId || '').trim().toLowerCase();
      const entryNameLower = String(entry.partyName || '').trim().toLowerCase();

      const matchId = entryIdLower === selLower;
      const matchName = entryNameLower === selLower;
      const matchWalkinId = selLower === `walkin-${entryNameLower}` || entryIdLower === `walkin-${selLower}`;

      return matchId || matchName || matchWalkinId;
    });

    // 2. Compute Running Balance chronologically
    let runningBalance = 0;
    const computed = partyEntries.map(entry => {
      // Invoice/Debit increases balance (+Receivable), Returns/Payments decrease balance (-Receivable)
      runningBalance = runningBalance + (Number(entry.debit || 0) - Number(entry.credit || 0));
      return {
        ...entry,
        runningBalance
      };
    });

    // 3. Apply inside-ledger filters (date, txType, search)
    return computed.filter(entry => {
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
    }).reverse(); // Latest transaction at the top for reading
  }, [rawLedgerEntries, selectedPartyId, dateFilterType, customStartDate, customEndDate, txTypeFilter, txSearchQuery]);

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
                <span>Print Ledger</span>
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
          {/* 4 Financial Condition KPI Cards (Screen Only) */}
          <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Total Receivable / Payable */}
            <div
              onClick={() => setStatusFilter(statusFilter === (isSupplier ? 'Payable' : 'Receivable') ? 'All' : (isSupplier ? 'Payable' : 'Receivable'))}
              className={`p-4 rounded-2xl border transition cursor-pointer card-hover card-shadow ${statusFilter === (isSupplier ? 'Payable' : 'Receivable')
                ? (isSupplier ? 'ring-2 ring-rose-500' : 'ring-2 ring-emerald-500')
                : ''
                } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : (isSupplier ? 'bg-gradient-to-b from-rose-50/60 to-white border-rose-200/80' : 'bg-gradient-to-b from-emerald-50/60 to-white border-emerald-200/80')}`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{isSupplier ? 'Remaining to Pay' : 'Total Receivable'}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${isSupplier ? 'bg-rose-500 shadow-xs shadow-rose-500/50' : 'bg-emerald-500 shadow-xs shadow-emerald-500/50'}`}></span>
              </div>
              <div className={`text-xl sm:text-2xl font-mono font-black mt-1.5 ${isSupplier ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                Rs. {(isSupplier ? totalPayable : totalReceivable).toLocaleString()}
              </div>
            </div>

            {/* 2. Total Sales / Purchases */}
            <div
              className={`p-4 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{isSupplier ? 'Total Purchases' : 'Total Sales'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black mt-1.5 text-blue-600 dark:text-blue-400">
                Rs. {totalDebitSum.toLocaleString()}
              </div>
            </div>

            {/* 3. Total Received / Paid */}
            <div
              className={`p-4 rounded-2xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{isSupplier ? 'Total Paid' : 'Total Received'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black mt-1.5 text-indigo-600 dark:text-indigo-400">
                Rs. {totalCreditSum.toLocaleString()}
              </div>
            </div>

            {/* 4. Settled Accounts */}
            <div
              onClick={() => setStatusFilter(statusFilter === 'Settled' ? 'All' : 'Settled')}
              className={`p-4 rounded-2xl border transition cursor-pointer card-hover card-shadow ${statusFilter === 'Settled'
                ? 'ring-2 ring-slate-400'
                : ''
                } ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Settled Accounts</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black mt-1.5 text-slate-700 dark:text-slate-200">
                {settledCount} Accounts
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
              { label: isSupplier ? 'Remaining to Pay' : 'Total Receivable', value: `Rs. ${(isSupplier ? totalPayable : totalReceivable).toLocaleString()}` },
              { label: isSupplier ? 'Total Purchases' : 'Total Sales', value: `Rs. ${totalDebitSum.toLocaleString()}` },
              { label: isSupplier ? 'Total Paid' : 'Total Received', value: `Rs. ${totalCreditSum.toLocaleString()}` }
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
                    <th className="py-3.5 px-4 text-right">{isSupplier ? 'Total Paid' : 'Total Received'}</th>
                    <th className="py-3.5 px-4 text-right">{isSupplier ? 'Remaining to Pay' : 'Remaining Balance'}</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {filteredCustomerEntities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No customer entities found matching your criteria.
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
                              isZero ? 'text-slate-400 font-bold' :
                                isNeg ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' :
                                  'text-amber-500 font-black'
                            }>
                              {isNeg ? `Credit: Rs. ${Math.abs(cust.balance).toLocaleString()}` : `Rs. ${cust.balance.toLocaleString()}`}
                            </span>
                          </td>

                          {/* 5. Condition Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isZero ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700' :
                                isNeg ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            }`}>
                              {isPos ? (isSupplier ? 'Payable' : 'Receivable') : isNeg ? (isSupplier ? 'Overpaid' : 'Customer Credit') : 'Settled'}
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${activeCustomer?.isWalkin
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-300'
                      : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                      }`}>
                      {activeCustomer?.customerType}
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

              {/* Total Paid / Received */}
              <div className={`p-3.5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {isSupplier ? 'Total Paid' : 'Total Received'}
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
                  {isSupplier ? 'Remaining to Pay' : 'Account Balance'}
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
              { label: isSupplier ? 'Total Paid' : 'Total Received', value: `Rs. ${(activeCustomer?.totalCredit || 0).toLocaleString()}` },
              { label: isSupplier ? 'Remaining to Pay' : 'Remaining Balance', value: `Rs. ${(activeCustomer?.balance || 0).toLocaleString()}` }
            ]}
          />

          {/* Complete Chronological Statement Table */}
          <div className={`border rounded-3xl card-shadow overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Voucher / Ref #</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-right">{isSupplier ? 'Purchases' : 'Sales'}</th>
                    <th className="py-3.5 px-4 text-right">{isSupplier ? 'Payments / Returns' : 'Payments / Returns'}</th>
                    <th className="py-3.5 px-4 text-right font-black">{isSupplier ? 'Remaining Balance' : 'Running Balance'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {singleCustomerLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    singleCustomerLedger.map(entry => {
                      const isBalPos = entry.runningBalance > 0;
                      const isBalNeg = entry.runningBalance < 0;

                      return (
                        <tr
                          key={entry.id}
                          className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}
                        >
                          {/* 1. Date */}
                          <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                            {entry.date}
                          </td>

                          {/* 2. Voucher # */}
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {entry.ref}
                          </td>

                          {/* 3. Description */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 dark:text-white">{entry.desc}</span>
                            {entry.notes && <span className="text-[10px] text-slate-400 block">{entry.notes}</span>}
                          </td>

                          {/* 4. Debit */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                            {entry.debit > 0 ? `Rs. ${entry.debit.toLocaleString()}` : '—'}
                          </td>

                          {/* 5. Credit */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {entry.credit > 0 ? `Rs. ${entry.credit.toLocaleString()}` : '—'}
                          </td>

                          {/* 6. Running Balance */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-xs">
                            <span className={
                              isBalPos ? 'text-emerald-600 dark:text-emerald-400' :
                                isBalNeg ? 'text-rose-600 dark:text-rose-400' :
                                  'text-slate-400'
                            }>
                              {isBalNeg ? `-Rs. ${Math.abs(entry.runningBalance).toLocaleString()}` : `Rs. ${entry.runningBalance.toLocaleString()}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
