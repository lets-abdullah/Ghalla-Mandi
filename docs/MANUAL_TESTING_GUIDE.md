# 🧪 Ghalla Mandi ERP — Step-by-Step Manual Testing Guide
**Comprehensive Manual Test Plan with Concrete Sample Numbers & End-to-End Accounting Verification**

---

## 🎯 Test Scenario Overview
In this manual test run, you will start with a fresh test commodity, execute realistic Mandi transactions step-by-step, and verify that every screen, khata ledger, stock counter, and financial report updates with **100% mathematical precision**.

---

## 📋 Initial Test Setup

### Step 1: Create a Test Product
1. Go to **Products** (`/products`) → Click **"+ Add Product"**.
2. Fill details:
   - **Product Name**: `Super Basmati Rice (Test)`
   - **Category**: `Rice`
   - **Purchase Rate**: `Rs. 100 / KG`
   - **Selling Rate**: `Rs. 150 / KG`
   - **Initial Opening Stock**: `1,000 KG` (or 25 Maunds)
   - **Min Stock Alert**: `100 KG`
3. Click **"Save Product"**.

> **🔍 Expected Initial Check**:
> - Go to **Inventory** (`/inventory`): Stock should show **1,000 KG**.
> - Go to **Reports → Stock Statement**: Stock Value should show **Rs. 100,000** (`1,000 KG × Rs. 100`).

---

## 🛒 Phase 1: Purchases (Khareedari)

### Step 2: Record a Stock Purchase (Cash + Credit)
1. Go to **Purchases** (`/purchases`) → Click **"+ Record Purchase"**.
2. Fill details:
   - **Supplier**: Select or create `Haji Zahid Traders`
   - **Product**: `Super Basmati Rice (Test)`
   - **Quantity**: `500 KG`
   - **Purchase Rate**: `Rs. 100 / KG`
   - **Total Bill**: `Rs. 50,000` (`500 × 100`)
   - **Payment Mode**: Select **Partial / Khata**
   - **Cash Paid Now**: `Rs. 20,000` (Cash outflow)
   - **Remaining Due (Credit)**: `Rs. 30,000`
3. Click **"Confirm & Save Purchase"**.

> **🔍 Expected Result Check**:
> 1. **Inventory (`/inventory`)**: Stock increases by `500 KG` → Total Stock = **1,500 KG**.
> 2. **Suppliers (`/suppliers`)**: `Haji Zahid Traders` balance shows **Rs. 30,000 (Payable)**.
> 3. **Supplier Ledger (`/ledger?type=Supplier`)**: 
>    - Bill Credit: `+Rs. 50,000`
>    - Cash Paid: `-Rs. 20,000`
>    - Running Balance: `Rs. 30,000`.

---

## 🛍️ Phase 2: Sales & POS (Farokht)

### Step 3: Record a POS Sale (Cash + Khata Udhaar)
1. Go to **Create Order / POS** (`/create-order` or `/sales`).
2. Fill details:
   - **Customer**: Select or create `Malik Usman Retailer`
   - **Product**: `Super Basmati Rice (Test)`
   - **Quantity**: `400 KG`
   - **Rate**: `Rs. 150 / KG`
   - **Gross Total**: `Rs. 60,000` (`400 × 150`)
   - **Cash Received**: `Rs. 40,000`
   - **Customer Due (Udhaar)**: `Rs. 20,000`
3. Click **"Complete Order / Print Receipt"**.

> **🔍 Expected Result Check**:
> 1. **Inventory (`/inventory`)**: Stock decreases by `400 KG` → Total Stock = **1,100 KG** (`1,500 - 400`).
> 2. **Customers (`/customers`)**: `Malik Usman Retailer` balance shows **Rs. 20,000 (Receivable)**.
> 3. **Customer Ledger (`/ledger?type=Customer`)**:
>    - Sale Debit: `+Rs. 60,000`
>    - Cash Received: `-Rs. 40,000`
>    - Remaining Due: `Rs. 20,000`.

---

## 🔄 Phase 3: Returns (Sale Return & Purchase Return)

### Step 4: Record a Sale Return (Wapasi)
1. Go to **Sale Returns** (`/sale-returns`) → Click **"+ Record Sale Return"**.
2. Fill details:
   - **Associated Sale**: Select the sale made in Step 3.
   - **Customer**: `Malik Usman Retailer`
   - **Product**: `Super Basmati Rice (Test)`
   - **Return Qty**: `50 KG`
   - **Rate**: `Rs. 150 / KG` → **Return Value**: `Rs. 7,500`
   - **Settlement Mode**: Select **"Deduct Customer Khata Due"** (Udhaar Kam Karo).
3. Click **"Confirm Return"**.

> **🔍 Expected Result Check**:
> 1. **Inventory (`/inventory`)**: Stock increases by `50 KG` → Total Stock = **1,150 KG**.
> 2. **Customers (`/customers`)**: `Malik Usman Retailer` balance drops from `Rs. 20,000` to **Rs. 12,500** (`20,000 - 7,500`).

---

### Step 5: Record a Purchase Return (Supplier Wapasi)
1. Go to **Purchase Returns** (`/purchase-returns`) → Click **"+ Record Purchase Return"**.
2. Fill details:
   - **Associated Purchase**: Select the purchase made in Step 2.
   - **Supplier**: `Haji Zahid Traders`
   - **Product**: `Super Basmati Rice (Test)`
   - **Return Qty**: `100 KG`
   - **Rate**: `Rs. 100 / KG` → **Debit Valuation**: `Rs. 10,000`
   - **Settlement Mode**: Select **"Deduct Supplier Khata"** (Dena Kam Karo).
3. Click **"Confirm Purchase Return"**.

> **🔍 Expected Result Check**:
> 1. **Inventory (`/inventory`)**: Stock decreases by `100 KG` → Total Stock = **1,050 KG**.
> 2. **Suppliers (`/suppliers`)**: `Haji Zahid Traders` balance drops from `Rs. 30,000` to **Rs. 20,000** (`30,000 - 10,000`).

---

## 💸 Phase 4: Khata Payments & Settlement

### Step 6: Receive Payment from Customer
1. Go to **Customer Ledger** (`/ledger?type=Customer`) or **Customers** (`/customers`).
2. Open `Malik Usman Retailer` → Click **"Record Payment / Vasooli"**.
3. Amount: `Rs. 10,000` (Cash received).
4. Click **"Save Payment"**.

> **🔍 Expected Result Check**:
> - Customer Remaining Due drops from `Rs. 12,500` to **Rs. 2,500**.

---

### Step 7: Pay Remaining Due to Supplier
1. Go to **Supplier Ledger** (`/ledger?type=Supplier`) or **Suppliers** (`/suppliers`).
2. Open `Haji Zahid Traders` → Click **"Pay Supplier"**.
3. Amount: `Rs. 15,000` (Cash paid).
4. Click **"Save Payment"**.

> **🔍 Expected Result Check**:
> - Supplier Remaining Due drops from `Rs. 20,000` to **Rs. 5,000**.

---

## 🏢 Phase 5: Shop Expenses (Dukan Ke Kharchay)

### Step 8: Record Operating Expenses
1. Go to **Reports** (`/reports?type=Expenses`) → Click **"+ Record Expense"**.
2. Entry 1:
   - **Category**: `Mazdoori / Loading`
   - **Description**: `Rice unloading labour`
   - **Amount**: `Rs. 2,000`
3. Entry 2:
   - **Category**: `Transport / Kiraya`
   - **Description**: `Truck freight`
   - **Amount**: `Rs. 3,000`
4. Total Expenses Recorded = **Rs. 5,000**.

---

## 📊 Phase 6: Final Verification (Profit & Loss and Balance Sheet)

### Step 9: Verify Profit & Loss Report (`/reports?type=ProfitLoss`)
Open **Reports → Profit & Loss Tab**. Check that the numbers match the formula:

| Field | Mathematical Calculation | Expected Value |
| :--- | :--- | :--- |
| **1. Total Sales** | Gross Sales (`Rs. 60,000`) − Sale Returns (`Rs. 7,500`) | **Rs. 52,500** |
| **2. Total Purchases** | Gross Purchases (`Rs. 50,000`) − Purchase Returns (`Rs. 10,000`) | **- Rs. 40,000** |
| **3. Shop Expenses** | Labour (`Rs. 2,000`) + Transport (`Rs. 3,000`) | **- Rs. 5,000** |
| **4. Net Profit** | `Sales (52,500) - Purchases (40,000) - Expenses (5,000)` | **= Rs. 7,500** |

---

### Step 10: Verify Balance Sheet (`/reports?type=BalanceSheet`)
Open **Reports → Balance Sheet Tab**. Check that the equation holds true:

#### 1. Assets (What You Own):
- **Cash in Hand**: Net cash flow from all transactions.
- **Pending from Customers (Receivables)**: `Rs. 2,500` (Malik Usman remaining balance).
- **Stock in Warehouse**: `1,050 KG × Rs. 100` = **Rs. 105,000**.
- **Total Assets** = `Cash + Receivables + Stock`.

#### 2. Liabilities (What You Owe):
- **Due to Suppliers (Payables)**: **Rs. 5,000** (Haji Zahid remaining balance).

#### 3. Net Business Worth:
- **Net Worth** = `Total Assets − Total Liabilities`.

---

## ✅ Summary Checklist Table for Manual Testing

| Flow | Screen | Action | Status |
| :--- | :--- | :--- | :---: |
| **1. Products** | `/products` | Create new commodity item with opening stock | 🔲 |
| **2. Purchases** | `/purchases` | Record purchase with cash + partial credit | 🔲 |
| **3. Sales / POS** | `/sales` | Sell goods with cash + credit balance | 🔲 |
| **4. Sale Returns** | `/sale-returns` | Return goods & deduct from customer khata | 🔲 |
| **5. Purchase Returns** | `/purchase-returns`| Return goods & deduct from supplier khata | 🔲 |
| **6. Customer Payment** | `/ledger?type=Customer` | Collect cash from customer & check balance | 🔲 |
| **7. Supplier Payment** | `/ledger?type=Supplier` | Pay cash to supplier & check balance | 🔲 |
| **8. Expenses** | `/reports?type=Expenses` | Record mazdoori & transport vouchers | 🔲 |
| **9. Dashboard Chart** | `/` | Verify 7D/30D/6M/1Y line trends update | 🔲 |
| **10. Profit & Loss** | `/reports?type=ProfitLoss` | Verify `Sales - Purchases - Expenses = Net Profit` | 🔲 |
| **11. Balance Sheet** | `/reports?type=BalanceSheet` | Verify `Assets - Payables = Net Business Worth` | 🔲 |
