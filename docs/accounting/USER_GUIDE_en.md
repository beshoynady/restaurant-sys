# Accounting Module – Developer Guide

## 1. Overview

This guide explains how developers interact with the Accounting module of the SmartMenu system.  
It covers models, workflows, and best practices for integrating accounting features with business activities.

Key Features:
- Automatic journal entry creation based on system activities.
- Payroll, sales, purchase, expense, asset, and cash management.
- Multi-branch and multi-currency support.
- Audit tracking for all actions.

---

## 2. Models & Their Roles

| Model                     | Purpose                                                                 |
|---------------------------|-------------------------------------------------------------------------|
| `Account`                 | Defines all accounts: Asset, Liability, Equity, Revenue, Expense.       |
| `AccountingPeriod`        | Represents fiscal periods. Transactions must belong to a period.        |
| `JournalEntry`            | Tracks all debit/credit movements. Embedded `JournalLine` defines lines.|
| `JournalLine`             | Represents a single debit/credit line of a journal entry.               |
| `CostCenter`              | Optional segmentation of revenue/expenses. Can be required per line.    |
| `AccountingSettings`      | Central configuration. Maps activities to accounts and controls rules.  |

---

## 3. Developer Workflow

### 3.1 Setup Accounts
1. Create necessary accounts in `Account` model.
2. Specify:
   - `category` (Asset, Liability, etc.)
   - `normalBalance` (Debit/Credit)
   - `isSystem` / `isGroup` flags
   - Parent-child relationship for grouping

### 3.2 Configure Accounting Settings
- Map each business activity to accounts:
  - Sales → Revenue, Tax, COGS, Delivery, Discount
  - Purchase → Inventory, Tax, Discount
  - Expense → Operating Expense, Tax
  - Payroll → Payroll Accounts
- Define control accounts (Cash, Bank, AR, AP, Inventory, COGS, etc.)

### 3.3 Define Accounting Period
- Create `AccountingPeriod` for the current fiscal year or month.
- Set startDate, endDate, status.
- Only `Open` periods accept journal entries.

### 3.4 Creating Transactions
- For any business activity (sale, purchase, payroll, expense):
  1. Fetch relevant accounts from `AccountingSettings`.
  2. Build `JournalEntry` with `JournalLine` array.
  3. Set `createdBy` (Employee) for audit tracking.
  4. Post the journal entry (optional approval if configured).

### 3.5 Using Cost Centers
- If `AccountingSettings.costCenter.enabled`:
  - Assign `costCenter` to each `JournalLine`.
  - Useful for reporting and analytical breakdowns.

---

## 4. Best Practices

- **Do not hardcode account IDs** in business modules; always use `AccountingSettings`.
- **Audit fields**: always populate `createdBy`, `updatedBy`, `deletedBy`.
- **Multi-branch**: always set `brand` and `branch` for transactions.
- **Multi-currency**: use `currency` and `exchangeRate` in `JournalLine`.
- **Validation**: ensure debit equals credit for each journal entry.
- **Period checks**: verify the `AccountingPeriod` is open before posting entries.

---

## 5. Example: Recording a Sale

```javascript
const AccountingSettings = require("./settings/accounting-settings.model");
const JournalEntry = require("./journal-entry.model");

async function recordSale(saleData, employeeId, branchId, brandId) {
  const settings = await AccountingSettings.findOne({ brand: brandId, branch: branchId });
  
  const journal = new JournalEntry({
    brand: brandId,
    branch: branchId,
    period: saleData.periodId,
    entryNumber: "JE0001",
    description: `Sale #${saleData.saleNumber}`,
    lines: [
      {
        account: settings.activities.sales.revenue,
        debit: 0,
        credit: saleData.total,
        currency: "EGP",
        exchangeRate: 1
      },
      {
        account: settings.controlAccounts.cash,
        debit: saleData.total,
        credit: 0,
        currency: "EGP",
        exchangeRate: 1
      }
    ],
    createdBy: employeeId
  });

  await journal.save();
}
