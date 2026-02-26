# Accounting Engine Architecture

## 1. Overview
This system implements a full-featured accounting engine for restaurant management.
It is designed to:
- Handle all financial transactions: payroll, sales, purchases, expenses, assets, cash.
- Produce analytical and financial statements automatically.
- Support multi-branch and multi-currency operations.
- Follow proper accounting standards (GAAP-like principles).

## 2. Key Components
### 2.1 Accounts
- Each account is defined in the `Account` model.
- Types: Asset, Liability, Equity, Revenue, Expense.
- Control flags:
  - `isSystem`: system-defined account
  - `isGroup`: grouping account
  - `allowPosting`: transactions allowed

### 2.2 Accounting Periods
- Defined in `AccountingPeriod`.
- Each transaction must belong to a period.
- Status: `Open` or `Closed`.

### 2.3 Journal Entries
- Defined in `JournalEntry` with embedded `JournalLine`.
- Tracks all debit/credit movements per account.
- Supports multi-currency conversion.
- Approval workflow optional.

### 2.4 Cost Centers
- Optional, defined in `CostCenter`.
- Used to segment expenses and revenues.
- Can be required per journal line.

### 2.5 Accounting Settings
- Central configuration stored in `AccountingSettings`.
- Defines control accounts, activity → account mapping, inventory rules, fiscal period settings, and currency formatting.
- All journal entry automation is driven from here.

## 3. Workflow
1. System activity occurs (sale, purchase, payroll, etc.).
2. Accounting engine checks `AccountingSettings` to determine debit/credit accounts.
3. Journal entries are generated automatically.
4. Periodic reports are derived from posted journal entries.

## 4. Principles
- No hard-coded accounts in operational modules.
- Auditability: all actions track `createdBy`, `updatedBy`, `deletedBy`.
- Supports analytical reporting and financial statements.
