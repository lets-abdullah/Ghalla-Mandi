# Comprehensive Forensic Audit Report (Phase 1)

## Executive Summary
This forensic audit was conducted across the backend services, models, controllers, frontend context, and UI modules. The audit identified critical bugs in transaction atomicity scoping, payment truth preservation on return deletions, and invoice payment status calculation when cash refunds are involved.

---

## Findings Matrix

### Finding 1: Transaction Connection Decoupling in `withTransaction`
- **Severity**: CRITICAL
- **File & Lines**: [`backend/src/services/db.service.js:L305-L343`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/services/db.service.js#L305-L343)
- **Root Cause**: `withTransaction` checked out a dedicated PostgreSQL `client` from the connection pool and issued `BEGIN` / `COMMIT` / `ROLLBACK`. However, helper functions `run()`, `get()`, and `query()` used by the ORM/models (e.g. `Product.findByIdAndUpdate`, `Sale.create`, `Ledger.create`) called `getPool().query()` directly. Thus, queries inside `withTransaction` were executed on random pool connections outside the transaction client, bypassing atomicity and preventing rollbacks upon failure.
- **Current Behavior**: If an error occurred midway in `createSale` or `createPurchase`, preceding queries were already committed on their independent connection.
- **Expected Behavior**: All queries executed within a `withTransaction` block must execute on the exact same dedicated PostgreSQL `client` that initiated `BEGIN`, guaranteeing that `ROLLBACK` genuinely undoes all mutations upon any failure.
- **Mathematical / Operational Impact**: Phantom stock deductions or orphan sales when a multi-step operation fails.
- **Affected Modules**: Sales, Purchases, Returns, Ledger Payments.
- **Recommended Fix**: Implement Node.js `AsyncLocalStorage` in `db.service.js` to automatically bind the active transaction client to all `query()`, `get()`, and `run()` calls executed inside `withTransaction`.

---

### Finding 2: Historical `paidAmount` Overwritten in Return Deletions
- **Severity**: HIGH
- **File & Lines**:
  - [`backend/src/controllers/return.controller.js:L192`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/controllers/return.controller.js#L192) (`deleteSaleReturn`)
  - [`backend/src/controllers/return.controller.js:L385`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/controllers/return.controller.js#L385) (`deletePurchaseReturn`)
- **Root Cause**: In `deleteSaleReturn` and `deletePurchaseReturn`, the update payload explicitly set `paidAmount: effectivePaid`, overwriting the historical upfront paid amount in the `sales` and `purchases` tables.
- **Current Behavior**: Deleting a return altered the original transaction payment record.
- **Expected Behavior**: Historical `paidAmount` on `Sale` and `Purchase` must remain completely immutable. Only `returnAmount`, `netAmount`, and `status` should be recalculated.
- **Mathematical Impact**: Destruction of historical audit trail and payment logs integrity.
- **Affected Modules**: Sale Returns, Purchase Returns, Audit Trail.
- **Recommended Fix**: Remove `paidAmount: effectivePaid` from the update payload in both deletion functions.

---

### Finding 3: Cash Return Refund Neglect in Invoice Status Calculation
- **Severity**: HIGH
- **File & Lines**:
  - [`backend/src/controllers/return.controller.js:L98-L100`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/controllers/return.controller.js#L98-L100) (`createSaleReturn`)
  - [`backend/src/controllers/return.controller.js:L291-L293`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/controllers/return.controller.js#L291-L293) (`createPurchaseReturn`)
  - [`backend/src/models/sale.model.js:L19`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/models/sale.model.js#L19)
  - [`backend/src/models/purchase.model.js:L14`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/models/purchase.model.js#L14)
- **Root Cause**: When computing parent invoice status on return, `effectivePaid` was computed as `min(netAmt, paidAmount)` without subtracting `cashRefundAmount`. For a sale of Rs. 7,500 with Rs. 5,000 paid and Rs. 2,750 return (Rs. 1,000 cash refund + Rs. 1,750 ledger adjustment), net amount is Rs. 4,750. Because gross paid is 5,000, `min(4750, 5000) = 4750 >= 4750`, incorrectly marking the invoice status as `'Paid'` instead of `'Partial'`.
- **Current Behavior**: Invoices with partial cash refunds were marked `'Paid'` while Customer Khata showed remaining Due (e.g. Rs. 750).
- **Expected Behavior**:
  $$\text{Net Cash Paid} = \max(0, \text{Gross Paid} - \text{Cash Refunds})$$
  $$\text{Effective Paid} = \min(\text{Net Amount}, \text{Net Cash Paid})$$
  $$\text{Status} = \text{isFull} ? \text{'Returned'} : ((\text{Effective Paid} \ge \text{Net Amount} \land \text{Net Amount} > 0) ? \text{'Paid'} : (\text{Effective Paid} > 0 ? \text{'Partial'} : \text{'Pending'}))$$
- **Mathematical Impact**: Status contradiction between Invoice View (`Paid`) and Khata View (`Due`).
- **Affected Modules**: Sales, Purchases, Returns, Customer Khata, Supplier Khata.
- **Recommended Fix**: Update status calculations in `return.controller.js` and models to deduct cash refunds from gross paid amounts.

---

### Finding 4: Model Mapper Disregarding Persisted DB Status
- **Severity**: MEDIUM
- **File & Lines**:
  - [`backend/src/models/sale.model.js:L19`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/models/sale.model.js#L19)
  - [`backend/src/models/purchase.model.js:L14`](file:///e:/Gallah%20Mandi/Galla%20Mandi%20Full%20-%20Copy/backend/src/models/purchase.model.js#L14)
- **Root Cause**: `mapSaleRow` and `mapPurchaseRow` recalculated status dynamically using raw `paidAmount >= netAmount` without inspecting `r.status` from the database table.
- **Current Behavior**: If the controller saved status as `'Partial'`, reading the row re-evaluated it to `'Paid'`.
- **Expected Behavior**: The persisted database status `r.status` or `r.paymentstatus` must take precedence.
- **Affected Modules**: All modules reading sales/purchases via models.
- **Recommended Fix**: Ensure `r.status` / `r.paymentstatus` is prioritized.
