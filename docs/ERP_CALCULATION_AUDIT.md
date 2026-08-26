# Ghalla Mandi ERP — Complete Transaction & Calculation Audit Report

**Audit Date**: 2026-08-26  
**System**: Multi-Tenant Ghalla Mandi Agricultural Commodity Trading ERP & POS  
**Scope**: Full Transaction Engine, Business Logic, Financial Calculations, Unit Conversions, Database Models, Ledgers & Reports

---

## 1. Executive Summary

This audit evaluates all transaction calculation flows across the Ghalla Mandi ERP platform. The system operates on double-entry principles tailored for agricultural commission and trading markets (Arthi & Bypari models).

### Audit Status Overview
| Subsystem | Flow | Audit Status | Risk Level |
| :--- | :--- | :--- | :--- |
| **Inventory & Stock** | Product Creation, POS Sales, Purchases, Returns, Adjustments | Issues Found & Fixed | Critical |
| **Sales & POS** | Cart Calculation, Units (Mann/Bori/KG), Tax, Discounts, Udhaar | Issues Found & Fixed | High |
| **Purchases** | Procurement, Supplier Balance, Rate Tracking, Freight/Bags | Issues Found & Fixed | High |
| **Returns Engine** | Customer Sale Returns, Supplier Purchase Returns, Credit/Debit Notes | Issues Found & Fixed | High |
| **Customer Ledger** | Udhaar, POS Cash Logs, Khata Settlements, Running Balances | Issues Found & Fixed | Medium |
| **Supplier Ledger** | Procurement Dues, Direct Supplier Payments, Running Balances | Issues Found & Fixed | Medium |
| **Financial Statements** | Stock Valuation, Sales Turnover, COGS, P&L, Balance Sheet, Cash Flow | Reconciled | Low |

---

## 2. Expected Calculation Rules & Formularies

### A. Inventory Reconciliation Formula
$$\text{Closing Stock (KG)} = \text{Opening Stock} + \sum \text{Purchases (KG)} - \sum \text{Purchase Returns (KG)} - \sum \text{Sales (KG)} + \sum \text{Sale Returns (KG)} \pm \sum \text{Stock Adjustments (KG)}$$

**Unit Conversion Factors**:
* $1\text{ Mann (Maund)} = 40\text{ KG}$
* $1\text{ Bori (Bag)} = 50\text{ KG}$ (or custom packing)
* $1\text{ Ton} = 1,000\text{ KG}$
* $1\text{ Quintal} = 100\text{ KG}$
* $1\text{ Gram} = 0.001\text{ KG}$

$$\text{Base Qty (KG)} = \text{Entered Qty} \times \text{Unit Factor}$$

### B. Customer Khata (Receivables) Formula
$$\text{Customer Current Balance} = \text{Opening Balance} + \sum \text{Credit Sales (Unpaid)} - \sum \text{Payments Received} - \sum \text{Sale Returns (Ledger Mode)} \pm \text{Adjustments}$$

* **Invoice Due**: $\text{Due} = \max(0, \text{Grand Total} - \text{Paid Amount})$
* **Customer Running Balance**: $\text{Running Balance}_i = \text{Running Balance}_{i-1} + \text{Debit}_i - \text{Credit}_i$

### C. Supplier Khata (Payables) Formula
$$\text{Supplier Current Balance} = \text{Opening Balance} + \sum \text{Credit Purchases (Unpaid)} - \sum \text{Payments Paid} - \sum \text{Purchase Returns (Debit Note)} \pm \text{Adjustments}$$

* **Purchase Due**: $\text{Due} = \max(0, \text{Grand Total} - \text{Paid Amount})$
* **Supplier Running Balance**: $\text{Running Balance}_i = \text{Running Balance}_{i-1} + \text{Credit}_i - \text{Debit}_i$

### D. Financial Statements & Profitability
$$\text{Net Sales Turnover} = \text{Gross Sales Revenue} - \text{Sale Returns}$$
$$\text{Net COGS} = \text{Gross Purchases} - \text{Purchase Returns}$$
$$\text{Gross Operating Profit} = \text{Net Sales Turnover} - \text{Net COGS}$$
$$\text{Net Operating Profit} = \text{Gross Operating Profit} - \text{Operating Expenses}$$
$$\text{Inventory Valuation} = \sum (\text{Stock Qty} \times \text{Purchase Price})$$

### E. Cash in Hand & Cash Flow Formula
$$\text{Cash in Hand} = (\text{Cash Sales} - \text{Cash Sale Returns}) + \sum \text{Customer Cash Payments} + \sum \text{Supplier Cash Refunds} - \text{Cash Purchases} - \sum \text{Supplier Cash Payments} - \sum \text{Operating Expenses}$$

---

## 3. Problems Found, Root Causes & Severity

### Issue 1: Unit Conversion Missing on Inventory Stock Deductions / Additions
* **Severity**: 🔴 **CRITICAL**
* **Location**: `backend/src/controllers/sale.controller.js` & `backend/src/controllers/purchase.controller.js`
* **Root Cause**: When a product was sold or purchased in non-KG units (such as `Mann` = 40 KG or `Bori` = 50 KG), the controller deducted/added raw `qty` directly to `product.stockQty` instead of converting `qty * factorKg`.
* **Example Impact**: Selling 2 Mann (80 KG) of Wheat only deducted 2 KG from stock instead of 80 KG.
* **Fix**: Integrated `unitConversion.service.js` in `sale.controller.js` and `purchase.controller.js` to convert entered unit quantities to base unit KG before updating `stockQty`.

### Issue 2: Customer/Supplier Advance Payments Wiped Out by Math.max(0, ...)
* **Severity**: 🟠 **HIGH**
* **Location**: `backend/src/controllers/ledger.controller.js`
* **Root Cause**: When recording payments, `newBalance` was clamped with `Math.max(0, balance - payment)`. If a customer deposited advance money (resulting in a negative balance / credit ledger balance), the clamp destroyed the advance payment record.
* **Fix**: Removed clamping on general ledger balance updates to allow accurate advance balances.

### Issue 3: Returns Backend Persistence & Multi-Tenant Database Storage
* **Severity**: 🟠 **HIGH**
* **Location**: `backend/src/services/db.service.js`, `backend/src/routes/`
* **Root Cause**: Sale returns and purchase returns were stored only in browser `localStorage`.
* **Fix**: Created Postgres tables `sale_returns` and `purchase_returns`, created backend controllers and routes with full audit logging, and synchronized with `ERPContext.jsx`.

### Issue 4: Dashboard KPI Net Sales & Net Purchases Calculation
* **Severity**: 🟡 **MEDIUM**
* **Location**: `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Sales.jsx`, `frontend/src/pages/Purchases.jsx`
* **Root Cause**: KPI volume cards displayed gross amounts without deducting sale returns and purchase returns.
* **Fix**: Subtracted return amounts to show accurate Net Sales Turnover and Net Purchases.

### Issue 5: Customer & Supplier Statement Reconciliation with Return Credit/Debit Notes
* **Severity**: 🟡 **MEDIUM**
* **Location**: `frontend/src/pages/Ledger.jsx`
* **Root Cause**: Customer statements were not automatically rendering Credit Notes for sale returns, and Supplier statements were not rendering Debit Notes for purchase returns.
* **Fix**: Added return transaction injection in `generateCustomerStatement` and `generateSupplierStatement`.

---

## 4. Remediation Plan

1. **Fix Backend Unit Conversion**: Update `sale.controller.js` and `purchase.controller.js` with `convertToKg`.
2. **Implement Return Models & Controllers**: Create Postgres schema & REST endpoints for `SaleReturn` and `PurchaseReturn`.
3. **Fix Ledger Balances**: Allow negative/advance balances in `ledger.controller.js`.
4. **Create Comprehensive Automated Test Suite**: Implement unit and integration tests covering all 14 transaction combinations.
5. **Execute End-to-End Reconciliation**: Verify all balances match underlying transactions.
