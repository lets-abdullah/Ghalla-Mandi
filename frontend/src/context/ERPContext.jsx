import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { authFetch } from '../services/api';

const ERPContext = createContext();

const normalizePurchase = (p) => {
  if (!p) return null;
  const grandTotal = Number(p.amount !== undefined ? p.amount : (p.grandTotal !== undefined ? p.grandTotal : (p.grandtotal !== undefined ? p.grandtotal : 0)));
  const paidAmount = Number(p.paidAmount !== undefined ? p.paidAmount : (p.paidamount !== undefined ? p.paidamount : 0));
  const supplierName = p.supplier || p.supplierName || p.suppliername || 'Supplier';
  const purchaseNo = p.purchaseNo || p.purchaseno || '';
  const status = p.status || p.paymentStatus || p.paymentstatus || (paidAmount >= grandTotal && grandTotal > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');
  const date = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const items = Array.isArray(p.items) ? p.items : (Array.isArray(p.cart) ? p.cart : []);

  return {
    ...p,
    id: p.id,
    purchaseNo,
    purchaseno: purchaseNo,
    supplier: supplierName,
    supplierName,
    suppliername: supplierName,
    amount: grandTotal,
    grandTotal,
    grandtotal: grandTotal,
    paidAmount,
    paidamount: paidAmount,
    status,
    paymentStatus: status,
    date,
    items,
    cart: p.cart || items
  };
};

const normalizeSale = (s) => {
  if (!s) return null;
  const amount = Number(s.amount !== undefined ? s.amount : (s.grandTotal !== undefined ? s.grandTotal : (s.grandtotal !== undefined ? s.grandtotal : 0)));
  const paidAmount = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paidamount !== undefined ? s.paidamount : 0));
  const partyName = s.partyName || s.partyname || s.customerName || s.customername || 'Walk-in Customer';
  const invoiceNo = s.invoiceNo || s.invoiceno || '';
  const status = s.status || s.paymentStatus || s.paymentstatus || (paidAmount >= amount && amount > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');
  const date = s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const profit = Number(s.profit !== undefined ? s.profit : 0);
  const cart = Array.isArray(s.cart) ? s.cart : (Array.isArray(s.items) ? s.items : []);

  return {
    ...s,
    id: s.id,
    invoiceNo,
    invoiceno: invoiceNo,
    partyName,
    customerName: partyName,
    amount,
    grandTotal: amount,
    paidAmount,
    status,
    paymentStatus: status,
    profit,
    date,
    cart,
    items: s.items || cart
  };
};

const normalizeProduct = (p) => {
  if (!p) return null;
  const purchasePrice = Number(p.purchasePrice !== undefined ? p.purchasePrice : (p.purchaseprice !== undefined ? p.purchaseprice : 0));
  const sellingPrice = Number(p.sellingPrice !== undefined ? p.sellingPrice : (p.sellingprice !== undefined ? p.sellingprice : 0));
  const stockQty = Number(p.stockQty !== undefined ? p.stockQty : (p.stockqty !== undefined ? p.stockqty : 0));
  const minStock = Number(p.minStock !== undefined ? p.minStock : (p.minstock !== undefined ? p.minstock : (p.minStockThreshold !== undefined ? p.minStockThreshold : 10)));
  const unit = p.unit || p.baseUnit || 'KG';

  return {
    ...p,
    id: p.id,
    shop_id: p.shop_id,
    code: p.code || '',
    name: p.name || '',
    category: p.category || 'General',
    purchasePrice,
    purchaseprice: purchasePrice,
    sellingPrice,
    sellingprice: sellingPrice,
    stockQty,
    stockqty: stockQty,
    minStock,
    minstock: minStock,
    minStockThreshold: minStock,
    unit,
    baseUnit: unit,
    image: p.image || ''
  };
};

const normalizeCustomer = (c) => {
  if (!c) return null;
  const openingBalance = Number(c.openingBalance !== undefined ? c.openingBalance : (c.openingbalance !== undefined ? c.openingbalance : 0));
  const balance = Number(c.balance !== undefined ? c.balance : openingBalance);
  const customerType = c.customerType || c.customertype || 'Regular Party';

  return {
    ...c,
    id: c.id,
    shop_id: c.shop_id,
    name: c.name || '',
    phone: c.phone || '',
    city: c.city || '',
    customerType,
    customertype: customerType,
    openingBalance,
    openingbalance: openingBalance,
    balance
  };
};

const normalizeSupplier = (s) => {
  if (!s) return null;
  const openingBalance = Number(s.openingBalance !== undefined ? s.openingBalance : (s.openingbalance !== undefined ? s.openingbalance : 0));
  const balance = Number(s.balance !== undefined ? s.balance : openingBalance);
  const suppliedProducts = s.suppliedProducts || s.suppliedproductsjson || [];

  return {
    ...s,
    id: s.id,
    shop_id: s.shop_id,
    name: s.name || '',
    phone: s.phone || '',
    city: s.city || '',
    openingBalance,
    openingbalance: openingBalance,
    balance,
    suppliedProducts
  };
};

const normalizePaymentLog = (p) => {
  if (!p) return null;
  const partyId = p.partyId || p.partyid || null;
  const partyType = p.partyType || p.partytype || 'Customer';
  const partyName = p.partyName || p.partyname || 'Party';
  const amount = Number(p.amount !== undefined ? p.amount : 0);
  const mode = p.mode || p.paymentMode || 'Cash';
  const date = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const ref = p.ref || '';
  const note = p.note || '';

  return {
    ...p,
    id: p.id,
    shop_id: p.shop_id,
    partyId,
    partyid: partyId,
    partyType,
    partytype: partyType,
    partyName,
    partyname: partyName,
    amount,
    mode,
    paymentMode: mode,
    date,
    ref,
    note
  };
};

export const ERPProvider = ({ children }) => {
  const { user, token } = useAuth();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [saleReturns, setSaleReturns] = useState(() => {
    try {
      const saved = localStorage.getItem('ghalla_mandi_sale_returns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [purchaseReturns, setPurchaseReturns] = useState(() => {
    try {
      const saved = localStorage.getItem('ghalla_mandi_purchase_returns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('ghalla_mandi_sale_returns', JSON.stringify(saleReturns));
    } catch (e) {}
  }, [saleReturns]);

  useEffect(() => {
    try {
      localStorage.setItem('ghalla_mandi_purchase_returns', JSON.stringify(purchaseReturns));
    } catch (e) {}
  }, [purchaseReturns]);

  // Fetch all ERP data from backend API for authenticated shop
  const fetchAllData = useCallback(async () => {
    if (!token || !user) {
      setCategories([]);
      setProducts([]);
      setCustomers([]);
      setSuppliers([]);
      setSales([]);
      setPurchases([]);
      setPaymentLogs([]);
      setStockMovements([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        catRes,
        prodRes,
        custRes,
        supRes,
        saleRes,
        purRes,
        ledgerRes,
        movRes
      ] = await Promise.all([
        authFetch('/api/products/categories'),
        authFetch('/api/products'),
        authFetch('/api/customers'),
        authFetch('/api/suppliers'),
        authFetch('/api/sales'),
        authFetch('/api/purchases'),
        authFetch('/api/ledger'),
        authFetch('/api/inventory/movements')
      ]);

      if (catRes.success) setCategories(catRes.categories || []);
      if (prodRes.success) setProducts((prodRes.products || []).map(normalizeProduct));
      if (custRes.success) setCustomers((custRes.customers || []).map(normalizeCustomer));
      if (supRes.success) setSuppliers((supRes.suppliers || []).map(normalizeSupplier));
      if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
      if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
      if (ledgerRes.success) setPaymentLogs((ledgerRes.entries || []).map(normalizePaymentLog));
      if (movRes.success) setStockMovements(movRes.movements || []);
    } catch (err) {
      console.error('Failed to load ERP dataset from server:', err);
      setError(err.message || 'Error loading data from server');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 1. Add Category
  const addCategory = async (categoryData) => {
    try {
      const res = await authFetch('/api/products/categories', {
        method: 'POST',
        body: categoryData
      });

      if (res.success && res.category) {
        setCategories(prev => [...prev, res.category]);
        return res.category;
      }
      throw new Error(res.message || 'Failed to create category');
    } catch (err) {
      console.error('addCategory error:', err);
      throw err;
    }
  };

  // 2. Edit Category
  const updateCategory = async (id, updatedFields) => {
    try {
      const res = await authFetch(`/api/products/categories/${id}`, {
        method: 'PUT',
        body: updatedFields
      });

      if (res.success && res.category) {
        setCategories(prev => prev.map(c => c.id === id ? res.category : c));
        return res.category;
      }
      throw new Error(res.message || 'Failed to update category');
    } catch (err) {
      console.error('updateCategory error:', err);
      throw err;
    }
  };

  // 3. Add Product
  const addProduct = async (productData) => {
    try {
      const payload = {
        name: productData.name,
        category: productData.category,
        code: productData.code,
        baseUnit: productData.unit || productData.defaultUnit || 'KG',
        stockQty: Number(productData.stockQty) || 0,
        minStockThreshold: Number(productData.minStock) || 10,
        purchasePrice: Number(productData.purchasePrice) || 0,
        sellingPrice: Number(productData.sellingPrice) || 0,
        image: productData.image || ''
      };

      const res = await authFetch('/api/products', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.product) {
        const norm = normalizeProduct(res.product);
        setProducts(prev => [...prev, norm]);
        return norm;
      }
      throw new Error(res.message || 'Failed to create product');
    } catch (err) {
      console.error('addProduct error:', err);
      throw err;
    }
  };

  // 4. Update Product
  const updateProduct = async (id, updatedFields) => {
    try {
      const res = await authFetch(`/api/products/${id}`, {
        method: 'PUT',
        body: updatedFields
      });

      if (res.success && res.product) {
        const norm = normalizeProduct(res.product);
        setProducts(prev => prev.map(p => p.id === id ? norm : p));
        return norm;
      }
      throw new Error(res.message || 'Failed to update product');
    } catch (err) {
      console.error('updateProduct error:', err);
      throw err;
    }
  };

  // 5. Delete Product
  const deleteProduct = async (id) => {
    try {
      const res = await authFetch(`/api/products/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete product');
    } catch (err) {
      console.error('deleteProduct error:', err);
      throw err;
    }
  };

  // 6. Adjust Stock
  const adjustStock = async (productId, adjustmentKg, type = 'ADJUSTMENT', reason = 'Manual Stock Audit') => {
    try {
      const res = await authFetch(`/api/products/${productId}/adjust-stock`, {
        method: 'POST',
        body: { adjustmentKg: Number(adjustmentKg), reason }
      });

      if (res.success && res.product) {
        const norm = normalizeProduct(res.product);
        setProducts(prev => prev.map(p => p.id === productId ? norm : p));
        // Refresh stock movements
        const movRes = await authFetch('/api/inventory/movements');
        if (movRes.success) setStockMovements(movRes.movements || []);
        return norm;
      }
      throw new Error(res.message || 'Failed to adjust stock');
    } catch (err) {
      console.error('adjustStock error:', err);
      throw err;
    }
  };

  // 7. Add Customer
  const addCustomer = async (customerData) => {
    try {
      const payload = {
        name: customerData.name,
        phone: customerData.phone || '',
        city: customerData.city || 'Faisalabad',
        customerType: customerData.customerType || 'Regular Party',
        openingBalance: Number(customerData.openingBalance) || 0
      };

      const res = await authFetch('/api/customers', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.customer) {
        setCustomers(prev => [...prev, res.customer]);
        return res.customer;
      }
      throw new Error(res.message || 'Failed to add customer');
    } catch (err) {
      console.error('addCustomer error:', err);
      throw err;
    }
  };

  const updateCustomer = async (id, updatedData) => {
    try {
      const res = await authFetch(`/api/customers/${id}`, {
        method: 'PUT',
        body: updatedData
      });

      if (res.success && res.customer) {
        setCustomers(prev => prev.map(c => c.id === id ? res.customer : c));
        return res.customer;
      }
      throw new Error(res.message || 'Failed to update customer');
    } catch (err) {
      console.error('updateCustomer error:', err);
      throw err;
    }
  };

  const deleteCustomer = async (id) => {
    try {
      const res = await authFetch(`/api/customers/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete customer');
    } catch (err) {
      console.error('deleteCustomer error:', err);
      throw err;
    }
  };

  // 8. Add Supplier
  const addSupplier = async (supplierData) => {
    try {
      const payload = {
        name: supplierData.name,
        phone: supplierData.phone || '',
        city: supplierData.city || 'Sargodha',
        openingBalance: Number(supplierData.openingBalance) || 0,
        suppliedProducts: supplierData.suppliedProductIds || supplierData.suppliedProducts || []
      };

      const res = await authFetch('/api/suppliers', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.supplier) {
        setSuppliers(prev => [...prev, res.supplier]);
        return res.supplier;
      }
      throw new Error(res.message || 'Failed to add supplier');
    } catch (err) {
      console.error('addSupplier error:', err);
      throw err;
    }
  };

  const updateSupplier = async (id, updatedData) => {
    try {
      const res = await authFetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: updatedData
      });

      if (res.success && res.supplier) {
        setSuppliers(prev => prev.map(s => s.id === id ? res.supplier : s));
        return res.supplier;
      }
      throw new Error(res.message || 'Failed to update supplier');
    } catch (err) {
      console.error('updateSupplier error:', err);
      throw err;
    }
  };

  const deleteSupplier = async (id) => {
    try {
      const res = await authFetch(`/api/suppliers/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setSuppliers(prev => prev.filter(s => s.id !== id));
        return true;
      }
      throw new Error(res.message || 'Failed to delete supplier');
    } catch (err) {
      console.error('deleteSupplier error:', err);
      throw err;
    }
  };

  const inFlightLocks = useRef(new Map());

  // 9. Record Payment with anti-duplicate lock
  const recordPayment = async ({ partyId, partyType, amount, paymentMode = 'Cash', note = '', saleId = null, purchaseId = null }) => {
    const lockKey = `pay:${partyId || ''}:${partyType}:${amount}:${saleId || ''}:${purchaseId || ''}`;
    if (inFlightLocks.current.has(lockKey)) {
      return inFlightLocks.current.get(lockKey);
    }

    const promise = (async () => {
      try {
        const res = await authFetch('/api/ledger/payment', {
          method: 'POST',
          body: { partyId, partyType, amount, paymentMode, note, saleId, purchaseId }
        });

        if (res.success && res.entry) {
          if (!res.deduplicated) {
            setPaymentLogs(prev => [res.entry, ...prev]);

            if (partyType === 'Customer') {
              const [custRes, saleRes] = await Promise.all([
                authFetch('/api/customers'),
                authFetch('/api/sales')
              ]);
              if (custRes.success) setCustomers(custRes.customers || []);
              if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
            } else {
              const [supRes, purRes] = await Promise.all([
                authFetch('/api/suppliers'),
                authFetch('/api/purchases')
              ]);
              if (supRes.success) setSuppliers(supRes.suppliers || []);
              if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
            }
          }

          return res.entry;
        }
        throw new Error(res.message || 'Failed to record payment');
      } catch (err) {
        console.error('recordPayment error:', err);
        throw err;
      } finally {
        setTimeout(() => {
          inFlightLocks.current.delete(lockKey);
        }, 2000);
      }
    })();

    inFlightLocks.current.set(lockKey, promise);
    return promise;
  };

  // 10. Record Purchase with anti-duplicate lock
  const recordPurchase = async (purchaseData) => {
    const rawItems = purchaseData.cart || (purchaseData.productId ? [{
      productId: purchaseData.productId,
      name: purchaseData.productName || purchaseData.name,
      productName: purchaseData.productName || purchaseData.name,
      unit: purchaseData.unit || purchaseData.unitName || 'KG',
      unitName: purchaseData.unitName || purchaseData.unit || 'KG',
      qty: Number(purchaseData.qtyKg || purchaseData.qty) || 1,
      rate: Number(purchaseData.rate) || 0,
      total: (Number(purchaseData.qtyKg || purchaseData.qty) || 1) * (Number(purchaseData.rate) || 0)
    }] : []);

    const items = rawItems.map(item => ({
      productId: item.productId || item.id,
      name: item.name || item.productName || 'Product',
      productName: item.productName || item.name || 'Product',
      unit: item.unit || item.unitName || item.enteredUnit || 'KG',
      unitName: item.unitName || item.unit || item.enteredUnit || 'KG',
      qty: Number(item.qty || item.enteredQty) || 1,
      enteredQty: Number(item.qty || item.enteredQty) || 1,
      rate: Number(item.rate || item.price || item.ratePerEnteredUnit) || 0,
      ratePerEnteredUnit: Number(item.rate || item.price || item.ratePerEnteredUnit) || 0,
      total: Number(item.total || item.totalAmount) || ((Number(item.qty || 1)) * (Number(item.rate || 0))),
      totalAmount: Number(item.total || item.totalAmount) || ((Number(item.qty || 1)) * (Number(item.rate || 0)))
    }));

    const payload = {
      supplierName: purchaseData.supplierName || purchaseData.supplier || '',
      supplierId: purchaseData.supplierId || null,
      paidAmount: Number(purchaseData.paidAmount) || 0,
      notes: purchaseData.notes || '',
      items
    };

    const lockKey = `pur:${payload.supplierId || payload.supplierName}:${items.length}:${items[0]?.productId}:${items[0]?.qty}:${payload.paidAmount}`;
    if (inFlightLocks.current.has(lockKey)) {
      return inFlightLocks.current.get(lockKey);
    }

    const promise = (async () => {
      try {
        const res = await authFetch('/api/purchases', {
          method: 'POST',
          body: payload
        });

        if (res.success && res.purchase) {
          const norm = normalizePurchase(res.purchase);
          if (!res.deduplicated) {
            setPurchases(prev => [norm, ...prev]);

            const [prodRes, supRes, movRes] = await Promise.all([
              authFetch('/api/products'),
              authFetch('/api/suppliers'),
              authFetch('/api/inventory/movements')
            ]);
            if (prodRes.success) setProducts(prodRes.products || []);
            if (supRes.success) setSuppliers(supRes.suppliers || []);
            if (movRes.success) setStockMovements(movRes.movements || []);
          }

          return norm;
        }
        throw new Error(res.message || 'Failed to record purchase');
      } catch (err) {
        console.error('recordPurchase error:', err);
        throw err;
      } finally {
        setTimeout(() => {
          inFlightLocks.current.delete(lockKey);
        }, 2000);
      }
    })();

    inFlightLocks.current.set(lockKey, promise);
    return promise;
  };

  // 11. Create Sale POS Invoice with anti-duplicate lock
  const createSale = async (saleData) => {
    const items = (saleData.cart || []).map(item => ({
      productId: item.productId || item.id,
      name: item.name,
      qty: Number(item.qty) || 1,
      rate: Number(item.rate) || 0,
      unitName: item.unitName || item.unit || 'KG'
    }));

    const payload = {
      customerName: saleData.customerName || 'Walk-in Customer',
      customerId: saleData.customerId || null,
      items,
      paidAmount: Number(saleData.paidAmount) || 0,
      discount: Number(saleData.discount) || 0,
      tax: Number(saleData.tax) || 0
    };

    const lockKey = `sale:${payload.customerId || payload.customerName}:${items.length}:${items[0]?.productId}:${items[0]?.qty}:${payload.paidAmount}`;
    if (inFlightLocks.current.has(lockKey)) {
      return inFlightLocks.current.get(lockKey);
    }

    const promise = (async () => {
      try {
        const res = await authFetch('/api/sales', {
          method: 'POST',
          body: payload
        });

        if (res.success && res.sale) {
          const norm = normalizeSale(res.sale);
          if (!res.deduplicated) {
            setSales(prev => [norm, ...prev]);

            const [prodRes, custRes, movRes] = await Promise.all([
              authFetch('/api/products'),
              authFetch('/api/customers'),
              authFetch('/api/inventory/movements')
            ]);
            if (prodRes.success) setProducts(prodRes.products || []);
            if (custRes.success) setCustomers(custRes.customers || []);
            if (movRes.success) setStockMovements(movRes.movements || []);
          }

          return norm;
        }
        throw new Error(res.message || 'Failed to create sale');
      } catch (err) {
        console.error('createSale error:', err);
        throw err;
      } finally {
        setTimeout(() => {
          inFlightLocks.current.delete(lockKey);
        }, 2000);
      }
    })();

    inFlightLocks.current.set(lockKey, promise);
    return promise;
  };

  // 12. Record Sale Return (Restocks inventory, adjusts customer khata, logs return)
  const recordSaleReturn = async (returnData) => {
    const returnNo = `SR-2026-${String(saleReturns.length + 1).padStart(4, '0')}`;
    const dateStr = returnData.date || new Date().toLocaleDateString('en-GB');

    const newReturn = {
      id: Date.now(),
      returnNo,
      saleId: returnData.saleId || null,
      invoiceNo: returnData.invoiceNo || 'Direct Sale Return',
      customerId: returnData.customerId || null,
      customerName: returnData.customerName || 'Customer Party',
      items: returnData.items || [],
      refundAmount: Number(returnData.refundAmount) || 0,
      refundMode: returnData.refundMode || 'Cash',
      reason: returnData.reason || 'Customer Return',
      date: dateStr
    };

    // Restock products in inventory
    for (const item of returnData.items || []) {
      const pId = item.productId || item.id;
      const rQty = Number(item.qty || item.enteredQty) || 0;
      if (pId && rQty > 0) {
        try {
          await adjustStock(pId, rQty, 'IN (Sale Return)', `Sale Return #${returnNo}`);
        } catch {
          setProducts(prev => prev.map(p => p.id === pId ? { ...p, stockQty: Number(p.stockQty || 0) + rQty } : p));
        }
      }
    }

    // Adjust customer ledger if refund mode is Ledger
    if (returnData.refundMode === 'Ledger' && returnData.customerId) {
      const cust = customers.find(c => c.id === returnData.customerId);
      if (cust) {
        const newBal = Math.max(0, Number(cust.balance || 0) - Number(returnData.refundAmount || 0));
        try {
          await updateCustomer(cust.id, { balance: newBal });
        } catch {
          setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, balance: newBal } : c));
        }
      }
    }

    setSaleReturns(prev => [newReturn, ...prev]);
    return newReturn;
  };

  // 13. Record Purchase Return (Deducts stock, adjusts supplier khata, logs return)
  const recordPurchaseReturn = async (returnData) => {
    const returnNo = `PR-2026-${String(purchaseReturns.length + 1).padStart(4, '0')}`;
    const dateStr = returnData.date || new Date().toLocaleDateString('en-GB');

    const newReturn = {
      id: Date.now(),
      returnNo,
      purchaseId: returnData.purchaseId || null,
      purchaseNo: returnData.purchaseNo || 'Direct Purchase Return',
      supplierId: returnData.supplierId || null,
      supplierName: returnData.supplierName || 'Supplier Firm',
      items: returnData.items || [],
      refundAmount: Number(returnData.refundAmount) || 0,
      refundMode: returnData.refundMode || 'Cash',
      reason: returnData.reason || 'Supplier Rejection',
      date: dateStr
    };

    // Deduct products from inventory
    for (const item of returnData.items || []) {
      const pId = item.productId || item.id;
      const rQty = Number(item.qty || item.enteredQty) || 0;
      if (pId && rQty > 0) {
        try {
          await adjustStock(pId, -rQty, 'OUT (Purchase Return)', `Purchase Return #${returnNo}`);
        } catch {
          setProducts(prev => prev.map(p => p.id === pId ? { ...p, stockQty: Math.max(0, Number(p.stockQty || 0) - rQty) } : p));
        }
      }
    }

    // Adjust supplier ledger if refund mode is Ledger
    if (returnData.refundMode === 'Ledger' && returnData.supplierId) {
      const sup = suppliers.find(s => s.id === returnData.supplierId);
      if (sup) {
        const newBal = Math.max(0, Number(sup.balance || 0) - Number(returnData.refundAmount || 0));
        try {
          await updateSupplier(sup.id, { balance: newBal });
        } catch {
          setSuppliers(prev => prev.map(s => s.id === sup.id ? { ...s, balance: newBal } : s));
        }
      }
    }

    setPurchaseReturns(prev => [newReturn, ...prev]);
    return newReturn;
  };

  return (
    <ERPContext.Provider value={{
      categories,
      products,
      customers,
      suppliers,
      sales,
      purchases,
      paymentLogs,
      stockMovements,
      saleReturns,
      purchaseReturns,
      loading,
      error,
      refreshData: fetchAllData,
      addCategory,
      updateCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      recordPayment,
      recordPurchase,
      createPurchase: recordPurchase,
      createSale,
      recordSaleReturn,
      recordPurchaseReturn
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => useContext(ERPContext);
