import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Warehouse, DollarSign, PieChart, Building,
  FileSpreadsheet, Printer, Plus, Wheat, X, Trash2, Search, Filter,
  CheckCircle2, AlertTriangle, ArrowUpDown, Package, Eye,
  Calendar, Users, ShoppingCart, ChevronDown, ChevronUp, BarChart3, Percent, Layers
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

      {/* Report Module Switcher Bar */}
      <div className={`p-2.5 rounded-2xl border card-shadow flex items-center justify-between gap-3 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar">
          {[
            { key: 'Stock', label: 'Stock & Inventory', icon: Warehouse },
            { key: 'Sales', label: 'Sales & Revenue', icon: TrendingUp },
            { key: 'Expenses', label: 'Operating Expenses', icon: DollarSign },
            { key: 'ProfitLoss', label: 'Profit & Loss (P&L)', icon: PieChart },
            { key: 'BalanceSheet', label: 'Balance Sheet & Equity', icon: Building },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = reportType === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(`/reports?type=${tab.key}`)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-black'
                    : theme === 'dark'
                      ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-center">
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

          {/* Sub-View Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200 dark:border-slate-700">
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'dateWise', label: '1. Date-wise Sales' },
              { id: 'productWise', label: '2. Product-wise Sales' },
              { id: 'supplierWise', label: '3. Supplier-wise Sales' },
              { id: 'supplierProduct', label: '4. Supplier → Product Drill-down' },
              { id: 'analytics', label: '5. Top Rankings & Analytics' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSalesActiveSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                  salesActiveSubTab === tab.id
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
      {/* 4. PROFIT & LOSS STATEMENT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'ProfitLoss' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              onClick={() => navigate('/sales')}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
                }`}
              title="Click to view Sales"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Total Sales</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalSalesGross.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">From Customer Sales</div>
            </div>

            <div
              onClick={() => navigate('/purchases')}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-blue-500/30' : 'bg-gradient-to-br from-blue-50/40 to-white border-blue-200/60'
                }`}
              title="Click to view Purchases"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Total Purchases</div>
              <div className="text-2xl font-black mt-1.5 text-blue-600 dark:text-blue-400 font-mono">Rs. {cogs.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Stock Purchase Cost</div>
            </div>

            <div
              onClick={() => setShowAddExpenseModal(true)}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60'
                }`}
              title="Click to view or add Expenses"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Shop Expenses</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">Rs. {totalExpensesAmount.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Labour, Bills & Rent</div>
            </div>

            <div
              className={`p-5 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/50' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300'
                }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">4. Net Profit</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">
                Rs. {netOperatingProfit.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">Sales − Purchases − Expenses</div>
            </div>
          </div>

          {/* Income Statement Table */}
          <div className={`border rounded-2xl p-6 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Profit & Loss Breakdown</span>
            </h3>

            <div className="space-y-3 text-xs font-bold">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block text-sm">1. Total Sales</span>
                  <span className="text-[11px] text-slate-500 font-medium">Money earned from selling goods to customers</span>
                </div>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">Rs. {totalSalesGross.toLocaleString()}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-slate-900/60 border border-blue-200/60 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block text-sm">2. Minus: Purchases</span>
                  <span className="text-[11px] text-slate-500 font-medium">Money spent on buying stock from suppliers</span>
                </div>
                <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">- Rs. {cogs.toLocaleString()}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-slate-900/60 border border-rose-200/60 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block text-sm">3. Minus: Shop Expenses</span>
                  <span className="text-[11px] text-slate-500 font-medium">Labour, loading, rent, bills & bags</span>
                </div>
                <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">- Rs. {totalExpensesAmount.toLocaleString()}</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 flex items-center justify-between font-bold text-base text-slate-900 dark:text-white shadow-2xs">
                <div>
                  <span className="block text-lg text-emerald-800 dark:text-emerald-300">Net Profit</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Money left after all costs are removed</span>
                </div>
                <span className="text-2xl font-mono text-emerald-700 dark:text-emerald-300 font-black">Rs. {netOperatingProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. BALANCE SHEET */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'BalanceSheet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => navigate('/inventory')}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200/60'
                }`}
              title="Click to view Inventory"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Total Business Assets</div>
              <div className="text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalAssets.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Cash + Pending Dues + Stock Value</div>
            </div>

            <div
              onClick={() => navigate('/suppliers')}
              className={`p-5 rounded-2xl border card-shadow card-hover transition-all cursor-pointer active:scale-98 ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200/60'
                }`}
              title="Click to view Supplier Payables"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Total Payables</div>
              <div className="text-2xl font-black mt-1.5 text-rose-600 dark:text-rose-400 font-mono">Rs. {totalLiabilities.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Amount you owe to suppliers</div>
            </div>

            <div
              className={`p-5 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-slate-50/50 to-white border-slate-200'
                }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Net Business Value</div>
              <div className="text-2xl font-black mt-1.5 text-slate-900 dark:text-white font-mono">Rs. {totalEquity.toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Assets minus what you owe</div>
            </div>
          </div>

          {/* Two Column Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS COLUMN */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>What You Own (Assets)</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Cash in Hand:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {cashInHand.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Pending from Customers:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {totalCustomerReceivables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Stock in Warehouse:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {totalStockValuation.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                  <span>TOTAL ASSETS:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">Rs. {totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* LIABILITIES & EQUITY COLUMN */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-rose-600" />
                <span>What You Owe & Net Worth</span>
              </h3>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Due to Suppliers:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">Rs. {totalSupplierPayables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Net Business Worth:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {totalEquity.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t-2 border-slate-900 dark:border-white flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                  <span>TOTAL LIABILITIES & VALUE:</span>
                  <span className="font-mono">Rs. {(totalLiabilities + totalEquity).toLocaleString()}</span>
                </div>
              </div>
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
