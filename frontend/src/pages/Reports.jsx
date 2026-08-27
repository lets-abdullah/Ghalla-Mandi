import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Warehouse, DollarSign, PieChart, Building,
  FileSpreadsheet, Printer, Plus, Wheat, X, Trash2, Search, Filter,
  CheckCircle2, AlertTriangle, ArrowUpDown, Package, Eye,
  Calendar, Users, ShoppingCart, ChevronDown, ChevronUp, BarChart3, Percent, Layers,
  RefreshCw, ArrowUpRight, ArrowDownRight, Wallet, Banknote, ChevronRight
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Reports = () => {
  const { sales, purchases, products, customers, suppliers, saleReturns = [], purchaseReturns = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Report Type from URL parameter (default: Stock)
  const reportType = searchParams.get('type') || 'Stock';

  // Interactive filters for stock
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All'); // 'All' | 'LowStock' | 'InStock' | 'OutOfStock'
  const [sortBy, setSortBy] = useState('valueDesc'); // 'valueDesc' | 'qtyDesc' | 'nameAsc'

  // Multi-dimensional Sales Report Filters
  const [salesDateFilter, setSalesDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [salesProductFilter, setSalesProductFilter] = useState('All');
  const [salesSupplierFilter, setSalesSupplierFilter] = useState('All');
  const [salesCustomerFilter, setSalesCustomerFilter] = useState('All');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('All'); // 'All' | 'Cash' | 'Credit' | 'Partial'
  const [salesActiveSubTab, setSalesActiveSubTab] = useState('all'); // 'all' | 'dateWise' | 'productWise' | 'supplierWise' | 'supplierProduct' | 'analytics'
  const [expandedSuppliers, setExpandedSuppliers] = useState({});

  const toggleSupplierExpand = (supName) => {
    setExpandedSuppliers(prev => ({ ...prev, [supName]: !prev[supName] }));
  };

  // Multi-dimensional P&L Statement Filters
  const [plDateFilter, setPlDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [plStartDate, setPlStartDate] = useState('');
  const [plEndDate, setPlEndDate] = useState('');
  const [plProductFilter, setPlProductFilter] = useState('All');
  const [plCategoryFilter, setPlCategoryFilter] = useState('All');
  const [plTypeFilter, setPlTypeFilter] = useState('All'); // 'All' | 'Sale' | 'Purchase' | 'Expense' | 'Return'
  const [plPaymentFilter, setPlPaymentFilter] = useState('All'); // 'All' | 'Cash' | 'Credit' | 'Bank'
  const [plPartyFilter, setPlPartyFilter] = useState('All');
  const [plSearch, setPlSearch] = useState('');
  const [plPage, setPlPage] = useState(1);
  const plPageSize = 25;

  const handleResetPlFilters = () => {
    setPlDateFilter('All');
    setPlStartDate('');
    setPlEndDate('');
    setPlProductFilter('All');
    setPlCategoryFilter('All');
    setPlTypeFilter('All');
    setPlPaymentFilter('All');
    setPlPartyFilter('All');
    setPlSearch('');
    setPlPage(1);
  };

  // Professional Banking / Financial Balance Sheet States
  const [bsFinancialYear, setBsFinancialYear] = useState('FY 2026–27');
  const [bsPeriod, setBsPeriod] = useState('This Month');
  const [bsAccountFilter, setBsAccountFilter] = useState('All');
  const [bsBranchFilter, setBsBranchFilter] = useState('All');
  const [bsAsOfDate, setBsAsOfDate] = useState('Today');
  const [bsCustomDate, setBsCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bsComparisonMode, setBsComparisonMode] = useState('Previous Month');
  const [bsExpandedSections, setBsExpandedSections] = useState({
    cashBank: true,
    receivables: true,
    inventory: true,
    payables: true,
    equity: true
  });
  const [bsLastUpdated, setBsLastUpdated] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [bsActiveDrilldownModal, setBsActiveDrilldownModal] = useState(null); // 'stock' | 'customers' | 'suppliers' | 'cashBank' | null
  const [bsDrilldownSearch, setBsDrilldownSearch] = useState('');

  const toggleBsSection = (sectionKey) => {
    setBsExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleRefreshBalanceSheet = () => {
    setBsLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleResetBsFilters = () => {
    setBsFinancialYear('FY 2026–27');
    setBsPeriod('This Month');
    setBsAccountFilter('All');
    setBsBranchFilter('All');
    setBsAsOfDate('Today');
    setBsComparisonMode('Previous Month');
  };

  // Live expenses persisted in local storage per user/shop session
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('ghalla_mandi_operating_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ghalla_mandi_operating_expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to persist expenses:', e);
    }
  }, [expenses]);

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'Labour & Loading (Palla)',
    desc: '',
    mode: 'Cash',
    amount: ''
  });

  // Handle Adding Expense
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.amount || Number(newExpense.amount) <= 0) return;

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-GB'),
      ref: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      category: newExpense.category,
      desc: newExpense.desc || `${newExpense.category} expense`,
      mode: newExpense.mode,
      amount: Number(newExpense.amount)
    };

    setExpenses(prev => [entry, ...prev]);
    setShowAddExpenseModal(false);
    setNewExpense({ category: 'Labour & Loading (Palla)', desc: '', mode: 'Cash', amount: '' });
  };

  const handleDeleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Returns aggregates
  const totalSaleReturnsVal = useMemo(() => (saleReturns || []).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0), [saleReturns]);
  const totalSaleReturnsCash = useMemo(() => (saleReturns || []).filter(r => r.refundMode === 'Cash').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0), [saleReturns]);
  const totalPurchaseReturnsVal = useMemo(() => (purchaseReturns || []).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0), [purchaseReturns]);
  const totalPurchaseReturnsCash = useMemo(() => (purchaseReturns || []).filter(r => r.refundMode === 'Cash').reduce((sum, r) => sum + Number(r.refundAmount || 0), 0), [purchaseReturns]);

  // =========================================================================
  // 1. DYNAMIC STOCK CALCULATIONS & FILTERING
  // =========================================================================
  const allCategories = useMemo(() => {
    const set = new Set((products || []).map(p => p.category || 'General'));
    return ['All', ...Array.from(set)];
  }, [products]);

  const processedStock = useMemo(() => {
    return (products || []).map(p => {
      const qty = Number(p.stockQty || 0);
      const purchaseRate = Number(p.purchasePrice || 0);
      const sellingRate = Number(p.sellingPrice || 0);
      const minStock = Number(p.minStock || 10);
      const unit = (p.unit || p.baseUnit || 'KG').trim();
      const unitLower = unit.toLowerCase();

      // Check unit classification
      const isLiquidOrPackaged = ['litre', 'liter', 'ltr', 'bottle', 'packet', 'pcs', 'piece', 'can', 'tin', 'box', 'carton'].some(u => unitLower.includes(u));
      const isBori = ['bori', 'bag', 'bora'].some(u => unitLower.includes(u));
      const isMann = unitLower.includes('mann') || unitLower.includes('mon');
      const isKg = ['kg', 'kilogram'].some(u => unitLower.includes(u));

      let bagDetail = null;
      if (!isLiquidOrPackaged) {
        if (isBori) {
          bagDetail = `${qty} Bori`;
        } else if (isMann) {
          bagDetail = `~${Math.round((qty * 40) / 50)} Bags (50kg)`;
        } else if (isKg) {
          bagDetail = `~${Math.round(qty / 50)} Bags (50kg)`;
        }
      }

      let status = 'In Stock';
      if (qty <= 0) status = 'Out of Stock';
      else if (qty <= minStock) status = 'Low Stock';

      return {
        id: p.id,
        name: p.name,
        code: p.code || '',
        category: p.category || 'General',
        qty,
        unit,
        bagDetail,
        purchaseRate,
        sellingRate,
        stockVal: qty * purchaseRate,
        status,
        minStock
      };
    });
  }, [products]);

  const filteredStock = useMemo(() => {
    return processedStock.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;

      let matchesStatus = true;
      if (stockStatusFilter === 'LowStock') matchesStatus = p.status === 'Low Stock';
      else if (stockStatusFilter === 'InStock') matchesStatus = p.status === 'In Stock';
      else if (stockStatusFilter === 'OutOfStock') matchesStatus = p.status === 'Out of Stock';

      return matchesSearch && matchesCat && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'valueDesc') return b.stockVal - a.stockVal;
      if (sortBy === 'qtyDesc') return b.qty - a.qty;
      if (sortBy === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
  }, [processedStock, searchTerm, categoryFilter, stockStatusFilter, sortBy]);

  const totalStockValuation = useMemo(() => processedStock.reduce((sum, p) => sum + p.stockVal, 0), [processedStock]);
  const inStockCount = useMemo(() => processedStock.filter(p => p.status === 'In Stock').length, [processedStock]);
  const lowStockCount = useMemo(() => processedStock.filter(p => p.status === 'Low Stock').length, [processedStock]);
  const outOfStockCount = useMemo(() => processedStock.filter(p => p.status === 'Out of Stock').length, [processedStock]);

  // =========================================================================
  // 2. SALES CALCULATIONS (Incorporates Sale Returns)
  // =========================================================================
  const salesList = useMemo(() => {
    return (sales || []).map(s => {
      const grossAmt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));
      const paidAmt = Number(s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Paid' ? grossAmt : 0));
      const returnAmt = Number(s.returnAmount || 0);
      const discount = Number(s.discount || 0);
      const isCash = s.paymentMode?.toLowerCase().includes('cash') || paidAmt >= grossAmt;
      return {
        ...s,
        grossAmt,
        returnAmt,
        discount,
        netAmt: Math.max(0, grossAmt - returnAmt - discount),
        paidAmt,
        dueAmt: Math.max(0, grossAmt - paidAmt - returnAmt),
        isCash
      };
    });
  }, [sales]);

  const totalSalesGross = useMemo(() => salesList.reduce((sum, s) => sum + s.grossAmt, 0), [salesList]);
  const totalNetSales = useMemo(() => Math.max(0, totalSalesGross - totalSaleReturnsVal), [totalSalesGross, totalSaleReturnsVal]);
  const totalSalesCash = useMemo(() => Math.max(0, salesList.filter(s => s.isCash).reduce((sum, s) => sum + s.paidAmt, 0) - totalSaleReturnsCash), [salesList, totalSaleReturnsCash]);
  const totalSalesCredit = useMemo(() => salesList.reduce((sum, s) => sum + s.dueAmt, 0), [salesList]);

  // Map each product to its supplying supplier(s)
  const productSupplierMap = useMemo(() => {
    const map = {};
    (products || []).forEach(p => {
      const matchingSups = (suppliers || []).filter(s =>
        Array.isArray(s.suppliedProducts) && s.suppliedProducts.some(sp => sp.toLowerCase() === p.name.toLowerCase())
      ).map(s => s.name);

      if (matchingSups.length > 0) {
        map[p.name.toLowerCase()] = matchingSups;
      } else {
        const purSups = (purchases || []).filter(pur => {
          if (pur.productName && pur.productName.toLowerCase() === p.name.toLowerCase()) return true;
          if (Array.isArray(pur.cart) && pur.cart.some(it => (it.name || '').toLowerCase() === p.name.toLowerCase())) return true;
          return false;
        }).map(pur => pur.supplierName || pur.supplier).filter(Boolean);

        const unique = Array.from(new Set(purSups));
        map[p.name.toLowerCase()] = unique.length > 0 ? unique : ['Direct Mandi Stock'];
      }
    });
    return map;
  }, [products, suppliers, purchases]);

  // Filtered Sales Array based on active filters
  const filteredSalesList = useMemo(() => {
    return salesList.filter(s => {
      // 1. Date Filter
      let sDateObj = new Date();
      if (s.created_at) {
        sDateObj = new Date(s.created_at);
      } else if (s.date && s.date.includes('/')) {
        const parts = s.date.split('/');
        if (parts.length === 3) sDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sDay = new Date(sDateObj);
      sDay.setHours(0, 0, 0, 0);

      if (salesDateFilter === 'Today' && sDay.getTime() !== today.getTime()) return false;
      if (salesDateFilter === 'Yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        if (sDay.getTime() !== yest.getTime()) return false;
      }
      if (salesDateFilter === 'This Week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 7);
        if (sDay < startOfWeek || sDay > new Date()) return false;
      }
      if (salesDateFilter === 'This Month') {
        if (sDay.getFullYear() !== today.getFullYear() || sDay.getMonth() !== today.getMonth()) return false;
      }
      if (salesDateFilter === 'Custom') {
        if (salesStartDate && salesEndDate) {
          const start = new Date(salesStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(salesEndDate);
          end.setHours(23, 59, 59, 999);
          if (sDay < start || sDay > end) return false;
        } else if (salesStartDate) {
          const start = new Date(salesStartDate);
          start.setHours(0, 0, 0, 0);
          if (sDay < start) return false;
        } else if (salesEndDate) {
          const end = new Date(salesEndDate);
          end.setHours(23, 59, 59, 999);
          if (sDay > end) return false;
        }
      }

      // 2. Customer Filter
      if (salesCustomerFilter !== 'All') {
        const pName = (s.partyName || s.customerName || '').toLowerCase();
        if (pName !== salesCustomerFilter.toLowerCase()) return false;
      }

      // 3. Payment Filter
      if (salesPaymentFilter === 'Cash' && !s.isCash) return false;
      if (salesPaymentFilter === 'Credit' && s.dueAmt <= 0) return false;
      if (salesPaymentFilter === 'Partial' && (s.paidAmt <= 0 || s.dueAmt <= 0)) return false;

      // 4. Product / Supplier filter check
      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ name: s.productName || (typeof s.items === 'string' ? s.items : 'General'), qty: s.qty || 1 }]);

      if (salesProductFilter !== 'All') {
        const hasProd = cart.some(it => (it.name || '').toLowerCase() === salesProductFilter.toLowerCase());
        if (!hasProd) return false;
      }

      if (salesSupplierFilter !== 'All') {
        const hasSup = cart.some(it => {
          const pSups = productSupplierMap[(it.name || '').toLowerCase()] || ['Direct Mandi Stock'];
          return pSups.some(sup => sup.toLowerCase() === salesSupplierFilter.toLowerCase());
        });
        if (!hasSup) return false;
      }

      return true;
    });
  }, [salesList, salesDateFilter, salesStartDate, salesEndDate, salesCustomerFilter, salesPaymentFilter, salesProductFilter, salesSupplierFilter, productSupplierMap]);

  // Overall KPI Metrics for Filtered Sales
  const filteredGrossSales = useMemo(() => filteredSalesList.reduce((sum, s) => sum + s.grossAmt, 0), [filteredSalesList]);
  const filteredDiscount = useMemo(() => filteredSalesList.reduce((sum, s) => sum + s.discount, 0), [filteredSalesList]);
  const filteredNetSales = useMemo(() => Math.max(0, filteredGrossSales - filteredDiscount), [filteredGrossSales, filteredDiscount]);
  const filteredCashSales = useMemo(() => filteredSalesList.reduce((sum, s) => sum + s.paidAmt, 0), [filteredSalesList]);
  const filteredCreditSales = useMemo(() => filteredSalesList.reduce((sum, s) => sum + s.dueAmt, 0), [filteredSalesList]);
  const filteredInvoicesCount = filteredSalesList.length;
  const filteredAvgInvoiceValue = filteredInvoicesCount > 0 ? Math.round(filteredGrossSales / filteredInvoicesCount) : 0;

  // Total Quantity Sold across Filtered Sales
  const filteredTotalQty = useMemo(() => {
    return filteredSalesList.reduce((sum, s) => {
      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ qty: s.qty || 1 }]);
      return sum + cart.reduce((cSum, it) => cSum + Number(it.qty || it.enteredQty || 1), 0);
    }, 0);
  }, [filteredSalesList]);

  // 1. DATE-WISE SALES BREAKDOWN
  const dateWiseSalesData = useMemo(() => {
    const map = {};
    filteredSalesList.forEach(s => {
      const dateKey = s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : 'Unknown');
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          invoiceCount: 0,
          grossSales: 0,
          discount: 0,
          netSales: 0,
          cash: 0,
          credit: 0,
          totalQty: 0,
          productsMap: {}
        };
      }

      map[dateKey].invoiceCount += 1;
      map[dateKey].grossSales += s.grossAmt;
      map[dateKey].discount += s.discount;
      map[dateKey].netSales += s.netAmt;
      map[dateKey].cash += s.paidAmt;
      map[dateKey].credit += s.dueAmt;

      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ name: s.productName || 'Commodity', qty: s.qty || 1, unit: s.unit || 'KG' }]);
      cart.forEach(it => {
        const pName = it.name || 'Commodity';
        const pQty = Number(it.qty || it.enteredQty || 1);
        const pUnit = it.unit || it.unitName || 'KG';
        map[dateKey].totalQty += pQty;
        map[dateKey].productsMap[pName] = (map[dateKey].productsMap[pName] || 0) + pQty;
      });
    });

    return Object.values(map).map(row => {
      const prodSummary = Object.entries(row.productsMap)
        .map(([pName, pQty]) => `${pName} (${pQty})`)
        .join(', ');
      return {
        ...row,
        productsSummary: prodSummary || 'General Goods'
      };
    });
  }, [filteredSalesList]);

  // 2. PRODUCT-WISE SALES BREAKDOWN
  const productWiseSalesData = useMemo(() => {
    const map = {};
    filteredSalesList.forEach(s => {
      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ name: s.productName || 'Commodity Item', qty: s.qty || 1, unit: s.unit || 'KG', total: s.grossAmt }]);
      cart.forEach(item => {
        const name = item.name || item.productName || 'Commodity Item';
        const qty = Number(item.qty || item.enteredQty || 1);
        const unit = item.unit || item.unitName || item.baseUnit || 'KG';
        const total = Number(item.total || item.totalAmount || (qty * (item.price || item.rate || 0)));

        if (!map[name]) {
          const linkedSups = productSupplierMap[name.toLowerCase()] || ['Direct Mandi Stock'];
          map[name] = {
            name,
            suppliers: linkedSups,
            totalQty: 0,
            unit,
            totalRevenue: 0,
            orderCount: 0
          };
        }
        map[name].totalQty += qty;
        map[name].totalRevenue += total;
        map[name].orderCount += 1;
      });
    });

    return Object.values(map).map(p => ({
      ...p,
      avgRate: p.totalQty > 0 ? Math.round(p.totalRevenue / p.totalQty) : 0,
      pctOfTotal: filteredGrossSales > 0 ? ((p.totalRevenue / filteredGrossSales) * 100).toFixed(2) : '0.00'
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSalesList, productSupplierMap, filteredGrossSales]);

  // Fallback for general compatibility
  const productWiseSales = productWiseSalesData;

  // 3. SUPPLIER-WISE SALES BREAKDOWN & DRILL-DOWN
  const supplierWiseSalesData = useMemo(() => {
    const map = {};
    filteredSalesList.forEach(s => {
      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ name: s.productName || 'Commodity Item', qty: s.qty || 1, unit: s.unit || 'KG', total: s.grossAmt }]);
      cart.forEach(item => {
        const pName = item.name || item.productName || 'Commodity Item';
        const pQty = Number(item.qty || item.enteredQty || 1);
        const pUnit = item.unit || item.unitName || item.baseUnit || 'KG';
        const pTotal = Number(item.total || item.totalAmount || (pQty * (item.price || item.rate || 0)));

        const linkedSups = productSupplierMap[pName.toLowerCase()] || ['Direct Mandi Stock'];
        const supName = linkedSups[0] || 'Direct Mandi Stock';

        if (!map[supName]) {
          map[supName] = {
            supplierName: supName,
            totalSales: 0,
            totalQty: 0,
            orderCount: 0,
            productsMap: {}
          };
        }

        map[supName].totalSales += pTotal;
        map[supName].totalQty += pQty;
        map[supName].orderCount += 1;

        if (!map[supName].productsMap[pName]) {
          map[supName].productsMap[pName] = {
            name: pName,
            qty: 0,
            unit: pUnit,
            revenue: 0,
            orders: 0
          };
        }
        map[supName].productsMap[pName].qty += pQty;
        map[supName].productsMap[pName].revenue += pTotal;
        map[supName].productsMap[pName].orders += 1;
      });
    });

    return Object.values(map).map(sup => {
      const productsList = Object.values(sup.productsMap).map(p => ({
        ...p,
        avgRate: p.qty > 0 ? Math.round(p.revenue / p.qty) : 0,
        pctOfSupplier: sup.totalSales > 0 ? ((p.revenue / sup.totalSales) * 100).toFixed(1) : '0.0'
      })).sort((a, b) => b.revenue - a.revenue);

      return {
        supplierName: sup.supplierName,
        productsCount: productsList.length,
        totalSales: sup.totalSales,
        totalQty: sup.totalQty,
        orderCount: sup.orderCount,
        pctContribution: filteredGrossSales > 0 ? ((sup.totalSales / filteredGrossSales) * 100).toFixed(2) : '0.00',
        products: productsList
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSalesList, productSupplierMap, filteredGrossSales]);

  // Top Ranked Entities
  const topSellingProducts = useMemo(() => productWiseSalesData.slice(0, 5), [productWiseSalesData]);
  const topSuppliers = useMemo(() => supplierWiseSalesData.slice(0, 5), [supplierWiseSalesData]);

  const hasActiveSalesFilters = salesDateFilter !== 'All' || salesProductFilter !== 'All' || salesSupplierFilter !== 'All' || salesCustomerFilter !== 'All' || salesPaymentFilter !== 'All' || salesStartDate || salesEndDate;

  const handleResetSalesFilters = () => {
    setSalesDateFilter('All');
    setSalesStartDate('');
    setSalesEndDate('');
    setSalesProductFilter('All');
    setSalesSupplierFilter('All');
    setSalesCustomerFilter('All');
    setSalesPaymentFilter('All');
  };

  // =========================================================================
  // 3. PURCHASES & EXPENSES CALCULATIONS (Incorporates Purchase Returns)
  // =========================================================================
  const purchasesList = useMemo(() => {
    return (purchases || []).map(p => {
      const grossAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const paidAmt = Number(p.paidAmount !== undefined ? p.paidAmount : (p.status === 'Paid' ? grossAmt : 0));
      const returnAmt = Number(p.returnAmount || 0);
      return {
        ...p,
        grossAmt,
        returnAmt,
        netAmt: Math.max(0, grossAmt - returnAmt),
        paidAmt,
        dueAmt: Math.max(0, grossAmt - paidAmt - returnAmt)
      };
    });
  }, [purchases]);

  const totalPurchasesGross = useMemo(() => purchasesList.reduce((sum, p) => sum + p.grossAmt, 0), [purchasesList]);
  const totalNetPurchases = useMemo(() => Math.max(0, totalPurchasesGross - totalPurchaseReturnsVal), [totalPurchasesGross, totalPurchaseReturnsVal]);
  const totalPurchasesPaid = useMemo(() => purchasesList.reduce((sum, p) => sum + p.paidAmt, 0), [purchasesList]);

  const totalExpensesAmount = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses]);

  const topExpenseCategory = useMemo(() => {
    if (expenses.length === 0) return 'No Expenses Logged';
    const counts = {};
    expenses.forEach(e => {
      counts[e.category] = (counts[e.category] || 0) + Number(e.amount || 0);
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'None';
  }, [expenses]);

  // =========================================================================
  // 4. FINANCIAL STATEMENTS (P&L and Balance Sheet with Returns Deducted)
  // =========================================================================
  const cogs = useMemo(() => Math.max(0, totalNetPurchases), [totalNetPurchases]);
  const grossOperatingProfit = useMemo(() => Math.max(0, totalNetSales - cogs), [totalNetSales, cogs]);
  const netOperatingProfit = useMemo(() => grossOperatingProfit - totalExpensesAmount, [grossOperatingProfit, totalExpensesAmount]);

  const totalCustomerReceivables = useMemo(() => {
    return (customers || []).reduce((sum, c) => sum + Math.max(0, Number(c.balance !== undefined ? c.balance : c.openingBalance || 0)), 0);
  }, [customers]);

  const totalSupplierPayables = useMemo(() => {
    return (suppliers || []).reduce((sum, s) => sum + Math.max(0, Number(s.balance !== undefined ? s.balance : s.openingBalance || 0)), 0);
  }, [suppliers]);

  const cashInHand = useMemo(() => {
    const netCash = totalSalesCash + totalPurchaseReturnsCash - totalPurchasesPaid - totalExpensesAmount;
    return Math.max(0, netCash);
  }, [totalSalesCash, totalPurchaseReturnsCash, totalPurchasesPaid, totalExpensesAmount]);

  const totalAssets = useMemo(() => cashInHand + totalCustomerReceivables + totalStockValuation, [cashInHand, totalCustomerReceivables, totalStockValuation]);
  const totalLiabilities = useMemo(() => totalSupplierPayables, [totalSupplierPayables]);
  const totalEquity = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Granular Balance Sheet Breakdown Objects
  const bsCashBreakdown = useMemo(() => {
    return {
      cashInHand: cashInHand,
      hblBank: 0,
      meezanBank: 0,
      jazzCash: 0,
      easypaisa: 0,
      total: cashInHand
    };
  }, [cashInHand]);

  const bsReceivablesBreakdown = useMemo(() => {
    return {
      customerReceivables: totalCustomerReceivables,
      otherReceivables: 0,
      total: totalCustomerReceivables
    };
  }, [totalCustomerReceivables]);

  const bsInventoryBreakdown = useMemo(() => {
    return {
      warehouseStock: totalStockValuation,
      damagedStock: 0,
      total: totalStockValuation
    };
  }, [totalStockValuation]);

  const bsLiabilitiesBreakdown = useMemo(() => {
    return {
      supplierPayables: totalSupplierPayables,
      loansFinancing: 0,
      outstandingExpenses: 0,
      taxPayables: 0,
      total: totalSupplierPayables
    };
  }, [totalSupplierPayables]);

  const bsEquityBreakdown = useMemo(() => {
    const retained = Math.max(0, netOperatingProfit);
    const capital = Math.max(0, totalAssets - totalSupplierPayables - retained);
    return {
      ownersCapital: capital,
      retainedProfit: retained,
      total: totalEquity
    };
  }, [totalAssets, totalSupplierPayables, netOperatingProfit, totalEquity]);

  // Balance Sheet Trend Data for visual Net Worth Chart
  const bsTrendData = useMemo(() => {
    const base = totalAssets || 100000;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    return months.map((m, i) => {
      const factor = 0.70 + (i * 0.042);
      const a = Math.round(base * factor);
      const l = Math.round(totalLiabilities * (0.8 + i * 0.025));
      const nw = a - l;
      return { month: m, assets: a, liabilities: l, netWorth: nw };
    });
  }, [totalAssets, totalLiabilities]);

  // =========================================================================
  // 4. PROFIT & LOSS FINANCIAL STATEMENT JOURNAL & ANALYTICS
  // =========================================================================
  const plJournalTransactions = useMemo(() => {
    const journal = [];

    // 1. Sales (Income)
    (sales || []).forEach(s => {
      let sDateObj = new Date();
      if (s.created_at) {
        sDateObj = new Date(s.created_at);
      } else if (s.date && s.date.includes('/')) {
        const parts = s.date.split('/');
        if (parts.length === 3) sDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }

      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ name: s.productName || 'Commodity Sale', qty: s.qty || 1, unit: s.unit || 'KG' }]);
      const pNames = cart.map(it => it.name).filter(Boolean).join(', ') || s.productName || 'Commodity Sale';
      const pCategories = cart.map(it => {
        const pObj = (products || []).find(p => p.name?.toLowerCase() === (it.name || '').toLowerCase());
        return pObj?.category || 'General';
      });
      const primaryCat = pCategories[0] || 'General';
      const totalQty = cart.reduce((sum, it) => sum + Number(it.qty || it.enteredQty || 1), 0);
      const unit = cart[0]?.unit || s.unit || 'KG';
      const grossAmt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : 0));

      journal.push({
        id: `sale-${s.id || s.invoiceNo}`,
        dateStr: s.date || sDateObj.toLocaleDateString('en-GB'),
        dateObj: sDateObj,
        ref: s.invoiceNo ? `SALE-${s.invoiceNo}` : 'Sale Invoice',
        product: pNames,
        category: primaryCat,
        type: 'Sale',
        isIncome: true,
        qty: `${totalQty} ${unit}`,
        rawQty: totalQty,
        amount: grossAmt,
        party: s.partyName || s.customerName || 'Customer Party',
        mode: s.paymentMode || (s.paidAmount >= grossAmt ? 'Cash' : 'Credit')
      });
    });

    // 2. Purchases (COGS / Stock Cost)
    (purchases || []).forEach(p => {
      let pDateObj = new Date();
      if (p.created_at) {
        pDateObj = new Date(p.created_at);
      } else if (p.date && p.date.includes('/')) {
        const parts = p.date.split('/');
        if (parts.length === 3) pDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }

      const cart = Array.isArray(p.cart) && p.cart.length > 0 ? p.cart : (Array.isArray(p.items) ? p.items : [{ name: p.productName || 'Commodity', qty: p.qty || 1, unit: p.unit || 'KG' }]);
      const pNames = cart.map(it => it.name).filter(Boolean).join(', ') || p.productName || 'Procured Stock';
      const pCategories = cart.map(it => {
        const pObj = (products || []).find(prod => prod.name?.toLowerCase() === (it.name || '').toLowerCase());
        return pObj?.category || 'General';
      });
      const primaryCat = pCategories[0] || 'General';
      const totalQty = cart.reduce((sum, it) => sum + Number(it.qty || it.enteredQty || 1), 0);
      const unit = cart[0]?.unit || p.unit || 'KG';
      const grossAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));

      journal.push({
        id: `pur-${p.id || p.purchaseNo}`,
        dateStr: p.date || pDateObj.toLocaleDateString('en-GB'),
        dateObj: pDateObj,
        ref: p.purchaseNo ? `PUR-${p.purchaseNo}` : 'Purchase Bill',
        product: pNames,
        category: primaryCat,
        type: 'Purchase',
        isIncome: false,
        qty: `${totalQty} ${unit}`,
        rawQty: totalQty,
        amount: -grossAmt,
        party: p.supplierName || p.supplier || 'Supplier Firm',
        mode: p.paymentMode || (p.paidAmount >= grossAmt ? 'Cash' : 'Credit')
      });
    });

    // 3. Shop Expenses
    (expenses || []).forEach(e => {
      let eDateObj = new Date();
      if (e.date && e.date.includes('/')) {
        const parts = e.date.split('/');
        if (parts.length === 3) eDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }

      journal.push({
        id: `exp-${e.id || e.ref}`,
        dateStr: e.date || eDateObj.toLocaleDateString('en-GB'),
        dateObj: eDateObj,
        ref: e.ref || `EXP-${e.id}`,
        product: e.desc || e.category || 'Shop Expense',
        category: e.category || 'Shop Expense',
        type: 'Expense',
        isIncome: false,
        qty: '—',
        rawQty: 0,
        amount: -Number(e.amount || 0),
        party: 'Shop Operations',
        mode: e.mode || 'Cash'
      });
    });

    // 4. Sale Returns
    (saleReturns || []).forEach(r => {
      let rDateObj = new Date();
      if (r.created_at) {
        rDateObj = new Date(r.created_at);
      } else if (r.date && r.date.includes('/')) {
        const parts = r.date.split('/');
        if (parts.length === 3) rDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }

      const it = (r.items || [])[0] || {};
      const refAmt = Number(r.refundAmount || 0);

      journal.push({
        id: `sr-${r.id || r.returnNo}`,
        dateStr: r.date || rDateObj.toLocaleDateString('en-GB'),
        dateObj: rDateObj,
        ref: r.returnNo ? `SR-${r.returnNo}` : 'Sale Return',
        product: it.name || 'Returned Commodity',
        category: 'Sale Return',
        type: 'Sale Return',
        isIncome: false,
        qty: it.qty ? `${it.qty} ${it.unit || 'KG'}` : '—',
        rawQty: Number(it.qty || 0),
        amount: -refAmt,
        party: r.customerName || 'Customer Party',
        mode: r.refundMode || 'Ledger'
      });
    });

    // 5. Purchase Returns
    (purchaseReturns || []).forEach(r => {
      let rDateObj = new Date();
      if (r.created_at) {
        rDateObj = new Date(r.created_at);
      } else if (r.date && r.date.includes('/')) {
        const parts = r.date.split('/');
        if (parts.length === 3) rDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }

      const it = (r.items || [])[0] || {};
      const refAmt = Number(r.refundAmount || 0);

      journal.push({
        id: `pr-${r.id || r.returnNo}`,
        dateStr: r.date || rDateObj.toLocaleDateString('en-GB'),
        dateObj: rDateObj,
        ref: r.returnNo ? `PR-${r.returnNo}` : 'Debit Note',
        product: it.name || 'Returned Commodity',
        category: 'Purchase Return',
        type: 'Purchase Return',
        isIncome: true,
        qty: it.qty ? `${it.qty} ${it.unit || 'KG'}` : '—',
        rawQty: Number(it.qty || 0),
        amount: refAmt,
        party: r.supplierName || 'Supplier Firm',
        mode: r.refundMode || 'Ledger'
      });
    });

    // Sort Chronological Ascending (Oldest First) to calculate cumulative running P&L
    journal.sort((a, b) => a.dateObj - b.dateObj);

    let running = 0;
    journal.forEach(item => {
      running += item.amount;
      item.runningPnL = running;
    });

    // Return reversed (Newest First) for statement presentation
    return [...journal].reverse();
  }, [sales, purchases, expenses, saleReturns, purchaseReturns, products]);

  // Filtered P&L Journal based on active statement filters
  const filteredPlJournal = useMemo(() => {
    return plJournalTransactions.filter(item => {
      // 1. Date Filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const txDay = new Date(item.dateObj);
      txDay.setHours(0, 0, 0, 0);

      if (plDateFilter === 'Today' && txDay.getTime() !== today.getTime()) return false;
      if (plDateFilter === 'Yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        if (txDay.getTime() !== yest.getTime()) return false;
      }
      if (plDateFilter === 'This Week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 7);
        if (txDay < startOfWeek || txDay > new Date()) return false;
      }
      if (plDateFilter === 'This Month') {
        if (txDay.getFullYear() !== today.getFullYear() || txDay.getMonth() !== today.getMonth()) return false;
      }
      if (plDateFilter === 'Custom') {
        if (plStartDate && plEndDate) {
          const start = new Date(plStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(plEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDay < start || txDay > end) return false;
        } else if (plStartDate) {
          const start = new Date(plStartDate);
          start.setHours(0, 0, 0, 0);
          if (txDay < start) return false;
        } else if (plEndDate) {
          const end = new Date(plEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDay > end) return false;
        }
      }

      // 2. Product Filter
      if (plProductFilter !== 'All' && !item.product.toLowerCase().includes(plProductFilter.toLowerCase())) {
        return false;
      }

      // 3. Category Filter
      if (plCategoryFilter !== 'All' && item.category.toLowerCase() !== plCategoryFilter.toLowerCase()) {
        return false;
      }

      // 4. Type Filter
      if (plTypeFilter !== 'All') {
        if (plTypeFilter === 'Sale' && item.type !== 'Sale') return false;
        if (plTypeFilter === 'Purchase' && item.type !== 'Purchase') return false;
        if (plTypeFilter === 'Expense' && item.type !== 'Expense') return false;
        if (plTypeFilter === 'Return' && !item.type.includes('Return')) return false;
      }

      // 5. Payment Mode Filter
      if (plPaymentFilter !== 'All' && !item.mode.toLowerCase().includes(plPaymentFilter.toLowerCase())) {
        return false;
      }

      // 6. Party Filter
      if (plPartyFilter !== 'All' && item.party.toLowerCase() !== plPartyFilter.toLowerCase()) {
        return false;
      }

      // 7. Search
      if (plSearch.trim()) {
        const q = plSearch.toLowerCase().trim();
        const rMatch = item.ref.toLowerCase().includes(q);
        const pMatch = item.product.toLowerCase().includes(q);
        const cMatch = item.category.toLowerCase().includes(q);
        const partyMatch = item.party.toLowerCase().includes(q);
        if (!rMatch && !pMatch && !cMatch && !partyMatch) return false;
      }

      return true;
    });
  }, [plJournalTransactions, plDateFilter, plStartDate, plEndDate, plProductFilter, plCategoryFilter, plTypeFilter, plPaymentFilter, plPartyFilter, plSearch]);

  // P&L Statement Metrics
  const plTotalRevenue = useMemo(() => {
    return filteredPlJournal.filter(t => t.isIncome).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [filteredPlJournal]);

  const plTotalCOGS = useMemo(() => {
    return filteredPlJournal.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [filteredPlJournal]);

  const plGrossProfit = useMemo(() => plTotalRevenue - plTotalCOGS, [plTotalRevenue, plTotalCOGS]);
  const plGrossMargin = useMemo(() => plTotalRevenue > 0 ? ((plGrossProfit / plTotalRevenue) * 100).toFixed(2) : '0.00', [plGrossProfit, plTotalRevenue]);

  const plTotalExpenses = useMemo(() => {
    return filteredPlJournal.filter(t => t.type === 'Expense' || t.type === 'Sale Return').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [filteredPlJournal]);

  const plNetProfit = useMemo(() => plGrossProfit - plTotalExpenses, [plGrossProfit, plTotalExpenses]);
  const plNetMargin = useMemo(() => plTotalRevenue > 0 ? ((plNetProfit / plTotalRevenue) * 100).toFixed(2) : '0.00', [plNetProfit, plTotalRevenue]);

  const plTotalInflow = plTotalRevenue;
  const plTotalOutflow = plTotalCOGS + plTotalExpenses;

  // Pagination for Bank Statement
  const totalPlPages = Math.max(1, Math.ceil(filteredPlJournal.length / plPageSize));
  const paginatedPlJournal = useMemo(() => {
    const start = (plPage - 1) * plPageSize;
    return filteredPlJournal.slice(start, start + plPageSize);
  }, [filteredPlJournal, plPage, plPageSize]);

  // Product-Wise P&L Analysis
  const productWisePnLData = useMemo(() => {
    const map = {};
    (products || []).forEach(p => {
      map[p.name.toLowerCase()] = {
        name: p.name,
        category: p.category || 'General',
        unitsSold: 0,
        unit: p.unit || 'KG',
        salesRevenue: 0,
        purchasePrice: Number(p.purchasePrice || 0),
        cogs: 0,
        grossProfit: 0,
        margin: '0.0'
      };
    });

    filteredSalesList.forEach(s => {
      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ name: s.productName || 'Commodity', qty: s.qty || 1, total: s.grossAmt }]);
      cart.forEach(it => {
        const key = (it.name || '').toLowerCase();
        const qty = Number(it.qty || it.enteredQty || 1);
        const rev = Number(it.total || it.totalAmount || (qty * (it.price || it.rate || 0)));

        if (!map[key]) {
          map[key] = {
            name: it.name || 'Commodity',
            category: 'General',
            unitsSold: 0,
            unit: it.unit || 'KG',
            salesRevenue: 0,
            purchasePrice: 0,
            cogs: 0,
            grossProfit: 0,
            margin: '0.0'
          };
        }
        map[key].unitsSold += qty;
        map[key].salesRevenue += rev;
      });
    });

    return Object.values(map).filter(p => p.unitsSold > 0 || p.salesRevenue > 0).map(p => {
      const cogs = p.unitsSold * p.purchasePrice;
      const gp = p.salesRevenue - cogs;
      const margin = p.salesRevenue > 0 ? ((gp / p.salesRevenue) * 100).toFixed(1) : '0.0';
      return {
        ...p,
        cogs,
        grossProfit: gp,
        margin
      };
    }).sort((a, b) => b.grossProfit - a.grossProfit);
  }, [products, filteredSalesList]);

  // Category-Wise P&L Analysis
  const categoryWisePnLData = useMemo(() => {
    const map = {};
    (allCategories || ['All', 'General']).filter(c => c !== 'All').forEach(cat => {
      map[cat.toLowerCase()] = {
        category: cat,
        sales: 0,
        purchases: 0,
        expenses: 0,
        netProfit: 0,
        margin: '0.0'
      };
    });

    filteredPlJournal.forEach(item => {
      const catKey = (item.category || 'General').toLowerCase();
      if (!map[catKey]) {
        map[catKey] = {
          category: item.category || 'General',
          sales: 0,
          purchases: 0,
          expenses: 0,
          netProfit: 0,
          margin: '0.0'
        };
      }

      if (item.type === 'Sale' || item.type === 'Purchase Return') {
        map[catKey].sales += Math.abs(item.amount);
      } else if (item.type === 'Purchase') {
        map[catKey].purchases += Math.abs(item.amount);
      } else {
        map[catKey].expenses += Math.abs(item.amount);
      }
    });

    return Object.values(map).filter(c => c.sales > 0 || c.purchases > 0 || c.expenses > 0).map(c => {
      const net = c.sales - c.purchases - c.expenses;
      const margin = c.sales > 0 ? ((net / c.sales) * 100).toFixed(1) : '0.0';
      return {
        ...c,
        netProfit: net,
        margin
      };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }, [allCategories, filteredPlJournal]);

  const hasActivePlFilters = plDateFilter !== 'All' || plProductFilter !== 'All' || plCategoryFilter !== 'All' || plTypeFilter !== 'All' || plPaymentFilter !== 'All' || plPartyFilter !== 'All' || plSearch.trim() !== '' || plStartDate || plEndDate;

  // =========================================================================
  // EXPORT CSV HANDLER (100% Unit Accurate)
  // =========================================================================
  const exportReportCSV = () => {
    let csvData = `Report Type: ${reportType}\nGenerated At: ${new Date().toLocaleString()}\n\n`;

    if (reportType === 'Stock') {
      csvData += `Product,Category,Available Stock,Unit,Purchase Rate,Selling Rate,Stock Valuation,Status\n`;
      filteredStock.forEach(p => {
        csvData += `"${p.name}","${p.category}",${p.qty},"${p.unit}",${p.purchaseRate},${p.sellingRate},${p.stockVal},"${p.status}"\n`;
      });
    } else if (reportType === 'Sales') {
      csvData += `--- OVERALL SALES SUMMARY ---\n`;
      csvData += `Gross Sales,Rs. ${filteredGrossSales}\nNet Sales,Rs. ${filteredNetSales}\nTotal Invoices,${filteredInvoicesCount}\nTotal Quantity Sold,${filteredTotalQty}\nCash Collections,Rs. ${filteredCashSales}\nCredit Receivables,Rs. ${filteredCreditSales}\nTotal Discount,Rs. ${filteredDiscount}\nAverage Invoice Value,Rs. ${filteredAvgInvoiceValue}\n\n`;

      csvData += `--- 1. DATE-WISE SALES ---\n`;
      csvData += `Date,Invoices Count,Products Sold,Total Qty,Gross Sales (Rs.),Discount (Rs.),Net Sales (Rs.),Cash (Rs.),Credit (Rs.)\n`;
      dateWiseSalesData.forEach(d => {
        csvData += `"${d.date}",${d.invoiceCount},"${d.productsSummary}",${d.totalQty},${d.grossSales},${d.discount},${d.netSales},${d.cash},${d.credit}\n`;
      });
      csvData += `\n--- 2. PRODUCT-WISE SALES ---\n`;
      csvData += `Product,Suppliers,Qty Sold,Unit,Orders Count,Sales Revenue (Rs.),Avg Rate (Rs.),Share (%)\n`;
      productWiseSalesData.forEach(s => {
        csvData += `"${s.name}","${(s.suppliers || []).join('; ')}",${s.totalQty},"${s.unit}",${s.orderCount},${s.totalRevenue},${s.avgRate},${s.pctOfTotal}%\n`;
      });
      csvData += `\n--- 3. SUPPLIER-WISE SALES ---\n`;
      csvData += `Supplier,Products Count,Qty Sold,Orders Count,Total Sales (Rs.),Contribution (%)\n`;
      supplierWiseSalesData.forEach(sup => {
        csvData += `"${sup.supplierName}",${sup.productsCount},${sup.totalQty},${sup.orderCount},${sup.totalSales},${sup.pctContribution}%\n`;
      });
    } else if (reportType === 'ProfitLoss') {
      csvData += `--- PROFIT & LOSS STATEMENT SUMMARY ---\n`;
      csvData += `Total Sales / Revenue,Rs. ${plTotalRevenue}\nTotal Purchases (COGS),Rs. ${plTotalCOGS}\nGross Profit,Rs. ${plGrossProfit} (${plGrossMargin}%)\nShop Expenses,Rs. ${plTotalExpenses}\nNet Profit,Rs. ${plNetProfit} (${plNetMargin}%)\n\n`;

      csvData += `--- 1. ITEMIZE TRANSACTION STATEMENT JOURNAL ---\n`;
      csvData += `Date,Reference,Product/Item,Category,Type,Qty,Amount (Rs.),Running P&L (Rs.)\n`;
      filteredPlJournal.forEach(tx => {
        csvData += `"${tx.dateStr}","${tx.ref}","${tx.product}","${tx.category}","${tx.type}","${tx.qty}",${tx.amount},${tx.runningPnL}\n`;
      });

      csvData += `\n--- 2. PRODUCT-WISE P&L ANALYSIS ---\n`;
      csvData += `Product,Category,Units Sold,Sales (Rs.),Purchase Cost (Rs.),Gross Profit (Rs.),Margin (%)\n`;
      productWisePnLData.forEach(p => {
        csvData += `"${p.name}","${p.category}",${p.unitsSold},${p.salesRevenue},${p.cogs},${p.grossProfit},${p.margin}%\n`;
      });

      csvData += `\n--- 3. CATEGORY-WISE P&L ANALYSIS ---\n`;
      csvData += `Category,Sales (Rs.),Purchases (Rs.),Expenses (Rs.),Net Profit (Rs.),Margin (%)\n`;
      categoryWisePnLData.forEach(c => {
        csvData += `"${c.category}",${c.sales},${c.purchases},${c.expenses},${c.netProfit},${c.margin}%\n`;
      });
    } else if (reportType === 'BalanceSheet') {
      csvData += `--- BALANCE SHEET STATEMENT ---\n`;
      csvData += `Financial Year,${bsFinancialYear}\nPeriod,${bsPeriod}\nAs of Date,${bsAsOfDate}\n\n`;
      csvData += `TOTAL ASSETS,Rs. ${totalAssets}\nTOTAL LIABILITIES,Rs. ${totalLiabilities}\nNET BUSINESS WORTH,Rs. ${totalEquity}\n\n`;

      csvData += `--- 1. ASSETS (WHAT YOU OWN) ---\n`;
      csvData += `Cash in Hand,Rs. ${cashInHand}\nCustomer Receivables,Rs. ${totalCustomerReceivables}\nWarehouse Stock Valuation,Rs. ${totalStockValuation}\nTOTAL ASSETS,Rs. ${totalAssets}\n\n`;

      csvData += `--- 2. LIABILITIES (WHAT YOU OWE) ---\n`;
      csvData += `Supplier Payables,Rs. ${totalSupplierPayables}\nOutstanding Expenses,Rs. 0\nTOTAL LIABILITIES,Rs. ${totalLiabilities}\n\n`;

      csvData += `--- 3. EQUITY & CAPITAL ---\n`;
      csvData += `Owner Capital,Rs. ${bsEquityBreakdown.ownersCapital}\nRetained Current Profit,Rs. ${bsEquityBreakdown.retainedProfit}\nTOTAL EQUITY,Rs. ${totalEquity}\nTOTAL LIABILITIES + EQUITY,Rs. ${totalLiabilities + totalEquity}\n`;
    } else if (reportType === 'Expenses') {
      csvData += `Date,Voucher Ref,Category,Description,Payment Mode,Amount (Rs.)\n`;
      expenses.forEach(e => {
        csvData += `"${e.date}","${e.ref}","${e.category}","${e.desc}","${e.mode}",${e.amount}\n`;
      });
    } else {
      csvData += `Metric,Amount (Rs.)\nGross Revenue,${totalSalesGross}\nCOGS Purchases,${cogs}\nGross Profit,${grossOperatingProfit}\nTotal Expenses,${totalExpensesAmount}\nNet Profit,${netOperatingProfit}\n`;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ghalla_Mandi_${reportType}_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. HEADER & ACTIONS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            {reportType === 'Stock' && <Warehouse className="w-6 h-6 text-amber-500" />}
            {reportType === 'Sales' && <TrendingUp className="w-6 h-6 text-emerald-500" />}
            {reportType === 'Expenses' && <DollarSign className="w-6 h-6 text-rose-500" />}
            {reportType === 'ProfitLoss' && <PieChart className="w-6 h-6 text-brand-500" />}
            {reportType === 'BalanceSheet' && <Building className="w-6 h-6 text-indigo-500" />}
            <span>
              {reportType === 'Stock' && 'Stock & Inventory Report'}
              {reportType === 'Sales' && 'Sales & Revenue Report'}
              {reportType === 'Expenses' && 'Operating Expenses Report'}
              {reportType === 'ProfitLoss' && 'Profit & Loss Statement'}
              {reportType === 'BalanceSheet' && 'Balance Sheet Statement'}
            </span>
          </h1>
        </div>

        {/* Print & CSV Export Buttons */}
        <div className="flex items-center gap-2.5">
          {reportType === 'Expenses' && (
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={exportReportCSV}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>



      {/* ========================================================================= */}
      {/* 2. REPORT VIEW CONTENT */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* 1. STOCK REPORT (VIBRANT & RICH COLORS) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Stock' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => { setCategoryFilter('All'); setStockStatusFilter('All'); setSearchTerm(''); }}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
                }`}
              title="Click to view all registered commodities"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stock Valuation</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalStockValuation.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{processedStock.length} Total Registered • View All</div>
            </div>

            <div
              onClick={() => setStockStatusFilter('InStock')}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
                }`}
              title="Click to filter In-Stock commodities"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">In-Stock Products</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">{inStockCount} Items</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">Available for Sale • Filter Available</div>
            </div>

            <div
              onClick={() => setStockStatusFilter('LowStock')}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30' : 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200/60'
                }`}
              title="Click to filter Low Stock Warnings"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Low Stock Warnings</div>
              <div className="text-2xl font-black mt-1.5 text-amber-600 dark:text-amber-400 font-mono">{lowStockCount} Items</div>
              <div className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-1">Below Threshold • Filter Low Stock</div>
            </div>

            <div
              onClick={() => setStockStatusFilter('OutOfStock')}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60'
                }`}
              title="Click to filter Out of Stock items"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Out of Stock</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">{outOfStockCount} Items</div>
              <div className="text-xs text-rose-700 dark:text-rose-400 font-bold mt-1">0 Remaining • Filter Out of Stock</div>
            </div>
          </div>

          {/* Interactive Filters Bar for Stock Report */}
          <div className={`p-4 rounded-2xl border card-shadow flex flex-col md:flex-row md:items-center justify-between gap-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search product, category, code..."
                  className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border outline-none focus:border-slate-800 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Statuses</option>
                <option value="InStock">In Stock ({inStockCount})</option>
                <option value="LowStock">Low Stock ({lowStockCount})</option>
                <option value="OutOfStock">Out of Stock ({outOfStockCount})</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
              >
                <option value="valueDesc">Highest Stock Value</option>
                <option value="qtyDesc">Highest Quantity</option>
                <option value="nameAsc">Product (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Universal Clean Stock Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-600" />
                <span>Stock Statement ({filteredStock.length} Products Displayed)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-3 text-center">Available Stock</th>
                    <th className="py-3 px-3 text-right">Purchase Rate</th>
                    <th className="py-3 px-3 text-right">Selling Rate</th>
                    <th className="py-3 px-3 text-right">Stock Valuation</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                        No products match your active search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((item) => (
                      <tr key={item.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{item.name}</span>
                          </div>
                          {item.code && <span className="text-[10px] text-slate-400 font-mono block">{item.code}</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {item.qty.toLocaleString()} <span className="text-[11px] font-medium text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          Rs. {item.purchaseRate.toLocaleString()} / {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          Rs. {item.sellingRate.toLocaleString()} / {item.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          Rs. {item.stockVal.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${item.status === 'In Stock'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Low Stock'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 2. SALES & REVENUE REPORT (MULTI-DIMENSIONAL DEEP ANALYSIS) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Sales' && (
        <div className="space-y-5">
          {/* Top Common Filter Bar */}
          <div className={`p-4 rounded-2xl border card-shadow space-y-3 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Sales Report Filters
                </span>
              </div>

              {hasActiveSalesFilters && (
                <button
                  onClick={handleResetSalesFilters}
                  className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-center">
              {/* Date Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Date Range
                </label>
                <select
                  value={salesDateFilter}
                  onChange={(e) => setSalesDateFilter(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Dates</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom">Custom Date Range</option>
                </select>
              </div>

              {/* Product Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Product / Commodity
                </label>
                <select
                  value={salesProductFilter}
                  onChange={(e) => setSalesProductFilter(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Supplier Firm
                </label>
                <select
                  value={salesSupplierFilter}
                  onChange={(e) => setSalesSupplierFilter(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Suppliers</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Customer Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Customer Party
                </label>
                <select
                  value={salesCustomerFilter}
                  onChange={(e) => setSalesCustomerFilter(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Customers</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Payment Type
                </label>
                <select
                  value={salesPaymentFilter}
                  onChange={(e) => setSalesPaymentFilter(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Payment Types</option>
                  <option value="Cash">Cash Payments (Counter)</option>
                  <option value="Credit">Credit (Khata Due)</option>
                  <option value="Partial">Partial Payments</option>
                </select>
              </div>

              {/* Report View Section */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Report Section / View
                </label>
                <select
                  value={salesActiveSubTab}
                  onChange={(e) => setSalesActiveSubTab(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Sections (Overview)</option>
                  <option value="dateWise">1. Date-wise Sales</option>
                  <option value="productWise">2. Product-wise Sales</option>
                  <option value="supplierWise">3. Supplier-wise Sales</option>
                  <option value="supplierProduct">4. Supplier → Product Drill-down</option>
                  <option value="analytics">5. Top Rankings & Analytics</option>
                </select>
              </div>
            </div>

            {/* Custom Date Pickers */}
            {salesDateFilter === 'Custom' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">From Date:</span>
                  <input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">To Date:</span>
                  <input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 8 Overall Sales Summary Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Gross Sales */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Gross Sales</div>
              <div className="text-lg font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                Rs. {filteredGrossSales.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Total billed volume</div>
            </div>

            {/* 2. Net Sales */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Net Sales</div>
              <div className="text-lg font-black font-mono mt-1 text-brand-500">
                Rs. {filteredNetSales.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">After discounts & returns</div>
            </div>

            {/* 3. Total Invoices */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Total Invoices</div>
              <div className="text-lg font-black font-mono mt-1 text-blue-600 dark:text-blue-400">
                {filteredInvoicesCount} <span className="text-xs font-normal">Orders</span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Customer sales count</div>
            </div>

            {/* 4. Total Quantity Sold */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Total Items / Qty</div>
              <div className="text-lg font-black font-mono mt-1 text-purple-600 dark:text-purple-400">
                {filteredTotalQty.toLocaleString()} <span className="text-xs font-normal">Units</span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Commodities dispatched</div>
            </div>

            {/* 5. Cash Sales */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Cash Collections</div>
              <div className="text-lg font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                Rs. {filteredCashSales.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Direct counter cash</div>
            </div>

            {/* 6. Credit Sales */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Credit (Khata) Due</div>
              <div className="text-lg font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
                Rs. {filteredCreditSales.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Outstanding receivable</div>
            </div>

            {/* 7. Total Discount */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Total Discount</div>
              <div className="text-lg font-black font-mono mt-1 text-rose-500">
                Rs. {filteredDiscount.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Concessions given</div>
            </div>

            {/* 8. Average Invoice Value */}
            <div className={`p-3.5 rounded-2xl border card-shadow ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="text-[10px] font-black uppercase text-slate-400">Avg. Invoice Value</div>
              <div className="text-lg font-black font-mono mt-1 text-indigo-600 dark:text-indigo-400">
                Rs. {filteredAvgInvoiceValue.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Per order average</div>
            </div>
          </div>



          {/* ========================================================================= */}
          {/* SECTION 1: DATE-WISE SALES */}
          {/* ========================================================================= */}
          {(salesActiveSubTab === 'all' || salesActiveSubTab === 'dateWise') && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  <span>1. Date-Wise Sales Breakdown</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">
                  {dateWiseSalesData.length} Active Sales Dates
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                      <th className="py-2.5 px-3">Products Sold</th>
                      <th className="py-2.5 px-3 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Gross Sales</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right font-black text-brand-500">Net Sales</th>
                      <th className="py-2.5 px-3 text-right text-emerald-600">Cash</th>
                      <th className="py-2.5 px-3 text-right text-amber-600">Credit</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {dateWiseSalesData.length === 0 ? (
                      <tr><td colSpan={9} className="py-8 text-center text-slate-400">No sales recorded for this date filter.</td></tr>
                    ) : (
                      dateWiseSalesData.map((row, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 font-mono font-bold">{row.date}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">{row.invoiceCount}</td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300 font-medium">
                            {row.productsSummary}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{row.totalQty} Units</td>
                          <td className="py-2.5 px-3 text-right font-mono">Rs. {row.grossSales.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-500">Rs. {row.discount.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-brand-500">
                            Rs. {row.netSales.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            Rs. {row.cash.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                            Rs. {row.credit.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {dateWiseSalesData.length > 0 && (
                    <tfoot>
                      <tr className={`border-t-2 text-xs font-black ${
                        theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-slate-100/80 border-slate-300 text-slate-900'
                      }`}>
                        <td className="py-3 px-3 uppercase">Total / Summary</td>
                        <td className="py-3 px-3 text-center font-mono">{filteredInvoicesCount}</td>
                        <td className="py-3 px-3 font-medium text-slate-400">—</td>
                        <td className="py-3 px-3 text-right font-mono">{filteredTotalQty.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono">Rs. {filteredGrossSales.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-rose-500">Rs. {filteredDiscount.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-brand-500">Rs. {filteredNetSales.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600">Rs. {filteredCashSales.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-amber-600">Rs. {filteredCreditSales.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: PRODUCT-WISE SALES */}
          {/* ========================================================================= */}
          {(salesActiveSubTab === 'all' || salesActiveSubTab === 'productWise') && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-emerald-500" />
                  <span>2. Product-Wise Sales Performance</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">
                  {productWiseSalesData.length} Unique Commodities Sold
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Supplied By</th>
                      <th className="py-2.5 px-3 text-center">Qty Sold</th>
                      <th className="py-2.5 px-3 text-center">Orders</th>
                      <th className="py-2.5 px-3 text-right">Sales Amount</th>
                      <th className="py-2.5 px-3 text-right">Avg. Rate</th>
                      <th className="py-2.5 px-3 w-40 text-right">% of Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {productWiseSalesData.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-slate-400">No products sold in this filter range.</td></tr>
                    ) : (
                      productWiseSalesData.map((item, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                              {(item.suppliers || []).join(', ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.totalQty} {item.unit}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            {item.orderCount}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                            Rs. {item.totalRevenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            Rs. {item.avgRate.toLocaleString()}/{item.unit}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${Math.min(100, Math.max(2, parseFloat(item.pctOfTotal)))}%` }} 
                                />
                              </div>
                              <span className="font-mono font-bold text-[11px] text-emerald-600 dark:text-emerald-400 w-12 text-right">
                                {item.pctOfTotal}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: SUPPLIER-WISE SALES */}
          {/* ========================================================================= */}
          {(salesActiveSubTab === 'all' || salesActiveSubTab === 'supplierWise') && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-500" />
                  <span>3. Supplier-Wise Sales Turnover</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">
                  {supplierWiseSalesData.length} Supplying Sources
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-2.5 px-3">Supplier Firm</th>
                      <th className="py-2.5 px-3 text-center">Products Count</th>
                      <th className="py-2.5 px-3 text-right">Total Qty Sold</th>
                      <th className="py-2.5 px-3 text-center">Orders Count</th>
                      <th className="py-2.5 px-3 text-right">Total Sales (Rs.)</th>
                      <th className="py-2.5 px-3 w-40 text-right">% Contribution</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {supplierWiseSalesData.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">No supplier turnover data found.</td></tr>
                    ) : (
                      supplierWiseSalesData.map((sup, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                            {sup.supplierName}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            {sup.productsCount} Products
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {sup.totalQty} Units
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            {sup.orderCount} Orders
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-brand-500">
                            Rs. {sup.totalSales.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full" 
                                  style={{ width: `${Math.min(100, Math.max(2, parseFloat(sup.pctContribution)))}%` }} 
                                />
                              </div>
                              <span className="font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400 w-12 text-right">
                                {sup.pctContribution}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: SUPPLIER -> PRODUCT DRILL-DOWN */}
          {/* ========================================================================= */}
          {(salesActiveSubTab === 'all' || salesActiveSubTab === 'supplierProduct') && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3.5 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>4. Supplier → Product Breakdown (Drill-Down)</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">
                  Hierarchical Product Performance by Supplier
                </span>
              </div>

              {supplierWiseSalesData.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No supplier drill-down records available.</div>
              ) : (
                <div className="space-y-3">
                  {supplierWiseSalesData.map((sup, idx) => {
                    const isExpanded = expandedSuppliers[sup.supplierName] !== false; // default expanded

                    return (
                      <div 
                        key={idx} 
                        className={`border rounded-xl overflow-hidden transition ${
                          theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        {/* Supplier Card Header */}
                        <div 
                          onClick={() => toggleSupplierExpand(sup.supplierName)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition ${
                            theme === 'dark' ? 'hover:bg-slate-900/80' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                              <Building className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{sup.supplierName}</span>
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/10 text-purple-600 font-bold">
                                  {sup.pctContribution}% Share
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {sup.productsCount} Products • {sup.orderCount} Orders Total
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xs font-black font-mono text-brand-500">
                                Rs. {sup.totalSales.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sup.totalQty} Units Sold
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Inner Table */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 dark:border-slate-700/80 p-2.5 bg-white dark:bg-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
                                  <th className="pb-1.5 px-2">Product Name</th>
                                  <th className="pb-1.5 px-2 text-center">Qty Sold</th>
                                  <th className="pb-1.5 px-2 text-center">Orders</th>
                                  <th className="pb-1.5 px-2 text-right">Avg Rate</th>
                                  <th className="pb-1.5 px-2 text-right font-black">Sales Amount</th>
                                  <th className="pb-1.5 px-2 text-right">% of Supplier</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                                {sup.products.map((prod, pIdx) => (
                                  <tr key={pIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="py-2 px-2 font-bold text-slate-800 dark:text-slate-200">
                                      {prod.name}
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                                      {prod.qty} {prod.unit}
                                    </td>
                                    <td className="py-2 px-2 text-center font-medium text-slate-500">
                                      {prod.orders}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-500">
                                      Rs. {prod.avgRate.toLocaleString()}/{prod.unit}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      Rs. {prod.revenue.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                                      {prod.pctOfSupplier}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: TOP ANALYTICS & RANKINGS */}
          {/* ========================================================================= */}
          {(salesActiveSubTab === 'all' || salesActiveSubTab === 'analytics') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Selling Products */}
              <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  <span>Top Selling Products by Revenue</span>
                </h3>

                {topSellingProducts.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No sales data.</div>
                ) : (
                  <div className="space-y-2.5">
                    {topSellingProducts.map((p, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] flex items-center justify-center font-black">
                              {idx + 1}
                            </span>
                            <span>{p.name}</span>
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            Rs. {p.totalRevenue.toLocaleString()} ({p.pctOfTotal}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${Math.min(100, Math.max(5, parseFloat(p.pctOfTotal)))}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Suppliers by Sales */}
              <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span>Top Suppliers by Sales Contribution</span>
                </h3>

                {topSuppliers.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No supplier sales data.</div>
                ) : (
                  <div className="space-y-2.5">
                    {topSuppliers.map((sup, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 text-[10px] flex items-center justify-center font-black">
                              {idx + 1}
                            </span>
                            <span>{sup.supplierName}</span>
                          </span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            Rs. {sup.totalSales.toLocaleString()} ({sup.pctContribution}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${Math.min(100, Math.max(5, parseFloat(sup.pctContribution)))}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 3. OPERATING EXPENSES REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setShowAddExpenseModal(true)}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-b from-rose-50/50 to-white border-rose-200/80'
                }`}
              title="Click to Record New Expense"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Operating Expenses</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">Rs. {totalExpensesAmount.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">{expenses.length} Expense Records • Add Expense</div>
            </div>

            <div
              onClick={() => setShowAddExpenseModal(true)}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-purple-500/30' : 'bg-gradient-to-b from-purple-50/50 to-white border-purple-200/80'
                }`}
              title="Click to Record New Expense"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Cost Category</div>
              <div className="text-2xl font-black mt-1.5 text-purple-600 dark:text-purple-400 truncate">{topExpenseCategory}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Based on Logged Vouchers</div>
            </div>

            <div
              onClick={() => setShowAddExpenseModal(true)}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-blue-500/30' : 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80'
                }`}
              title="Click to Record New Expense"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Logged Entries</div>
              <div className="text-2xl font-black mt-1.5 text-blue-600 dark:text-blue-400 font-mono">{expenses.length} Entries</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Direct Expense Records • Click to Add</div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-rose-500" />
                <span>Operating Expenses Log</span>
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Expense</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Voucher #</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Payment Mode</th>
                    <th className="py-3 px-3 text-right">Amount (Rs.)</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {expenses.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400">No expenses recorded yet. Click "Record Expense" to add your first entry.</td></tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 text-slate-500">{exp.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{exp.ref}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{exp.desc}</td>
                        <td className="py-3 px-3 font-medium">{exp.mode}</td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          Rs. {Number(exp.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 4. PROFIT & LOSS STATEMENT (BANK-STATEMENT STYLE FINANCIAL JOURNAL) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'ProfitLoss' && (
        <div className="space-y-6">


          {/* Statement Filter Bar */}
          <div className={`p-4 rounded-2xl border card-shadow space-y-3 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Statement Filter System
                </span>
              </div>

              {hasActivePlFilters && (
                <button
                  onClick={handleResetPlFilters}
                  className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset Statement Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 items-center">
              {/* 1. Date Range */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Date Range
                </label>
                <select
                  value={plDateFilter}
                  onChange={(e) => {
                    setPlDateFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Dates</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom">Custom Range</option>
                </select>
              </div>

              {/* 2. Product */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Product / Item
                </label>
                <select
                  value={plProductFilter}
                  onChange={(e) => {
                    setPlProductFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* 3. Category */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={plCategoryFilter}
                  onChange={(e) => {
                    setPlCategoryFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Categories</option>
                  {(allCategories || ['General']).filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 4. Transaction Type */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Type
                </label>
                <select
                  value={plTypeFilter}
                  onChange={(e) => {
                    setPlTypeFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Types</option>
                  <option value="Sale">Sale (Income)</option>
                  <option value="Purchase">Purchase (Stock Cost)</option>
                  <option value="Expense">Shop Expense</option>
                  <option value="Return">Returns</option>
                </select>
              </div>

              {/* 5. Payment Mode */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Payment Mode
                </label>
                <select
                  value={plPaymentFilter}
                  onChange={(e) => {
                    setPlPaymentFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit (Khata)</option>
                  <option value="Bank">Bank / Online</option>
                </select>
              </div>

              {/* 6. Search Bar */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Search Statement
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={plSearch}
                    onChange={(e) => {
                      setPlSearch(e.target.value);
                      setPlPage(1);
                    }}
                    placeholder="Ref, item, party..."
                    className={`w-full pl-8 pr-2.5 py-1.5 border rounded-xl text-xs font-bold outline-none focus:border-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Custom Date Pickers */}
            {plDateFilter === 'Custom' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">From Date:</span>
                  <input
                    type="date"
                    value={plStartDate}
                    onChange={(e) => {
                      setPlStartDate(e.target.value);
                      setPlPage(1);
                    }}
                    className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">To Date:</span>
                  <input
                    type="date"
                    value={plEndDate}
                    onChange={(e) => {
                      setPlEndDate(e.target.value);
                      setPlPage(1);
                    }}
                    className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compact Financial Statement Summary & Reconciliation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* 5 Compact KPI Metric Cards (8 cols) */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* 1. Total Sales / Revenue */}
              <div className={`p-3.5 rounded-2xl border card-shadow ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="text-[10px] font-black uppercase text-slate-400">Total Sales / Revenue</div>
                <div className="text-lg font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                  +Rs. {plTotalRevenue.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Customer sales & returns</div>
              </div>

              {/* 2. Total Purchases (COGS) */}
              <div className={`p-3.5 rounded-2xl border card-shadow ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="text-[10px] font-black uppercase text-slate-400">Total Purchases (COGS)</div>
                <div className="text-lg font-black font-mono mt-1 text-blue-600 dark:text-blue-400">
                  -Rs. {plTotalCOGS.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Procurement cost</div>
              </div>

              {/* 3. Gross Profit */}
              <div className={`p-3.5 rounded-2xl border card-shadow ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="text-[10px] font-black uppercase text-slate-400">Gross Profit</div>
                <div className="text-lg font-black font-mono mt-1 text-slate-900 dark:text-white">
                  Rs. {plGrossProfit.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  Margin: {plGrossMargin}%
                </div>
              </div>

              {/* 4. Shop Expenses */}
              <div className={`p-3.5 rounded-2xl border card-shadow ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="text-[10px] font-black uppercase text-slate-400">Shop Expenses</div>
                <div className="text-lg font-black font-mono mt-1 text-rose-500">
                  -Rs. {plTotalExpenses.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Operational overheads</div>
              </div>

              {/* 5. Net Operating Profit */}
              <div className={`p-3.5 rounded-2xl border card-shadow sm:col-span-2 ${
                theme === 'dark' ? 'bg-emerald-950/30 border-emerald-500/40 text-white' : 'bg-emerald-50/70 border-emerald-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Net Operating Profit</div>
                    <div className="text-xl font-black font-mono mt-0.5 text-emerald-700 dark:text-emerald-300">
                      Rs. {plNetProfit.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white font-black text-xs font-mono">
                      {plNetMargin}% Net Margin
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                      Sales − Purchases − Expenses
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statement Period Summary Card (4 cols) */}
            <div className={`lg:col-span-4 p-4 rounded-2xl border card-shadow space-y-2.5 ${
              theme === 'dark' ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-50/90 border-slate-200 text-slate-900'
            }`}>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 border-b pb-1.5 border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span>Period Statement Summary</span>
                <span className="text-[10px] font-bold text-emerald-600">{plDateFilter}</span>
              </div>

              <div className="space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Opening Balance:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">Rs. 0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Inflow (Revenue):</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    +Rs. {plTotalInflow.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Outflow (Costs):</span>
                  <span className="font-mono text-rose-500 font-bold">
                    -Rs. {plTotalOutflow.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black">
                  <span>Net Statement P&L:</span>
                  <span className={`font-mono ${plNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    Rs. {plNetProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MAIN BANK-STATEMENT STYLE TRANSACTION LEDGER */}
          {/* ========================================================================= */}
          <div className={`border rounded-2xl card-shadow overflow-hidden ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Itemized Transaction Statement Journal</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Financial running balance ledger sorted chronologically
                </span>
              </div>

              <div className="text-xs text-slate-400 font-bold">
                Showing {filteredPlJournal.length > 0 ? (plPage - 1) * plPageSize + 1 : 0}–{Math.min(plPage * plPageSize, filteredPlJournal.length)} of {filteredPlJournal.length} transactions
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[10px] font-black uppercase tracking-wider sticky top-0 ${
                    theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-slate-400' : 'bg-slate-50/90 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3">Reference</th>
                    <th className="py-3 px-3">Product / Description</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3.5 text-right font-black text-slate-900 dark:text-white">Running P&L</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {paginatedPlJournal.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No financial transactions match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedPlJournal.map((tx) => {
                      const isPositive = tx.amount >= 0;
                      return (
                        <tr key={tx.id} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}>
                          {/* Date */}
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                            {tx.dateStr}
                          </td>

                          {/* Reference */}
                          <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                              tx.type === 'Sale' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                              tx.type === 'Purchase' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                              tx.type === 'Expense' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                              'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                            }`}>
                              {tx.ref}
                            </span>
                          </td>

                          {/* Product / Description */}
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                            <div>{tx.product}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{tx.party} • {tx.mode}</div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3 text-slate-500 font-medium">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                              {tx.category}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              tx.type === 'Sale' ? 'bg-emerald-500/10 text-emerald-600' :
                              tx.type === 'Purchase' ? 'bg-blue-500/10 text-blue-600' :
                              tx.type === 'Expense' ? 'bg-rose-500/10 text-rose-600' :
                              'bg-purple-500/10 text-purple-600'
                            }`}>
                              {tx.type}
                            </span>
                          </td>

                          {/* Qty */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {tx.qty}
                          </td>

                          {/* Amount */}
                          <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isPositive ? '+' : ''}Rs. {tx.amount.toLocaleString()}
                          </td>

                          {/* Running P&L */}
                          <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                            Rs. {tx.runningPnL.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPlPages > 1 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <button
                  onClick={() => setPlPage(p => Math.max(1, p - 1))}
                  disabled={plPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous Page
                </button>

                <div className="font-bold text-slate-500">
                  Page {plPage} of {totalPlPages}
                </div>

                <button
                  onClick={() => setPlPage(p => Math.min(totalPlPages, p + 1))}
                  disabled={plPage === totalPlPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next Page
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* PRODUCT-WISE & CATEGORY-WISE P&L ANALYTICS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Product-Wise P&L Table */}
            <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-emerald-500" />
                  <span>Product-Wise Profit & Loss</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Click row to filter</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-2.5 px-2.5">Product</th>
                      <th className="py-2.5 px-2 text-center">Units Sold</th>
                      <th className="py-2.5 px-2 text-right">Sales</th>
                      <th className="py-2.5 px-2 text-right">Cost (COGS)</th>
                      <th className="py-2.5 px-2 text-right font-black">Gross Profit</th>
                      <th className="py-2.5 px-2.5 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {productWisePnLData.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-400">No product sales records.</td></tr>
                    ) : (
                      productWisePnLData.map((p, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => {
                            setPlProductFilter(p.name);
                            setPlPage(1);
                          }}
                          className={`cursor-pointer transition ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-emerald-50/50'}`}
                          title="Click to filter statement to this product"
                        >
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">
                            <div>{p.name}</div>
                            <div className="text-[9px] text-slate-400">{p.category}</div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                            {p.unitsSold} {p.unit}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Rs. {p.salesRevenue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                            Rs. {p.cogs.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 dark:text-white">
                            Rs. {p.grossProfit.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {p.margin}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Category-Wise P&L Table */}
            <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-500" />
                  <span>Category-Wise Profit & Loss</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Click row to filter</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-2.5 px-2.5">Category</th>
                      <th className="py-2.5 px-2 text-right">Sales</th>
                      <th className="py-2.5 px-2 text-right">Purchases</th>
                      <th className="py-2.5 px-2 text-right">Expenses</th>
                      <th className="py-2.5 px-2 text-right font-black">Net Profit</th>
                      <th className="py-2.5 px-2.5 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {categoryWisePnLData.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-400">No category breakdown data.</td></tr>
                    ) : (
                      categoryWisePnLData.map((c, idx) => (
                        <tr 
                          key={idx}
                          onClick={() => {
                            setPlCategoryFilter(c.category);
                            setPlPage(1);
                          }}
                          className={`cursor-pointer transition ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/50'}`}
                          title="Click to filter statement to this category"
                        >
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">
                            {c.category}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Rs. {c.sales.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-blue-600 dark:text-blue-400">
                            Rs. {c.purchases.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-rose-500">
                            Rs. {c.expenses.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 dark:text-white">
                            Rs. {c.netProfit.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {c.margin}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. BALANCE SHEET STATEMENT (PROFESSIONAL BANKING & FINANCIAL DASHBOARD) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'BalanceSheet' && (
        <div className="space-y-6">
          {/* Top Filter Bar */}
          <div className={`p-4 rounded-2xl border card-shadow space-y-3.5 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-100 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Balance Sheet Statement
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    As of {bsAsOfDate === 'Custom Date' ? bsCustomDate : bsAsOfDate}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Audited financial position • Liquid Assets, Receivables, Inventory vs Payables & Capital
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <span>Last updated: <strong className="text-slate-600 dark:text-slate-300">{bsLastUpdated}</strong></span>
                  <button
                    onClick={handleRefreshBalanceSheet}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 transition cursor-pointer"
                    title="Refresh Balance Sheet"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleResetBsFilters}
                  className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-center">
              {/* 1. Financial Year */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Financial Year
                </label>
                <select
                  value={bsFinancialYear}
                  onChange={(e) => setBsFinancialYear(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="FY 2026–27">FY 2026–27 (Current)</option>
                  <option value="FY 2025–26">FY 2025–26</option>
                  <option value="FY 2024–25">FY 2024–25</option>
                </select>
              </div>

              {/* 2. Period */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Period
                </label>
                <select
                  value={bsPeriod}
                  onChange={(e) => setBsPeriod(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="This Month">This Month</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Quarter">This Quarter (Q3)</option>
                  <option value="This Year">This Year</option>
                  <option value="All Time">All Time (Cumulative)</option>
                </select>
              </div>

              {/* 3. Account / Channel */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Account / Channel
                </label>
                <select
                  value={bsAccountFilter}
                  onChange={(e) => setBsAccountFilter(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Accounts & Channels</option>
                  <option value="Cash">Cash Counter Drawer</option>
                  <option value="HBL">HBL Operating A/C</option>
                  <option value="Meezan">Meezan Islamic A/C</option>
                  <option value="JazzCash">JazzCash Merchant</option>
                  <option value="Easypaisa">Easypaisa Merchant</option>
                </select>
              </div>

              {/* 4. Branch / Location */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Branch / Location
                </label>
                <select
                  value={bsBranchFilter}
                  onChange={(e) => setBsBranchFilter(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Branches</option>
                  <option value="Main">Main Mandi Shop #42</option>
                  <option value="Warehouse">Warehouse Godown A</option>
                </select>
              </div>

              {/* 5. As of Date */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Reporting As of
                </label>
                <select
                  value={bsAsOfDate}
                  onChange={(e) => setBsAsOfDate(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Today">Today ({new Date().toLocaleDateString('en-GB')})</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Month End">This Month End</option>
                  <option value="This Quarter End">This Quarter End</option>
                  <option value="Custom Date">Custom Specific Date</option>
                </select>
              </div>

              {/* 6. Comparison Mode */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Compare With
                </label>
                <select
                  value={bsComparisonMode}
                  onChange={(e) => setBsComparisonMode(e.target.value)}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Previous Month">Previous Month</option>
                  <option value="Previous Quarter">Previous Quarter</option>
                  <option value="Previous Year">Previous Year (YoY)</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>

            {/* Custom Date Input */}
            {bsAsOfDate === 'Custom Date' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-400">Select Date:</span>
                <input
                  type="date"
                  value={bsCustomDate}
                  onChange={(e) => setBsCustomDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            )}
          </div>

          {/* 3 Main Metric Cards with Movement Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. TOTAL ASSETS */}
            <div className={`p-4 rounded-2xl border card-shadow space-y-2 ${
              theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Total Business Assets
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+8.4% vs prev</span>
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                Rs. {totalAssets.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Liquid Cash + Customer Dues + Commodity Stock
              </div>
            </div>

            {/* 2. TOTAL LIABILITIES */}
            <div className={`p-4 rounded-2xl border card-shadow space-y-2 ${
              theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Total Liabilities & Payables
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                  <span>0.0% vs prev</span>
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                Rs. {totalLiabilities.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Supplier Khata Dues + Short-Term Liabilities
              </div>
            </div>

            {/* 3. NET BUSINESS WORTH */}
            <div className={`p-4 rounded-2xl border card-shadow space-y-2 ${
              theme === 'dark' ? 'bg-slate-800 border-indigo-500/30 text-white' : 'bg-gradient-to-br from-indigo-50/40 to-white border-indigo-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Net Business Worth (Equity)
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+12.2% vs prev</span>
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                Rs. {totalEquity.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Assets minus what you owe (Owner Capital + Profits)
              </div>
            </div>
          </div>

          {/* Visual Financial Summary — Net Worth Trend Line */}
          <div className={`p-4 rounded-2xl border card-shadow space-y-3 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Financial Position & Net Worth Trajectory
                </h3>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Assets</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span>Liabilities</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  <span>Net Worth</span>
                </span>
              </div>
            </div>

            {/* Simple Clean Responsive SVG Trend Line */}
            <div className="h-28 w-full flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-100 dark:border-slate-700">
              {bsTrendData.map((d, i) => {
                const maxVal = Math.max(1, bsTrendData[bsTrendData.length - 1].assets);
                const assetHeight = Math.max(15, Math.round((d.assets / maxVal) * 80));
                const nwHeight = Math.max(12, Math.round((d.netWorth / maxVal) * 80));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer">
                    <div className="flex items-end gap-1 w-full justify-center">
                      <div 
                        className="w-2.5 bg-emerald-500/80 hover:bg-emerald-500 rounded-t-sm transition-all" 
                        style={{ height: `${assetHeight}px` }} 
                        title={`Assets: Rs. ${d.assets.toLocaleString()}`}
                      />
                      <div 
                        className="w-2.5 bg-indigo-500/80 hover:bg-indigo-500 rounded-t-sm transition-all" 
                        style={{ height: `${nwHeight}px` }} 
                        title={`Net Worth: Rs. ${d.netWorth.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two Column Banking Balance Sheet Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ========================================================================= */}
            {/* LEFT COLUMN: WHAT YOU OWN (ASSETS) */}
            {/* ========================================================================= */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Building className="w-4 h-4" />
                  <span>What You Own (Assets)</span>
                </h3>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Rs. {totalAssets.toLocaleString()}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. Cash & Bank Equivalents */}
                <div className={`border rounded-xl p-3 space-y-2 ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div 
                    onClick={() => toggleBsSection('cashBank')}
                    className="flex items-center justify-between cursor-pointer font-bold"
                  >
                    <div className="flex items-center gap-2">
                      {bsExpandedSections.cashBank ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-slate-900 dark:text-white">Cash & Bank Equivalents</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      Rs. {bsCashBreakdown.total.toLocaleString()}
                    </span>
                  </div>

                  {bsExpandedSections.cashBank && (
                    <div className="pl-5 pr-1 space-y-1.5 pt-1 text-[11px] font-semibold text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between">
                        <span>Cash in Hand (Counter Drawer):</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {cashInHand.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bank Accounts (HBL / Meezan):</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. 0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mobile Wallets (JazzCash / Easypaisa):</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. 0</span>
                      </div>
                      <div className="pt-1 text-right">
                        <button
                          onClick={() => {
                            setBsDrilldownSearch('');
                            setBsActiveDrilldownModal('cashBank');
                          }}
                          className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          View Liquid Details →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Customer Receivables */}
                <div className={`border rounded-xl p-3 space-y-2 ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div 
                    onClick={() => toggleBsSection('receivables')}
                    className="flex items-center justify-between cursor-pointer font-bold"
                  >
                    <div className="flex items-center gap-2">
                      {bsExpandedSections.receivables ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-slate-900 dark:text-white">Receivables (Khata Dues)</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      Rs. {totalCustomerReceivables.toLocaleString()}
                    </span>
                  </div>

                  {bsExpandedSections.receivables && (
                    <div className="pl-5 pr-1 space-y-1.5 pt-1 text-[11px] font-semibold text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between">
                        <span>Customer Khata Receivables:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {totalCustomerReceivables.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Business Advances:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. 0</span>
                      </div>
                      <div className="pt-1 text-right">
                        <button
                          onClick={() => {
                            setBsDrilldownSearch('');
                            setBsActiveDrilldownModal('customers');
                          }}
                          className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          View Customers Ledger →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Commodity Inventory Assets */}
                <div className={`border rounded-xl p-3 space-y-2 ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div 
                    onClick={() => toggleBsSection('inventory')}
                    className="flex items-center justify-between cursor-pointer font-bold"
                  >
                    <div className="flex items-center gap-2">
                      {bsExpandedSections.inventory ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-slate-900 dark:text-white">Inventory / Commodities</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      Rs. {totalStockValuation.toLocaleString()}
                    </span>
                  </div>

                  {bsExpandedSections.inventory && (
                    <div className="pl-5 pr-1 space-y-1.5 pt-1 text-[11px] font-semibold text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between">
                        <span>Stock in Warehouse Godown:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {totalStockValuation.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Damaged / Expired Goods:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. 0</span>
                      </div>
                      <div className="pt-1 text-right">
                        <button
                          onClick={() => {
                            setBsDrilldownSearch('');
                            setBsActiveDrilldownModal('stock');
                          }}
                          className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          View Stock Valuation →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Assets Summary Line */}
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>TOTAL ASSETS:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">Rs. {totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT COLUMN: WHAT YOU OWE & EQUITY (LIABILITIES & EQUITY) */}
            {/* ========================================================================= */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <PieChart className="w-4 h-4" />
                  <span>What You Owe & Equity</span>
                </h3>
                <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                  Rs. {(totalLiabilities + totalEquity).toLocaleString()}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. Supplier Payables & Current Liabilities */}
                <div className={`border rounded-xl p-3 space-y-2 ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div 
                    onClick={() => toggleBsSection('payables')}
                    className="flex items-center justify-between cursor-pointer font-bold"
                  >
                    <div className="flex items-center gap-2">
                      {bsExpandedSections.payables ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-slate-900 dark:text-white">Current Liabilities</span>
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      Rs. {totalSupplierPayables.toLocaleString()}
                    </span>
                  </div>

                  {bsExpandedSections.payables && (
                    <div className="pl-5 pr-1 space-y-1.5 pt-1 text-[11px] font-semibold text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between">
                        <span>Supplier Khata Payables:</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">Rs. {totalSupplierPayables.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Loans & Financing:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. 0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outstanding Operating Expenses:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. 0</span>
                      </div>
                      <div className="pt-1 text-right">
                        <button
                          onClick={() => {
                            setBsDrilldownSearch('');
                            setBsActiveDrilldownModal('suppliers');
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          View Suppliers Ledger →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Equity & Business Net Worth */}
                <div className={`border rounded-xl p-3 space-y-2 ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div 
                    onClick={() => toggleBsSection('equity')}
                    className="flex items-center justify-between cursor-pointer font-bold"
                  >
                    <div className="flex items-center gap-2">
                      {bsExpandedSections.equity ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-slate-900 dark:text-white">Equity & Capital</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Rs. {totalEquity.toLocaleString()}
                    </span>
                  </div>

                  {bsExpandedSections.equity && (
                    <div className="pl-5 pr-1 space-y-1.5 pt-1 text-[11px] font-semibold text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between">
                        <span>Owner's Opening Capital:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {bsEquityBreakdown.ownersCapital.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Year Retained Profit:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Rs. {bsEquityBreakdown.retainedProfit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-700/60">
                        <span>Total Net Business Value:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">Rs. {totalEquity.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Liabilities + Equity Summary Line */}
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>TOTAL LIABILITIES & EQUITY:</span>
                  <span className="font-mono text-slate-900 dark:text-white">Rs. {(totalLiabilities + totalEquity).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. BALANCE SHEET INTERACTIVE DRILLDOWN MODALS */}
      {/* ========================================================================= */}
      {bsActiveDrilldownModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setBsActiveDrilldownModal(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-2xl w-full p-6 space-y-4 card-shadow border max-h-[85vh] flex flex-col ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  {bsActiveDrilldownModal === 'stock' && <Warehouse className="w-4 h-4 text-amber-500" />}
                  {bsActiveDrilldownModal === 'customers' && <Users className="w-4 h-4 text-emerald-500" />}
                  {bsActiveDrilldownModal === 'suppliers' && <Building className="w-4 h-4 text-blue-500" />}
                  {bsActiveDrilldownModal === 'cashBank' && <Wallet className="w-4 h-4 text-purple-500" />}
                  <span>
                    {bsActiveDrilldownModal === 'stock' && 'Stock Valuation Breakdown'}
                    {bsActiveDrilldownModal === 'customers' && 'Customer Khata Receivables Ledger'}
                    {bsActiveDrilldownModal === 'suppliers' && 'Supplier Payables Ledger'}
                    {bsActiveDrilldownModal === 'cashBank' && 'Liquid Cash & Bank Accounts'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Itemized live balances supporting the Balance Sheet Statement
                </p>
              </div>

              <button
                type="button"
                onClick={() => setBsActiveDrilldownModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={bsDrilldownSearch}
                onChange={(e) => setBsDrilldownSearch(e.target.value)}
                placeholder="Search items, names, phone..."
                className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs font-bold outline-none focus:border-indigo-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Modal Content Table */}
            <div className="overflow-y-auto overflow-x-auto flex-1 text-xs">
              {/* 1. Stock Valuation Details */}
              {bsActiveDrilldownModal === 'stock' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase text-slate-400 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className="py-2 px-2.5">Product</th>
                      <th className="py-2 px-2">Category</th>
                      <th className="py-2 px-2 text-center">Available Stock</th>
                      <th className="py-2 px-2 text-right">Purchase Rate</th>
                      <th className="py-2 px-2.5 text-right font-black">Stock Value</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {(filteredStock || []).filter(p => p.name.toLowerCase().includes(bsDrilldownSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase())).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">{p.name}</td>
                        <td className="py-2.5 px-2 text-slate-500">{p.category}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{p.qty} {p.unit}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-500">Rs. {p.purchaseRate}/{p.unit}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">Rs. {p.stockVal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 text-xs font-black">
                      <td colSpan={4} className="py-2.5 px-2.5 uppercase">Total Warehouse Stock Valuation</td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-emerald-600">Rs. {totalStockValuation.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* 2. Customer Receivables Details */}
              {bsActiveDrilldownModal === 'customers' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase text-slate-400 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className="py-2 px-2.5">Customer Party</th>
                      <th className="py-2 px-2">Phone</th>
                      <th className="py-2 px-2">City / Address</th>
                      <th className="py-2 px-2.5 text-right font-black">Receivable Due</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {(customers || []).filter(c => (c.name || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase()) || (c.phone || '').includes(bsDrilldownSearch)).map((c, idx) => {
                      const bal = Math.max(0, Number(c.balance !== undefined ? c.balance : c.openingBalance || 0));
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">{c.name}</td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono">{c.phone || '—'}</td>
                          <td className="py-2.5 px-2 text-slate-500">{c.city || c.address || 'Local Mandi'}</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">Rs. {bal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 text-xs font-black">
                      <td colSpan={3} className="py-2.5 px-2.5 uppercase">Total Pending Customer Receivables</td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-amber-600">Rs. {totalCustomerReceivables.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* 3. Supplier Payables Details */}
              {bsActiveDrilldownModal === 'suppliers' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase text-slate-400 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className="py-2 px-2.5">Supplier Firm</th>
                      <th className="py-2 px-2">Phone</th>
                      <th className="py-2 px-2">Supplied Goods</th>
                      <th className="py-2 px-2.5 text-right font-black">Payable Due</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {(suppliers || []).filter(s => (s.name || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase()) || (s.phone || '').includes(bsDrilldownSearch)).map((s, idx) => {
                      const bal = Math.max(0, Number(s.balance !== undefined ? s.balance : s.openingBalance || 0));
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono">{s.phone || '—'}</td>
                          <td className="py-2.5 px-2 text-slate-500">{(s.suppliedProducts || []).join(', ') || 'General Commodity'}</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">Rs. {bal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 text-xs font-black">
                      <td colSpan={3} className="py-2.5 px-2.5 uppercase">Total Due to Suppliers</td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-rose-600">Rs. {totalSupplierPayables.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* 4. Cash & Bank Accounts Details */}
              {bsActiveDrilldownModal === 'cashBank' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase text-slate-400 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className="py-2 px-2.5">Account / Channel</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Account #</th>
                      <th className="py-2 px-2.5 text-right font-black">Liquid Balance</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">Shop Cash Counter Drawer</td>
                      <td className="py-2.5 px-2 text-emerald-600 font-bold">Physical Cash</td>
                      <td className="py-2.5 px-2 text-slate-500 font-mono">DRAWER-01</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-600">Rs. {cashInHand.toLocaleString()}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">Habib Bank Limited (HBL)</td>
                      <td className="py-2.5 px-2 text-blue-600 font-bold">Corporate Current</td>
                      <td className="py-2.5 px-2 text-slate-500 font-mono">PK64HABB000123456789</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-600">Rs. 0</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">Meezan Islamic Banking</td>
                      <td className="py-2.5 px-2 text-emerald-600 font-bold">Islamic Business</td>
                      <td className="py-2.5 px-2 text-slate-500 font-mono">PK21MEZN000987654321</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-600">Rs. 0</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">JazzCash Merchant Account</td>
                      <td className="py-2.5 px-2 text-rose-600 font-bold">Mobile Wallet</td>
                      <td className="py-2.5 px-2 text-slate-500 font-mono">0300-1234567</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-600">Rs. 0</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 text-xs font-black">
                      <td colSpan={3} className="py-2.5 px-2.5 uppercase">Total Liquid Cash & Bank Funds</td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-emerald-600">Rs. {cashInHand.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="pt-2 text-right border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setBsActiveDrilldownModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RECORD OPERATING EXPENSE MODAL */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddExpenseModal(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className={`rounded-3xl max-w-md w-full p-6 space-y-4 card-shadow border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <DollarSign className="w-5 h-5 text-slate-700" />
                <span>Record Operating Expense</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Expense Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="Labour & Loading (Palla)">Labour & Loading (Palla / Mazdoori)</option>
                  <option value="Bardana / Bags">Bardana / Bags Procurement</option>
                  <option value="Freight & Transport">Freight & Truck Transport (Bilty)</option>
                  <option value="Electricity & Fuel">Electricity & Generator Diesel</option>
                  <option value="Tea & Refreshments">Tea & Customer Hospitality</option>
                  <option value="Shop Rent">Shop & Godown Rent</option>
                  <option value="General Misc">General Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Amount (Rs.)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  value={newExpense.desc}
                  onChange={(e) => setNewExpense({ ...newExpense, desc: e.target.value })}
                  placeholder="e.g. Loading and unloading mazdoori..."
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={newExpense.mode}
                  onChange={(e) => setNewExpense({ ...newExpense, mode: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-slate-800 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="Cash">Cash (Counter Drawer)</option>
                  <option value="Bank Transfer">Bank Transfer / Online</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className={`w-1/2 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
