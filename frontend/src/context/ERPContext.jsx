import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      if (custRes.success) setCustomers(custRes.customers || []);
      if (supRes.success) setSuppliers(supRes.suppliers || []);
      if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
      if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
      if (ledgerRes.success) setPaymentLogs(ledgerRes.entries || []);
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

  // 9. Record Payment
  const recordPayment = async ({ partyId, partyType, amount, paymentMode = 'Cash', note = '', saleId = null, purchaseId = null }) => {
    try {
      const res = await authFetch('/api/ledger/payment', {
        method: 'POST',
        body: { partyId, partyType, amount, paymentMode, note, saleId, purchaseId }
      });

      if (res.success && res.entry) {
        setPaymentLogs(prev => [res.entry, ...prev]);

        // Refetch customers or suppliers to reflect updated balances
        if (partyType === 'Customer') {
          const custRes = await authFetch('/api/customers');
          if (custRes.success) setCustomers(custRes.customers || []);
          const saleRes = await authFetch('/api/sales');
          if (saleRes.success) setSales((saleRes.sales || []).map(normalizeSale));
        } else {
          const supRes = await authFetch('/api/suppliers');
          if (supRes.success) setSuppliers(supRes.suppliers || []);
          const purRes = await authFetch('/api/purchases');
          if (purRes.success) setPurchases((purRes.purchases || []).map(normalizePurchase));
        }

        return res.entry;
      }
      throw new Error(res.message || 'Failed to record payment');
    } catch (err) {
      console.error('recordPayment error:', err);
      throw err;
    }
  };

  // 10. Record Purchase
  const recordPurchase = async (purchaseData) => {
    try {
      const items = purchaseData.cart || (purchaseData.productId ? [{
        productId: purchaseData.productId,
        productName: purchaseData.productName,
        qty: Number(purchaseData.qtyKg || purchaseData.qty) || 1,
        rate: Number(purchaseData.rate) || 0
      }] : []);

      const payload = {
        supplierName: purchaseData.supplierName || purchaseData.supplier || '',
        supplierId: purchaseData.supplierId || null,
        paidAmount: Number(purchaseData.paidAmount) || 0,
        notes: purchaseData.notes || '',
        items
      };

      const res = await authFetch('/api/purchases', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.purchase) {
        const norm = normalizePurchase(res.purchase);
        setPurchases(prev => [norm, ...prev]);

        // Refetch products and suppliers to ensure latest stock & balances
        const [prodRes, supRes, movRes] = await Promise.all([
          authFetch('/api/products'),
          authFetch('/api/suppliers'),
          authFetch('/api/inventory/movements')
        ]);
        if (prodRes.success) setProducts(prodRes.products || []);
        if (supRes.success) setSuppliers(supRes.suppliers || []);
        if (movRes.success) setStockMovements(movRes.movements || []);

        return norm;
      }
      throw new Error(res.message || 'Failed to record purchase');
    } catch (err) {
      console.error('recordPurchase error:', err);
      throw err;
    }
  };

  // 11. Create Sale POS Invoice
  const createSale = async (saleData) => {
    try {
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

      const res = await authFetch('/api/sales', {
        method: 'POST',
        body: payload
      });

      if (res.success && res.sale) {
        const norm = normalizeSale(res.sale);
        setSales(prev => [norm, ...prev]);

        // Refetch products, customers, movements to ensure synchronized state
        const [prodRes, custRes, movRes] = await Promise.all([
          authFetch('/api/products'),
          authFetch('/api/customers'),
          authFetch('/api/inventory/movements')
        ]);
        if (prodRes.success) setProducts(prodRes.products || []);
        if (custRes.success) setCustomers(custRes.customers || []);
        if (movRes.success) setStockMovements(movRes.movements || []);

        return norm;
      }
      throw new Error(res.message || 'Failed to create sale');
    } catch (err) {
      console.error('createSale error:', err);
      throw err;
    }
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
      createSale
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => useContext(ERPContext);
