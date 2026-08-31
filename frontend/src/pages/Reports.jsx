import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Warehouse, DollarSign, PieChart, Building,
  FileSpreadsheet, Printer, Plus, Wheat, X, Trash2, Search, Filter,
  CheckCircle2, AlertTriangle, ArrowUpDown, Package, Eye,
  Calendar, Users, ShoppingCart, ChevronDown, ChevronUp, BarChart3, Percent, Layers,
  RefreshCw, ArrowUpRight, ArrowDownRight, Wallet, Banknote, ChevronRight
} from 'lucide-react';
import { useERP, computeCustomerKhataBalance, computeSupplierKhataBalance, computeSaleFinancials, computePurchaseFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { PrintHeader } from '../components/PrintHeader';
import { PrintFooter } from '../components/PrintFooter';

export const Reports = () => {
  const {
    sales = [],
    purchases = [],
    products = [],
    customers = [],
    suppliers = [],
    categories = [],
    paymentLogs = [],
    saleReturns = [],
    purchaseReturns = [],
    expenses = []
  } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const { shop, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Report Type from URL parameter (default: Stock)
  const reportType = searchParams.get('type') || 'Stock';

  // Interactive filters for stock
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All'); // 'All' | 'LowStock' | 'InStock' | 'OutOfStock'
  const [stockUnitFilter, setStockUnitFilter] = useState('All');
  const [sortBy, setSortBy] = useState('valueDesc'); // 'valueDesc' | 'valueAsc' | 'qtyDesc' | 'qtyAsc' | 'nameAsc' | 'recent'
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(25);

  const handleResetStockFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setStockStatusFilter('All');
    setStockUnitFilter('All');
    setSortBy('valueDesc');
    setStockPage(1);
  };

  // Operating Expenses Filters & Pagination
  const [expDateFilter, setExpDateFilter] = useState('All'); // 'All' | 'Today' | 'This Week' | 'This Month' | 'Last Month' | 'This Quarter' | 'This FY' | 'Custom'
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expCategoryFilter, setExpCategoryFilter] = useState('All');
  const [expPaymentFilter, setExpPaymentFilter] = useState('All');
  const [expSearch, setExpSearch] = useState('');
  const [expPage, setExpPage] = useState(1);
  const [expPageSize, setExpPageSize] = useState(25);

  const handleResetExpFilters = () => {
    setExpDateFilter('All');
    setExpStartDate('');
    setExpEndDate('');
    setExpCategoryFilter('All');
    setExpPaymentFilter('All');
    setExpSearch('');
    setExpPage(1);
  };

  // Multi-dimensional Sales Report Filters
  const [salesDateFilter, setSalesDateFilter] = useState('All'); // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [salesProductFilter, setSalesProductFilter] = useState('All');
  const [salesSupplierFilter, setSalesSupplierFilter] = useState('All');
  const [salesCustomerFilter, setSalesCustomerFilter] = useState('All');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('All'); // 'All' | 'Cash' | 'Credit' | 'Partial'
  const [salesActiveSubTab, setSalesActiveSubTab] = useState('invoices'); // 'invoices' | 'productWise' | 'customerWise' | 'dateWise' | 'supplierWise'
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
  const [plActiveSubTab, setPlActiveSubTab] = useState('statement'); // 'statement' | 'productWise' | 'categoryWise'
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

  // Balance Sheet Date Filter States
  const [bsDateFilter, setBsDateFilter] = useState('All Time'); // 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'All Time' | 'Custom'
  const [bsCustomDate, setBsCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
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
    setBsDateFilter('All Time');
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

  const allUnits = useMemo(() => {
    const set = new Set((products || []).map(p => (p.unit || p.baseUnit || 'KG').trim()));
    return ['All', ...Array.from(set)];
  }, [products]);

  const totalStockUnits = useMemo(() => processedStock.reduce((sum, p) => sum + p.qty, 0), [processedStock]);

  const filteredStock = useMemo(() => {
    return processedStock.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesUnit = stockUnitFilter === 'All' || p.unit === stockUnitFilter;

      let matchesStatus = true;
      if (stockStatusFilter === 'LowStock') matchesStatus = p.status === 'Low Stock';
      else if (stockStatusFilter === 'InStock') matchesStatus = p.status === 'In Stock';
      else if (stockStatusFilter === 'OutOfStock') matchesStatus = p.status === 'Out of Stock';

      return matchesSearch && matchesCat && matchesStatus && matchesUnit;
    }).sort((a, b) => {
      if (sortBy === 'valueDesc') return b.stockVal - a.stockVal;
      if (sortBy === 'valueAsc') return a.stockVal - b.stockVal;
      if (sortBy === 'qtyDesc') return b.qty - a.qty;
      if (sortBy === 'qtyAsc') return a.qty - b.qty;
      if (sortBy === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'recent') return b.id - a.id;
      return 0;
    });
  }, [processedStock, searchTerm, categoryFilter, stockStatusFilter, stockUnitFilter, sortBy]);

  const paginatedStock = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredStock.slice(start, start + stockPageSize);
  }, [filteredStock, stockPage, stockPageSize]);

  const totalStockPages = useMemo(() => Math.max(1, Math.ceil(filteredStock.length / stockPageSize)), [filteredStock, stockPageSize]);

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

  const allProductsList = useMemo(() => {
    const set = new Set((products || []).map(p => p.name).filter(Boolean));
    (sales || []).forEach(s => {
      if (s.productName) set.add(s.productName);
      if (Array.isArray(s.cart)) s.cart.forEach(it => it.name && set.add(it.name));
      if (Array.isArray(s.items)) s.items.forEach(it => it.name && set.add(it.name));
    });
    return ['All', ...Array.from(set).sort()];
  }, [products, sales]);

  const allCustomersList = useMemo(() => {
    const set = new Set((customers || []).map(c => c.name).filter(Boolean));
    (sales || []).forEach(s => {
      const name = s.partyName || s.customerName;
      if (name) set.add(name);
    });
    return ['All', ...Array.from(set).sort()];
  }, [customers, sales]);

  const allSuppliersList = useMemo(() => {
    const set = new Set((suppliers || []).map(s => s.name).filter(Boolean));
    (purchases || []).forEach(p => {
      const name = p.supplierName || p.supplier;
      if (name) set.add(name);
    });
    return ['All', ...Array.from(set).sort()];
  }, [suppliers, purchases]);

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

  // 4. CUSTOMER-WISE SALES BREAKDOWN
  const customerWiseSalesData = useMemo(() => {
    const map = {};
    filteredSalesList.forEach(s => {
      const cName = s.partyName || s.customerName || 'Walk-in Customer';
      if (!map[cName]) {
        map[cName] = {
          name: cName,
          customerId: s.customerId || null,
          invoiceCount: 0,
          grossSales: 0,
          discount: 0,
          returnAmt: 0,
          netSales: 0,
          cashPaid: 0,
          khataDue: 0,
          totalQty: 0
        };
      }
      map[cName].invoiceCount += 1;
      map[cName].grossSales += s.grossAmt;
      map[cName].discount += s.discount;
      map[cName].returnAmt += Number(s.returnAmount || 0);
      map[cName].netSales += s.netAmt;
      map[cName].cashPaid += s.paidAmt;
      map[cName].khataDue += s.dueAmt;

      const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ qty: s.qty || 1 }]);
      map[cName].totalQty += cart.reduce((sum, it) => sum + Number(it.qty || it.enteredQty || 1), 0);
    });

    return Object.values(map).map(c => ({
      ...c,
      pctContribution: filteredGrossSales > 0 ? ((c.grossSales / filteredGrossSales) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.netSales - a.netSales);
  }, [filteredSalesList, filteredGrossSales]);

  const filteredSalesReturnsVal = useMemo(() => {
    return filteredSalesList.reduce((sum, s) => sum + Number(s.returnAmount || s.returnAmt || 0), 0);
  }, [filteredSalesList]);

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

  // Detailed Operating Expenses Filtering, Search & Period Breakdown
  const processedExpenses = useMemo(() => {
    return expenses.map(e => {
      let eDateObj = new Date();
      if (e.date && e.date.includes('/')) {
        const parts = e.date.split('/');
        if (parts.length === 3) eDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else if (e.date) {
        eDateObj = new Date(e.date);
      }

      return {
        ...e,
        amount: Number(e.amount || 0),
        dateObj: eDateObj,
        status: e.status || 'Paid / Cleared'
      };
    });
  }, [expenses]);

  const thisMonthExpenses = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    return processedExpenses.filter(e => e.dateObj.getMonth() === currentMonth && e.dateObj.getFullYear() === currentYear).reduce((sum, e) => sum + e.amount, 0);
  }, [processedExpenses]);

  const thisFYExpenses = useMemo(() => {
    return processedExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [processedExpenses]);

  const filteredExpensesList = useMemo(() => {
    return processedExpenses.filter(e => {
      // 1. Search
      const matchesSearch = (e.ref || '').toLowerCase().includes(expSearch.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(expSearch.toLowerCase()) ||
        (e.desc || '').toLowerCase().includes(expSearch.toLowerCase()) ||
        (e.mode || '').toLowerCase().includes(expSearch.toLowerCase());

      // 2. Category
      const matchesCategory = expCategoryFilter === 'All' || e.category === expCategoryFilter;

      // 3. Payment Mode
      const matchesPayment = expPaymentFilter === 'All' || e.mode === expPaymentFilter;

      // 4. Date Range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eDate = new Date(e.dateObj);
      eDate.setHours(0, 0, 0, 0);

      let matchesDate = true;
      if (expDateFilter === 'Today') {
        matchesDate = eDate.getTime() === today.getTime();
      } else if (expDateFilter === 'This Week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        matchesDate = eDate >= startOfWeek;
      } else if (expDateFilter === 'This Month') {
        matchesDate = eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
      } else if (expDateFilter === 'Last Month') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        matchesDate = eDate.getMonth() === lastMonth.getMonth() && eDate.getFullYear() === lastMonth.getFullYear();
      } else if (expDateFilter === 'This Quarter') {
        const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
        matchesDate = eDate.getMonth() >= qStartMonth && eDate.getFullYear() === today.getFullYear();
      } else if (expDateFilter === 'Custom' && expStartDate && expEndDate) {
        const start = new Date(expStartDate);
        const end = new Date(expEndDate);
        matchesDate = eDate >= start && eDate <= end;
      }

      return matchesSearch && matchesCategory && matchesPayment && matchesDate;
    });
  }, [processedExpenses, expSearch, expCategoryFilter, expPaymentFilter, expDateFilter, expStartDate, expEndDate]);

  const filteredExpensesTotal = useMemo(() => filteredExpensesList.reduce((sum, e) => sum + e.amount, 0), [filteredExpensesList]);

  const expenseCashTotal = useMemo(() => {
    return filteredExpensesList.filter(e => e.mode === 'Cash').reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpensesList]);

  const expenseBankTotal = useMemo(() => {
    return filteredExpensesList.filter(e => e.mode !== 'Cash').reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpensesList]);

  const paginatedExpenses = useMemo(() => {
    const start = (expPage - 1) * expPageSize;
    return filteredExpensesList.slice(start, start + expPageSize);
  }, [filteredExpensesList, expPage, expPageSize]);

  const totalExpensePages = useMemo(() => Math.max(1, Math.ceil(filteredExpensesList.length / expPageSize)), [filteredExpensesList, expPageSize]);

  const hasActiveExpFilters = expDateFilter !== 'All' || expCategoryFilter !== 'All' || expPaymentFilter !== 'All' || expSearch || expStartDate || expEndDate;

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

  // Combined Customer Receivables List (Regular + Walk-in Customers) for Balance Sheet
  const allCustomerReceivablesList = useMemo(() => {
    const list = [];
    const processedCustNames = new Set();
    const processedCustIds = new Set();

    // 1. Regular / Registered Customers
    (customers || []).forEach(cust => {
      processedCustIds.add(String(cust.id));
      if (cust.name) processedCustNames.add(cust.name.trim().toLowerCase());

      const fin = computeCustomerKhataBalance(cust, sales, paymentLogs, saleReturns);
      if (fin.balance > 0) {
        const isWalkin = (cust.customerType || '').toLowerCase().includes('walk-in');
        list.push({
          id: cust.id,
          name: cust.name,
          phone: cust.phone || '',
          city: cust.city || cust.address || 'Local Mandi',
          type: isWalkin ? 'Walk-in Customer' : 'Regular Party',
          balance: fin.balance
        });
      }
    });

    // 2. Walk-in / Counter Sales not in customers table
    const walkinSalesMap = new Map();
    (sales || []).forEach(s => {
      const sCustId = s.customerId ? String(s.customerId) : null;
      const sName = (s.partyName || s.customerName || '').trim().toLowerCase();
      const isRegisteredCust = (sCustId && processedCustIds.has(sCustId)) ||
        (sName && processedCustNames.has(sName));

      if (!isRegisteredCust) {
        const rawName = (s.partyName || s.customerName || 'Walk-in Customer').trim();
        const key = rawName.toLowerCase();
        if (!walkinSalesMap.has(key)) {
          walkinSalesMap.set(key, { name: rawName, sales: [] });
        }
        walkinSalesMap.get(key).sales.push(s);
      }
    });

    walkinSalesMap.forEach((val, key) => {
      const fin = computeCustomerKhataBalance({ id: `walkin-${key}`, name: val.name }, val.sales, paymentLogs, saleReturns);
      if (fin.balance > 0) {
        list.push({
          id: `walkin-${key}`,
          name: val.name,
          phone: '',
          city: 'Counter Sales',
          type: 'Walk-in Customer',
          balance: fin.balance
        });
      }
    });

    return list.sort((a, b) => b.balance - a.balance);
  }, [customers, sales, saleReturns, paymentLogs]);

  const totalCustomerReceivables = useMemo(() => {
    return allCustomerReceivablesList.reduce((sum, c) => sum + c.balance, 0);
  }, [allCustomerReceivablesList]);

  const regularCustomerReceivables = useMemo(() => {
    return allCustomerReceivablesList.filter(c => !c.type.includes('Walk-in')).reduce((sum, c) => sum + c.balance, 0);
  }, [allCustomerReceivablesList]);

  const walkinCustomerReceivables = useMemo(() => {
    return allCustomerReceivablesList.filter(c => c.type.includes('Walk-in')).reduce((sum, c) => sum + c.balance, 0);
  }, [allCustomerReceivablesList]);

  const totalSupplierPayables = useMemo(() => {
    return (suppliers || []).reduce((sum, s) => {
      const fin = computeSupplierKhataBalance(s, purchases, paymentLogs, purchaseReturns);
      return sum + fin.balance;
    }, 0);
  }, [suppliers, purchases, purchaseReturns, paymentLogs]);

  // Dynamic Liquid Funds (Cash, Bank, Mobile Wallets) Calculation
  const {
    cashInHand,
    bankBalance,
    walletBalance,
    totalLiquidFunds,
    liquidTransactionsList
  } = useMemo(() => {
    let cash = 0;
    let bank = 0;
    let wallet = 0;
    const txList = [];

    // Helper to categorize channel
    const getChannel = (modeStr) => {
      const m = String(modeStr || 'Cash').toLowerCase();
      if (m.includes('jazz') || m.includes('easy') || m.includes('wallet') || m.includes('upaisa')) return 'wallet';
      if (m.includes('bank') || m.includes('card') || m.includes('online') || m.includes('cheque') || m.includes('raast') || m.includes('transfer')) return 'bank';
      return 'cash';
    };

    // 1. Sales Inflows
    (sales || []).forEach(s => {
      const grossAmt = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : (s.grandtotal !== undefined ? s.grandtotal : 0)));
      const pMode = s.paymentMode || s.paymentMethod || 'Cash';
      const isFullPaidMode = pMode === 'Cash' || pMode === 'Bank' || pMode === 'Card' || pMode === 'Bank Transfer' || pMode === 'JazzCash' || pMode === 'Easypaisa';
      const paid = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount !== undefined ? s.paidamount : (s.status === 'Paid' || s.paymentStatus === 'Paid' || isFullPaidMode ? grossAmt : 0)));

      if (paid > 0) {
        const chan = getChannel(pMode);
        if (chan === 'wallet') wallet += paid;
        else if (chan === 'bank') bank += paid;
        else cash += paid;

        txList.push({
          date: s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : 'Today'),
          source: `Sale Receipt (#${s.invoiceNo || s.orderId || s.id || 'N/A'})`,
          party: s.customerName || s.partyName || 'Counter Sale',
          channel: chan === 'wallet' ? 'Mobile Wallet' : chan === 'bank' ? 'Bank Account' : 'Cash Drawer',
          type: 'Inflow',
          amount: paid
        });
      }
    });

    // 2. Customer Ledger Payments Inflow
    (paymentLogs || []).filter(p => p.partyType === 'Customer').forEach(p => {
      const amt = Number(p.amount || 0);
      if (amt > 0) {
        const chan = getChannel(p.mode || p.paymentMode);
        if (chan === 'wallet') wallet += amt;
        else if (chan === 'bank') bank += amt;
        else cash += amt;

        txList.push({
          date: p.date || 'Today',
          source: `Customer Khata Settlement (${p.ref || 'Receipt'})`,
          party: p.partyName || 'Customer',
          channel: chan === 'wallet' ? 'Mobile Wallet' : chan === 'bank' ? 'Bank Account' : 'Cash Drawer',
          type: 'Inflow',
          amount: amt
        });
      }
    });

    // 3. Purchase Returns Inflow (Refunds received)
    (purchaseReturns || []).forEach(r => {
      const refAmt = Number(r.refundAmount || 0);
      if (refAmt > 0) {
        const chan = getChannel(r.refundMode);
        if (chan === 'wallet') wallet += refAmt;
        else if (chan === 'bank') bank += refAmt;
        else cash += refAmt;

        txList.push({
          date: r.date || 'Today',
          source: `Purchase Return Refund (#${r.returnNo || r.id || 'N/A'})`,
          party: r.supplierName || 'Supplier',
          channel: chan === 'wallet' ? 'Mobile Wallet' : chan === 'bank' ? 'Bank Account' : 'Cash Drawer',
          type: 'Inflow',
          amount: refAmt
        });
      }
    });

    // 4. Purchases Outflows
    (purchases || []).forEach(p => {
      const grossAmt = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : 0));
      const paid = Number(p.paidAmount !== undefined ? p.paidAmount : (p.status === 'Paid' ? grossAmt : 0));
      if (paid > 0) {
        const chan = getChannel(p.paymentMode || p.paymentMethod);
        if (chan === 'wallet') wallet -= paid;
        else if (chan === 'bank') bank -= paid;
        else cash -= paid;

        txList.push({
          date: p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'Today'),
          source: `Purchase Voucher (#${p.invoiceNo || p.id || 'N/A'})`,
          party: p.supplierName || p.supplier || 'Mandi Supplier',
          channel: chan === 'wallet' ? 'Mobile Wallet' : chan === 'bank' ? 'Bank Account' : 'Cash Drawer',
          type: 'Outflow',
          amount: paid
        });
      }
    });

    // 5. Supplier Ledger Payments Outflow
    (paymentLogs || []).filter(p => p.partyType === 'Supplier').forEach(p => {
      const amt = Number(p.amount || 0);
      if (amt > 0) {
        const chan = getChannel(p.mode || p.paymentMode);
        if (chan === 'wallet') wallet -= amt;
        else if (chan === 'bank') bank -= amt;
        else cash -= amt;

        txList.push({
          date: p.date || 'Today',
          source: `Supplier Payment Settlement (${p.ref || 'Voucher'})`,
          party: p.partyName || 'Supplier',
          channel: chan === 'wallet' ? 'Mobile Wallet' : chan === 'bank' ? 'Bank Account' : 'Cash Drawer',
          type: 'Outflow',
          amount: amt
        });
      }
    });

    // 6. Expenses Outflows
    (expenses || []).forEach(e => {
      const amt = Number(e.amount || 0);
      if (amt > 0) {
        const chan = getChannel(e.mode || e.paymentMode || e.paymentMethod);
        if (chan === 'wallet') wallet -= amt;
        else if (chan === 'bank') bank -= amt;
        else cash -= amt;

        txList.push({
          date: e.date || 'Today',
          source: `Expense: ${e.category || 'Shop'} (${e.desc || ''})`,
          party: e.payee || 'Expense Payee',
          channel: chan === 'wallet' ? 'Mobile Wallet' : chan === 'bank' ? 'Bank Account' : 'Cash Drawer',
          type: 'Outflow',
          amount: amt
        });
      }
    });

    // 7. Sale Returns Outflows (Refunds given to customers)
    (saleReturns || []).forEach(r => {
      const refAmt = Number(r.refundAmount || 0);
      if (refAmt > 0) {
        const chan = getChannel(r.refundMode);
        if (chan === 'wallet') wallet -= refAmt;
        else if (chan === 'bank') bank -= refAmt;
        else cash -= refAmt;

        txList.push({
          date: r.date || 'Today',
          source: `Sale Return Refund (${r.refundMode || 'Cash'})`,
          party: r.customerName || 'Customer',
          channel: chan === 'wallet' ? 'Mobile Wallet' : chan === 'bank' ? 'Bank Account' : 'Cash Drawer',
          type: 'Outflow',
          amount: refAmt
        });
      }
    });

    return {
      cashInHand: Math.max(0, cash),
      bankBalance: Math.max(0, bank),
      walletBalance: Math.max(0, wallet),
      totalLiquidFunds: Math.max(0, cash) + Math.max(0, bank) + Math.max(0, wallet),
      liquidTransactionsList: txList
    };
  }, [sales, purchases, paymentLogs, expenses, saleReturns, purchaseReturns]);

  const totalAssets = useMemo(() => totalCustomerReceivables + totalStockValuation, [totalCustomerReceivables, totalStockValuation]);
  const totalLiabilities = useMemo(() => totalSupplierPayables, [totalSupplierPayables]);
  const totalEquity = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Granular Balance Sheet Breakdown Objects
  const bsCashBreakdown = useMemo(() => {
    return {
      cashInHand: cashInHand,
      bankBalance: bankBalance,
      walletBalance: walletBalance,
      total: totalLiquidFunds
    };
  }, [cashInHand, bankBalance, walletBalance, totalLiquidFunds]);

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

  const plTotalSalesIncome = useMemo(() => {
    return filteredPlJournal.filter(t => t.type === 'Sale').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [filteredPlJournal]);

  const plTotalReturns = useMemo(() => {
    return filteredPlJournal.filter(t => t.type === 'Return' || t.type === 'Sale Return').reduce((sum, t) => sum + Math.abs(t.amount), 0);
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
  // =========================================================================
  // EXPORT CSV HANDLER (Enterprise Aligned, Structured & Excel-Compatible)
  // =========================================================================
  const exportReportCSV = () => {
    // Helper to safely escape individual cell content
    const esc = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""').trim();
      return `"${str}"`;
    };

    // Helper to format numeric values cleanly
    const num = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    // Helper to build rows padded to exact column count
    const makeRow = (cells, totalCols = 8) => {
      const padded = [...cells];
      while (padded.length < totalCols) {
        padded.push('');
      }
      return padded.slice(0, totalCols).map(esc).join(',') + '\r\n';
    };

    // Helper to build section headers
    const makeSectionHeader = (title, totalCols = 8) => {
      return (
        makeRow([''], totalCols) +
        makeRow([`================= ${title.toUpperCase()} =================`], totalCols) +
        makeRow([''], totalCols)
      );
    };

    let csvContent = '\uFEFF'; // UTF-8 Byte Order Mark for Excel
    const sName = shop?.name || 'Shaheen Traders Ghalla Mandi';
    const sMandi = shop?.mandiName || 'Ghalla Mandi Multan';
    const sPhone = shop?.businessPhone || shop?.phone || '';
    const nowStr = new Date().toLocaleString();

    if (reportType === 'Stock') {
      const COLS = 8;
      // Header Info
      csvContent += makeRow([sName], COLS);
      csvContent += makeRow([sMandi + (sPhone ? ` • Contact: ${sPhone}` : '')], COLS);
      csvContent += makeRow(['STOCK & INVENTORY VALUATION REPORT'], COLS);
      csvContent += makeRow([`Generated On: ${nowStr} | User: ${user?.fullName || 'Admin'}`], COLS);
      csvContent += makeRow([''], COLS);

      // KPI Summary Block
      csvContent += makeRow(['--- EXECUTIVE STOCK VALUATION SUMMARY ---'], COLS);
      csvContent += makeRow(['Total Stock Value (Rs.)', num(totalStockValuation), 'Total Products Registered', filteredStock.length, 'In-Stock Items', inStockCount, 'Low Stock Alert', lowStockCount], COLS);
      csvContent += makeRow(['Total Physical Units', num(totalStockQty), 'Out of Stock Items', outOfStockCount, 'Avg Stock Value / Product', num(filteredStock.length ? totalStockValuation / filteredStock.length : 0), '', ''], COLS);

      // Section 1: Detailed Inventory Table
      csvContent += makeSectionHeader('1. DETAILED INVENTORY REGISTER & VALUATION', COLS);
      csvContent += makeRow(['Product Name', 'Category', 'Available Stock', 'Unit', 'Purchase Rate (Rs.)', 'Selling Rate (Rs.)', 'Stock Valuation (Rs.)', 'Stock Status'], COLS);

      filteredStock.forEach(p => {
        csvContent += makeRow([
          p.name,
          p.category || 'General',
          num(p.qty),
          p.unit || 'KG',
          num(p.purchaseRate),
          num(p.sellingRate),
          num(p.stockVal),
          p.status
        ], COLS);
      });

      // Stock Total Row
      csvContent += makeRow(['TOTAL STOCK INVENTORY', '', num(totalStockQty), 'UNITS', '', '', num(totalStockValuation), 'ACTIVE INVENTORY'], COLS);

      // Section 2: Category Breakdown
      csvContent += makeSectionHeader('2. CATEGORY-WISE STOCK VALUATION BREAKDOWN', COLS);
      csvContent += makeRow(['Category Name', 'Total Items', 'Total Stock Qty', 'Valuation (Rs.)', 'Share of Stock (%)', '', '', ''], COLS);

      const catMap = {};
      filteredStock.forEach(p => {
        const c = p.category || 'General';
        if (!catMap[c]) catMap[c] = { items: 0, qty: 0, val: 0 };
        catMap[c].items += 1;
        catMap[c].qty += Number(p.qty || 0);
        catMap[c].val += Number(p.stockVal || 0);
      });

      Object.entries(catMap).forEach(([cat, d]) => {
        const pct = totalStockValuation > 0 ? ((d.val / totalStockValuation) * 100).toFixed(1) : '0.0';
        csvContent += makeRow([cat, d.items, num(d.qty), num(d.val), `${pct}%`, '', '', ''], COLS);
      });

    } else if (reportType === 'Sales') {
      const COLS = 9;
      // Header Info
      csvContent += makeRow([sName], COLS);
      csvContent += makeRow([sMandi + (sPhone ? ` • Contact: ${sPhone}` : '')], COLS);
      csvContent += makeRow(['SALES & REVENUE TURNOVER REPORT'], COLS);
      csvContent += makeRow([`Generated On: ${nowStr} | Active Date Filter: ${salesDateFilter}`], COLS);
      csvContent += makeRow([''], COLS);

      // KPI Summary Block
      csvContent += makeRow(['--- EXECUTIVE SALES & REVENUE SUMMARY ---'], COLS);
      csvContent += makeRow(['Gross Sales (Rs.)', num(filteredGrossSales), 'Net Sales (Rs.)', num(filteredNetSales), 'Cash Collected (Rs.)', num(filteredCashSales), 'Khata Receivables (Rs.)', num(filteredCreditSales), ''], COLS);
      csvContent += makeRow(['Total Invoices Count', filteredInvoicesCount, 'Total Qty Sold', num(filteredTotalQty), 'Total Trade Discount', num(filteredDiscount), 'Avg Order Value (Rs.)', num(filteredAvgInvoiceValue), ''], COLS);

      // Section 1: Date-Wise Sales Breakdown
      csvContent += makeSectionHeader('1. DATE-WISE SALES & CASH/KHATA SETTLEMENT', COLS);
      csvContent += makeRow(['Date', 'Invoices Count', 'Products Sold Summary', 'Total Qty Sold', 'Gross Sales (Rs.)', 'Discount (Rs.)', 'Net Sales (Rs.)', 'Cash Received (Rs.)', 'Khata Due (Rs.)'], COLS);

      dateWiseSalesData.forEach(d => {
        csvContent += makeRow([
          d.date,
          d.invoiceCount,
          d.productsSummary,
          num(d.totalQty),
          num(d.grossSales),
          num(d.discount),
          num(d.netSales),
          num(d.cash),
          num(d.credit)
        ], COLS);
      });

      csvContent += makeRow(['TOTAL SALES SUMMARY', filteredInvoicesCount, 'ALL COMMODITIES', num(filteredTotalQty), num(filteredGrossSales), num(filteredDiscount), num(filteredNetSales), num(filteredCashSales), num(filteredCreditSales)], COLS);

      // Section 2: Product-Wise Sales Performance
      csvContent += makeSectionHeader('2. PRODUCT-WISE SALES & TURNOVER PERFORMANCE', COLS);
      csvContent += makeRow(['Product Name', 'Suppliers / Mandi Source', 'Qty Sold', 'Unit', 'Orders Count', 'Sales Revenue (Rs.)', 'Avg Selling Rate (Rs.)', 'Share of Total Sales (%)', 'Performance'], COLS);

      productWiseSalesData.forEach(s => {
        csvContent += makeRow([
          s.name,
          (s.suppliers || []).join('; ') || 'Direct Mandi',
          num(s.totalQty),
          s.unit || 'KG',
          s.orderCount,
          num(s.totalRevenue),
          num(s.avgRate),
          `${s.pctOfTotal}%`,
          Number(s.pctOfTotal) > 10 ? 'High Velocity' : 'Standard'
        ], COLS);
      });

      // Section 3: Supplier-Wise Sales Contribution
      csvContent += makeSectionHeader('3. SUPPLIER-WISE SALES CONTRIBUTION', COLS);
      csvContent += makeRow(['Supplier Name', 'Supplied Products Count', 'Total Qty Sold', 'Orders Count', 'Total Sales Generated (Rs.)', 'Revenue Share (%)', 'Avg Order Value (Rs.)', 'Settlement Status', ''], COLS);

      supplierWiseSalesData.forEach(sup => {
        const avg = sup.orderCount > 0 ? (sup.totalSales / sup.orderCount) : 0;
        csvContent += makeRow([
          sup.supplierName,
          sup.productsCount,
          num(sup.totalQty),
          sup.orderCount,
          num(sup.totalSales),
          `${sup.pctContribution}%`,
          num(avg),
          'Khata Settled',
          ''
        ], COLS);
      });

    } else if (reportType === 'ProfitLoss') {
      const COLS = 8;
      // Header Info
      csvContent += makeRow([sName], COLS);
      csvContent += makeRow([sMandi + (sPhone ? ` • Contact: ${sPhone}` : '')], COLS);
      csvContent += makeRow(['PROFIT & LOSS STATEMENT (P&L JOURNAL & AUDIT)'], COLS);
      csvContent += makeRow([`Generated On: ${nowStr} | Date Filter: ${plDateFilter}`], COLS);
      csvContent += makeRow([''], COLS);

      // KPI Summary Block
      csvContent += makeRow(['--- PROFIT & LOSS EXECUTIVE SUMMARY ---'], COLS);
      csvContent += makeRow(['Total Sales / Revenue (Inflow)', num(plTotalRevenue), 'Cost of Goods Sold (COGS Purchases)', num(plTotalCOGS), 'Gross Profit (Rs.)', `${num(plGrossProfit)} (${plGrossMargin}%)`, 'Operating Expenses', num(plTotalExpenses)], COLS);
      csvContent += makeRow(['NET OPERATING PROFIT / (LOSS)', `${num(plNetProfit)} (${plNetMargin}%)`, 'Total Cash Inflow', num(plTotalInflow), 'Total Cash Outflow', num(plTotalOutflow), 'Statement Status', plNetProfit >= 0 ? 'Profitable' : 'Loss'], COLS);

      // Section 1: Itemized Journal Ledger
      csvContent += makeSectionHeader('1. ITEMIZED TRANSACTION JOURNAL & RUNNING P&L LEDGER', COLS);
      csvContent += makeRow(['Date', 'Reference / Voucher', 'Particulars / Item', 'Category', 'Transaction Type', 'Quantity', 'Amount (Rs.)', 'Running Cumulative P&L (Rs.)'], COLS);

      filteredPlJournal.forEach(tx => {
        csvContent += makeRow([
          tx.dateStr,
          tx.ref,
          tx.product,
          tx.category || 'General',
          tx.type,
          tx.qty || '1',
          num(tx.amount),
          num(tx.runningPnL)
        ], COLS);
      });

      // Section 2: Product-Wise Profitability Breakdown
      csvContent += makeSectionHeader('2. PRODUCT-WISE PROFITABILITY & GROSS MARGINS', COLS);
      csvContent += makeRow(['Product Name', 'Category', 'Units Sold', 'Unit', 'Sales Revenue (Rs.)', 'COGS Purchase Cost (Rs.)', 'Gross Profit (Rs.)', 'Gross Margin (%)'], COLS);

      productWisePnLData.forEach(p => {
        csvContent += makeRow([
          p.name,
          p.category || 'General',
          num(p.unitsSold),
          p.unit || 'KG',
          num(p.salesRevenue),
          num(p.cogs),
          num(p.grossProfit),
          `${p.margin}%`
        ], COLS);
      });

      // Section 3: Category-Wise P&L Breakdown
      csvContent += makeSectionHeader('3. CATEGORY-WISE PROFIT & LOSS BREAKDOWN', COLS);
      csvContent += makeRow(['Category Name', 'Sales Revenue (Rs.)', 'Purchases / COGS (Rs.)', 'Operating Expenses (Rs.)', 'Net Profit (Rs.)', 'Net Margin (%)', 'Status', ''], COLS);

      categoryWisePnLData.forEach(c => {
        csvContent += makeRow([
          c.category,
          num(c.sales),
          num(c.purchases),
          num(c.expenses),
          num(c.netProfit),
          `${c.margin}%`,
          c.netProfit >= 0 ? 'Profitable' : 'Loss',
          ''
        ], COLS);
      });

    } else if (reportType === 'BalanceSheet') {
      const COLS = 6;
      // Header Info
      csvContent += makeRow([sName], COLS);
      csvContent += makeRow([sMandi + (sPhone ? ` • Contact: ${sPhone}` : '')], COLS);
      csvContent += makeRow(['BALANCE SHEET STATEMENT & FINANCIAL POSITION'], COLS);
      csvContent += makeRow([`As of Date / Period: ${bsDateFilter === 'Custom' ? bsCustomDate : bsDateFilter} | Generated: ${nowStr}`], COLS);
      csvContent += makeRow([''], COLS);

      // Executive Summary
      csvContent += makeRow(['--- FINANCIAL POSITION STATEMENT ---'], COLS);
      csvContent += makeRow(['TOTAL ASSETS (Rs.)', num(totalAssets), 'TOTAL LIABILITIES (Rs.)', num(totalLiabilities), 'NET BUSINESS WORTH / EQUITY', num(totalEquity)], COLS);
      csvContent += makeRow(['Asset to Liability Ratio', totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(2) : 'Debt-Free', 'Solvency Status', totalEquity >= 0 ? 'Healthy & Solvent' : 'Deficit', '', ''], COLS);

      // Section 1: ASSETS
      csvContent += makeSectionHeader('1. ASSETS (WHAT THE BUSINESS OWNS)', COLS);
      csvContent += makeRow(['Asset Classification', 'Category / Subhead', 'Line Item / Description', 'Liquidity Details', 'Valuation (Rs.)', 'Subtotal (Rs.)'], COLS);
      csvContent += makeRow(['Current Assets', 'Cash & Bank Balances', 'Cash in Hand / Register', 'Immediate Liquidity', num(cashInHand), ''], COLS);
      csvContent += makeRow(['Current Assets', 'Receivables', 'Customer Khata Receivables', 'Outstanding Market Debtors', num(totalCustomerReceivables), ''], COLS);
      csvContent += makeRow(['Current Assets', 'Inventory', 'Warehouse Stock Valuation', 'Physical Grain Inventory', num(totalStockValuation), ''], COLS);
      csvContent += makeRow(['TOTAL CURRENT ASSETS', '', '', '', '', num(totalAssets)], COLS);

      // Section 2: LIABILITIES
      csvContent += makeSectionHeader('2. LIABILITIES (WHAT THE BUSINESS OWES)', COLS);
      csvContent += makeRow(['Liability Classification', 'Category / Subhead', 'Line Item / Description', 'Settlement Terms', 'Outstanding (Rs.)', 'Subtotal (Rs.)'], COLS);
      csvContent += makeRow(['Current Liabilities', 'Payables', 'Supplier Khata Payables', 'Outstanding Mandi Suppliers', num(totalSupplierPayables), ''], COLS);
      csvContent += makeRow(['Current Liabilities', 'Accrued Expenses', 'Outstanding Shop Dues & Rent', 'Operating Liabilities', '0', ''], COLS);
      csvContent += makeRow(['TOTAL LIABILITIES', '', '', '', '', num(totalLiabilities)], COLS);

      // Section 3: EQUITY & CAPITAL
      csvContent += makeSectionHeader('3. OWNER EQUITY & CAPITAL STRUCTURE', COLS);
      csvContent += makeRow(['Capital Classification', 'Equity Account', 'Particulars / Source', 'Account Status', 'Balance (Rs.)', 'Subtotal (Rs.)'], COLS);
      csvContent += makeRow(['Owner Equity', 'Contributed Capital', "Owner's Opening Capital", 'Initial Investment', num(bsEquityBreakdown.ownersCapital), ''], COLS);
      csvContent += makeRow(['Owner Equity', 'Retained Earnings', 'Retained Current Period Profit', 'Cumulative P&L Balance', num(bsEquityBreakdown.retainedProfit), ''], COLS);
      csvContent += makeRow(['TOTAL OWNER EQUITY', '', '', '', '', num(totalEquity)], COLS);
      csvContent += makeRow(['TOTAL LIABILITIES & EQUITY (BALANCED)', '', '', '', '', num(totalLiabilities + totalEquity)], COLS);

    } else if (reportType === 'Expenses') {
      const COLS = 7;
      // Header Info
      csvContent += makeRow([sName], COLS);
      csvContent += makeRow([sMandi + (sPhone ? ` • Contact: ${sPhone}` : '')], COLS);
      csvContent += makeRow(['OPERATING EXPENSES REGISTER & FINANCIAL AUDIT'], COLS);
      csvContent += makeRow([`Generated On: ${nowStr} | Date Filter: ${expDateFilter}`], COLS);
      csvContent += makeRow([''], COLS);

      // KPI Summary Block
      csvContent += makeRow(['--- OPERATING EXPENSES SUMMARY ---'], COLS);
      csvContent += makeRow(['Total Operating Expenses (Rs.)', num(totalExpensesAmount), 'Total Vouchers Recorded', filteredExpenses.length, 'Active Expense Categories', activeExpCategoriesCount, 'Avg Expense Per Voucher', num(filteredExpenses.length ? totalExpensesAmount / filteredExpenses.length : 0)], COLS);

      // Section 1: Category Breakdown
      csvContent += makeSectionHeader('1. CATEGORY-WISE EXPENSE DISTRIBUTION', COLS);
      csvContent += makeRow(['Expense Category', 'Vouchers Count', 'Total Amount (Rs.)', 'Share of Expenses (%)', 'Category Status', 'Remarks', ''], COLS);

      (expensesCategorySummary || []).forEach(cat => {
        csvContent += makeRow([
          cat.name,
          cat.count,
          num(cat.total),
          `${cat.pct}%`,
          Number(cat.pct) > 25 ? 'High Expense Area' : 'Normal',
          'Operating Cost',
          ''
        ], COLS);
      });

      // Section 2: Detailed Expense Voucher Register
      csvContent += makeSectionHeader('2. ITEMIZED EXPENSE VOUCHER REGISTER', COLS);
      csvContent += makeRow(['Date', 'Voucher Ref', 'Expense Category', 'Description / Purpose', 'Payment Mode', 'Paid To / Beneficiary', 'Amount (Rs.)'], COLS);

      filteredExpenses.forEach(e => {
        csvContent += makeRow([
          e.date,
          e.ref,
          e.category,
          e.desc || e.description || '-',
          e.mode || 'Cash',
          e.paidTo || 'Shop Staff / Vendor',
          num(e.amount)
        ], COLS);
      });

      csvContent += makeRow(['TOTAL EXPENSES INCURRED', `${filteredExpenses.length} Vouchers`, 'ALL CATEGORIES', 'FINANCIAL YEAR 2026-27', 'ALL PAYMENT MODES', 'TOTAL OUTFLOW', num(totalExpensesAmount)], COLS);

    } else {
      const COLS = 4;
      csvContent += makeRow([sName], COLS);
      csvContent += makeRow(['FINANCIAL METRICS SUMMARY'], COLS);
      csvContent += makeRow(['Metric Name', 'Amount (Rs.)', 'Percentage (%)', 'Status'], COLS);
      csvContent += makeRow(['Gross Revenue', num(totalSalesGross), '100%', 'Recorded'], COLS);
      csvContent += makeRow(['COGS Purchases', num(cogs), '0%', 'Recorded'], COLS);
      csvContent += makeRow(['Gross Operating Profit', num(grossOperatingProfit), '0%', 'Recorded'], COLS);
      csvContent += makeRow(['Total Shop Expenses', num(totalExpensesAmount), '0%', 'Recorded'], COLS);
      csvContent += makeRow(['Net Operating Profit', num(netOperatingProfit), '0%', 'Recorded'], COLS);
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${(shop?.name || 'Ghalla_Mandi').replace(/\s+/g, '_')}_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. HEADER & ACTIONS (Screen Only) */}
      {/* ========================================================================= */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            {reportType === 'Stock' && <Warehouse className="w-6 h-6 text-amber-500" />}
            {reportType === 'Sales' && <TrendingUp className="w-6 h-6 text-emerald-500" />}
            {reportType === 'Expenses' && <DollarSign className="w-6 h-6 text-rose-500" />}
            {reportType === 'ProfitLoss' && <PieChart className="w-6 h-6 text-brand-500" />}
            {reportType === 'BalanceSheet' && <Building className="w-6 h-6 text-indigo-500" />}
            <span>
              {reportType === 'Stock' && 'Stock & Inventory'}
              {reportType === 'Sales' && 'Sales & Revenue Report'}
              {reportType === 'Expenses' && 'Operating Expenses'}
              {reportType === 'ProfitLoss' && 'Profit & Loss Statement'}
              {reportType === 'BalanceSheet' && 'Balance Sheet Statement'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {reportType === 'Stock' && 'Stock value, available quantity, and warehouse overview'}
            {reportType === 'Sales' && 'Sales summary, product performance, and revenue trends'}
            {reportType === 'Expenses' && 'Expense register and financial summary'}
            {reportType === 'ProfitLoss' && 'Income, purchase costs, expenses, and net profit'}
            {reportType === 'BalanceSheet' && 'Summary of assets, liabilities, and net worth'}
          </p>
        </div>

        {/* Print & CSV Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
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
      {/* 1. STOCK & INVENTORY REGISTER (ENTERPRISE VALUATION & AVAILABILITY) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Stock' && (
        <div className="space-y-5">
          {/* KPI Summary Cards (Screen Only) */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Valuation */}
            <div
              onClick={() => handleResetStockFilters()}
              className={`p-4 rounded-xl border card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Stock Value</div>
              <div className="text-xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                Rs. {totalStockValuation.toLocaleString()}
              </div>
            </div>

            {/* 2. Total Products */}
            <div
              onClick={() => setStockStatusFilter('All')}
              className={`p-4 rounded-xl border card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Registered Items</div>
              <div className="text-xl font-black mt-1 font-mono text-slate-900 dark:text-white">
                {processedStock.length} <span className="text-xs font-normal">Products</span>
              </div>
            </div>

            {/* 3. Total Units Available */}
            <div
              className={`p-4 rounded-xl border card-shadow ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Available Units</div>
              <div className="text-xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
                {totalStockUnits.toLocaleString()} <span className="text-xs font-normal">Units</span>
              </div>
            </div>

            {/* 4. Low Stock */}
            <div
              onClick={() => { setStockStatusFilter('LowStock'); setStockPage(1); }}
              className={`p-4 rounded-xl border card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-amber-500/40 text-white' : 'bg-white border-amber-200 text-slate-900'
                }`}
            >
              <div className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Low Stock Warnings</div>
              <div className="text-xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
                {lowStockCount} <span className="text-xs font-normal">Items</span>
              </div>
            </div>

            {/* 5. Out of Stock */}
            <div
              onClick={() => { setStockStatusFilter('OutOfStock'); setStockPage(1); }}
              className={`p-4 rounded-xl border card-shadow card-hover transition-all cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-rose-500/40 text-white' : 'bg-white border-rose-200 text-slate-900'
                }`}
            >
              <div className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Out of Stock</div>
              <div className="text-xl font-black mt-1 font-mono text-rose-600 dark:text-rose-400">
                {outOfStockCount} <span className="text-xs font-normal">Items</span>
              </div>
            </div>
          </div>

          {/* Enterprise Inventory Control & Filter Toolbar (Screen Only) */}
          <div className={`no-print p-3.5 rounded-xl border card-shadow space-y-2.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setStockPage(1); }}
                  placeholder="Search product name, SKU code, category..."
                  className={`w-full pl-8 pr-3 py-1.5 text-xs font-bold rounded-xl border outline-none focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category */}
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setStockPage(1); }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Categories</option>
                  {allCategories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Stock Level / Status */}
                <select
                  value={stockStatusFilter}
                  onChange={(e) => { setStockStatusFilter(e.target.value); setStockPage(1); }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Stock Levels</option>
                  <option value="InStock">In Stock (Normal)</option>
                  <option value="LowStock">Low Stock Alert (&le; Minimum)</option>
                  <option value="OutOfStock">Out of Stock (Zero Units)</option>
                </select>

                {/* Unit */}
                <select
                  value={stockUnitFilter}
                  onChange={(e) => { setStockUnitFilter(e.target.value); setStockPage(1); }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Units</option>
                  {allUnits.filter(u => u !== 'All').map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="valueDesc">Highest Stock Value</option>
                  <option value="valueAsc">Lowest Stock Value</option>
                  <option value="qtyDesc">Highest Quantity</option>
                  <option value="qtyAsc">Lowest Quantity</option>
                  <option value="nameAsc">Product Name (A-Z)</option>
                  <option value="recent">Recently Added</option>
                </select>

                {/* Reset Button */}
                {(searchTerm || categoryFilter !== 'All' || stockStatusFilter !== 'All' || stockUnitFilter !== 'All' || sortBy !== 'valueDesc') && (
                  <button
                    onClick={handleResetStockFilters}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    title="Reset all filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRINT-ONLY HEADER (Stock Valuation) */}
          {/* ========================================================================= */}
          <PrintHeader
            title="Stock Valuation & Inventory Report"
            filterSummary={`Category: ${categoryFilter} | Status: ${stockStatusFilter}`}
            stats={[
              { label: 'Total Stock Value', value: `Rs. ${totalStockValuation.toLocaleString()}` },
              { label: 'Registered Products', value: processedStock.length },
              { label: 'Available Units', value: totalStockUnits.toLocaleString() },
              { label: 'Low Stock Warnings', value: lowStockCount }
            ]}
          />

          {/* Enterprise Inventory Register Table */}
          <div className={`border rounded-xl card-shadow overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 bg-slate-900/60 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-200'
                    }`}>
                    <th className="py-3 px-3.5">Product & SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Available</th>
                    <th className="py-3 px-2 text-center">Unit</th>
                    <th className="py-3 px-3 text-right">Purchase Rate</th>
                    <th className="py-3 px-3 text-right">Selling Rate</th>
                    <th className="py-3 px-3.5 text-right font-black">Stock Value</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {paginatedStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                        No commodities match your active search or filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedStock.map((item) => (
                      <tr key={item.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}`}>
                        {/* 1. Product & SKU */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {item.code || `PRD-${item.id}`}
                          </span>
                        </td>

                        {/* 2. Category */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                            {item.category}
                          </span>
                        </td>

                        {/* 3. Available Stock */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {item.qty.toLocaleString()}
                        </td>

                        {/* 4. Unit */}
                        <td className="py-3 px-2 text-center font-bold text-slate-500">
                          {item.unit}
                        </td>

                        {/* 5. Purchase Rate */}
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          Rs. {item.purchaseRate.toLocaleString()}
                        </td>

                        {/* 6. Selling Rate */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          Rs. {item.sellingRate.toLocaleString()}
                        </td>

                        {/* 7. Stock Valuation */}
                        <td className="py-3 px-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          Rs. {item.stockVal.toLocaleString()}
                        </td>

                        {/* 8. Status */}
                        <td className="py-3 px-3 text-center">
                          <span className={`font-extrabold text-xs ${item.status === 'In Stock'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.status === 'Low Stock'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
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

            {/* Table Footer with Pagination */}
            <div className={`p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700 text-slate-400' : 'bg-slate-50/70 border-slate-200 text-slate-500'
              }`}>
              <div className="flex items-center gap-3">
                <span>
                  Showing {filteredStock.length === 0 ? 0 : (stockPage - 1) * stockPageSize + 1}–{Math.min(stockPage * stockPageSize, filteredStock.length)} of {filteredStock.length} commodities
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px]">Rows:</span>
                  <select
                    value={stockPageSize}
                    onChange={(e) => { setStockPageSize(Number(e.target.value)); setStockPage(1); }}
                    className={`border rounded-lg px-2 py-0.5 text-xs font-bold outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalStockPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setStockPage(prev => Math.max(1, prev - 1))}
                    disabled={stockPage === 1}
                    className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold font-mono">
                    {stockPage} / {totalStockPages}
                  </span>
                  <button
                    onClick={() => setStockPage(prev => Math.min(totalStockPages, prev + 1))}
                    disabled={stockPage === totalStockPages}
                    className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 2. SALES & REVENUE REPORT */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Sales' && (
        <div className="space-y-5">
          {/* Top KPI Summary Cards (Screen Only) */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Gross Sales */}
            <div className={`p-4 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Total Invoiced (Gross)</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono mt-2 text-slate-900 dark:text-white">
                Rs. {filteredGrossSales.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">
                {filteredInvoicesCount} sale orders before deductions
              </div>
            </div>

            {/* 2. Returns & Discounts */}
            <div className={`p-4 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">2. Returns & Discounts</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono mt-2 text-rose-600 dark:text-rose-400">
                -Rs. {(filteredDiscount + filteredSalesReturnsVal).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">
                Rs. {filteredSalesReturnsVal.toLocaleString()} returns • Rs. {filteredDiscount.toLocaleString()} discounts
              </div>
            </div>

            {/* 3. Final Net Sales */}
            <div className={`p-4 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-brand-500/40 text-white' : 'bg-brand-50/50 border-brand-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">3. Final Net Sales</span>
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono mt-2 text-brand-600 dark:text-brand-400">
                Rs. {filteredNetSales.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                {filteredTotalQty.toLocaleString()} units sold after returns
              </div>
            </div>

            {/* 4. Cash Received vs Khata Due */}
            <div className={`p-4 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">4. Payment Split</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Cash in Hand</div>
                  <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    Rs. {filteredCashSales.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Khata Due</div>
                  <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                    Rs. {filteredCreditSales.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">
                {filteredGrossSales > 0 ? ((filteredCashSales / filteredGrossSales) * 100).toFixed(0) : 0}% collected in counter cash
              </div>
            </div>
          </div>

          {/* Plain-English Mathematical Equation Ribbon (Screen Only) */}
          <div className={`no-print p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
            <div className="flex flex-wrap items-center gap-2 font-bold">
              <span className="text-slate-400">Sales Formula:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">Gross (Rs. {filteredGrossSales.toLocaleString()})</span>
              <span className="text-rose-500 font-black">−</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">Deductions (Rs. {(filteredDiscount + filteredSalesReturnsVal).toLocaleString()})</span>
              <span className="text-brand-500 font-black">=</span>
              <span className="font-mono font-black text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">
                Final Net Sales: Rs. {filteredNetSales.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400">
                ● Cash: Rs. {filteredCashSales.toLocaleString()}
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                ● Khata Due: Rs. {filteredCreditSales.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Clean Filter Panel (Screen Only) */}
          <div className={`no-print p-4 rounded-2xl border card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Filter Sales Data
                </span>
              </div>

              {hasActiveSalesFilters && (
                <button
                  type="button"
                  onClick={handleResetSalesFilters}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Date Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Time Period
                </label>
                <select
                  value={salesDateFilter}
                  onChange={(e) => setSalesDateFilter(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom">Custom Date Range</option>
                </select>
              </div>

              {/* Product / Item */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Commodity Item
                </label>
                <select
                  value={salesProductFilter}
                  onChange={(e) => setSalesProductFilter(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Commodities</option>
                  {allProductsList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Customer Party */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Customer Party
                </label>
                <select
                  value={salesCustomerFilter}
                  onChange={(e) => setSalesCustomerFilter(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Customers</option>
                  {allCustomersList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Payment Status
                </label>
                <select
                  value={salesPaymentFilter}
                  onChange={(e) => setSalesPaymentFilter(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Transactions</option>
                  <option value="Paid">Fully Paid</option>
                  <option value="Partial">Partial Paid</option>
                  <option value="Khata">Khata Due</option>
                </select>
              </div>
            </div>

            {/* Custom Date Pickers */}
            {salesDateFilter === 'Custom' && (
              <div className="flex flex-wrap items-center gap-4 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">From:</span>
                  <input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className={`border rounded-xl px-3 py-1.5 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">To:</span>
                  <input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className={`border rounded-xl px-3 py-1.5 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Sub-Navigation Tabs (Screen Only) */}
          <div className="no-print flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSalesActiveSubTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${salesActiveSubTab === 'invoices'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>1. All Sales & Invoices</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 font-bold text-brand-600 dark:text-brand-400">
                {filteredSalesList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSalesActiveSubTab('productWise')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${salesActiveSubTab === 'productWise'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Wheat className="w-3.5 h-3.5 text-emerald-500" />
              <span>2. By Commodity</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 font-bold text-emerald-600 dark:text-emerald-400">
                {productWiseSalesData.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSalesActiveSubTab('customerWise')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${salesActiveSubTab === 'customerWise'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>3. By Customer Party</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-600 dark:text-blue-400">
                {customerWiseSalesData.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSalesActiveSubTab('dateWise')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${salesActiveSubTab === 'dateWise'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>4. By Date (Daily Log)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 font-bold text-purple-600 dark:text-purple-400">
                {dateWiseSalesData.length}
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* PRINT-ONLY HEADER (Sales Report) */}
          {/* ========================================================================= */}
          <PrintHeader
            title="Sales & Revenue Report"
            filterSummary={`Period: ${salesDateFilter} | Mode: ${salesPaymentFilter}`}
            stats={[
              { label: 'Gross Sales', value: `Rs. ${filteredGrossSales.toLocaleString()}` },
              { label: 'Deductions', value: `Rs. ${(filteredDiscount + filteredSalesReturnsVal).toLocaleString()}` },
              { label: 'Net Revenue', value: `Rs. ${filteredNetSales.toLocaleString()}` },
              { label: 'Cash Collected', value: `Rs. ${filteredCashSales.toLocaleString()}` },
              { label: 'Khata Due', value: `Rs. ${filteredCreditSales.toLocaleString()}` }
            ]}
          />

          {/* ========================================================================= */}
          {/* VIEW 1: ALL SALES & INVOICES (PRIMARY BEGINNER VIEW) */}
          {/* ========================================================================= */}
          {salesActiveSubTab === 'invoices' && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-brand-500" />
                    <span>All Sales & Invoices Register</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Itemized list of customer orders, commodity items, payments received, and remaining balances
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {filteredSalesList.length} Invoices
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Customer Party</th>
                      <th className="py-3 px-3">Commodities Sold</th>
                      <th className="py-3 px-3 text-right">Gross Total</th>
                      <th className="py-3 px-3 text-right">Deductions</th>
                      <th className="py-3 px-3 text-right font-black text-brand-500">Net Sales</th>
                      <th className="py-3 px-3 text-right text-emerald-600">Cash Paid</th>
                      <th className="py-3 px-3 text-right text-amber-600">Khata Due</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {filteredSalesList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 font-medium">
                          No sales orders found matching current filter selection.
                        </td>
                      </tr>
                    ) : (
                      filteredSalesList.map((s, idx) => {
                        const cart = Array.isArray(s.cart) && s.cart.length > 0 ? s.cart : (Array.isArray(s.items) ? s.items : [{ name: s.productName || 'Item', qty: s.qty || 1, unit: s.unit || 'KG' }]);
                        const itemsSummary = cart.map(it => `${it.name || it.productName || 'Item'} (${it.qty || it.enteredQty || 1} ${it.unit || it.unitName || 'KG'})`).join(', ');
                        const returnAmt = Number(s.returnAmount || s.returnAmt || 0);
                        const totalDeduction = Number(s.discount || 0) + returnAmt;

                        return (
                          <tr key={s.id || idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {s.dateStr || s.date || '—'}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                              {s.invoiceNo || `INV-${s.id}`}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                              {s.partyName || s.customerName || 'Walk-in Customer'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate font-medium">
                              {itemsSummary}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              Rs. {s.grossAmt.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-rose-500">
                              {totalDeduction > 0 ? `-Rs. ${totalDeduction.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-brand-500">
                              Rs. {s.netAmt.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              Rs. {s.paidAmt.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                              {s.dueAmt > 0 ? `Rs. ${s.dueAmt.toLocaleString()}` : <span className="text-emerald-500 font-bold text-[10px]">Cleared</span>}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${s.dueAmt <= 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : s.paidAmt > 0
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}>
                                {s.dueAmt <= 0 ? 'Paid' : s.paidAmt > 0 ? 'Partial' : 'Khata'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredSalesList.length > 0 && (
                    <tfoot>
                      <tr className={`border-t-2 text-xs font-black ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-slate-100/90 border-slate-300 text-slate-900'
                        }`}>
                        <td className="py-3.5 px-3 uppercase" colSpan={4}>Total / Summary ({filteredSalesList.length} Orders)</td>
                        <td className="py-3.5 px-3 text-right font-mono">Rs. {filteredGrossSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-rose-500">
                          -Rs. {(filteredDiscount + filteredSalesReturnsVal).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-brand-500">Rs. {filteredNetSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-emerald-600">Rs. {filteredCashSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-amber-600">Rs. {filteredCreditSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: PRODUCT-WISE SALES */}
          {/* ========================================================================= */}
          {salesActiveSubTab === 'productWise' && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-emerald-500" />
                    <span>Commodity Sales Performance</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Total volume sold, average realized rate, and sales revenue share per commodity
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {productWiseSalesData.length} Commodities
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <th className="py-3 px-3">Commodity Name</th>
                      <th className="py-3 px-3">Supplied By</th>
                      <th className="py-3 px-3 text-center">Volume Sold</th>
                      <th className="py-3 px-3 text-center">Orders</th>
                      <th className="py-3 px-3 text-right">Sales Amount</th>
                      <th className="py-3 px-3 text-right">Avg Rate</th>
                      <th className="py-3 px-3 w-44 text-right">% of Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {productWiseSalesData.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-medium">No commodity sales recorded for this filter selection.</td></tr>
                    ) : (
                      productWiseSalesData.map((item, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}>
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
                              <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
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
                  {productWiseSalesData.length > 0 && (
                    <tfoot>
                      <tr className={`border-t-2 text-xs font-black ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-slate-100/90 border-slate-300 text-slate-900'
                        }`}>
                        <td className="py-3.5 px-3 uppercase" colSpan={2}>Total Commodities Summary</td>
                        <td className="py-3.5 px-3 text-center font-mono">{filteredTotalQty.toLocaleString()} Units</td>
                        <td className="py-3.5 px-3 text-center font-mono">{filteredInvoicesCount}</td>
                        <td className="py-3.5 px-3 text-right font-mono">Rs. {filteredGrossSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-400">—</td>
                        <td className="py-3.5 px-3 text-right font-mono text-emerald-600">100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: CUSTOMER-WISE SALES */}
          {/* ========================================================================= */}
          {salesActiveSubTab === 'customerWise' && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Customer Party Sales & Recovery</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Turnover per buyer party, counter cash collected, and outstanding khata dues
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {customerWiseSalesData.length} Customer Parties
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <th className="py-3 px-3">Customer Party</th>
                      <th className="py-3 px-3 text-center">Orders</th>
                      <th className="py-3 px-3 text-right">Total Units</th>
                      <th className="py-3 px-3 text-right">Gross Sales</th>
                      <th className="py-3 px-3 text-right">Deductions</th>
                      <th className="py-3 px-3 text-right font-black text-brand-500">Net Sales</th>
                      <th className="py-3 px-3 text-right text-emerald-600">Cash Paid</th>
                      <th className="py-3 px-3 text-right text-amber-600">Khata Due</th>
                      <th className="py-3 px-3 w-40 text-right">% Contribution</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {customerWiseSalesData.length === 0 ? (
                      <tr><td colSpan={9} className="py-10 text-center text-slate-400 font-medium">No customer sales records found.</td></tr>
                    ) : (
                      customerWiseSalesData.map((c, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}>
                          <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                            {c.name}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            {c.invoiceCount}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {c.totalQty} Units
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            Rs. {c.grossSales.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-rose-500">
                            {(c.discount + c.returnAmt) > 0 ? `-Rs. ${(c.discount + c.returnAmt).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-brand-500">
                            Rs. {c.netSales.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            Rs. {c.cashPaid.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                            {c.khataDue > 0 ? `Rs. {c.khataDue.toLocaleString()}` : <span className="text-emerald-500 font-bold text-[10px]">Cleared</span>}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(2, parseFloat(c.pctContribution)))}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400 w-12 text-right">
                                {c.pctContribution}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {customerWiseSalesData.length > 0 && (
                    <tfoot>
                      <tr className={`border-t-2 text-xs font-black ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-slate-100/90 border-slate-300 text-slate-900'
                        }`}>
                        <td className="py-3.5 px-3 uppercase">Total Customers ({customerWiseSalesData.length})</td>
                        <td className="py-3.5 px-3 text-center font-mono">{filteredInvoicesCount}</td>
                        <td className="py-3.5 px-3 text-right font-mono">{filteredTotalQty.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono">Rs. {filteredGrossSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-rose-500">
                          -Rs. {(filteredDiscount + filteredSalesReturnsVal).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-brand-500">Rs. {filteredNetSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-emerald-600">Rs. {filteredCashSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-amber-600">Rs. {filteredCreditSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-blue-600">100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 4: DATE-WISE SALES */}
          {/* ========================================================================= */}
          {salesActiveSubTab === 'dateWise' && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>Daily Sales & Settlement Register</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Aggregated daily transactions, trade discounts, counter cash vs khata dues
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {dateWiseSalesData.length} Trading Days
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-center">Invoices</th>
                      <th className="py-3 px-3">Commodities Summary</th>
                      <th className="py-3 px-3 text-right">Total Qty</th>
                      <th className="py-3 px-3 text-right">Gross Amount</th>
                      <th className="py-3 px-3 text-right">Discount</th>
                      <th className="py-3 px-3 text-right font-black text-brand-500">Net Sales</th>
                      <th className="py-3 px-3 text-right text-emerald-600">Cash Received</th>
                      <th className="py-3 px-3 text-right text-amber-600">Khata Due</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {dateWiseSalesData.length === 0 ? (
                      <tr><td colSpan={9} className="py-10 text-center text-slate-400 font-medium">No sales recorded matching current filter selection.</td></tr>
                    ) : (
                      dateWiseSalesData.map((row, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}>
                          <td className="py-3 px-3 font-mono font-bold">{row.date}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">{row.invoiceCount}</td>
                          <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300 font-medium">
                            {row.productsSummary}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">{row.totalQty} Units</td>
                          <td className="py-3 px-3 text-right font-mono">Rs. {row.grossSales.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-mono text-rose-500">Rs. {row.discount.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-brand-500">
                            Rs. {row.netSales.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            Rs. {row.cash.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                            Rs. {row.credit.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {dateWiseSalesData.length > 0 && (
                    <tfoot>
                      <tr className={`border-t-2 text-xs font-black ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-slate-100/90 border-slate-300 text-slate-900'
                        }`}>
                        <td className="py-3.5 px-3 uppercase">Total / Summary</td>
                        <td className="py-3.5 px-3 text-center font-mono">{filteredInvoicesCount}</td>
                        <td className="py-3.5 px-3 font-medium text-slate-400">—</td>
                        <td className="py-3.5 px-3 text-right font-mono">{filteredTotalQty.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono">Rs. {filteredGrossSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-rose-500">Rs. {filteredDiscount.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-brand-500">Rs. {filteredNetSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-emerald-600">Rs. {filteredCashSales.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-amber-600">Rs. {filteredCreditSales.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 3. OPERATING EXPENSES (ENTERPRISE EXPENSE REGISTER & FINANCIAL SUMMARY) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'Expenses' && (
        <div className="space-y-5">
          {/* Simple, Clean, Natural Expense Summary Cards (Screen Only) */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Total Expenses */}
            <div
              onClick={() => handleResetExpFilters()}
              className={`p-4 rounded-2xl border card-shadow card-hover transition-all cursor-pointer space-y-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              title="Click to reset filters"
            >
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Total Expenses
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                Rs. {filteredExpensesTotal.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Total in selected date & filter
              </div>
            </div>

            {/* 2. Paid in Cash */}
            <div
              className={`p-4 rounded-2xl border card-shadow space-y-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Paid in Cash
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                Rs. {expenseCashTotal.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Paid from counter cash
              </div>
            </div>

            {/* 3. Paid via Bank / Online */}
            <div
              className={`p-4 rounded-2xl border card-shadow space-y-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Paid via Bank / Transfer
              </div>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                Rs. {expenseBankTotal.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Bank / online transfers
              </div>
            </div>

            {/* 4. Total Entries */}
            <div
              className={`p-4 rounded-2xl border card-shadow space-y-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Expense Entries
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {filteredExpensesList.length} <span className="text-sm font-bold">Vouchers</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Recorded expense vouchers
              </div>
            </div>
          </div>

          {/* Enterprise Expenses Filter Toolbar (Screen Only) */}
          <div className={`no-print p-3.5 rounded-xl border card-shadow space-y-2.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={expSearch}
                  onChange={(e) => { setExpSearch(e.target.value); setExpPage(1); }}
                  placeholder="Search voucher #, category, description, payment mode..."
                  className={`w-full pl-8 pr-3 py-1.5 text-xs font-bold rounded-xl border outline-none focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Range Filter */}
                <select
                  value={expDateFilter}
                  onChange={(e) => { setExpDateFilter(e.target.value); setExpPage(1); }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Dates</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Last Month">Last Month</option>
                  <option value="This Quarter">This Quarter</option>
                  <option value="Custom">Custom Date Range</option>
                </select>

                {/* Category Filter */}
                <select
                  value={expCategoryFilter}
                  onChange={(e) => { setExpCategoryFilter(e.target.value); setExpPage(1); }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Categories</option>
                  <option value="Salary (Staff / Workers)">Salary (Staff / Workers)</option>
                  <option value="Bills (Electricity / Gas / Water)">Bills (Electricity / Gas / Water)</option>
                  <option value="Transport & Freight (Bilty / Gaari)">Transport & Freight (Bilty / Gaari)</option>
                  <option value="Shop & Godown Rent">Shop & Godown Rent</option>
                  <option value="Labour & Loading (Mazdoori / Palla)">Labour & Loading (Mazdoori / Palla)</option>
                  <option value="Bardana & Bags Purchase">Bardana & Bags Purchase</option>
                  <option value="Fuel & Generator Diesel">Fuel & Generator Diesel</option>
                  <option value="Tea & Hospitality (Chai Pani)">Tea & Hospitality (Chai Pani)</option>
                  <option value="Repair & Maintenance">Repair & Maintenance</option>
                  <option value="General Miscellaneous">General Miscellaneous</option>
                </select>

                {/* Payment Mode */}
                <select
                  value={expPaymentFilter}
                  onChange={(e) => { setExpPaymentFilter(e.target.value); setExpPage(1); }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer focus:border-rose-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Payment Modes</option>
                  <option value="Cash">Cash (Counter Drawer)</option>
                  <option value="Bank Transfer">Bank Transfer / Online</option>
                  <option value="Cheque">Cheque</option>
                </select>

                {/* Reset Button */}
                {hasActiveExpFilters && (
                  <button
                    onClick={handleResetExpFilters}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    title="Reset all filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Pickers */}
            {expDateFilter === 'Custom' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">From:</span>
                  <input
                    type="date"
                    value={expStartDate}
                    onChange={(e) => { setExpStartDate(e.target.value); setExpPage(1); }}
                    className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">To:</span>
                  <input
                    type="date"
                    value={expEndDate}
                    onChange={(e) => { setExpEndDate(e.target.value); setExpPage(1); }}
                    className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* PRINT-ONLY HEADER (Operating Expenses) */}
          {/* ========================================================================= */}
          <PrintHeader
            title="Operating Expenses Report"
            filterSummary={`Category: ${expCategoryFilter} | Period: ${expDateFilter}`}
            stats={[
              { label: 'Total Expenses', value: `Rs. ${filteredExpensesTotal.toLocaleString()}` },
              { label: 'Paid in Cash', value: `Rs. ${expenseCashTotal.toLocaleString()}` },
              { label: 'Paid via Bank', value: `Rs. ${expenseBankTotal.toLocaleString()}` },
              { label: 'Total Vouchers', value: filteredExpensesList.length }
            ]}
          />

          {/* Enterprise Expenses Register Table */}
          <div className={`border rounded-xl card-shadow overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400 bg-slate-900/60 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-200'
                    }`}>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3">Voucher #</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Payment Mode</th>
                    <th className="py-3 px-3.5 text-right font-black">Amount (Rs.)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                  {paginatedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                        No expenses recorded matching your active filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenses.map((exp) => (
                      <tr key={exp.id} className={`transition ${theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}`}>
                        {/* 1. Date */}
                        <td className="py-3 px-3.5 text-slate-500 font-medium">
                          {exp.date}
                        </td>

                        {/* 2. Voucher # */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {exp.ref}
                        </td>

                        {/* 3. Category */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-xs text-rose-600 dark:text-rose-400">
                            {exp.category}
                          </span>
                        </td>

                        {/* 4. Description */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {exp.desc}
                        </td>

                        {/* 5. Payment Mode */}
                        <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">
                          {exp.mode}
                        </td>

                        {/* 6. Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                          Rs. {Number(exp.amount).toLocaleString()}
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Pagination */}
            <div className={`p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700 text-slate-400' : 'bg-slate-50/70 border-slate-200 text-slate-500'
              }`}>
              <div className="flex items-center gap-3">
                <span>
                  Showing {filteredExpensesList.length === 0 ? 0 : (expPage - 1) * expPageSize + 1}–{Math.min(expPage * expPageSize, filteredExpensesList.length)} of {filteredExpensesList.length} entries
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px]">Rows:</span>
                  <select
                    value={expPageSize}
                    onChange={(e) => { setExpPageSize(Number(e.target.value)); setExpPage(1); }}
                    className={`border rounded-lg px-2 py-0.5 text-xs font-bold outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalExpensePages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpPage(prev => Math.max(1, prev - 1))}
                    disabled={expPage === 1}
                    className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold font-mono">
                    {expPage} / {totalExpensePages}
                  </span>
                  <button
                    onClick={() => setExpPage(prev => Math.min(totalExpensePages, prev + 1))}
                    disabled={expPage === totalExpensePages}
                    className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 4. PROFIT & LOSS STATEMENT (BANK-STATEMENT STYLE FINANCIAL JOURNAL) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'ProfitLoss' && (
        <div className="space-y-5">
          {/* Top 3-Stage Visual Flow Cards (Screen Only) */}
          <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Stage 1: Money In (Total Revenue) */}
            <div className={`p-4 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">1. Money In (Revenue)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-sm">
                  +
                </div>
              </div>
              <div className="text-2xl font-black font-mono mt-2 text-emerald-600 dark:text-emerald-400">
                +Rs. {plTotalRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">
                Total money made from sales orders after returns
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/80 text-[10px] text-slate-500 font-mono">
                <span>Sales: Rs. {plTotalSalesIncome.toLocaleString()}</span>
                <span>•</span>
                <span>Returns: Rs. {plTotalReturns.toLocaleString()}</span>
              </div>
            </div>

            {/* Stage 2: Money Out (Direct Costs & Expenses) */}
            <div className={`p-4 rounded-2xl border card-shadow transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">2. Money Out (Costs & Expenses)</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-black text-sm">
                  −
                </div>
              </div>
              <div className="text-2xl font-black font-mono mt-2 text-rose-600 dark:text-rose-400">
                -Rs. {(plTotalCOGS + plTotalExpenses).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">
                Inventory purchases + Shop running expenses
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/80 text-[10px] text-slate-500 font-mono">
                <span>Purchases: Rs. {plTotalCOGS.toLocaleString()}</span>
                <span>•</span>
                <span>Expenses: Rs. {plTotalExpenses.toLocaleString()}</span>
              </div>
            </div>

            {/* Stage 3: Final Net Profit / Loss */}
            <div className={`p-4 rounded-2xl border card-shadow transition-all ${plNetProfit >= 0
              ? (theme === 'dark' ? 'bg-emerald-950/30 border-emerald-500/40 text-white' : 'bg-emerald-50/70 border-emerald-300 text-slate-900')
              : (theme === 'dark' ? 'bg-rose-950/30 border-rose-500/40 text-white' : 'bg-rose-50/70 border-rose-300 text-slate-900')
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${plNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>
                  3. Final Profit or Loss
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${plNetProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                  {plNetProfit >= 0 ? `${plNetMargin}% Margin` : 'Net Loss'}
                </span>
              </div>
              <div className={`text-2xl font-black font-mono mt-2 ${plNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                {plNetProfit >= 0 ? '+Rs. ' : '-Rs. '}{Math.abs(plNetProfit).toLocaleString()}
              </div>
              <div className={`text-[11px] font-semibold mt-1 ${plNetProfit >= 0 ? 'text-emerald-700/80 dark:text-emerald-300/80' : 'text-rose-600/80'}`}>
                {plNetProfit >= 0 ? 'Real earnings remaining in your pocket after all costs' : 'Expenses and stock costs exceeded sales revenue'}
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800 text-[10px] font-mono text-slate-500">
                Gross Profit: Rs. {plGrossProfit.toLocaleString()} ({plGrossMargin}% Gross Margin)
              </div>
            </div>
          </div>

          {/* Plain-English Mathematical Equation Ribbon (Screen Only) */}
          <div className={`no-print p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
            <div className="flex flex-wrap items-center gap-2 font-bold">
              <span className="text-slate-400">P&L Formula:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">Income (+Rs. {plTotalRevenue.toLocaleString()})</span>
              <span className="text-rose-500 font-black">−</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">Purchases (-Rs. {plTotalCOGS.toLocaleString()})</span>
              <span className="text-rose-500 font-black">−</span>
              <span className="font-mono text-rose-500">Expenses (-Rs. {plTotalExpenses.toLocaleString()})</span>
              <span className="text-brand-500 font-black">=</span>
              <span className={`font-mono font-black px-2 py-0.5 rounded-md ${plNetProfit >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}>
                Net Result: {plNetProfit >= 0 ? '+Rs. ' : '-Rs. '}{Math.abs(plNetProfit).toLocaleString()}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              Period: <strong className="text-slate-700 dark:text-slate-200">{plDateFilter}</strong>
            </div>
          </div>

          {/* Statement Filter Bar (Screen Only) */}
          <div className={`no-print p-4 rounded-2xl border card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Filter Financial Statement
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-center">
              {/* 1. Date Range */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Time Period
                </label>
                <select
                  value={plDateFilter}
                  onChange={(e) => {
                    setPlDateFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom">Custom Date Range</option>
                </select>
              </div>

              {/* 2. Product */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Commodity Item
                </label>
                <select
                  value={plProductFilter}
                  onChange={(e) => {
                    setPlProductFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Commodities</option>
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
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  Transaction Type
                </label>
                <select
                  value={plTypeFilter}
                  onChange={(e) => {
                    setPlTypeFilter(e.target.value);
                    setPlPage(1);
                  }}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                >
                  <option value="All">All Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Khata</option>
                  <option value="Bank">Bank / Online</option>
                </select>
              </div>

              {/* Custom Date Pickers */}
              {plDateFilter === 'Custom' && (
                <div className="col-span-full flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">From Date:</span>
                    <input
                      type="date"
                      value={plStartDate}
                      onChange={(e) => {
                        setPlStartDate(e.target.value);
                        setPlPage(1);
                      }}
                      className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Sub-Navigation Tabs (Screen Only) */}
          <div className="no-print flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPlActiveSubTab('statement')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${plActiveSubTab === 'statement'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>1. All Financial Transactions Journal</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 font-bold text-emerald-600 dark:text-emerald-400">
                {filteredPlJournal.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPlActiveSubTab('productWise')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${plActiveSubTab === 'productWise'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Wheat className="w-3.5 h-3.5 text-brand-500" />
              <span>2. Commodity Profit Margins</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 font-bold text-brand-600 dark:text-brand-400">
                {productWisePnLData.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPlActiveSubTab('categoryWise')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${plActiveSubTab === 'categoryWise'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Building className="w-3.5 h-3.5 text-blue-500" />
              <span>3. Expense & Category Breakdown</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-600 dark:text-blue-400">
                {categoryWisePnLData.length}
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* PRINT-ONLY HEADER (Profit & Loss) */}
          {/* ========================================================================= */}
          <PrintHeader
            title="Profit & Loss Statement"
            filterSummary={`Period: ${plDateFilter} | Type: ${plTypeFilter}`}
            stats={[
              { label: 'Total Revenue', value: `Rs. ${plTotalRevenue.toLocaleString()}` },
              { label: 'Purchases (COGS)', value: `Rs. ${plTotalCOGS.toLocaleString()}` },
              { label: 'Shop Expenses', value: `Rs. ${plTotalExpenses.toLocaleString()}` },
              { label: 'Net Profit', value: `Rs. ${plNetProfit.toLocaleString()}` }
            ]}
          />

          {/* ========================================================================= */}
          {/* TAB 1: ALL FINANCIAL TRANSACTIONS JOURNAL */}
          {/* ========================================================================= */}
          {plActiveSubTab === 'statement' && (
            <div className={`border rounded-2xl card-shadow overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Financial Transaction Journal</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Complete chronological list of all sales, purchases, and expenses
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider sticky top-0 ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-slate-400' : 'bg-slate-50/90 border-slate-200 text-slate-500'
                      }`}>
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3">Reference</th>
                      <th className="py-3 px-3">Description / Party</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-center">Type</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-right">Inflow / Outflow</th>
                      <th className="py-3 px-3.5 text-right font-black text-slate-900 dark:text-white">Running Balance</th>
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
                            <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                              {tx.dateStr}
                            </td>

                            <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                              <span className={`font-mono font-bold text-xs ${tx.type === 'Sale' ? 'text-emerald-600 dark:text-emerald-400' :
                                tx.type === 'Purchase' ? 'text-blue-600 dark:text-blue-400' :
                                  tx.type === 'Expense' ? 'text-rose-600 dark:text-rose-400' :
                                    'text-purple-600 dark:text-purple-400'
                                }`}>
                                {tx.ref}
                              </span>
                            </td>

                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                              <div>{tx.product}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{tx.party} • {tx.mode}</div>
                            </td>

                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-semibold text-xs">
                              {tx.category}
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tx.type === 'Sale'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : tx.type === 'Purchase'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : tx.type === 'Expense'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                }`}>
                                {tx.type}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {tx.qty}
                            </td>

                            <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                              {isPositive ? '+' : ''}Rs. {tx.amount.toLocaleString()}
                            </td>

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
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PRODUCT-WISE PROFIT & LOSS */}
          {/* ========================================================================= */}
          {plActiveSubTab === 'productWise' && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-emerald-500" />
                    <span>Commodity Profit & Loss Analysis</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Gross margins and net profitability per traded commodity
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {productWisePnLData.length} Commodities
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3 text-center">Units Sold</th>
                      <th className="py-3 px-3 text-right">Sales Revenue</th>
                      <th className="py-3 px-3 text-right">Purchase Cost (COGS)</th>
                      <th className="py-3 px-3 text-right font-black text-brand-500">Gross Profit</th>
                      <th className="py-3 px-3 text-right">Gross Margin %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {productWisePnLData.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No commodity transactions found.</td></tr>
                    ) : (
                      productWisePnLData.map((p, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}>
                          <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                            {p.name}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                            {p.units}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Rs. {p.sales.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                            Rs. {p.cogs.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-brand-500">
                            Rs. {p.grossProfit.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {p.margin}%
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
          {/* TAB 3: CATEGORY & EXPENSES BREAKDOWN */}
          {/* ========================================================================= */}
          {plActiveSubTab === 'categoryWise' && (
            <div className={`border rounded-2xl p-4 card-shadow space-y-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span>Category & Expense Structure</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Net contributions and cost distribution grouped by business category
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {categoryWisePnLData.length} Categories
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Sales Revenue</th>
                      <th className="py-3 px-3 text-right">Purchase Costs</th>
                      <th className="py-3 px-3 text-right">Operating Expenses</th>
                      <th className="py-3 px-3 text-right font-black text-brand-500">Net Profit</th>
                      <th className="py-3 px-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {categoryWisePnLData.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No category breakdown data.</td></tr>
                    ) : (
                      categoryWisePnLData.map((c, idx) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}>
                          <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                            {c.category}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Rs. {c.sales.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                            Rs. {c.purchases.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-rose-500">
                            Rs. {c.expenses.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-brand-500">
                            Rs. {c.netProfit.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {c.margin}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. BALANCE SHEET STATEMENT (PROFESSIONAL BANKING & FINANCIAL DASHBOARD) */}
      {/* ------------------------------------------------------------------------- */}
      {reportType === 'BalanceSheet' && (
        <div className="space-y-6">
          {/* Top Filter Bar (Screen Only) */}
          <div className={`no-print p-4 rounded-2xl border card-shadow space-y-3.5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Balance Sheet Statement
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    As of {bsDateFilter === 'Custom' ? bsCustomDate : bsDateFilter}
                  </span>
                </div>
              </div>

              {/* Single Clean Date Filter Dropdown & Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <select
                    value={bsDateFilter}
                    onChange={(e) => setBsDateFilter(e.target.value)}
                    className={`border rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer focus:border-indigo-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  >
                    <option value="Today">Today ({new Date().toLocaleDateString('en-GB')})</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="This Week">Weekly (This Week)</option>
                    <option value="This Month">Monthly (This Month)</option>
                    <option value="All Time">All Time</option>
                    <option value="Custom">Custom Date Range</option>
                  </select>
                </div>

                {bsDateFilter === 'Custom' && (
                  <input
                    type="date"
                    value={bsCustomDate}
                    onChange={(e) => setBsCustomDate(e.target.value)}
                    className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                  />
                )}

                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 font-medium">Last updated: <strong className="text-slate-600 dark:text-slate-300">{bsLastUpdated}</strong></span>
                  <button
                    onClick={handleRefreshBalanceSheet}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500 transition cursor-pointer"
                    title="Refresh Balance Sheet"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  {bsDateFilter !== 'All Time' && (
                    <button
                      onClick={handleResetBsFilters}
                      className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Distinct Financial Metric Cards (Screen Only) */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. TOTAL ASSETS */}
            <div className={`p-4 rounded-2xl border card-shadow space-y-2 ${theme === 'dark' ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Total Assets
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Gross Wealth</span>
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                Rs. {totalAssets.toLocaleString()}
              </div>
            </div>

            {/* 2. TOTAL LIABILITIES */}
            <div className={`p-4 rounded-2xl border card-shadow space-y-2 ${theme === 'dark' ? 'bg-slate-800 border-rose-500/30 text-white' : 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Total Payables
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <span>External Debt</span>
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                Rs. {totalLiabilities.toLocaleString()}
              </div>
            </div>

            {/* 3. OPERATING NET PROFIT */}
            <div className={`p-4 rounded-2xl border card-shadow space-y-2 ${theme === 'dark' ? 'bg-slate-800 border-amber-500/30 text-white' : 'bg-gradient-to-br from-amber-50/40 to-white border-amber-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Operating Profit (P&L)
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <span>Profit</span>
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                Rs. {netOperatingProfit.toLocaleString()}
              </div>
            </div>

            {/* 4. NET BUSINESS WORTH */}
            <div className={`p-4 rounded-2xl border card-shadow space-y-2 ${theme === 'dark' ? 'bg-slate-800 border-indigo-500/30 text-white' : 'bg-gradient-to-br from-indigo-50/40 to-white border-indigo-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Net Worth
                </span>
                <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                  Assets − Liabilities
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                Rs. {totalEquity.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRINT-ONLY HEADER (Balance Sheet) */}
          {/* ========================================================================= */}
          <PrintHeader
            title="Balance Sheet Statement"
            filterSummary={`As of: ${bsDateFilter === 'Custom' ? bsCustomDate : bsDateFilter}`}
            stats={[
              { label: 'Total Assets', value: `Rs. ${totalAssets.toLocaleString()}` },
              { label: 'Total Payables', value: `Rs. ${totalLiabilities.toLocaleString()}` },
              { label: 'Operating Profit', value: `Rs. ${netOperatingProfit.toLocaleString()}` },
              { label: 'Net Worth', value: `Rs. ${totalEquity.toLocaleString()}` }
            ]}
          />

          {/* Two Column Banking Balance Sheet Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ========================================================================= */}
            {/* LEFT COLUMN: WHAT YOU OWN (ASSETS) */}
            {/* ========================================================================= */}
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                {/* 1. Customer Receivables */}
                <div className={`border rounded-xl p-3 space-y-2 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
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
                        <span>Regular Customer Khata Dues:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {regularCustomerReceivables.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Walk-in Customer Khata Dues:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {walkinCustomerReceivables.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1 text-slate-900 dark:text-white">
                        <span className="font-bold">Total Khata Receivables:</span>
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400">Rs. {totalCustomerReceivables.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Commodity Inventory Assets */}
                <div className={`border rounded-xl p-3 space-y-2 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
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
            <div className={`border rounded-2xl p-5 card-shadow space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                <div className={`border rounded-xl p-3 space-y-2 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
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
                    </div>
                  )}
                </div>

                {/* 2. Equity & Business Net Worth */}
                <div className={`border rounded-xl p-3 space-y-2 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'
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
                        <span>Total Gross Assets:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Rs. {totalAssets.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Less: Total Liabilities & Dues:</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">- Rs. {totalLiabilities.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-700/60">
                        <span>Net Worth (Assets − Liabilities):</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">Rs. {totalEquity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>• Owner's Invested Capital: Rs. {bsEquityBreakdown.ownersCapital.toLocaleString()}</span>
                        <span>• Retained Profit: Rs. {bsEquityBreakdown.retainedProfit.toLocaleString()}</span>
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
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className={`rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 card-shadow border my-auto max-h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs font-bold outline-none focus:border-indigo-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
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

              {/* 2. Customer Receivables Details (Regular + Walk-in) */}
              {bsActiveDrilldownModal === 'customers' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase text-slate-400 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className="py-2 px-2.5">Customer Party</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Phone</th>
                      <th className="py-2 px-2">City / Location</th>
                      <th className="py-2 px-2.5 text-right font-black">Khata Due</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                    {allCustomerReceivablesList.filter(c =>
                      (c.name || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase()) ||
                      (c.phone || '').includes(bsDrilldownSearch) ||
                      (c.type || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase()) ||
                      (c.city || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase())
                    ).map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">{c.name}</td>
                        <td className="py-2.5 px-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${c.type.includes('Walk-in')
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 font-mono">{c.phone || '—'}</td>
                        <td className="py-2.5 px-2 text-slate-500">{c.city || 'Local Mandi'}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          Rs. {c.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 text-xs font-black">
                      <td colSpan={4} className="py-2.5 px-2.5 uppercase">Total Customer Khata Receivables (Regular + Walk-in)</td>
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
                      const fin = computeSupplierKhataBalance(s, purchases, paymentLogs, purchaseReturns);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono">{s.phone || '—'}</td>
                          <td className="py-2.5 px-2 text-slate-500">{(s.suppliedProducts || []).join(', ') || 'General Commodity'}</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">Rs. {fin.balance.toLocaleString()}</td>
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

              {/* 4. Cash & Bank Accounts Details (Fully Functional Live Channels & Ledger) */}
              {bsActiveDrilldownModal === 'cashBank' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                      1. Liquid Accounts & Channels Summary
                    </h4>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] font-black uppercase text-slate-400 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                          <th className="py-2 px-2.5">Account / Channel</th>
                          <th className="py-2 px-2">Type</th>
                          <th className="py-2 px-2">Description / Mode</th>
                          <th className="py-2 px-2.5 text-right font-black">Liquid Balance</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">Shop Cash Counter Drawer</td>
                          <td className="py-2.5 px-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Physical Cash
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 font-medium">Safe & Counter Cash Drawer</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">Rs. {cashInHand.toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">Bank Accounts & Online Transfers</td>
                          <td className="py-2.5 px-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Bank / Card
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 font-medium">Bank Transfer, Cards & Raast Payments</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">Rs. {bankBalance.toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">Mobile Digital Wallets</td>
                          <td className="py-2.5 px-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Mobile Wallet
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 font-medium">JazzCash & Easypaisa Merchant Wallets</td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">Rs. {walletBalance.toLocaleString()}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 text-xs font-black">
                          <td colSpan={3} className="py-2.5 px-2.5 uppercase">Total Liquid Cash & Bank Funds</td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">Rs. {totalLiquidFunds.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 2. Itemized Transactions Flow */}
                  <div className="pt-2">
                    <h4 className="text-[11px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                      2. Recent Liquid Fund Transactions Flow ({liquidTransactionsList.length} Entries)
                    </h4>
                    <div className="max-h-60 overflow-y-auto border rounded-xl dark:border-slate-700">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b text-[10px] font-black uppercase text-slate-400 sticky top-0 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <th className="py-2 px-2.5">Date</th>
                            <th className="py-2 px-2">Source / Reference</th>
                            <th className="py-2 px-2">Party</th>
                            <th className="py-2 px-2">Channel</th>
                            <th className="py-2 px-2 text-center">Type</th>
                            <th className="py-2 px-2.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y font-semibold ${theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
                          {liquidTransactionsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400 font-normal">
                                No liquid fund transactions logged yet.
                              </td>
                            </tr>
                          ) : (
                            liquidTransactionsList.filter(tx =>
                              (tx.source || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase()) ||
                              (tx.party || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase()) ||
                              (tx.channel || '').toLowerCase().includes(bsDrilldownSearch.toLowerCase())
                            ).map((tx, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                                <td className="py-2 px-2.5 font-mono text-[11px]">{tx.date}</td>
                                <td className="py-2 px-2 font-bold text-slate-900 dark:text-white max-w-[140px] truncate">{tx.source}</td>
                                <td className="py-2 px-2 text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{tx.party}</td>
                                <td className="py-2 px-2">
                                  <span className="text-[10px] font-bold text-slate-500">{tx.channel}</span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${tx.type === 'Inflow'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}>
                                    {tx.type === 'Inflow' ? '+ Inflow' : '- Outflow'}
                                  </span>
                                </td>
                                <td className={`py-2 px-2.5 text-right font-mono font-bold ${tx.type === 'Inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                  Rs. {tx.amount.toLocaleString()}
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

      {/* Print Footer */}
      <PrintFooter note="Official Business Report • Ghalla Mandi Management System" />
    </div>
  );
};

export default Reports;
