# Architecture Review

Status: **Architecture & Analysis phase.** This document records findings only — nothing in this file implies any file has been renamed, moved, or modified. See [server/BACKEND_FOUNDATION.md](BACKEND_FOUNDATION.md) for the infrastructure layer (already reviewed and fixed in a prior pass) and `docs/PROJECT_VISION_ar.md` for the product vision this architecture serves.

Scope of this review: `server/modules/**` — folder structure, naming, domain boundaries, and module classification. Business-logic-vs-settings findings (which service reads which setting, hardcoded rules, etc.) live in the conversation history that produced this document; this file focuses on structural/naming architecture per the current request.

---

## 1. Typos

| Location | Typo | Correct form | Impact |
|---|---|---|---|
| `modules/sales/rerturn-sales-settings/` | `rerturn` | `return` | Folder name is misspelled; the files inside it (`sales-return-settings.*`) are spelled correctly — the folder and its own contents disagree, which is worse than a consistent misspelling since a search for "return-settings" won't find the folder. |
| `modules/setup/inital-accounts/` | `inital` | `initial` | Inside the legacy/dead `modules/setup/` tree (see §4) — low impact since nothing imports it, but confusing if anyone opens the folder expecting `initial-accounts`. |

---

## 2. Naming Inconsistency

These are cases where a *working* module has a folder name and a file-basename that disagree, or two conceptually-identical settings modules use unrelated naming schemes. No functional bug — purely a discoverability/consistency problem (searching by one name won't find the file named the other way).

| Folder | Actual file basename | Why inconsistent |
|---|---|---|
| `modules/system/tax-settings/` | `tax-config.*` | Completely different words. This is the worst case in the codebase — grepping for "tax-settings" in filenames returns nothing; the folder name is the only clue. |
| `modules/system/service-charge-settings/` | `service-charge.*` | Folder includes the `-settings` suffix, files omit it. |
| `modules/purchasing/purchasing-settings/` | `purchase-settings.*` | Gerund ("purchasing") vs. noun ("purchase") — the domain folder itself is also `purchasing/` while the entity folder inside it is `purchase-invoice/`/`purchase-return/` (noun form), so `purchasing-settings` is the outlier even within its own domain. |
| `modules/accounting/accounting-settings/` | `accounting-setting.*` (singular) | Folder is plural, files are singular. Minor, but every other settings module keeps folder and file plurality aligned. |

**No fix is proposed here** per instructions — flagging only. A "clear improvement" would be picking one convention (`<domain>-settings` folder + matching file basename) and applying it uniformly, but that's a decision for the backlog, not this document.

---

## 3. Domain Boundary Problems

### `modules/hr/shift-settings/` — misclassified domain

**Finding:** The model's fields (`autoOpen`, `autoClose`, `allowNegativeCash`, `maxDifferenceAllowed`) describe **POS/cashier shift behavior** — opening/closing a till, tolerance for a cash-count mismatch at close-out. This is the exact conceptual surface of `modules/finance/cashier-shift` (which has `status: OPEN/COUNTED/CLOSED/POSTED`, `openingCash`, `actualCash`, `variance.amount/reason/approved`).

**Why it's misplaced:** `modules/hr/shift` (the sibling module actually under HR) is a completely different concept — employee work-shift *scheduling* (`name`, `code`, `shiftType`, `startMinutes`, `endMinutes`). It has no opening/closing/cash concept at all. A developer looking for cashier-shift configuration would reasonably search under `finance/`, not `hr/`, and would miss this module entirely.

**Corroborating evidence:** `cashier-shift.service.js` does not import or read `shift-settings` in any form (confirmed by repo-wide search) — so even functionally, nothing currently ties this settings module to the business module its fields actually describe.

No other domain-boundary violations of this severity were found — every other settings/business module pairing (accounting-settings↔accounting, loyalty-settings↔loyalty, etc.) is topically correct even where it's functionally unused (see the settings-usage findings from the prior review round).

---

## 4. Duplicate / Legacy Modules

### `modules/audit-log/` vs. `modules/system/audit-log/`

- **Active:** `modules/audit-log/` — full `model/service/controller/router/validation/index.js`, mounted at `/api/v1/audit-logs` in `router/v1/index.router.ts`, and actively written to by `middlewares/auditLogger.js` on every non-GET/error request.
- **Legacy:** `modules/system/audit-log/` — a materially richer schema was started (`module`/`collection`/`documentId`, `oldData`/`newData`/`changedFields` diffing, a 208-line constants file, a 205-line UA-parsing utils file) but `controller.js`, `service.js`, `routes.js`, `validation.js`, and `index.js` are all empty files. Not imported anywhere.
- **Both referenced?** No — only `modules/audit-log/` is referenced by anything outside its own folder. `modules/system/audit-log/` is dead weight, but both files register a Mongoose model under the identical name `"AuditLog"`; if `system/audit-log`'s model file were ever imported alongside the live one, it would throw `OverwriteModelError`.

### `modules/setup/` vs. `modules/system-setup/`

- **Active:** `modules/system-setup/` — mounted at `/api/v1/setup/initialize`, contains real, transactional bootstrap logic (creates Brand → Branch → Owner Role → Owner User).
- **Legacy:** `modules/setup/` — `initial-setup.controller.js` and `.router.js` are 100% commented out; `system-setup.service.js` (inside this legacy folder, name nearly identical to the *live* `modules/system-setup/setup.service.js` — easy to confuse) references a `./seeds/` directory and a `../../../models/` path that don't exist. `inital-accounts/` (see §1) is also fully commented out.
- **Both referenced?** No — nothing outside `modules/setup/` imports any file inside it. It is fully dead.

**Naming risk specific to this pair:** `modules/setup/system-setup.service.js` and `modules/system-setup/setup.service.js` are two different files with nearly-swapped names. Anyone skimming the directory tree is likely to open the wrong one.

---

## 5. Model Naming Consistency

Checked: Mongoose registered model name (the string passed to `mongoose.model(...)`) vs. file basename vs. folder name, across every `*.model.js` in `modules/`.

**Convention actually in force (by majority):** PascalCase registered name matching the entity (e.g. `Account`, `CashRegister`, `BranchSettings`), file basename in kebab-case matching the folder, settings models registered in **plural** form (`AccountingSettings`, `LoyaltySettings`, `BranchSettings`, `BrandSettings`, `PreparationReturnSettings`, `PreparationTicketSettings`, `PurchaseSettings`, `OrderSettings`, `NotificationSettings`, `DiscountSettings`, `SalesReturnSettings`).

**Deviations found:**

| File | Registered name | Deviation |
|---|---|---|
| `modules/finance/cash-transaction/cash-transaction.model.js` | `"cashTransaction"` | Lowercase first letter — the only model in the entire codebase not registered in PascalCase. |
| `modules/inventory/inventory-settings/inventory-settings.model.js` | `"InventorySetting"` | Singular, breaking the plural-settings convention used everywhere else. |
| `modules/hr/employee-settings/employee-settings.model.js` | `"EmployeeSetting"` | Same — singular, against the plural convention. |

No other registered-name/file/folder mismatches were found; the remaining ~90+ models follow the convention exactly.

---

## 6. Module Classification & 7. Business Responsibility

Combined into one table per domain (classification + purpose + dependency direction) to avoid repeating the same module twice. Dependency edges reflect **schema-level references** (`ObjectId ref: "X"`) since — per the prior settings-vs-business-logic review — almost no module currently contains service-layer logic that *executes* against a dependency; the graph below is what the data model implies, not what the running code does today. Where a real functional (service-calls-service) dependency exists, it's called out explicitly.

Classification key: **Core** = models the primary business transaction/entity of its domain · **Supporting** = auxiliary entity that exists to serve a Core module · **Configuration** = settings/policy document · **Infrastructure** = platform-level concern (auth, audit, tenancy) not itself a restaurant-domain concept · **Integration** = façade over another module or (eventually) external system · **Legacy** = confirmed dead code.

### Organization (tenancy backbone)
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `brand` | Core | The tenant itself — identity, currency, locale, subscription-adjacent fields (`maxBranches`, `setupStatus`) | — | almost every other module (`brand` ref) |
| `branch` | Core | A physical location under a Brand | `brand` | most operational modules (`branch` ref) |
| `brand-settings` | Configuration | SEO/social/feature-toggle/security config per brand. Only `modules.*` (feature toggles) is functionally read, via `checkModuleEnabled` | `brand` | (consumed by middleware, not by other modules directly) |
| `branch-settings` | Configuration | Operating hours, service availability, contact info, policies per branch | `brand`, `branch` | none currently consume it besides its own public read endpoints |
| `delivery-area` | Supporting | Geofenced delivery zones + fee rules, duplicates fields conceptually owned by `branch-settings.services.delivery`/`policies` | `branch` | `crm` customer address `deliveryArea` ref |

### IAM (identity & access)
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `role` | Infrastructure | RBAC permission definitions (`RESOURCE_ENUM` + per-resource CRUD/approve flags) | `brand` | `user-account` |
| `user-account` | Infrastructure | Staff login identity, linked optionally to `employee` | `brand`, `branch`, `role`, `employee` | every authenticated request (`authenticate.js`) |
| `user-auth` | Infrastructure | Login/refresh/logout flow, reuses `user-account` model | `user-account` | — |

### Audit / Setup
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `audit-log` | Infrastructure | Generic request/response audit trail, written by global middleware | `brand`, `branch`, `user-account` | — |
| `system/audit-log` | **Legacy** | Abandoned richer redesign of the above; not wired to anything | — | — |
| `system-setup` | Infrastructure | One-time tenant bootstrap (Brand+Branch+Owner) | `brand`, `branch`, `role`, `user-account` | — |
| `setup` (incl. `inital-accounts`) | **Legacy** | Superseded predecessor of `system-setup`; fully commented out or import-broken | — | — |

### Accounting
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `account` | Core | Chart of accounts entry | `brand`, `branch`, self (`parent`) | `journal-line`, `accounting-settings`, `asset-category`, `expense`, `service-charge-settings`, `tax-settings` (ref only) |
| `journal-entry` | Core | GL posting header | `brand`, `branch`, `accounting-period` | `journal-line` |
| `journal-line` | Core | GL posting line (debit/credit) | `account`, `cost-center`, polymorphic `sourceRef` | `ledger` (query target) |
| `account-balance` | Supporting | Period rollup per account | `account`, `accounting-period` | — |
| `accounting-period` | Supporting | Fiscal period open/close state | `brand`, `branch` | `journal-entry` (ref only, not enforced) |
| `cost-center` | Supporting | Cost allocation dimension | `brand`, self (`parent`) | `journal-line` |
| `ledger` | Core | Hand-written trial-balance/ledger-by-account reports | `account`, `journal-entry` | — |
| `accounting-settings` | Configuration | Control accounts, posting policy, fiscal defaults | `account` (×12 refs), `cost-center` | none currently read it |
| `accounting-reports` | **Legacy** | Superseded duplicate draft of `ledger`; broken imports, not mounted | — | — |

### Assets
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `asset` | Core | Fixed-asset register | `brand`, `branch`, `asset-category` | `asset-depreciation`, `asset-transactions`, `asset-maintenance` |
| `asset-category` | Supporting | Depreciation/disposal account mapping per category | `account` (×5) | `asset` |
| `asset-depreciation` | Supporting | Per-period depreciation entries | `asset`, `journal-entry` | — |
| `asset-maintenance` | Supporting | Maintenance events on an asset | `asset`, `supplier` | — |
| `asset-purchase-invoice` | Supporting | Asset acquisition invoice | `asset`, `cash-register` | — |
| `asset-transactions` | Supporting | Immutable movement log (purchase/depreciate/transfer/dispose) | `asset`, polymorphic ref | — |

### CRM
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `online-customer` | Core | Self-registered customer account | `brand`, `product` (favorites), `delivery-area` | `customer-auth`, `loyalty`, `product-review` |
| `offline-customer` | Core | Staff-created walk-in/phone customer | `brand`, `delivery-area` | — |
| `message` | Supporting | Inbound customer message/complaint, polymorphic sender | `brand`, `branch`, `order`, `employee` | — |
| `customer-auth` | Integration | Thin auth façade over `online-customer` (no own model) | `online-customer` | — |

### Expense
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `expense` | Supporting | Expense-type definition | `account`, `cost-center` | `daily-expense` |
| `daily-expense` | Supporting | Actual expense payment record | `expense`, `cash-register` | — |

### Finance
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `cash-register` | Core | Any cash-equivalent custody point (POS/safe/employee/suspense) | `brand`, `branch`, `account`, `employee` | `cash-transaction`, `daily-expense`, `asset-purchase-invoice` |
| `cash-transaction` | Core | Single source of truth for money movement | `cash-register`, polymorphic ref to `order`/`invoice`/`supplier-transaction`/`daily-expense` | — |
| `cash-transfer` | Supporting | Cash↔cash/bank transfer | `cash-register`, `bank-account` | — |
| `cashier-shift` | Core | POS shift open/close/reconciliation | `cash-register`(?), `account`, `journal-entry`, `attendance-record` | (should read `hr/shift-settings`, see §3 — does not) |
| `bank-account` | Supporting | Real bank account custody | `account`, `employee` | `cash-transfer` |

### HR
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `employee` | Core | Staff master record | `brand`, `branch`, `department`, `job-title` | almost every module's `createdBy`/staff refs |
| `department` | Core | Org unit | `brand` | `employee` |
| `job-title` | Core | Role/title reference data | `brand`, `department` | `employee`, `preparation-*-settings.decisionBy` |
| `attendance-record` | Core | Clock-in/out | `employee` | `cashier-shift` |
| `payroll` | Core | Payroll run | `employee`, `payroll-item` (×4 arrays) | — |
| `payroll-item` | Supporting | Formula-driven payroll component definition | `account` | `payroll` |
| `shift` | Core | Employee work-shift schedule definition | `brand` | `employee`(?), `attendance-record`(?) |
| `leave-request` | Supporting | Leave approval workflow | `employee`, `payroll-item` | — |
| `employee-advance` | Supporting | Salary advance + repayment schedule | `employee`, `employee-financial-transaction`, `payroll` | — |
| `employee-financial-profile` | Supporting | Salary/bank/payment config per employee | `employee` | — |
| `employee-financial-transaction` | Supporting | Ad-hoc bonus/deduction feeding payroll | `employee`, `payroll` | `employee-advance` |
| `employee-settings` | Configuration | Brand-wide HR policy defaults | `brand` | none currently read it |
| `shift-settings` | Configuration — **misfiled**, see §3 | POS/cashier shift policy | `brand`, `branch` | none currently read it |
| `attendance-settings` | **Legacy (stub)** | Empty placeholder | — | — |
| `payroll-settings` | **Legacy (stub)** | Empty placeholder | — | — |

### Inventory & Production
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `stock-item` | Core | Ingredient/supply master data + costing method | `stock-category`, `account` (×3) | `recipe`, `inventory`, `stock-ledger` |
| `stock-category` | Supporting | Stock item grouping | `brand` | `stock-item` |
| `inventory` | Core | Current stock balance per warehouse+item | `warehouse`, `stock-item` | — |
| `stock-ledger` | Core | Stock movement transaction log | `stock-item`, `warehouse-document` | — |
| `warehouse` | Core | Physical/logical storage location | `brand`, `branch`, `employee` (storekeepers) | `inventory`, `warehouse-document` |
| `warehouse-document` | Core | IN/OUT/TRANSFER/ADJUSTMENT movement document | `warehouse`, `stock-item`, `journal-entry` | `stock-ledger`, `inventory-count`, `stock-transfer-request` |
| `inventory-count` | Supporting | Physical count reconciliation | `warehouse`, `stock-item` | produces `warehouse-document` (by design, not implemented) |
| `stock-transfer-request` | Supporting | Inter-warehouse transfer workflow | `warehouse` (×2) | produces `warehouse-document` (by design, not implemented) |
| `consumption` | Supporting | Per-shift theoretical vs. actual usage | `preparation-section`, `stock-item` | — |
| `inventory-settings` | Configuration | Deduction/negative-stock/production policy | `brand`, `branch` | none currently read it |
| `production-order` | Core | Internal manufacturing order | `warehouse`, `stock-item` | `production-record` |
| `production-recipe` | Core | Production BOM (raw → produced stock item) | `stock-item` (×2) | `production-order` |
| `production-record` | Core | Actual production execution log | `production-order`, `production-recipe` | — |

### Loyalty
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `customer-loyalty` | Core | Points wallet per customer | `brand` | `loyalty-transaction` (functional call), `loyalty-reward` (functional call) |
| `loyalty-transaction` | Core | Earn/redeem/adjust ledger — **duplicates wallet-mutation logic independently of `customer-loyalty`, see prior review round** | `customer-loyalty`, `loyalty-reward`, `order` | — |
| `loyalty-reward` | Core | Redeemable catalog | `product` | calls `customer-loyalty` |
| `loyalty-settings` | Configuration | Earn/redeem rates, tiers, bonuses — the one settings module with real (partial) consumers | `brand` | read by `customer-loyalty.service.js` (functional) |

### Menu
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `product` | Core | Sellable catalog item (with size/extra/combo variants) | `menu-category`, `preparation-section`, self | `recipe`, `order`, `loyalty-reward`, `online-customer` (favorites) |
| `menu-category` | Core | Product categorization/hierarchy | `brand`, self | `product` |
| `recipe` | Core | Product BOM linking to `stock-item` | `product`, `stock-item` | (should drive inventory deduction — not implemented) |
| `product-review` | Supporting | Post-order rating | `order`, `product`, polymorphic reviewer | — |

### Payments
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `payment-method` | Core | Customer/POS-facing payment option | polymorphic → `cash-register`/`payment-channel` | `order`/`invoice` payment refs |
| `payment-channel` | Core | Non-cash rail (gateway/wallet/POS terminal) | `account` (×3) | `payment-method` |
| `payment-provider` | **Legacy (broken stub)** | Intended external gateway integration | — | — |
| `payment-settings` | **Legacy (stub)** | Empty placeholder | — | — |

### Preparation (Kitchen)
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `preparation-ticket` | Core | Kitchen ticket derived from an order | `order`, `preparation-section`, `employee` | — |
| `preparation-section` | Core | Kitchen station config | `brand`, `branch` | `preparation-ticket`, `product` |
| `preparation-return` | Core | Waste/return decision workflow | `sales-return`(as `returnInvoice`), `preparation-section` | — |
| `preparation-ticket-settings` | Configuration | Ticket numbering/delivery-policy/timeout | `brand`, `branch` | none currently read it |
| `preparation-return-settings` | Configuration | Waste/return decision policy | `brand`, `branch`, `preparation-section`, `job-title` | none currently read it |

### Purchasing
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `supplier` | Core | Vendor master data | `stock-item`(supplied), `asset`(supplied), `expense`(services) | `purchase-invoice`, `asset-maintenance` |
| `purchase-invoice` | Core | Purchase transaction | `supplier`, `stock-item`, `warehouse`, `payment-method`, `cash-register`, `cost-center` | `purchase-return`, `supplier-transaction` |
| `purchase-return` | Core | Return-to-supplier transaction | `purchase-invoice` | — |
| `supplier-transaction` | Supporting | Supplier balance ledger | polymorphic → `purchase-invoice`/`purchase-return` | — |
| `purchasing-settings` | Configuration | Numbering/approval/tax policy | `brand`, `branch` | none currently read it |

### Sales
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `order` | Core | Operational order lifecycle (explicitly no financial data by design) | `cashier-shift`, `table`, `product` (×items) | `invoice`, `preparation-ticket`, `loyalty-transaction`, `product-review` |
| `invoice` | Core | Financial close of an order | `order`, `cashier-shift`, `employee`, `payment-method` | `sales-return` |
| `sales-return` | Core | Return-of-sale transaction | `invoice`, `order` | `preparation-return` (as `returnInvoice`) |
| `promotion` | Core | Discount/BOGO campaign definition, never consumed at runtime | `product` (×2 arrays) | — |
| `order-settings` | Configuration | Order workflow policy | `brand`, `branch` | none currently read it |
| `invoice-settings` | Configuration | Numbering/printing/display policy | `brand`, `branch` | none currently read it |
| `sales-return-settings` (`rerturn-sales-settings/`) | Configuration | Return window/refund/approval policy | `brand`, `branch`, `job-title` | none currently read it |
| `promotion-settings` | **Legacy (stub)** | Empty placeholder | — | — |

### Seating
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `dining-area` | Core | Front-of-house zone (dine-in/takeaway/bar/etc.) | `branch` | `table` |
| `table` | Core | Physical table | `dining-area` | `order`, `reservation` |
| `reservation` | Core | Booking against a table | `table`, `online-customer`/`offline-customer`, `order` | — |

### System (cross-cutting configuration)
| Module | Class | Responsibility | Depends on | Depended on by |
|---|---|---|---|---|
| `discount-settings` | Configuration | Manual-discount limits/approval | `brand`, `branch` | none currently read it |
| `notification-settings` | Configuration | Event→role→channel notification routing | `brand`, `branch` | none currently read it |
| `print-settings` | Configuration | Receipt/printer config for a feature that doesn't exist yet (no printing code anywhere in the repo) | `brand`, `branch` | none currently read it |
| `service-charge-settings` | Configuration | Service charge calculation policy | `brand`, `branch`, `account` | none currently read it |
| `tax-settings` (`tax-config.*`) | Configuration | VAT rate/calculation policy, heavily cross-referenced by other schemas as `ref: "TaxConfig"` | `brand`, `branch`, `account` (×2) | referenced by `product`, `purchase-invoice` items (schema ref only, not read) |

---

## 8. Folder Structure Review

**Overall verdict: the domain-based folder structure (`modules/<domain>/<entity>/`) correctly reflects the business domains** — accounting, assets, crm, expense, finance, hr, iam, inventory, loyalty, menu, organization, payments, preparation, production, purchasing, sales, seating, system are all real, distinct restaurant-ERP domains and each entity generally sits under the right one, with the single confirmed exception of `hr/shift-settings` (§3).

Two structural observations beyond individual module placement:

1. **`system/` is a catch-all, not a domain.** Unlike every other top-level folder (which names an actual business area), `system/` groups five unrelated configuration modules (discount, notification, print, service-charge, tax) whose only common trait is "doesn't obviously belong to one domain." This is a reasonable pragmatic choice, not a defect — but it means `system/` will keep absorbing future cross-cutting settings, and its contents won't be discoverable by domain reasoning the way `accounting/` or `hr/` are.
2. **Two top-level trees exist purely because of historical migration, not business structure**: `audit-log/` sits at the top level (not inside a domain) while a second, abandoned copy sits inside `system/audit-log/` — and `setup/` vs. `system-setup/` similarly split across two top-level locations for the same responsibility (see §4). Neither is a "wrong domain" problem so much as leftover scaffolding from a prior restructure that was never cleaned up.

No folder is proposed to move as part of this review.

---

## Architecture Refactoring Backlog

Every issue found in this document (plus the settings-vs-business-logic findings from the prior review round, referenced where relevant), prioritized. This backlog is the candidate implementation plan for after the architecture review is fully approved — nothing here has been implemented.

### Critical
- **`loyalty-transaction.service.js` bypasses `loyalty-settings` entirely**, independently re-implementing earn/redeem/adjust without rate/tier/limit enforcement — real risk of wallet-balance desync depending on which endpoint a caller hits. (Carried over from the prior settings-vs-business-logic review; listed here because it's the one item in this whole review with genuine runtime risk today.)
- **`purchase-invoice.router.js` / `purchase-return.router.js` have no `authorize()` or `checkModuleEnabled()`** — a real security gap of the same class already fixed elsewhere in the foundation review, just missed because Purchasing wasn't in that pass's scope.

### High
- **`hr/shift-settings` is in the wrong domain** (§3) — describes cashier-shift policy, filed under HR, and isn't consumed by either `hr/shift` or `finance/cashier-shift`. Left unresolved, any future work on cashier-shift behavior is likely to either duplicate this module or never find it.
- **Two live-vs-legacy duplicate trees** (`audit-log` vs `system/audit-log`; `setup` vs `system-setup`) risk a real `OverwriteModelError` (audit-log) if the dead tree is ever accidentally imported, and active confusion from the near-identical filenames (`modules/setup/system-setup.service.js` vs `modules/system-setup/setup.service.js`).
- **`tax-settings/` folder vs. `tax-config.*` files** — the single worst naming-discoverability case in the repo; anyone searching by the domain name ("tax settings") will not find the implementation files.

### Medium
- Folder/file basename mismatches: `purchasing-settings/` ↔ `purchase-settings.*`, `service-charge-settings/` ↔ `service-charge.*`, `accounting-settings/` ↔ `accounting-setting.*` (singular/plural).
- Model registration naming outliers: `cashTransaction` (lowercase), `InventorySetting`/`EmployeeSetting` (singular vs. the plural convention used by every other settings model).
- Typo: `sales/rerturn-sales-settings/` folder name (files inside are spelled correctly).

### Low
- Typo: `setup/inital-accounts/` (inside an already-fully-dead legacy tree — cosmetic only).
- `inventory/inventory/` entity name collides conceptually with the `inventory/` domain folder name; a more specific name (e.g. reflecting "stock balance") would disambiguate it from sibling entities (`stock-item`, `stock-category`, `stock-ledger`) which all share a `stock-` prefix that this one lacks.
- `crm/message/` folder/file name is generic ("message") while the registered model name is specific and clear (`CustomerMessage`) — no functional issue, just a minor discoverability gap between what you'd search for and what's registered.

---

## Open Questions for Product/Architecture Decision

Not backlog items — decisions only the project owner can make before any of the above is actioned:

1. Should `system/` remain a catch-all, or should discount/notification/print/service-charge/tax each move under the domain they most affect (e.g. `tax-settings` → `accounting/` or `sales/`)?
2. Is Printing a planned near-term feature? If not, `print-settings` (and the printing-related fields embedded in `invoice-settings`) should probably be explicitly marked as "future/unbuilt" rather than looking like a currently-configurable feature.
3. For the two duplicate trees (audit-log, setup) — confirmed safe to delete the legacy copies once this review is approved, or is there any reason to keep them as reference?

---

# Final Architecture Review — Business ERP Perspective

Everything below evaluates the system as a business, not as code. No file has been touched to produce this section. Ratings and "missing feature" calls are judgment, not measurement — treat them as a starting point for discussion, not a verdict.

## 1–2. Why each module exists, and the dependency graph

Organized as one dependency map per business domain rather than 97 repeated paragraphs — the "why" is almost always one sentence per domain, and independence is a graph property, not a per-entity one.

```
Organization (Brand/Branch)          — the tenant itself. Depends on nothing. Everything else depends on it.
  └─ IAM (Role/UserAccount)          — depends on Organization. Nothing is usable without it.
       └─ HR (Employee)              — depends on Organization + IAM (a UserAccount may link to an Employee)
            └─ Finance (CashRegister/CashierShift) — depends on HR (custody by employee) + Accounting (account ref)
                 └─ Sales (Order/Invoice) — depends on Finance (cashier shift), Seating (table), Menu (product)
                      ├─ Preparation (Kitchen) — depends on Sales (order) + Menu (product→section)
                      ├─ Inventory  — depends on Menu (recipe→stockItem); SHOULD depend on Sales (deduction) but doesn't yet
                      ├─ Loyalty    — depends on Sales (order) + CRM (customer)
                      └─ Accounting — depends on Sales (invoice), Purchasing (invoice), HR (payroll), Assets (depreciation)
  Purchasing                         — depends on Organization + Inventory (stock-item) + Finance (payment)
  Assets                             — depends on Organization + Accounting (control accounts) + Purchasing (acquisition)
  CRM                                — depends on Organization only; independent otherwise
  Seating                            — depends on Organization (branch) only; independent otherwise
  Menu                               — depends on Organization + Inventory (recipe→stockItem); otherwise independent
  Payments                           — depends on Accounting (settlement accounts); otherwise independent
  System (discount/notification/print/service-charge/tax) — cross-cutting; conceptually depended on by Sales/Accounting, not the reverse
```

**No module in the system is truly independent** except Organization itself — every business domain ultimately roots back to Brand/Branch (correct, expected for a multi-tenant ERP) and to IAM for the identity of whoever acts. The two domains closest to standalone are **CRM** and **Seating** — both could theoretically ship and be used with almost no other domain wired up, which matches how most restaurant software actually gets adopted in stages (seating/reservations and customer records are commonly turned on before accounting or purchasing).

**Confirmed dependency inversions worth flagging** (a module depends on something that conceptually should depend on it instead):
- **Inventory should depend on Sales** (an Order should trigger a stock deduction) but currently the dependency doesn't exist in either direction — Order doesn't know Inventory exists.
- **Accounting should depend on almost everything** (it's the financial mirror of every transaction) but currently nothing posts to it — the dependency is declared in schema refs (`journal-line.sourceRef`) but never exercised.

## 3. Module Ownership — who owns which business object

| Business Object | Rightful Owner | Currently Owned By | Conflict? |
|---|---|---|---|
| Product sell price | Menu (`Product.price`) | Menu only | No conflict |
| Product **cost** | Should be Inventory/Recipe (derived from `StockItem` cost × `Recipe.ingredients`) | Nobody — no module computes or stores a derived product cost anywhere | **Gap, not conflict** — no owner exists yet |
| Stock quantity | Inventory (`Inventory.quantity`) | Inventory only, but never written to by any other module | No conflict, but functionally orphaned (see §7) |
| Stock costing method | Should be Inventory (`inventory-settings.costMethod`, if it existed) | Currently `StockItem.costMethod`, set once per item at creation | **Design gap**: per-item costing method with no brand-level default or override is unusual for an ERP — normally costing method is a brand/warehouse policy, not a per-SKU choice |
| Customer identity | CRM (`OnlineCustomer`/`OfflineCustomer`) | CRM | No conflict |
| Customer loyalty points balance | Loyalty (`CustomerLoyalty.points`) | **Duplicated**: `OnlineCustomer.loyalty.{points,tier}` embeds a second, independent copy with its own tier thresholds (500/2000/5000) that don't match `LoyaltySettings.tiers` (100/500/1000) | **Real conflict** — two sources of truth for the same fact, with different values |
| Delivery fee/eligibility policy | Should be one of `DeliveryArea` or `BranchSettings.services.delivery`/`policies` | Both — independently, with no inheritance | **Real conflict** |
| Tax rate | System (`TaxConfig`) | `TaxConfig`, but `purchase-invoice.isTaxInclusive` and `invoice` tax fields are independent per-document flags that ignore it | **Real conflict** — brand-level tax policy exists but every document can silently disagree with it |
| Refund type default (purchase returns) | Should be `purchase-settings.purchaseReturn.defaultRefundType` | `purchase-return.model.js`'s own hardcoded default, which doesn't even match the settings model's default value | **Real conflict** |
| Employee leave-policy defaults | Should be `employee-settings.leavePolicy` | Duplicated as independent hardcoded defaults directly on `Employee.model.js` | **Real conflict** |
| Payroll salary/currency | HR (`employee-financial-profile`) | HR, no conflict | No conflict |
| Accounting control accounts (which GL account cash/AR/inventory posts to) | Accounting (`accounting-settings.controlAccounts`) | Accounting, no conflict, but never read (see §6) | No conflict, but unused |
| Cash register custody | Finance (`CashRegister.employee`) | Finance | No conflict |
| Table/seating status | Seating (`Table.status`) | Seating, but nothing transitions it from Order/Reservation lifecycle events | **Gap** — no owner actively drives the field even though one is declared |

**Overall finding:** the ERP has **more silent duplication than active multi-module contention** — the more common failure mode here isn't "two modules fighting over one field," it's "two independent copies of the same fact that were never reconciled" (loyalty tiers, delivery policy, tax inclusivity, leave-policy defaults). This is a natural consequence of building each module's schema in isolation, exactly the risk the "always analyze the whole feature, not one schema" principle from our last discussion is meant to prevent going forward.

## 4. Business Events — conceptual catalog (not implemented anywhere today)

No event system exists in the codebase (this was already established as a future "Workflow/Event Engine"). This section documents what the event catalog *should* look like once one exists, based on the business objects and lifecycle already implied by the schemas.

| Event | Produced by | Should be consumed by |
|---|---|---|
| `OrderCreated` | Sales | Preparation (create tickets), Seating (mark table occupied) |
| `OrderConfirmed` | Sales | Preparation, Inventory (reserve/deduct), Notifications |
| `OrderItemReady` | Preparation | Sales (update item status), Notifications (notify waiter) |
| `OrderClosed` / `InvoiceCreated` | Sales | Accounting (post journal), Inventory (finalize deduction), Loyalty (earn points), Printing (print receipt), Notifications |
| `InvoicePaid` | Sales/Finance | Accounting (cash movement), Finance (cashier-shift running totals) |
| `SalesReturnApproved` | Sales | Preparation (waste/return decision), Accounting (reversing entry), Inventory (restock if applicable), Finance (refund) |
| `PurchaseInvoicePosted` | Purchasing | Inventory (stock increase), Accounting (journal), Finance (supplier payment due) |
| `StockBelowThreshold` | Inventory | Notifications (alert relevant roles) |
| `ProductionOrderCompleted` | Production | Inventory (increase produced item, decrease raw materials), Accounting (cost transfer) |
| `CashierShiftClosed` | Finance | Accounting (post shift journal), HR (attendance correlation) |
| `EmployeeClockIn`/`ClockOut` | HR | Payroll (attendance feeds payroll), Finance (cashier-shift correlation) |
| `LeaveRequestApproved` | HR | Payroll (deduction/accrual), Attendance (auto-generate records) |
| `ReservationConfirmed` | Seating | Notifications (customer confirmation), CRM |
| `AssetDepreciationRun` | Assets | Accounting (journal entry) |
| `LoyaltyPointsEarned`/`Redeemed` | Loyalty | Notifications, CRM (customer profile update) |

**Finding:** almost every "Consumed by" cell above describes an integration that **does not exist today** — this table is effectively the specification for the future event engine, not a description of current behavior. The one domain where an event-consumption pattern already exists in embryonic form is Loyalty (`customer-loyalty.service.js` calling into `loyalty-settings.service.js` synchronously) — everything else would need to be built from zero.

## 5. Business Workflow — the real end-to-end lifecycle

**Primary revenue workflow (as the system *should* work, annotated with what's actually implemented today):**

```
Customer creates Order                          ✅ implemented (generic CRUD)
  ↓
Cashier/system approves                          ❌ no approval concept exists — status is freely settable
  ↓
Kitchen receives ticket                           ⚠️ PreparationTicket model exists, but nothing auto-creates it from Order
  ↓
Kitchen completes                                 ⚠️ status field exists, no transition logic, no notification
  ↓
Waiter serves                                     ❌ no waiter-facing state or notification exists
  ↓
Invoice closes                                    ⚠️ Invoice model exists but computes nothing from Order — client must supply all totals
  ↓
Inventory deducted                                ❌ no code path connects Invoice/Order to Inventory at all
  ↓
Accounting Journal created                        ❌ no code path connects Invoice to JournalEntry at all
  ↓
Loyalty updated                                   ⚠️ possible via manual API call to customer-loyalty; not triggered by Invoice/Order
```

**Secondary workflows** (equally unimplemented as *connected* flows, though each step's data model exists in isolation):

- **Procure-to-pay**: Supplier → PurchaseInvoice → (should trigger) Inventory increase + Accounting journal + Supplier balance update. Currently: three independent CRUD endpoints with schema refs but no triggering.
- **Hire-to-retire**: Employee created → Attendance tracked → Leave requested/approved → Payroll calculated → Payslip. Currently: five independent CRUD endpoints; `PayrollItem`'s formula engine (the piece meant to compute Payroll from Attendance/Leave) has no interpreter.
- **Asset lifecycle**: Purchase → Depreciate (periodic) → Maintain → Dispose. Currently: four independent CRUD endpoints; depreciation schedule fields exist but nothing runs the schedule.
- **Loyalty lifecycle**: Order closed → Points earned → Tier recalculated → Reward redeemed → Points expire. Currently: the earn/tier steps work end-to-end **only when called manually through `customer-loyalty`**; expiry doesn't exist; the redemption step works but doesn't ledger correctly (see prior review's `loyalty-transaction` finding).

**This confirms, at the business-workflow level, the same conclusion the earlier code-level review reached: the system currently ships ~20 well-modeled business entities with almost no connective tissue between them.** The "workflow" that exists is entirely manual — a human (or a future integration layer) must call each module's API in the right order themselves; the system enforces none of the sequencing.

## 6. Settings Ownership — prescriptive (who *should* read each setting, and when)

Applying the agreed litmus test ("would a restaurant owner reasonably want to change this from a settings screen?") plus the 5-question framework from the prior discussion. Only settings that pass are listed as genuinely necessary; the rest are flagged.

| Settings Module | Should be read by | At what point | Decision it controls | Verdict |
|---|---|---|---|---|
| `accounting-settings.controlAccounts` | Any service posting a JournalEntry | At journal-entry creation time, to resolve which GL account to debit/credit | Which account absorbs a given transaction type | **Necessary** — this is a textbook ERP setting (every ERP has a "default accounts" config) |
| `accounting-settings.journalEntry.requireApproval` | `journal-entry.service.js` | Before allowing `status: Posted` | Whether a second person must approve a journal entry | **Necessary** |
| `accounting-settings.inventoryAccounting.*` | Inventory deduction logic (once built) | At the moment stock is consumed | Which account absorbs wastage vs. COGS vs. adjustment | **Necessary** |
| `inventory-settings.allowNegativeStock` | Order confirmation / stock deduction logic (once built) | Before decrementing `Inventory.quantity` | Whether to block or allow the sale | **Necessary** — one of the most commonly-changed restaurant settings in real ERPs |
| `inventory-settings.costMethod` (proposed relocation from `StockItem`, see §3) | Inventory valuation logic (once built) | At every stock movement | FIFO/LIFO/WeightedAverage costing | **Necessary**, but currently mis-owned at the item level instead of brand level |
| `inventory-settings.autoDeductOnOrder` / `enableProduction` / `productionAutoApprove` | Order service / Production service | At order-confirm / production-order creation | Timing and approval of stock/production side effects | **Necessary** |
| `order-settings.requireManagerApprovalForCancel`, `cancelReasonRequired` | `order.service.js` | On cancel/void attempt | Whether staff can cancel freely or need a manager override | **Necessary** — extremely common real-world restaurant control |
| `order-settings.allowSplitPayment`, `allowPartialPayment` | Invoice payment logic | At payment time | Payment flexibility | **Necessary** |
| `order-settings.orderSequence.*` | Order creation | On create | Numbering format | Borderline — most owners don't touch numbering format once set; still reasonable as a one-time setup setting, not a "necessary" runtime toggle |
| `invoice-settings.show*` display flags, `receiptHeader/Footer` | Printing (once it exists) | At print time | Receipt layout/content | **Necessary once Printing exists** — currently premature |
| `invoice-settings.roundingPolicy` | Invoice total computation (once built) | At total calculation | Currency rounding | **Necessary** |
| `discount-settings.maxManualDiscount`, `requireManagerApproval`, `approvalThreshold` | Order/Invoice discount application | At discount-entry time | Discount ceiling and approval gate | **Necessary** — this is exactly the kind of policy owners change constantly |
| `service-charge-settings.*` | Invoice total computation | At total calculation | Whether/how much service charge applies | **Necessary** |
| `tax-settings.*` | Invoice/PurchaseInvoice total computation | At total calculation | Tax rate and inclusive/exclusive method | **Necessary**, and must become the single source of truth (see §3 conflict) |
| `preparation-ticket-settings.autoSendToWaiter`, `deliveryPolicy`, `allowRejectTicket`, `autoMergeTickets` | Preparation service (once built) | On ticket status change | Kitchen-to-floor handoff behavior | **Necessary** |
| `preparation-ticket-settings.maxPreparationTime` | Preparation service | Continuously (timeout check) | Late-ticket alerting | **Necessary** |
| `preparation-return-settings.allowWaste/allowReturnToStock/allowResellable`, `requireSupervisorReview` | Preparation-return service | At return-decision time | What staff are allowed to decide about returned food | **Necessary** |
| `sales-return-settings.maxReturnMinutes`, `requireManagerApproval`, `approvalThresholdAmount` | Sales-return service | At return-creation time | Return eligibility window and approval | **Necessary** |
| `purchasing-settings.requireApprovalBeforePosting`, `preventNegativeStock` | Purchase-invoice/return service | At posting time | Purchasing approval gate | **Necessary** |
| `loyalty-settings.*` (all 12 fields) | `customer-loyalty.service.js` (already does, for 8 of 12) | At earn/redeem/tier time | Point economics | **Necessary** — already proven useful, extend to the 4 unused fields once expiry/bonus features are built, don't remove them |
| `employee-settings.employeeCode.*` | Employee creation (once code-generation exists) | At employee creation | Employee code format | **Necessary once the feature exists** — currently premature, not unnecessary |
| `employee-settings.probation.*` | A scheduled job (once it exists) | Periodic/on hire-date+duration | Auto-confirm employment status | **Necessary once the feature exists** |
| `employee-settings.accountPolicy.*` | Employee→UserAccount creation flow (once it exists) | At employee creation | Whether/how a login account is auto-created | **Necessary once the feature exists** |
| `brand-settings.seo.*`, `socialMedia.*` | A future public storefront/menu page | At page render | Public-facing brand presentation | Legitimate setting, just not consumed by anything in this backend (frontend concern) — **not unnecessary, just out of backend scope** |
| `brand-settings.maintenanceMode` | A global request-gating middleware (doesn't exist) | On every request | Whether the brand's storefront is down for maintenance | **Necessary**, currently unbuilt |
| `branch-settings.operatingHours`, `services.*`, `reservation.*` | Public menu/ordering flow + Reservation service | At order/reservation creation | Whether the branch can accept an order/reservation right now | **Necessary** — and note this should be the *single* owner of delivery/service policy, resolving the §3 conflict with `DeliveryArea` |
| `print-settings.*` | Printing (doesn't exist) | At print time | Printer/receipt hardware config | **Premature, not unnecessary** — flag as "designed ahead of the feature," revisit when Printing is actually scoped |
| `notification-settings.*` | Notification engine (doesn't exist) | On every business event | Who gets notified, by what channel | **Necessary once Notifications exists**, currently premature |

**Nothing in the current settings surface should be deleted as genuinely unnecessary** — every field maps to a real, plausible owner decision. The correct framing isn't "remove these," it's **"most of them are waiting on business logic that hasn't been built yet."** This matches the earlier finding precisely.

## 7. Missing Features (ERP concepts not yet represented)

| Domain | Missing Concept | Why it matters |
|---|---|---|
| Inventory | **Stock Adjustment** (manual correction outside a count/transfer) | Every ERP needs a way to correct stock without a full cycle count |
| Inventory | **Approval chain for Stock Transfer** | `StockTransferRequest` has an `Approved` status but no approver/threshold concept |
| Inventory | **Reorder point automation** (auto-generate PO draft at low stock) | Currently `lowStockThreshold` exists but triggers nothing |
| Accounting | **Bank reconciliation** | No concept of matching bank statement lines to `CashTransaction`/`BankAccount` |
| Accounting | **Multi-currency revaluation** | `currencySettings` exists but no FX gain/loss handling |
| Accounting | **Recurring/template journal entries** | Common for rent, depreciation, amortized expenses |
| Purchasing | **Purchase requisition / RFQ before PO** | Currently jumps straight to `PurchaseInvoice`; no request-for-quote or purchase-order-before-invoice stage |
| Purchasing | **Three-way match** (PO vs. Goods Receipt vs. Invoice) | Standard ERP control against over-billing; no Goods Receipt concept exists separate from the invoice itself |
| Purchasing | **Landed cost allocation** (freight/customs spread across items) | Relevant for imported ingredients |
| Sales | **Split bill / bill transfer between tables** | Common restaurant requirement, no model support |
| Sales | **Void/comp with reason + approval**, separate from cancellation | Currently only generic status change |
| Sales | **Table transfer / merge** | `Table`/`Order` have no transfer concept |
| HR | **Time-off accrual engine** | `leavePolicy` has static day counts, no accrual-over-time logic |
| HR | **Performance review / disciplinary record** | Not represented at all |
| HR | **Termination/offboarding workflow** | `Employee.status` includes terminated states but no workflow (asset return, final settlement) |
| CRM | **Customer segmentation / campaign targeting** | `tags[]` exists on `OfflineCustomer` but no segment/campaign concept |
| Loyalty | **Points expiry job** | Field exists (`expirePointsAfterMonths`), no execution |
| Loyalty | **Referral tracking** | `referralBonusPoints` exists, no referral-code/attribution model |
| Assets | **Disposal approval workflow** | `AssetTransactions` supports a `Disposal` type but no approval gate |
| Assets | **Insurance/warranty tracking** | Not represented |
| Seating | **Waitlist** | Only direct reservation exists, no waitlist-when-full concept |
| Payments | **Refund/chargeback handling** | `PaymentMethod`/`PaymentChannel` model the happy path only |
| Payments | **Settlement reconciliation** (channel fees vs. bank deposit) | `PaymentChannel.feesPercentage/feesFixed` exists but nothing reconciles against it |
| Cross-cutting | **Approval framework** (generic, reusable across Purchasing/Sales-Return/Journal-Entry/Stock-Transfer) | Every domain above independently *wants* an approval gate; none share a common mechanism — worth designing once, not five times |

## 8. Module Readiness

Rated 1–5 stars. **Architecture** = does the code structure/pattern support building the feature well · **Business Logic** = how much of the actual workflow is implemented · **Data Model** = schema completeness/correctness · **API Design** = REST surface quality · **Integration** = how well it's wired to other modules · **Overall** = practical readiness to demo as a working feature today.

| Domain | Architecture | Business Logic | Data Model | API Design | Integration | Overall |
|---|---|---|---|---|---|---|
| Organization | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ |
| IAM | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |
| Accounting | ★★★★☆ | ★☆☆☆☆ | ★★★★★ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Assets | ★★★★☆ | ★☆☆☆☆ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ |
| CRM | ★★★★☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ |
| Expense | ★★★★☆ | ★☆☆☆☆ | ★★★☆☆ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Finance | ★★★★☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ |
| HR | ★★★★☆ | ★☆☆☆☆ | ★★★★★ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Inventory/Production | ★★★★☆ | ★☆☆☆☆ | ★★★★★ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Loyalty | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ |
| Menu | ★★★★★ | ★★☆☆☆ | ★★★★★ | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ |
| Payments | ★★★☆☆ | ★☆☆☆☆ | ★★★☆☆ | ★★☆☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Preparation/Kitchen | ★★★★☆ | ★☆☆☆☆ | ★★★★☆ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Purchasing | ★★★★☆ | ★☆☆☆☆ | ★★★★☆ | ★★☆☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Sales | ★★★★☆ | ★☆☆☆☆ | ★★★★☆ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Seating | ★★★★☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ |
| System (settings) | ★★★★☆ | n/a (config, not logic) | ★★★★☆ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ |

**Pattern:** Architecture and Data Model consistently score 4–5 across the board — the scaffolding (`BaseService`/`BaseController`/`joiFactory`) and schema design are genuinely strong. Business Logic and Integration consistently score 1–2 everywhere except Loyalty/CRM/Seating/IAM. **This single pattern is the whole story of the codebase's current state**: a very well-architected shell around almost no implemented business behavior.

## 9. ERP Best Practices — conceptual comparison

Comparing concepts only, not implementation, against Odoo / ERPNext / SAP Business One / Microsoft Dynamics / NetSuite:

- **Chart of Accounts & Journal Posting**: All five reference ERPs auto-post journal entries from operational documents (sales invoice, purchase invoice, payroll run) via a configurable "posting rule" per document type — exactly what `accounting-settings.activities.*` is modeled to do. The gap here isn't design, it's that no poster exists yet. This is the single most important parity gap with real ERPs.
- **Inventory Costing**: Odoo/ERPNext/NetSuite all treat costing method (FIFO/Average/Standard) as a **company or product-category-level policy**, with per-item override as the *exception* not the default. The current design (`StockItem.costMethod` mandatory per item, no brand default) inverts this — worth reconsidering in the redesign phase.
- **Three-Way Match**: SAP B1/NetSuite/Dynamics all enforce PO→Receipt→Invoice matching before payment. This project has no Purchase Order or Goods Receipt concept distinct from the invoice itself — a structural gap, not just a missing feature toggle.
- **Approval Workflows**: every reference ERP has a generic, reusable approval-workflow engine (approve based on role + amount threshold) applied consistently across modules (PO, journal entry, discount, stock adjustment). This project has the *concept* scattered as one-off boolean flags per settings module (`requireApprovalBeforePosting`, `requireManagerApproval`, `requireSupervisorReview`, ×6 independent implementations) rather than one shared mechanism — directly relevant to the "Permission Engine" / approval-chain discussion from earlier in this review process.
- **Settings/Configuration Layering**: Odoo's `ir.config_parameter` + company-level settings, ERPNext's "Settings" doctypes, and this project's per-domain settings modules are conceptually equivalent — this part of the design is already aligned with how real ERPs organize configuration (one settings document per functional area, not one giant global config).
- **Loyalty/CRM as a bolt-on module**: Dynamics/NetSuite treat loyalty as an add-on to a broader CRM/marketing module, not a standalone points ledger. This project's Loyalty is more tightly scoped (points/tiers/rewards only) — reasonable for a restaurant vertical, not a gap.
- **Kitchen Display / Production**: this is restaurant-vertical-specific and has no direct analogue in general ERPs (Odoo's "Point of Restaurant" module is the closest comparison) — the ticket/section/delivery-policy model here is appropriately scoped and comparable in shape to Odoo POS's kitchen-order-ticket concept.

## 10. ERP Roadmap

Every item states why it belongs in its phase — sequencing is driven by what later phases structurally depend on, not by feature importance alone.

### Phase 1 — Foundation
*Must exist before any business workflow can be trusted, because every later phase depends on these being correct.*
- Resolve the ownership conflicts in §3 (loyalty tiers, delivery policy, tax inclusivity, leave-policy defaults) — building Phase 2 features on top of duplicated truth guarantees the duplication gets worse, not better.
- Fix `loyalty-transaction` bypassing settings (Critical, carried from the structural review) — the only item in this whole review with active runtime risk today.
- Close the Purchasing RBAC/module-toggle gap (Critical, carried from the structural review).
- Decide and design the shared **Approval Framework** referenced in §9 — six domains independently want this; building it once now avoids five more one-off implementations in Phase 2.
- Decide the Printing question (Open Question #2) — several Phase 2 workflows (Order→Invoice close) implicitly assume printing exists.

### Phase 2 — Core ERP
*The primary revenue loop — nothing else in the product matters commercially until this works end-to-end.*
- Order → Invoice computation (totals, tax via `TaxConfig`, discount via `discount-settings`, service charge via `service-charge-settings`) — this is the single highest-value gap identified anywhere in this review.
- Invoice → Inventory deduction (using `inventory-settings.autoDeductOnOrder`/`allowNegativeStock`/`costMethod`, relocated to brand-level per §3).
- Invoice → Accounting journal posting (using `accounting-settings.activities.sales` control accounts).
- Order → Kitchen ticket auto-generation and status-driven handoff (`preparation-ticket-settings`).
- Basic event notifications for the above (even a synchronous in-process version — the full Event Engine can come later; the *behavior* matters more than the mechanism at this stage).

### Phase 3 — Advanced ERP
*Depends on Phase 2 existing and being trustworthy — these are refinements and secondary workflows, not new revenue paths.*
- Procure-to-pay completion: Purchase → Inventory increase → Accounting journal → Supplier balance (mirrors Phase 2's pattern, applied to Purchasing).
- Payroll calculation engine (interpret `PayrollItem` formula tokens) — HR's Business Logic score is the lowest in the review for a reason; this is its single biggest unlock.
- Loyalty completion: points expiry job, referral tracking, unify the reward-redemption ledger gap.
- Asset depreciation scheduler + disposal approval workflow.
- Stock Adjustment, Cycle Count execution, and Transfer approval (the Inventory items from §7) — these depend on Inventory deduction already being real from Phase 2, otherwise there's nothing to adjust against.
- Three-way match (PO→Receipt→Invoice) — requires introducing a Goods Receipt concept, a genuine data-model addition, hence Phase 3 not Phase 1.

### Phase 4 — Enterprise Features
*Valuable at scale, not required for the product to be usable — appropriately deferred.*
- Multi-currency revaluation and bank reconciliation (Accounting).
- Generic Event/Workflow Engine formalized as reusable infrastructure (superseding the synchronous Phase 2 notifications and the settings-embedded approval flags with a real event bus) — this is the "Workflow/Event Engine" discussed earlier as the third foundational engine; it only pays for itself once there are enough real events (from Phases 2–3) to justify the infrastructure.
- Customer segmentation/campaign targeting (CRM).
- Settlement reconciliation against payment-channel fees.
- Full Printing subsystem (templates, multi-format receipts) — reasonable to build once Phase 2's Invoice totals are actually correct; printing an incorrect total earlier would be worse than not printing at all.
- Waitlist (Seating) — a genuine enhancement, not a blocker to anything else in the system.

---

# FINAL ARCHITECTURE REVIEW — Architecture Freeze Candidate

This section is the closing pass. Where a question was already answered in full above, it's referenced rather than repeated (module classification, readiness stars, settings-vs-workflow ownership, and the phased roadmap already exist above and are not duplicated here — only refined where this pass adds something new). Genuinely new material — state machines, business rules, module interfaces, event status, external integrations, and the missing workflow types — is written out in full.

## 1. Module Review

Already delivered in full above as the combined **§6 Module Classification & Business Responsibility** tables (Business Purpose = "Responsibility" column, Inputs/Outputs = the schema fields discussed per domain, Dependencies/Depended-on-by = the explicit columns, Completeness = the §12 Readiness stars below). Not repeated here to avoid two divergent copies of the same 97-module table existing in one document.

## 2. Business Workflow (complete set, including the workflows not yet documented)

The revenue workflow (Customer Order) and four secondary workflows (Procure-to-pay, Hire-to-retire, Asset lifecycle, Loyalty lifecycle) are already documented above in **§5 Business Workflow**. The remaining named workflows:

**Customer Reservation**
Start: customer/staff creates `Reservation` against a `Table` → Intermediate: confirmed → (optionally) linked to an `Order` on arrival → End: completed or no-show/cancelled. Modules: Seating (owner), CRM (customer identity), Sales (linked order). Events: `ReservationConfirmed`, `ReservationCheckedIn` (no such state exists today — see §3 state machine below), `ReservationCompleted`/`NoShow`. **Status: data model only — no overlap-prevention logic, no reminder/notification trigger, no auto-transition on order creation.**

**Purchasing**
Start: `PurchaseInvoice` created against a `Supplier` → Intermediate: (should be Draft→Review→Approved, per schema) → posted → payment recorded → End: fully paid/closed. Modules: Purchasing (owner), Inventory (should receive stock), Accounting (should post journal), Finance (payment). **Status: CRUD only — the approval states exist in the schema enum but nothing transitions or enforces them; no downstream trigger to Inventory or Accounting.**

**Inventory Receiving**
Start: goods physically arrive against a `PurchaseInvoice` → Intermediate: quantity/quality check → `WarehouseDocument` (type IN) created → `Inventory.quantity` increased → `StockLedger` entry written → End: stock available for use. Modules: Inventory (owner), Purchasing (source document). **Status: fully unimplemented — no code path connects `PurchaseInvoice` to `WarehouseDocument`/`Inventory` at all; this is also the "Goods Receipt" concept flagged as structurally missing in the ERP Gap Analysis.**

**Production**
Start: `ProductionOrder` created for a `stockItem` using a `ProductionRecipe` → Intermediate: materials consumed (should decrement raw `StockItem` quantities) → `ProductionRecord` logs actual usage/cost → End: produced item's stock increased. Modules: Production (owner), Inventory (both consumer and beneficiary). **Status: fully unimplemented — the recipe/order/record triad exists as three independent CRUD collections with no material-consumption or stock-increment logic.**

**Kitchen**
Start: `Order` confirmed → `PreparationTicket` created per section → Intermediate: PENDING→PREPARING→READY, optional REJECTED → handoff to waiter → End: DELIVERED. Modules: Preparation (owner), Sales (source), Menu (product→section routing). **Status: data model only — no auto-ticket-creation from Order, no status-transition enforcement, no waiter notification.**

**Cashier**
Start: `CashierShift` opened (opening cash counted) → Intermediate: `CashTransaction`s accrue against the register → close initiated → actual cash counted → variance computed → End: shift `POSTED` (should trigger an Accounting journal). Modules: Finance (owner), HR (attendance correlation), Accounting (posting). **Status: CRUD only — variance/status fields exist, but nothing computes `expected.netCash` from transactions, nothing blocks closing with a discrepancy beyond `maxDifferenceAllowed` (which is itself unread — see the `shift-settings` domain-boundary finding above), and no journal is posted on `POSTED`.**

**Payroll**
Already covered under Hire-to-retire above — repeated here only to note explicitly: Start `Payroll` run created → Intermediate: earnings/deductions computed from `PayrollItem` formulas + `AttendanceRecord` + `EmployeeFinancialTransaction` → approved → End: paid, `netSalary` finalized. **Status: the formula interpreter is the single largest unbuilt piece of business logic identified anywhere in this review.**

**Accounting / Financial Closing**
Start: `AccountingPeriod` open → Intermediate: journal entries post throughout the period from every operational module → period-end adjustments (depreciation, accruals) → period locked (`isLocked`) → End: closed, feeds `AccountBalance` rollups and financial statements. Modules: Accounting (owner), every transactional module (source of postings), Assets (depreciation). **Status: `AccountingPeriod.status`/`isLocked` exist but nothing checks them before allowing a journal entry to post into a closed period — this is a real control gap, not just a missing feature.**

**Expense**
Start: `Expense` type defined → `DailyExpense` payment recorded against a `CashRegister` → Intermediate: none (single-step) → End: recorded, should post to Accounting via `activities.expense`. Modules: Expense (owner), Finance (payment source), Accounting (should consume). **Status: CRUD only, no posting.**

## 3. Entity State Machines

Documented as designed-intent lifecycles based on the status enums already present in each schema — annotated with whether the transition is actually enforced in code today.

**Order** (`order.model.js` status enum, annotated against what's enforced)
```
OPEN → IN_PROGRESS → READY → DELIVERED → CLOSED
                                        ↘ CANCELLED (from any pre-CLOSED state)
```
Enforcement: **none** — `status` is a free field settable via the generic `PUT /:id`; any transition (including CLOSED→OPEN) is currently possible.

**Invoice** (`invoice.model.js`)
```
OPEN → PAID → PARTIALLY_RETURNED → FULLY_RETURNED
    ↘ CANCELLED
```
Enforcement: **none**. Business rule that *should* apply (see §5 below): once `PAID`, most fields should become immutable except through a `SalesReturn`.

**Purchase Invoice** (`purchase-invoice.model.js`)
```
Draft → Review → Approved → Completed
              ↘ Rejected      ↘ Cancelled
```
Enforcement: **none** — default status is `Completed`, meaning invoices bypass the Draft/Review/Approved states entirely by default rather than starting at `Draft`.

**Purchase Return** (`purchase-return.model.js`)
```
Draft → (approval) → Posted
     ↘ Cancelled
```
Enforcement: **none**.

**Reservation** (`reservation.model.js`)
```
pending → confirmed → seated → completed
                    ↘ cancelled
                    ↘ no_show
```
Enforcement: **none** for transitions; the overlap-prevention rule (§5) is not enforced despite an index existing that could support checking it.

**Preparation Ticket** (`preparation-ticket.model.js`)
```
PENDING → PREPARING → READY → (delivery: WAITING → HANDED_OVER)
                    ↘ CANCELLED / REJECTED
```
Enforcement: **none**.

**Preparation Return** (`preparation-return.model.js`)
```
<item-level decision: WASTE | RETURN_TO_STOCK | RESELLABLE> → (header status) → FINALIZED (immutable per `ticketImmutableAfterFinalize`)
```
Enforcement: **none** — nothing currently blocks editing after finalize despite the setting existing specifically to control this.

**Cashier Shift** (`cashier-shift.model.js`)
```
OPEN → COUNTED → CLOSED → POSTED
```
Enforcement: **none** for the transition sequence; `variance.approved` exists but nothing gates `CLOSED`→`POSTED` on approval.

**Stock Transfer Request** (`stock-transfer-request.model.js`)
```
Draft → Submitted → Approved → Executed
               ↘ Rejected
```
Enforcement: **none** — and per §2, "Executed" is supposed to generate `WarehouseDocument`s that it currently doesn't.

**Journal Entry** (`journal-entry.model.js`)
```
Pending → Posted
       ↘ Rejected
```
Enforcement: **none** — `requireApproval` setting exists (§ Settings Review) but nothing gates the Pending→Posted transition on it.

**Production Order** (`production-order.model.js`)
```
Pending → approved → (execution, produces ProductionRecord) → completed
       ↘ rejected / canceled
```
Enforcement: **none**.

**Employee** (`employee.model.js` status field)
```
active → probation → active (confirmed)
                   ↘ terminated
                   ↘ suspended
```
Enforcement: **none** — `statusRules.allowManualStatusChange`/`allowRehireAfterTermination` settings exist but are unread (§ Settings Review).

**Table** (`table.model.js`)
```
available → occupied → cleaning → available
         ↘ reserved (from Reservation)
         ↘ maintenance / out_of_service
```
Enforcement: **none** — no code transitions this field from Order or Reservation lifecycle events, despite it being the field's entire reason to exist.

**Common pattern across every state machine above: the enum is always well-designed; the transition logic enforcing it never exists.** This is the single most repeated finding in this entire review, now confirmed at the state-machine level specifically.

## 4. Source of Truth (canonical ownership table)

Expands §3 of the Business ERP Perspective section above into the exact Owner/Modify/Read-only format requested. Objects already flagged as conflicted there are marked again here for visibility.

| Business Object | Owner (writes) | May Read | Conflict? |
|---|---|---|---|
| Customer Points Balance | Loyalty (`CustomerLoyalty`) | Sales, CRM, POS/Cashier, Reports | **Conflict** — `OnlineCustomer.loyalty.{points,tier}` is a second writer with different tier thresholds |
| Product Price | Menu | Sales, Loyalty (reward valuation) | None |
| Product Cost | *No owner exists* | — | Gap, not conflict (§3 above) |
| Stock Quantity | Inventory | Menu (availability display, not implemented), Sales (should read before allowing order), Purchasing (should write on receipt) | None currently, but functionally orphaned — nothing writes to it besides direct API calls |
| Order Status | Sales | Preparation (should read to drive tickets), Seating (should read to drive table status) | None — just unconsumed |
| Invoice Totals | Sales/Invoice | Accounting (should read to post), Loyalty (should read to compute points) | None — just unconsumed |
| Tax Rate/Policy | System (`TaxConfig`) | Sales, Purchasing | **Conflict** — Invoice/PurchaseInvoice carry their own independent tax flags |
| Delivery Policy | *Contested* | Sales (checkout), CRM (address validation) | **Conflict** — `DeliveryArea` and `BranchSettings.services.delivery`/`policies` both claim ownership |
| Employee Leave Policy Defaults | Should be `employee-settings.leavePolicy` | HR (leave-request approval) | **Conflict** — `Employee.model.js` hardcodes its own independent defaults |
| GL Control Accounts | Accounting (`accounting-settings.controlAccounts`) | Any posting service (Sales, Purchasing, Payroll, Assets) | None — just unconsumed |
| Cash Register Balance | Finance (`CashRegister`/`CashierShift`) | Accounting (should read to post shift journal) | None — just unconsumed |
| Table Status | Seating | Sales (should write on order open/close), Reservation (should write on check-in) | None currently — nobody writes it except direct API calls, so there's no conflict, just no driver |
| Refund Type Default (Purchase Return) | Should be `purchasing-settings.purchaseReturn.defaultRefundType` | Purchasing | **Conflict** — model's own hardcoded default disagrees with the setting's default |

**Every conflict listed here was already identified in §3 above** — repeated in this canonical Owner/Read format per the request, not newly discovered.

## 5. Business Rules (not settings, not permissions, not field validation)

These are invariants the business logic should enforce regardless of any Settings toggle — the kind of rule that, if violated, produces a factually wrong business outcome, not just an unwanted-but-valid one.

1. **An Order cannot be edited once its items have been sent to the kitchen** (the *ability* to lock is a setting — `order-settings.allowEditOrderAfterSendToKitchen` — but the underlying rule that a chef shouldn't discover the dish changed mid-prep is a business invariant the default should protect, not something arbitrarily "off" by default).
2. **An Invoice cannot be deleted once payment has been recorded** — a paid invoice is a legal/financial record; it can be reversed via a `SalesReturn`, never hard-deleted. Currently: generic `hardDelete` is available on every settings-pattern module and nothing distinguishes Invoice as special.
3. **Inventory quantity cannot go negative unless `allowNegativeStock` is explicitly true** — the rule itself (block by default) is the business invariant; the setting only controls the override, per the litmus test discussed earlier.
4. **A Cashier Shift cannot close while any `CashTransaction` tied to it is still pending/unposted.**
5. **A Reservation cannot overlap another Reservation for the same table and time window** — the compound index on `{table, startTime, endTime}` exists specifically to make this checkable, but the check itself doesn't exist.
6. **A split bill's parts cannot sum to more than the original order/invoice total** — relevant once split-bill (§7, Missing Features) is built.
7. **A Journal Entry's debit total must equal its credit total before it can be posted** — the most fundamental double-entry accounting invariant; currently nothing validates this anywhere.
8. **An Accounting Period that is locked cannot accept new or edited Journal Entries.**
9. **A Purchase Return cannot exceed the quantity/amount of its original Purchase Invoice line.**
10. **A Sales Return cannot exceed the quantity/amount of its original Invoice line**, and (per `sales-return-settings.maxReturnMinutes`) cannot be created after the configured return window — again, the window length is a setting, the "cannot exceed original" rule is not.
11. **An Employee cannot be paid twice for the same payroll period.**
12. **A Production Order cannot be marked complete if the raw materials it consumed were never actually available** (ties to the missing stock-reservation concept in §9 gap analysis).
13. **A Table cannot be marked `available` while it has an open, unclosed Order attached.**
14. **A Loyalty redemption cannot exceed the customer's current points balance** — already enforced correctly in `customer-loyalty.service.js`, and precisely the rule bypassed by `loyalty-transaction.service.js` (Critical backlog item, carried forward again here because it is a Business Rule violation, not just a code-quality issue).
15. **A Brand cannot have more branches than its `maxBranches` plan limit.**
16. **A Branch cannot be deleted while it has an open Cashier Shift, unclosed Orders, or non-zero Inventory.**

None of these are implemented as enforced rules today; they're listed because an ERP that doesn't hold them isn't yet trustworthy for real money/stock movement, independent of any Settings or Permission configuration.

## 6. Module Interfaces (conceptual, not code)

The public *responsibilities* each domain should expose to other domains — phrased as capability names, not method signatures to implement. The point of this list is to establish that, going forward, **no domain should reach into another domain's collection directly** — every cross-domain effect should go through a name on this list.

- **Inventory**: `reserveStock()`, `deductStock()`, `releaseStock()`, `adjustStock()`, `receiveStock()`, `transferStock()`, `getAvailableQuantity()`. *Sales/Production/Purchasing should never write to `Inventory`/`StockLedger` directly.*
- **Accounting**: `postJournalEntry()`, `reverseJournalEntry()`, `closePeriod()`, `getAccountBalance()`. *No other domain should create a `JournalLine` directly — always through a posting call that applies `accounting-settings` control-account resolution.*
- **Sales**: `confirmOrder()`, `closeOrder()`, `cancelOrder()`, `computeInvoiceTotals()`, `applyPromotion()`. *Kitchen/Inventory/Loyalty should react to these, never mutate Order/Invoice state themselves.*
- **Preparation**: `createTicketsFromOrder()`, `acceptTicket()`, `completeTicket()`, `rejectTicket()`, `recordReturnDecision()`.
- **Loyalty**: `earnPoints()`, `redeemPoints()`, `adjustPoints()`, `recalculateTier()`, `expirePoints()`. *This is the one domain where the interface boundary is already mostly correct (`customer-loyalty.service.js`) — `loyalty-transaction` violating it is exactly what an interface boundary is meant to prevent.*
- **HR**: `runPayroll()`, `approveLeaveRequest()`, `recordAttendance()`, `generateEmployeeCode()`, `confirmProbation()`.
- **Finance**: `openShift()`, `closeShift()`, `reconcileShift()`, `recordCashTransaction()`, `transferBetweenRegisters()`.
- **Purchasing**: `submitPurchaseInvoice()`, `approvePurchaseInvoice()`, `receiveGoods()`, `createSupplierReturn()`.
- **Assets**: `runDepreciation()`, `disposeAsset()`, `recordMaintenance()`.
- **Seating**: `assignTable()`, `releaseTable()`, `checkInReservation()`, `checkForOverlap()`.
- **Notifications** *(doesn't exist yet)*: `notify(event, recipients, channel)` — every domain above should call this, never implement its own notification logic.
- **Printing** *(doesn't exist yet)*: `printReceipt()`, `printKitchenTicket()`.

## 7. Business Events (expanded with implementation status)

Same catalog as §4 of the Business ERP Perspective section above, with the explicitly requested **Producer / Consumers / Purpose / Status** framing applied:

| Event | Producer | Consumers | Purpose | Status |
|---|---|---|---|---|
| `OrderConfirmed` | Sales | Preparation, Inventory, Notifications | Trigger kitchen + stock reservation | **Missing** |
| `OrderItemReady` | Preparation | Sales, Notifications | Notify waiter/floor | **Missing** |
| `InvoiceCreated`/`OrderClosed` | Sales | Accounting, Inventory, Loyalty, Printing, Notifications | Close the financial/stock/loyalty loop | **Missing** |
| `InvoicePaid` | Sales/Finance | Accounting, Finance | Record cash movement | **Partial** — the data field exists (`Invoice.status`), nothing reacts to it |
| `SalesReturnApproved` | Sales | Preparation, Accounting, Inventory, Finance | Reverse the sale correctly | **Missing** |
| `PurchaseInvoicePosted` | Purchasing | Inventory, Accounting, Finance | Receive goods + post cost | **Missing** |
| `StockBelowThreshold` | Inventory | Notifications | Reorder alert | **Missing** (threshold field exists, unread) |
| `ProductionOrderCompleted` | Production | Inventory, Accounting | Move cost from raw to produced item | **Missing** |
| `CashierShiftClosed` | Finance | Accounting, HR | Post shift journal | **Missing** |
| `EmployeeClockInOut` | HR | Payroll, Finance | Feed attendance into payroll/shift correlation | **Missing** |
| `LeaveRequestApproved` | HR | Payroll, Attendance | Adjust pay / auto-generate leave-days-as-attendance | **Missing** |
| `ReservationConfirmed` | Seating | Notifications, CRM | Confirm to customer | **Missing** |
| `AssetDepreciationRun` | Assets | Accounting | Post depreciation journal | **Missing** |
| `LoyaltyPointsEarned`/`Redeemed` | Loyalty | Notifications, CRM | Update customer profile, notify | **Partial** — the earn/redeem logic itself works via `customer-loyalty`; the notify/CRM-update fan-out doesn't exist |
| `PeriodClosed` | Accounting | (blocks) further postings | Financial closing control | **Missing** |

**Zero events in this catalog are "Implemented"** in the sense of an actual pub/sub or hook mechanism firing — the two "Partial" rows exist only because the underlying data field is present even though nothing produces or consumes it as an event.

## 8. Settings Review

Already delivered in full above (**§6 Settings Ownership** in the Business ERP Perspective section) — every settings module reviewed field-by-field against exactly this framework (why it exists, who should read it, at what workflow step, which decision it controls, and the "would an owner want to configure this" test), with the explicit conclusion that **no field currently warrants demotion into hardcoded Business Logic** — every field maps to a plausible, real owner decision; the gap is universally "waiting on the workflow that would read it," not "shouldn't be a setting." Not repeated here.

## 9. ERP Gap Analysis

Already delivered in full above (**§7 Missing Features** and **§9 ERP Best Practices** in the Business ERP Perspective section), covering Stock Adjustment, Approval Workflow (as a shared framework gap), Three-Way Match, Cycle Count, Waste Management (via Preparation-Return), Payroll Accrual, Recurring Expenses, Financial Closing (the period-lock enforcement gap, also restated in §5 Business Rules above), and Fixed Assets (disposal approval, insurance tracking) — all explicitly named per this section's own example list. Not repeated here. One addition specific to this final pass:

- **Inventory Reservation** (holding stock against a confirmed-but-unfulfilled Order so two orders can't both claim the last unit) — not previously called out by name. This sits structurally between "Order Confirmed" and "Invoice Closed" in the workflow and is a standard concept in every reference ERP's order-to-cash flow (Odoo's `stock.move` reservation, NetSuite's commitment quantity). Add to the Phase 2/3 boundary in the roadmap below.

## 10. External Integrations (documentation only — no implementation)

| Integration | Purpose | Likely owning module | Notes |
|---|---|---|---|
| Payment Gateways | Online/card payment capture | Payments (`PaymentChannel`) | Schema already models `clearingAccount`/`settlementAccount`/fees — the integration slot is designed, the connector isn't |
| Fiscal Printer | Government-mandated tax-compliant receipt printing (common requirement in EG/Gulf markets) | Sales/Printing | No printing subsystem exists yet at all (§ ERP Gap Analysis) — fiscal compliance should be designed in from the start of that subsystem, not retrofitted |
| Kitchen Printer | Physical ticket printing at a prep station | Preparation/Printing | Same dependency as above |
| WhatsApp | Order status, reservation confirmation, marketing | Notifications, CRM | `BranchSettings`/`notification-settings` already reference "whatsapp" as a channel enum value |
| SMS | Same as WhatsApp, fallback channel | Notifications | — |
| Email | Receipts, marketing, password reset | Notifications, IAM (reset flow already partially exists in `UserAccount.resetPasswordToken`) | — |
| Delivery Platforms (Talabat/Uber Eats-style aggregators) | Order ingestion from third-party apps | Sales (as an alternate Order-creation channel) | Would need a new `orderSource`/external-ID concept on `Order` |
| POS Devices / Card Terminals | Payment capture hardware | Payments, Finance | — |
| Barcode Scanner | Stock receiving/counting speed | Inventory | Relevant once Inventory Receiving (§2) and Cycle Count (§9) are built |
| QR Menu | Customer-facing digital menu access | Menu, CRM (guest ordering) | `Table.qrEnabled` field already exists |
| Biometric Attendance | Clock-in/out hardware | HR (`AttendanceRecord`) | — |
| Accounting Export | Sync to external accounting software (QuickBooks/Odoo/etc.) for brands that don't want to run this system's Accounting module | Accounting | Only relevant if this ERP's own Accounting module is treated as optional per-brand (it already is, via `BrandSettings.modules.accounting`) |
| Mobile Applications | Customer app, staff app | Cross-cutting (consumes the API, doesn't add a backend module) | — |

## 11. Module Classification

Unchanged from **§6** of the earlier Architecture Review section above (Core Business / Supporting Business / Configuration / Infrastructure / Integration / Legacy, applied to every module) — this final pass did not surface any module whose classification should change.

## 12. Readiness Assessment

Unchanged from **§8** of the Business ERP Perspective section above (the per-domain star ratings across Architecture/Business Logic/Data Model/API Design/Integration/Overall). This final pass adds two columns requested here that weren't rated before:

| Domain | Workflow (does the lifecycle actually run end-to-end?) | Settings (are its settings connected to logic?) |
|---|---|---|
| Organization | ★★☆☆☆ — no branch-status-driven workflow | ★★★☆☆ — `modules.*` toggle works, rest doesn't |
| Accounting | ★☆☆☆☆ | ★☆☆☆☆ |
| Assets | ★☆☆☆☆ | n/a (no dedicated settings module) |
| CRM | ★★☆☆☆ | n/a |
| Finance | ★★☆☆☆ | n/a |
| HR | ★☆☆☆☆ | ★☆☆☆☆ |
| Inventory/Production | ★☆☆☆☆ | ★☆☆☆☆ |
| Loyalty | ★★★☆☆ — the only domain with a real, if incomplete, end-to-end run | ★★★★☆ — 8/12 fields actually consumed |
| Menu | ★★☆☆☆ | n/a |
| Payments | ★☆☆☆☆ | ★☆☆☆☆ (stub) |
| Preparation/Kitchen | ★☆☆☆☆ | ★☆☆☆☆ |
| Purchasing | ★☆☆☆☆ | ★☆☆☆☆ |
| Sales | ★☆☆☆☆ | ★☆☆☆☆ |
| Seating | ★★☆☆☆ | n/a |
| System (settings) | n/a | ★☆☆☆☆ (as a group, excluding the domains counted above) |

## 13. Architecture Issues

Fully documented above: Naming Issues (§§1–2 of the first Architecture Review), Folder Structure (§8), Duplicate/Legacy Modules (§4), Business Conflicts and Ownership Conflicts (§3/§4 of this final section), Missing Workflows (§2/§9 of this final section), Missing Integrations (§10 of this final section). The consolidated, re-prioritized list is the backlog immediately below — this final pass merges the original structural backlog with the business-level findings from this document into one authoritative list.

### Critical
- `loyalty-transaction.service.js` bypasses `loyalty-settings` and violates Business Rule #14 (redemption cannot exceed balance is enforced in one code path, not the other).
- `purchase-invoice.router.js`/`purchase-return.router.js` have no `authorize()`/`checkModuleEnabled()`.
- No Journal Entry debit=credit validation exists (Business Rule #7) — the foundation of every number Accounting will ever report.
- Ownership conflicts with live, disagreeing data: Loyalty tier duplication, Tax policy duplication, Delivery policy duplication (§3/§4).

### High
- `hr/shift-settings` domain misplacement (unchanged from the original review).
- Duplicate/legacy trees: `audit-log` vs `system/audit-log`, `setup` vs `system-setup` (unchanged).
- `tax-settings/`↔`tax-config.*` naming (unchanged).
- No shared Approval Framework — six domains independently want one (accounting, purchasing, sales-return, preparation-return, stock-transfer, discount).
- No Accounting Period lock enforcement (Business Rule #8) — financial closing is not actually closeable today.

### Medium
- Folder/file basename mismatches (unchanged: purchasing-settings, service-charge-settings, accounting-settings).
- Model naming outliers: `cashTransaction`, `InventorySetting`, `EmployeeSetting` (unchanged).
- No state-machine enforcement on any of the 13 entities documented in §3 above — each is individually Medium since none currently causes data corruption (nothing enforces the *wrong* transitions either, since nothing enforces any transitions), but collectively this is why Business Logic scores 1★ almost everywhere in §12.
- Missing Inventory Reservation concept (§9) — needed before Order↔Inventory integration can be built correctly (two simultaneous orders could otherwise both claim the last unit).

### Low
- Remaining typos (`rerturn-sales-settings`, `inital-accounts`).
- `inventory/inventory/` entity-vs-domain name collision.
- `crm/message/` generic folder name vs. specific `CustomerMessage` model name.

## 14. ERP Roadmap (final, 5-phase)

Refines the 4-phase roadmap above into the requested 5-phase structure — Phase 1–2 map closely to the earlier Foundation/Core-ERP phases with the newly-identified Business Rules and Approval Framework folded in explicitly; the earlier "Advanced ERP"/"Enterprise" split is redrawn around Business Automation vs. genuinely advanced ERP concepts, and External Integrations is separated out as its own phase since it was not previously broken out on its own.

### Phase 1 — Platform Foundation
*Nothing above this is safe to build on until these are true.*
- Resolve the four live ownership conflicts (§4): Loyalty tier, Tax policy, Delivery policy, Leave-policy defaults.
- Fix the Critical items: `loyalty-transaction` bypass, Purchasing RBAC gap, Journal Entry balance validation, Accounting Period lock enforcement.
- Design (not build) the shared Approval Framework referenced by six domains — deciding its shape now prevents six divergent one-off implementations later.
- Resolve the two duplicate/legacy module trees.
- Decide the Printing and Fiscal-Printer question together (§10) — fiscal compliance requirements should shape the printing subsystem's design from day one, not be retrofitted.

### Phase 2 — Restaurant Core
*The order-to-cash loop — the product doesn't function as a restaurant system until this exists.*
- Order → Invoice computation (tax/discount/service-charge via their respective settings modules).
- Order Confirmed → Kitchen ticket generation, with real state-machine transitions (§3) replacing the current free-form status fields.
- Invoice Closed → Inventory deduction, including the new Inventory Reservation concept (§9) so concurrent orders can't oversell the last unit.
- Invoice Closed → Accounting journal posting via `accounting-settings.activities.sales`.
- Table/Reservation status driven by the Order/Reservation lifecycle instead of sitting inert.
- Basic Cashier Shift close-out validation (Business Rule #4).

### Phase 3 — Business Automation
*Everything here assumes Phase 2's loop is real and trustworthy; these automate the operational domains around it.*
- Procure-to-pay completion (Purchasing → Inventory Receiving → Accounting), including the Goods Receipt / Three-Way Match concept.
- Production workflow (material consumption → produced-item stock increase → cost transfer).
- Payroll formula-engine execution (`PayrollItem` token interpreter) + Leave-approval → Payroll integration.
- Stock Adjustment, Cycle Count execution, Stock Transfer approval-and-execution.
- Loyalty completion: points-expiry job, reward-redemption ledger fix, referral tracking.
- Sales Return / Purchase Return full workflow including approval thresholds.

### Phase 4 — Advanced ERP
*Deeper financial/operational sophistication — valuable once the automated core (Phase 3) is stable, not before.*
- Financial Closing as a real period-lock workflow with recurring/template journal entries and accrual support.
- Multi-currency revaluation and bank reconciliation.
- Fixed Asset depreciation scheduler + disposal approval.
- Split bill / table transfer / void-with-approval (Sales).
- Formal Event/Workflow Engine replacing the synchronous Phase 2/3 integrations with a real event bus — same reasoning as the earlier roadmap: it only earns its complexity once there are enough real events to justify it.
- Waitlist (Seating), Customer segmentation/campaigns (CRM).

### Phase 5 — External Integrations
*Deliberately last — every integration in §10 is either a hardware/channel connector (needs a stable internal event to trigger from) or an export (needs stable internal data to export). Building these before Phase 2–4 exist would mean integrating against a moving, unfinished target.*
- Payment Gateway connectors, POS/card terminal integration.
- Fiscal Printer + Kitchen Printer hardware drivers (the printing *subsystem* itself was designed in Phase 1; the hardware connectors are the Phase 5 work).
- WhatsApp/SMS/Email delivery providers behind the Notifications interface designed in Phase 1/§6.
- Delivery platform aggregator ingestion.
- Barcode scanner support (pairs with Cycle Count/Receiving from Phase 3).
- QR Menu customer-facing surface.
- Biometric attendance hardware.
- Accounting export connector.
- Mobile application API surface (consumes what already exists; not a new backend module).

---

## Architecture Freeze Statement

This document, together with `server/BACKEND_FOUNDATION.md`, now constitutes the complete architectural reference for the Restaurant ERP: infrastructure layer (Foundation doc) + business/domain architecture (this document). No further architecture-review passes are anticipated — subsequent work is expected to be implementation and refactoring **against** this document, not further analysis of it. Where implementation reveals this document to be wrong or incomplete, this file should be corrected as part of that implementation work rather than treated as immutable — "frozen" means "the reference to build against," not "never revisited."


