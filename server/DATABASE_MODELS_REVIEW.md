# Database Models Review — Restaurant ERP SaaS

**Scope:** This is a **models-only** review. Services, controllers, routers, validation, middleware, and frontend were explicitly out of scope and were not read or modified. No code was changed as part of this review — it is analysis only, per the review mandate.

**Method:** Every `*.model.js`/`*.model.ts` file under `server/modules/**` (94 files across 16 domains) was read in full and evaluated against: database architecture, restaurant operations (multi-branch, kitchen, delivery, dine-in, takeaway, reservations), inventory/purchasing/production, accounting/tax/discounts/loyalty/CRM, reporting, security, performance, scalability, i18n, multi-currency, multi-brand, and future extensibility. The goal was to challenge the design, not confirm it.

**How to read this document:** Section 1 is the cross-cutting patterns — the same handful of mistakes repeated across a dozen-plus models; read this first, it explains most of the "Critical" tags below. Section 2 is the per-model audit, organized by domain, in the requested 9-point format. Section 3 is the full sales/inventory/accounting chain consistency check. Section 4 is the final scored ERP assessment and conclusion.

---

## 1. Cross-Cutting Patterns (found repeated across many models)

These are not one-off mistakes — the same defect class recurs so often it indicates a systemic gap rather than isolated bugs. Fixing the pattern once (as a documented convention + a lint/review checklist) is more valuable than fixing each instance independently.

### 1.1 CRITICAL — Global-unique fields that must be brand-scoped (multi-tenant-breaking)
This SaaS is explicitly multi-brand/multi-branch, yet the following fields use `unique: true` at the **field level** (global, across all tenants) instead of a compound `{brand, ...}` or `{brand, branch, ...}` index. Every one of these will throw duplicate-key errors the moment a **second brand** onboards and picks a common code/name/number:
- `Product.sku`, `StockItem.SKU`/`barcode` (menu/inventory)
- `ProductionRecord.productionNumber` (production — also entirely missing `brand`/`branch` fields)
- `PayrollItem.code` (HR)
- `Supplier.name`, `Supplier.Code` (purchasing — plus `Expense.code`)
- `Order.orderNum`, `Invoice.serial` (has a redundant compound index too, but the field-level unique still blocks), `SalesReturn.serial` (worst — no compound index at all)
- `PaymentChannel.code`
- `CashRegister.code` (has both a global field-level unique AND a conflicting compound index — direct contradiction)

**Fix pattern:** never declare `unique: true` on a business identifier field directly; always express tenant-scoped uniqueness via a compound schema-level index `{brand: 1, code: 1}` (add `branch: 1` where the identifier resets per-branch, e.g. daily order/invoice sequences).

### 1.2 HIGH — Inconsistent "who did this" actor references (Employee vs UserAccount)
Across HR, Accounting, and Sales workflow models, generic audit fields (`createdBy`/`updatedBy`) consistently reference `UserAccount` (the login/auth identity), while workflow-approval actor fields (`approvedBy`, `cancelledBy`, `rejectedBy`, `postedBy`, `calculatedBy`, `paidBy`) inconsistently reference `Employee` instead. Since `UserAccount.employee` is optional, an `Employee._id` stored in an approval field cannot always be traced back to the acting login identity. Found in: `EmployeeAdvance`, `EmployeeFinancialTransaction`, `LeaveRequest`, `Payroll`, `JournalEntry`, `AssetMaintenance`, `Reservation`, `Order`. Pick one collection as the canonical "actor" reference (most of the codebase's own convention argues for `UserAccount`) and use it everywhere.

### 1.3 CRITICAL — The financial documents don't reference the JournalEntry they generate
`CashTransaction`, `CashTransfer`, `PurchaseInvoice`, `PurchaseReturnInvoice`, `AssetPurchaseInvoice`, `DailyExpense` all represent real money-movement events that are supposed to post to the general ledger, but **none of them carry a `journalEntry` reference field** — only a boolean `accountingPosted`/`status` flag at best (and `DailyExpense` has neither). The only correctly-wired example in the entire codebase is `AssetDepreciation.journalEntryId`, and even `CashierShift.journalEntry` exists but has no link to the individual `CashTransaction` rows that fed its totals. Without this link, no operational document can be traced to its GL posting from the document side — only inferable one-directionally via `JournalLine.sourceRef`.

### 1.4 CRITICAL — JournalEntry ↔ JournalLine, the core of double-entry bookkeeping, is structurally broken
`JournalLine` is registered as a **top-level Mongoose collection** with `{ _id: false }` in its schema options, while `JournalEntry.lines` stores an array of `ObjectId` refs to it. `_id: false` is the correct option for an *embedded subdocument*, not a standalone collection — using it here means `JournalLine` documents have no reliable primary key for `JournalEntry.lines` to reference. Worse, `JournalLine` has **no `journalEntry` back-reference field at all**, so the parent↔child relationship is one-directional in the best case and non-functional in the worst. On top of that: nothing anywhere (`JournalEntry`, `JournalLine`) validates that `sum(debit) === sum(credit)` — the single most important invariant of double-entry accounting is unenforced at the model layer.

### 1.5 HIGH — Soft-delete convention is applied inconsistently
Most models use the `isDeleted: Boolean` + `deletedAt: Date` + `deletedBy: ObjectId` triple. But: `Shift` (HR) uses only `deletedAt` (no `isDeleted` boolean) — and per a code comment found in `employee-settings.model.js`, `BaseService.softDelete()`/`getAll()`'s default filter explicitly depends on `isDeleted`, meaning **Shift records may be invisible to or excluded incorrectly from standard list queries**. `Role`, `AttendanceRecord`, `LeaveRequest`, `StockItem`, `ProductReview`, `DiningArea`, `Table`, `PaymentChannel` have no soft-delete fields at all, or only a partial subset. `AuditLog` — the one model that should categorically be append-only/immutable — has full `isDeleted`/`deletedAt`/`deletedBy`, which is backwards: it's the one place soft-delete should not exist.

### 1.6 HIGH — Two empty/placeholder "settings" models and an empty payment model
The following files contain no schema at all — only a comment (`// ... model - placeholder`) or are literally 0 bytes:
- `server/modules/hr/attendance-settings/attendance-settings.model.js`
- `server/modules/hr/payroll-settings/payroll-settings.model.js`
- `server/modules/sales/promotion-settings/promotion-settings.model.js`
- `server/modules/payments/payment-provider/payment-provider.model.js` (0 bytes)
- `server/modules/payments/payment-settings/payment-settings.model.js`

Any controller/service that imports one of these expecting a Mongoose model will crash on import. Even setting that aside, their absence is a real product gap: attendance policy is currently squeezed into `EmployeeSettings.attendance`, payroll policy into `EmployeeSettings.payroll`, and there is no dedicated payment-provider registry at all (`PaymentChannel.providerName` is a free-text Map instead of a foreign key, which is itself a symptom of this gap).

### 1.7 CRITICAL — No cost/COGS data anywhere in the menu → recipe → production chain
`Product`, `Recipe` (menu), and `ProductionRecipe` (production) store **zero cost fields** — no `costPrice`, `totalCost`, `costPerUnit`, no historical cost snapshot. Every COGS/margin calculation has to be computed ad hoc at query time by walking Recipe → StockItem → `Inventory.avgUnitCost`, with no caching and, critically, no way to reconstruct what a dish actually cost at the time it was sold once ingredient prices change later. This is a foundational gap for any restaurant ERP claiming accounting-grade costing.

### 1.8 HIGH — Free-text, unvalidated units of measure everywhere
`StockItem` provides exactly one conversion step (`storageUnit` ↔ `ingredientUnit` via a single scalar `parts`). Every downstream `unit` field — `Recipe.ingredients[].unit`, `ProductionRecipe.ingredients[].unit`, `InventoryCount.items[].unit`, `StockTransferRequest.items[].unit`, `Consumption`'s unit fields — is a free-text string with no enum, no cross-reference, and no validation against the StockItem's declared units. There is no general-purpose unit-conversion table. This silently breaks costing and stock-deduction math whenever a recipe author enters a unit the StockItem wasn't configured for (e.g., `"tbsp"` when only gram/carton conversion exists).

### 1.9 MEDIUM — `Brand`/`Branch` capitalization inconsistency
`AssetDepreciation` stores `Brand`/`Branch` (capitalized) while every other model in the codebase uses lowercase `brand`/`branch`. Any shared tenant-scoping query helper filtering on the lowercase field name will silently ignore this collection entirely.

### 1.10 MEDIUM — No unified calculation-order/pipeline for discount → tax → service charge
`TaxConfig.calculationMethod` (BEFORE/AFTER discount) and `ServiceCharge.calculationBase` (BEFORE_TAX/AFTER_TAX) are each independently configurable with no single authoritative sequence definition reconciling them, and neither is ever referenced from `Invoice` (which just stores flat `discount`/`salesTax`/`serviceTax` numbers). Combined with `Promotion` and `DiscountSettings` also being unreferenced from Invoice, there are **four separate discount/tax/fee mechanisms with zero cross-linkage or defined order of operations** — a real risk of two code paths computing different totals for the same order.

### 1.11 MEDIUM — Duplicate/fragmented identity models with no linkage
`OnlineCustomer` and `OfflineCustomer` duplicate ~80% of their fields with incompatible shapes (structured vs. free-text address, divergent tag/tier enums) and no merge/link mechanism when a walk-in later registers online. `CustomerLoyalty` (the points wallet) is keyed by raw `phone` string rather than a stable customer reference to either model. And `Order.customer`/`Order.user` reference model names (`"Customer"`, `"User"`) that **do not exist** anywhere in the codebase (the real models are `"OnlineCustomer"`/`"OfflineCustomer"`) — this is a broken/dangling ref that silently fails to populate.

---

## 2. Per-Model Audit

### 2.1 Organization

#### `organization/brand/brand.model.js` — Brand
1. **Purpose:** Top-level tenant entity representing a restaurant brand.
2. **Strengths:** Multilingual `name` via Map; slug regex validation; full audit + soft delete; sensible `businessType`/`currency` enums.
3. **Weaknesses:** No `owner`/`ownerUserAccount` ref (only inferable via `UserAccount.brand`); `maxBranches` is an unenforced soft cap; no SaaS billing/subscription fields (plan, trial, expiry) despite being the tenant root of a SaaS product.
4. **Missing Fields:** Billing/subscription scaffolding; brand contact phone/email; index on `status`.
5. **Incorrect Fields:** None severe.
6. **Redundant Fields:** `timezone`/`countryCode`/`currency` duplicated (with no documented inheritance rule) at Branch/BranchSettings level.
7. **Relationship Problems:** `createdBy` references `UserAccount`, which itself requires `brand` — bootstrap chicken-and-egg for the very first user (minor).
8. **Recommended Changes:** Add subscription/billing fields; add brand contact fields; index `status`.
9. **Priority:** Medium.

#### `organization/brand-settings/brand-settings.model.js` — BrandSettings
1. **Purpose:** Per-brand SEO/social/module-toggle/security configuration.
2. **Strengths:** Clean 1:1 with Brand (unique indexed `brand`); module toggles align with `RESOURCE_ENUM`.
3. **Weaknesses:** `keywords` Map uses lowercase `en`/`ar` keys while Branch's multilingual pattern elsewhere uses uppercase `EN`/`AR` — casing inconsistency risk. No `status` independent of Brand's own status. No versioning/audit trail of module-toggle changes (compliance-relevant).
4. **Missing Fields:** Settings-change audit trail.
5. **Incorrect Fields:** Map key casing inconsistency.
6. **Redundant Fields:** None major.
7. **Relationship Problems:** None (clean brand-only scope).
8. **Recommended Changes:** Normalize language-key casing project-wide.
9. **Priority:** Low/Medium.

#### `organization/branch/branch.model.ts` — Branch
1. **Purpose:** Physical branch/location of a brand.
2. **Strengths:** Geo `location` with 2dsphere index; partial unique index enforcing one main branch per brand; slug uniqueness scoped per brand; TypeScript interfaces; full soft-delete/audit.
3. **Weaknesses:** `code` is optional with no uniqueness constraint at all (inconsistent with Department/Shift, which enforce `{brand,code}`); no index on `code` despite being described as used for integration lookups.
4. **Missing Fields:** Branch-level phone/email (deferred to BranchSettings — arguably fine, but inconsistent with Brand keeping its own contact fields); `openingDate`.
5. **Incorrect Fields:** None.
6. **Redundant Fields:** `taxIdentificationNumber`/`commercialRegisterNumber` duplicate Brand's equivalents with no documented authority rule for invoicing.
7. **Relationship Problems:** `manager` references `UserAccount`, but a branch manager is more naturally an `Employee` (with jobTitle/department) — conflates "manager for permissions" with "manager as HR employee."
8. **Recommended Changes:** Add unique sparse index on `{brand, code}`; clarify manager reference target.
9. **Priority:** Medium.

#### `organization/branch-settings/branch-settings.model.ts` — BranchSettings
1. **Purpose:** Branch-level operating hours, service availability (dine-in/takeaway/delivery), reservation and policy config.
2. **Strengths:** Thorough operating-hours model with per-period service overrides and pauses; good indexing; self-documented historical `isActive` bug fix.
3. **Weaknesses:** `contact.email` has no format validation (Employee's equivalent does) — inconsistent validation rigor for the same concept across models.
4. **Missing Fields:** Operating-hours change versioning.
5. **Incorrect Fields:** None.
6. **Redundant Fields:** `timezone` duplicated against Brand.timezone — three potential sources of truth (Brand, BranchSettings, and the absent Branch.timezone), none authoritative.
7. **Relationship Problems:** Correctly dual-scoped brand+branch.
8. **Recommended Changes:** Add email regex validation; consolidate timezone ownership onto Branch.
9. **Priority:** Low.

#### `organization/delivery-area/delivery-area.model.ts` — DeliveryArea
1. **Purpose:** Geo-fenced delivery zone and pricing per branch.
2. **Strengths:** Excellent geo modeling (2dsphere Polygon index); compound indexes matching real query shapes; sparse unique indexes for optional code/slug; avoids the historical `isActive` bug pattern (documented in a code comment).
3. **Weaknesses:** `createdBy` required, inconsistent with sibling org models defaulting it to `null`.
4. **Missing Fields:** No explicit `currency` field despite carrying `deliveryFee`/`minimumOrderAmount`/`freeDeliveryThreshold` — implicitly inherits Brand.currency, undocumented.
5. **Incorrect Fields:** None.
6. **Redundant Fields:** None.
7. **Relationship Problems:** None — correctly brand+branch scoped.
8. **Recommended Changes:** Add explicit currency field or document the inheritance.
9. **Priority:** Low.

### 2.2 IAM

#### `iam/role/role.model.js` — Role
1. **Purpose:** Brand-scoped RBAC role with per-resource CRUD/approve/reject permissions.
2. **Strengths:** Comprehensive `RESOURCE_ENUM`; per-permission branch override; `isSystemRole` flag.
3. **Weaknesses:** `RESOURCE_ENUM` includes `"CashierShifts"` with no backing model of that name (the actual models are `Shift` and the oddly-named `ShiftSettings`, which is really cashier/POS settings) — naming drift between permission strings and real collections, unenforced programmatically.
4. **Missing Fields:** No `isDeleted`/soft-delete triple at all — inconsistent with virtually every other model.
5. **Incorrect Fields:** None.
6. **Redundant Fields:** `permissions[].branch` duplicates the purpose of top-level `branchAccess`/`allBranchesAccess` — two overlapping branch-scoping mechanisms in one document that can produce contradictory authorization states.
7. **Relationship Problems:** No soft delete means a Role referenced by `UserAccount.role` can't be safely deactivated without either hard-deleting (breaking references) or leaving orphaned state undocumented.
8. **Recommended Changes:** Add soft-delete triple; simplify to one branch-scoping mechanism; align `RESOURCE_ENUM` strings with real model names via a shared constant.
9. **Priority:** High.

#### `iam/user-account/user-account.model.js` — UserAccount
1. **Purpose:** Authentication/authorization account, optionally linked to an Employee.
2. **Strengths:** Strong security fields (login attempts, lockout, 2FA, password reset, refresh token); brand+username uniqueness; sparse unique email/phone; `select:false` on password.
3. **Weaknesses:** `email`/`phone` have no format validation (Employee's `email` does) — inconsistent. `twoFactorSecret` defaults to `""` instead of `null`, unlike the rest of the schema's null-default convention — risks strict-equality bugs in 2FA checks.
4. **Missing Fields:** `passwordHistory` (reuse prevention); `lastLoginIp`/`lastLoginDevice`; `mustChangePassword`.
5. **Incorrect Fields:** `twoFactorSecret` default.
6. **Redundant Fields:** `branch` on UserAccount duplicates `Employee.defaultBranch`/`branches` when linked, with no synchronization logic.
7. **Relationship Problems:** No reciprocal `Employee.userAccount` back-reference — `Employee.hasAccount` (boolean) and `UserAccount.employee` (ref) are two independent flags that must be kept in sync manually, real data-integrity risk.
8. **Recommended Changes:** Add regex validation on email/phone; reconcile branch source of truth; keep `Employee.hasAccount` in sync with `UserAccount.employee` at the service layer, or replace the boolean with a computed value.
9. **Priority:** Medium/High.

### 2.3 HR

#### `hr/department/department.model.js` — Department
1. **Purpose:** Organizational department (kitchen, service, management) per brand, optionally multi-branch.
2. **Strengths:** `branches[]` multi-branch support; hierarchical `parentDepartment`; good compound unique indexes.
3. **Weaknesses:** `classification` enum has redundant lowercase/length validators on top of the enum constraint.
4. **Missing Fields:** No richer `status` enum (JobTitle has one; Department only has binary `isActive`) — inconsistent expressiveness for parallel entities in the same module.
5. **Incorrect Fields:** None.
6. **Redundant Fields:** `isActive` + `isDeleted` overlap in intent.
7. **Relationship Problems:** `parentDepartment` self-ref has no cycle-prevention guard.
8. **Recommended Changes:** Standardize on a `status` enum; add circular-reference guard at service layer.
9. **Priority:** Medium.

#### `hr/job-title/job-title.model.js` — JobTitle
1. **Purpose:** Job position within a department.
2. **Strengths:** Proper brand+department scoping with optional branch override; multilingual fields.
3. **Weaknesses:** `description`/`responsibilities`/`requirements` all `required: true` — heavy multilingual-text burden not applied consistently elsewhere.
4. **Missing Fields:** No salary-band fields; no `code` identifier (Department/Shift both have one).
5. **Incorrect Fields:** `{brand:1, name:1}` index targets a `Map` field directly — Mongoose Map fields need wildcard indexing (`"name.$**"`, which is *also* separately declared); the plain `{name:1}` index is very likely a broken no-op, duplicating and conflicting with the correct wildcard index.
6. **Redundant Fields:** The two overlapping `name` indexes.
7. **Relationship Problems:** No `{brand, department, name}` uniqueness — duplicate job titles within a department are possible.
8. **Recommended Changes:** Remove the broken plain-`name` index; add `code`; relax required-ness on long text fields; add name-uniqueness-per-department.
9. **Priority:** Medium.

#### `hr/employee/employee.model.js` — Employee
1. **Purpose:** Core HR entity — personal, contact, employment data.
2. **Strengths:** Strong branch-scoping (`branches[]`+`defaultBranch`); good uniqueness (employeeCode, nationalID, phone all brand-scoped); rich document/emergency-contact subdocuments.
3. **Weaknesses:** `middleName` is `required: true` — breaks for the many cultures with no middle name, a real usability bug for a system aiming at broad applicability.
4. **Missing Fields:** No `reportsTo` self-reference for org-chart reporting lines; no index on `status`; no `financialProfile` denormalized quick-access pointer.
5. **Incorrect Fields:** `dateOfBirth` required with no minimum-age validation.
6. **Redundant Fields:** `dailyWorkingHours`, `annualLeaveDays`, `emergencyLeaveDays`, `sickLeaveDays`, `weeklyOffDay` all fully duplicate `EmployeeSettings`' brand-wide defaults with **no flag distinguishing "using default" from "explicitly overridden"** — every employee materializes a full copy that can silently drift from policy after the policy changes.
7. **Relationship Problems:** No schema-level guarantee that `Employee.jobTitle.department === Employee.department`; `AttendanceRecord.shift` is `required` while `Employee.shift` is optional — schema-level mismatch if service logic naively copies one to the other.
8. **Recommended Changes:** Make `middleName` optional; add `reportsTo`; add an explicit override-tracking flag instead of blind duplication; add `status` index; enforce jobTitle/department consistency at service layer.
9. **Priority:** High.

#### `hr/employee-settings/employee-settings.model.js` — EmployeeSettings
1. **Purpose:** Brand-wide default HR policy (work hours, leave, attendance/overtime, payroll defaults, employee-code generation, account policy).
2. **Strengths:** Thorough and well organized; `pre('save')` hook enforcing `maxCarryForwardDays=0` when carry-forward disabled; correctly avoids a redundant explicit unique index (documented in comment).
3. **Weaknesses:** Strictly brand-wide — no branch-level override even though multi-branch brands may legitimately need different labor-law policy per branch/region.
4. **Missing Fields:** Branch-level override support.
5. **Incorrect Fields:** `payroll.defaultCurrency` hardcoded default (`"EGP"`) rather than deriving from `Brand.currency`.
6. **Redundant Fields:** `employeeCode.prefix`/format settings exist but nothing enforces that `Employee.employeeCode` actually conforms to the configured format.
7. **Relationship Problems:** None referential.
8. **Recommended Changes:** Allow branch-level override; derive currency default from Brand.
9. **Priority:** Low/Medium.

#### `hr/employee-advance/employee-advance.model.js` — EmployeeAdvance
1. **Purpose:** Employee salary advance/loan and repayment-installment tracking.
2. **Strengths:** Clear workflow (Draft/Approved/Active/Completed/Cancelled); links disbursement/repayments to `EmployeeFinancialTransaction`; tracks `remainingBalance`.
3. **Weaknesses:** Status enum uses PascalCase (`"Draft"`) while almost every other status enum in the codebase uses lowercase — casing inconsistency.
4. **Missing Fields:** `dueDate`/`nextInstallmentDate` for repayment scheduling.
5. **Incorrect Fields:** `currency` is a free string with no enum, unlike `Brand.currency`.
6. **Redundant Fields:** None major.
7. **Relationship Problems:** `approvedBy`/`cancelledBy`/`payments[].createdBy` reference `Employee` while `createdBy`/`updatedBy` reference `UserAccount` — see cross-cutting pattern §1.2; this is one of the clearest instances of the wrong reference target, since approving an advance is plausibly an HR admin action, not necessarily tied to an Employee record.
8. **Recommended Changes:** Change approval-actor refs to `UserAccount`; normalize enum casing; constrain `currency`.
9. **Priority:** High.

#### `hr/employee-financial-profile/employee-financial-profile.model.js` — EmployeeFinancialProfile
1. **Purpose:** Per-employee salary/compensation, banking, tax, insurance configuration.
2. **Strengths:** 1:1 enforced via unique index on `employee`; clean separation of pay/bank/tax; decoupled references to PaymentMethod/TaxConfig/InsuranceSetting.
3. **Weaknesses:** No validation that `salaryEndDate > salaryStartDate`.
4. **Missing Fields:** No `bankCurrency` distinct from salary `currency` (cross-border edge case).
5. **Incorrect Fields:** Hardcoded `currency` default (`"EGP"`) instead of deriving from Brand.
6. **Redundant Fields:** `salaryType` duplicates `EmployeeSettings.payroll.defaultSalaryType` — acceptable as an intentional override pattern.
7. **Relationship Problems:** `branch: default: null` with no documented convention for whether that means "brand-wide" or "inherit `Employee.defaultBranch`."
8. **Recommended Changes:** Add date-range validation; derive default currency from Brand.
9. **Priority:** Low/Medium.

#### `hr/employee-financial-transaction/employee-financial-transaction.model.js` — EmployeeFinancialTransaction
1. **Purpose:** Ledger of individual payroll-affecting transactions (bonuses, deductions, penalties, advance repayments).
2. **Strengths:** Good category/type/payrollEffect classification; indexed `payrollMonth`; approval and cancellation workflows.
3. **Weaknesses:** The model's own doc-comment claims it "links to PayrollItem for automatic aggregation in payroll," but there is **no `payrollItem` reference field anywhere in the schema** — only a boolean `isPayrollProcessed`. Comment/implementation mismatch.
4. **Missing Fields:** **`brand` — entirely absent.** This is the single clearest multi-tenancy scoping gap found across the whole codebase on a table that holds financial transactions.
5. **Incorrect Fields:** `approvedBy`/`cancelledBy` reference `Employee` while `createdBy`/`updatedBy` reference `UserAccount` (§1.2).
6. **Redundant Fields:** `payrollMonth` (string `"YYYY-MM"`) duplicates `Payroll.period.{year,month}` (structured numbers) — two different representations of the same concept across two closely related models.
7. **Relationship Problems:** Missing `brand`; missing real `payrollItem` ref; actor-ref inconsistency.
8. **Recommended Changes:** Add required `brand` field + compound index `{brand, branch, payrollMonth}`; add real `payrollItem` ref; align actor refs to `UserAccount`; unify period representation with `Payroll`.
9. **Priority:** Critical.

#### `hr/attendance-record/attendance-record.model.js` — AttendanceRecord
1. **Purpose:** Daily attendance (clock-in/out, overtime, lateness, leave linkage) per employee.
2. **Strengths:** Compound unique index `{brand,branch,employee,currentDate}` prevents duplicate daily records; comprehensive overtime/lateness tracking; links Leave/Shift.
3. **Weaknesses:** No `versionKey:false` (inconsistent with siblings).
4. **Missing Fields:** No `isDeleted`/soft-delete triple at all — attendance corrections/voids have no soft-delete trail.
5. **Incorrect Fields:** **`arrivalTime` is `required: true` unconditionally**, but the `type` enum includes `ABSENT`/`VACATION`/`SICK_LEAVE`/`HOLIDAY`, states where an arrival time is meaningless — a genuine functional data-integrity bug that will block creating absence-type records unless a placeholder timestamp is faked.
6. **Redundant Fields:** None major.
7. **Relationship Problems:** `shift` is `required: true` here while `Employee.shift` is optional — an employee with no assigned default shift can never get a valid attendance record if service logic naively copies the field.
8. **Recommended Changes:** Make `arrivalTime` conditionally required via a custom validator keyed on `type`; add soft-delete triple; reconcile Shift optionality between Employee and AttendanceRecord.
9. **Priority:** High.

#### `hr/attendance-settings/attendance-settings.model.js` — **EMPTY PLACEHOLDER**
See §1.6. **Priority: Critical.**

#### `hr/shift/shift.model.js` — Shift (staff work-shift template)
1. **Purpose:** Reusable shift time-window templates per branch.
2. **Strengths:** Good unique indexes; efficient `startMinutes`/`endMinutes` numeric representation avoiding timezone-string issues.
3. **Weaknesses:** Uses only `deletedAt` (nullable) as its soft-delete marker — **no `isDeleted` boolean field at all**, unlike almost every sibling model. Per a code comment elsewhere in the codebase, `BaseService.softDelete()`/`getAll()`'s default filter is `{isDeleted:false}` — if that generic filter is applied to Shift, its records may be **invisible in list endpoints since the field the filter checks doesn't exist on this collection.**
4. **Missing Fields:** `isDeleted` boolean (critical for BaseService compatibility); no documented handling for overnight shifts crossing midnight (`endMinutes < startMinutes`).
5. **Incorrect Fields:** None else.
6. **Redundant Fields:** None.
7. **Relationship Problems:** Compounds the Employee.shift-optional / AttendanceRecord.shift-required mismatch noted above.
8. **Recommended Changes:** Add `isDeleted: Boolean` matching BaseService's expected contract; document/validate overnight-shift handling.
9. **Priority:** Critical (same defect class the codebase has already been burned by once, per its own comments).

#### `hr/shift-settings/shift-settings.model.js` — ShiftSettings (cashier/POS shift policy — **not** related to staff Shift)
1. **Purpose:** Cashier/POS shift behavior (auto open/close, cash variance tolerance) per brand/branch.
2. **Strengths:** Clean brand+branch unique pairing; consistent audit/soft-delete.
3. **Weaknesses:** **Name collision:** "ShiftSettings" here governs cash-register/POS shifts, entirely unrelated to the HR `Shift` model (staff scheduling). The same English word "Shift" denotes two unrelated domain concepts across the codebase — this is exactly the kind of ambiguity `Role.RESOURCE_ENUM`'s separate `"Shifts"`/`"CashierShifts"` entries hint at, but no model is actually named `CashierShift`.
4. **Missing Fields:** None critical for its narrow scope.
5. **Incorrect Fields:** None.
6. **Redundant Fields:** None.
7. **Relationship Problems:** None referential, but naming makes intent unclear without reading the code.
8. **Recommended Changes:** Rename to `CashierShiftSettings`/`POSShiftSettings` to disambiguate.
9. **Priority:** Medium (clarity, not correctness).

#### `hr/leave-request/leave-request.model.js` — LeaveRequest
1. **Purpose:** Employee leave/permission request workflow with payroll/attendance impact flags.
2. **Strengths:** Good approval/rejection/cancellation workflow with distinct actor+timestamp fields; correctly links `PayrollItem`.
3. **Weaknesses:** No soft-delete triple at all.
4. **Missing Fields:** No reverse link from LeaveRequest to the `AttendanceRecord`(s) it generates (only a boolean `attendanceGenerated`; AttendanceRecord does hold a one-directional `leaveRequest` ref).
5. **Incorrect Fields:** `approvedBy`/`rejectedBy`/`cancelledBy` reference `Employee` (§1.2 pattern).
6. **Redundant Fields:** `department` denormalized from `Employee.department` at request time with no validation it still matches (possibly intentional as a historical snapshot, undocumented).
7. **Relationship Problems:** Actor-ref inconsistency; no reverse AttendanceRecord linkage array.
8. **Recommended Changes:** Add soft-delete triple; standardize approver ref target; consider `generatedAttendanceRecords: [ObjectId]`.
9. **Priority:** Medium/High.

#### `hr/payroll/payroll.model.js` — Payroll
1. **Purpose:** Per-employee, per-period computed payroll record.
2. **Strengths:** Good earnings/deductions/tax/insurance line-item separation, each referencing `PayrollItem`; unique `{employee, period.year, period.month}`; clear status workflow.
3. **Weaknesses:** Computed totals (`grossEarnings`, `netSalary`, etc.) have no schema-level enforcement (no pre-save hook) tying them to the underlying line-item arrays — pure trust-the-service-layer design.
4. **Missing Fields:** **No `currency` field** on an actual money-movement record — more severe than the same gap elsewhere since Payroll is real money leaving the business. No `paymentReference`/transaction linkage to an actual bank transfer or `CashTransaction`.
5. **Incorrect Fields:** None type-wise.
6. **Redundant Fields:** `calculatedBy`/`approvedBy`/`paidBy` reference `Employee`, `createdBy`/`updatedBy` reference `UserAccount` — same recurring actor-ref split (§1.2).
7. **Relationship Problems:** No reference to `PayrollSettings` (which doesn't exist — see below) — once implemented, payroll generation would have no schema-level audit trail of which settings/version drove a given calculation.
8. **Recommended Changes:** Add `currency`; add consistency hooks/validation for computed totals; standardize actor references.
9. **Priority:** High.

#### `hr/payroll-item/payroll-item.model.js` — PayrollItem
1. **Purpose:** Reusable payroll calculation component (earning/deduction/tax/insurance) with a safe tokenized-formula engine.
2. **Strengths:** Sophisticated, safe tokenized formula design (VAR/OP/NUMBER/PERCENT — avoids unsafe `eval`); good classification; links to `Account` for GL integration.
3. **Weaknesses:** `code` uniqueness is declared **globally**, not scoped to `{brand, code}` (§1.1) — two different brands cannot both have a payroll item coded `"BASIC"`, a direct multi-tenancy-breaking bug.
4. **Missing Fields:** `deletedBy` missing despite `isDeleted`/`deletedAt` present.
5. **Incorrect Fields:** The global-unique `code` index.
6. **Redundant Fields:** None major.
7. **Relationship Problems:** `rateBase` enum includes `"SALES_TOTAL"` with no `ref` to any Sales model — a purely string-resolved cross-module dependency invisible at the schema level (acceptable design, worth documenting).
8. **Recommended Changes:** Fix the `code` index to `{brand:1, code:1}, {unique:true}` immediately; add `deletedBy`.
9. **Priority:** Critical.

#### `hr/payroll-settings/payroll-settings.model.js` — **EMPTY PLACEHOLDER**
See §1.6. **Priority: Critical.**

### 2.4 Menu

#### `menu/menu-category/menu-category.model.js` — MenuCategory
1. **Purpose:** Menu category grouping with visibility windows and channel availability.
2. **Strengths:** Multilingual `Map` fields; soft delete; brand/branch scoping; sensible indexes.
3. **Weaknesses:** `isGroupCategory`/`parentCategory`/`isMainCategory` is a confusing three-flag hierarchy instead of a clean parent/child tree.
4. **Missing Fields:** No `imageUrl`; no explicit `level`/`path` for nesting; `displayOrder` has no uniqueness scope.
5. **Incorrect Fields:** None major.
6. **Redundant Fields:** The three hierarchy flags overlap conceptually with `parentCategory`.
7. **Relationship Problems:** `parentCategory` self-reference is otherwise correct.
8. **Recommended Changes:** Collapse the three flags into a single `type: enum[root, group, sub]`.
9. **Priority:** Low.

#### `menu/product/product.model.js` — Product
1. **Purpose:** Sellable menu item / addon / combo / size-variant with pricing.
2. **Strengths:** Good size-group/extras/combo separation; tax reference; `preparationSection` linking product to kitchen station.
3. **Weaknesses:** **No cost/COGS fields whatsoever** (§1.7). `priceAfterDiscount` is a stored, non-computed field with no pre-save hook keeping it in sync with `price`/`discount` — will silently go stale. Single-image only (a code comment acknowledges this).
4. **Missing Fields:** `costPrice`, `lastCalculatedCost`, `marginPercentage`; index on `isDeleted`.
5. **Incorrect Fields:** **`sku: { unique: true }` is global, not brand-scoped** (§1.1); `barcode` has `sparse: true` but no `unique` at all — duplicate barcodes possible.
6. **Redundant Fields:** `price`/`discount`/`priceAfterDiscount` — the last is derived data prone to drift.
7. **Relationship Problems:** Product doesn't reference Recipe (acceptable via reverse lookup) but has no way to represent a directly-sold item with no Recipe at all (e.g., a bottled drink) needing stock deduction — no direct `stockItem` fallback field.
8. **Recommended Changes:** Add `{brand, sku}` compound unique index; add cached cost fields with a pre-save recompute hook for `priceAfterDiscount`; support multi-image array.
9. **Priority:** High.

#### `menu/recipe/recipe.model.js` — Recipe (Product → StockItem BOM)
1. **Purpose:** Bill-of-materials tying a Product to StockItem ingredients for costing/production.
2. **Strengths:** Unique `{product, brand, branch}` index; waste percentage per ingredient; separate `serviceDetails` for channel-specific consumption (e.g., extra delivery packaging).
3. **Weaknesses:** **No cost fields at all** (§1.7) — this is the single model where COGS should be computed and cached, and it has nowhere to store it. No versioning — edits overwrite in place, destroying historical costing/audit trail.
4. **Missing Fields:** `totalCost`, `costPerUnit`, `version`, `status` (draft/published).
5. **Incorrect Fields:** `unit` is free text with no cross-validation against StockItem's units (§1.8).
6. **Redundant Fields:** `ingredients` and `serviceDetails` are near-identical shapes that could be unified with a `channel` discriminator.
7. **Relationship Problems:** No reference to which `Inventory`/cost basis priced the recipe.
8. **Recommended Changes:** Add cached cost fields recalculated on ingredient/stock cost change; add recipe versioning.
9. **Priority:** Critical.

#### `menu/product-review/product-review.model.js` — ProductReview
1. **Purpose:** Customer review/rating per order/product.
2. **Strengths:** Correct `refPath` polymorphism (`reviewSource`/`referenceId`); good moderation workflow.
3. **Weaknesses:** No soft-delete triple — only `isActive`, inconsistent with the rest of the codebase.
4. **Missing Fields:** `isDeleted`/`deletedAt`/`deletedBy`.
5. **Incorrect Fields:** None.
6. **Redundant Fields:** None.
7. **Relationship Problems:** `relatedSalesReturn` refs `"SalesReturn"` correctly.
8. **Recommended Changes:** Standardize soft-delete fields.
9. **Priority:** Low.

### 2.5 Inventory

#### `inventory/inventory/inventory.model.js` — Inventory (current balance)
1. **Purpose:** Current stock balance (quantity + avg cost) per warehouse+stockItem.
2. **Strengths:** Unique `{warehouse, stockItem}` compound index prevents duplicate balance rows.
3. **Weaknesses:** **Only supports weighted-average costing** (singular `avgUnitCost`/`totalCost` fields) even though `StockItem.costMethod` offers FIFO/LIFO/WeightedAverage — for FIFO/LIFO items there is nowhere to store layered lots, so the "current balance" for those items can only be an approximation or must be fully recomputed from `StockLedger` every time, defeating the point of a materialized balance table.
4. **Missing Fields:** `reservedQuantity` (for orders/production in progress); lot/expiry breakdown; audit `createdBy`/`updatedBy` (absent entirely).
5. **Incorrect Fields:** None type-wise.
6. **Redundant Fields:** `brand` redundant given `warehouse → branch → brand`, and not even indexed for query benefit.
7. **Relationship Problems:** Correctly references Warehouse/StockItem/Brand/Branch, but no direct pointer to/from StockLedger to verify sync.
8. **Recommended Changes:** Add `{brand, branch, stockItem}` index; add lot/expiry breakdown or explicitly document that FIFO items must be read from StockLedger only; add `reservedQuantity`.
9. **Priority:** Critical (valuation-method inconsistency blocks accurate FIFO accounting).

#### `inventory/inventory-count/inventory-count.model.js` — InventoryCount
1. **Purpose:** Physical stock count/reconciliation workflow.
2. **Strengths:** Good workflow states; links `adjustmentDocument`; variance stored per item.
3. **Weaknesses:** **`variance` has `min: 0`** — variance = counted − system can legitimately be negative (shrinkage, the common real-world case); this either throws validation errors or forces callers to store `Math.abs()` and lose the sign, corrupting the resulting adjustment direction. A real functional bug, not a design nit.
4. **Missing Fields:** `costVariance`/dollar-value of the variance (quantity-only today).
5. **Incorrect Fields:** `variance.min: 0`.
6. **Redundant Fields:** None major.
7. **Relationship Problems:** `approvedBy`/`executedBy` reference `Employee`, `createdBy`/`deletedBy` reference `UserAccount` (§1.2).
8. **Recommended Changes:** Remove `min:0` from `variance`; add `costVariance`; standardize actor refs.
9. **Priority:** High (functional bug that will break negative-variance counts).

#### `inventory/inventory-settings/inventory-settings.model.js` — InventorySettings
1. **Purpose:** Brand/branch toggles for auto-deduction, negative stock, production approvals.
2. **Strengths:** Clean, minimal, correct `{brand,branch}` uniqueness.
3. **Weaknesses:** `lowStockThreshold` is a single global number, but `StockItem` also has its own per-item `minThreshold`/`maxThreshold` — no documented precedence between the two.
4. **Missing Fields:** `defaultCostMethod`; `autoDeductOnProduction` (only `autoDeductOnOrder` exists).
5. **Incorrect Fields:** None.
6. **Redundant Fields:** `lowStockThreshold` overlaps StockItem's per-item thresholds.
7. **Relationship Problems:** None.
8. **Recommended Changes:** Document precedence or remove the brand-level fallback.
9. **Priority:** Low.

#### `inventory/stock-category/stock-category.model.js` — StockCategory
1. **Purpose:** Classification of stock items.
2. **Strengths:** Simple, unique `{brand, categoryCode}`, multilingual.
3. **Weaknesses:** `categoryCode` declares field-level `unique:false` (dead/misleading, harmless since the real constraint is the compound index below it). `branch` field exists but isn't part of the unique index — contradicts its apparent purpose of allowing branch-specific category codes.
4. **Missing Fields:** `parentCategory` for sub-classification.
5. **Incorrect Fields:** Dead `unique:false` declaration.
6. **Redundant Fields:** None.
7. **Relationship Problems:** None.
8. **Recommended Changes:** Either drop `branch` or include it in the unique index intentionally.
9. **Priority:** Low.

#### `inventory/stock-item/stock-item.model.js` — StockItem
1. **Purpose:** Master data for raw material/ingredient/packaging/service items, UOM conversion, costing method.
2. **Strengths:** `storageUnit`/`ingredientUnit`/`parts` conversion; `costMethod` enum; accounting account references (`inventoryAccount`/`expenseAccount`/`cogsAccount`) — genuinely accounting-grade intent.
3. **Weaknesses:** **UOM conversion supports exactly one conversion step** — real kitchens need multi-level and non-linear conversions (case→box→each, "1 egg ≈ 50g"); no general UOM table exists (§1.8). `hasExpiry` flag exists with no `shelfLifeDays` default, so expiry must be manually entered every single receipt. `notes` (a Map) is oddly `required: true`.
4. **Missing Fields:** `shelfLifeDays`, `batchTrackingEnabled` (distinct from `hasExpiry`), full soft-delete triple (StockItem has none — only `isActive`), brand-scoped SKU/barcode.
5. **Incorrect Fields:** `notes` incorrectly required; global (not brand-scoped) `unique:true` on SKU/barcode (§1.1).
6. **Redundant Fields:** Overlap with InventorySettings' `lowStockThreshold`.
7. **Relationship Problems:** `categoryId`/account refs correct.
8. **Recommended Changes:** Add a real multi-tier UOM conversion table (`unitConversions: [{from,to,factor}]`); add `shelfLifeDays`; add full soft-delete; brand-scope SKU/barcode; make `notes` optional.
9. **Priority:** Critical (UOM gap is the single biggest blocker to accurate recipe costing across units).

#### `inventory/stock-ledger/stock-ledger.model.js` — StockLedger
1. **Purpose:** Append-only movement log per stock item per warehouse — the FIFO/valuation source of truth.
2. **Strengths:** `inbound`/`outbound`/`balanceSnapshot` triad is a solid ledger pattern; `remainingQuantity` supports FIFO layers; best expiry support in the whole model set; polymorphic `sender`/`receiver`.
3. **Weaknesses:** **`source` enum contains `"ProductionOut"` twice** (two separate lines, with conflicting comments) — a genuine schema defect corrupting production consumption-vs-output semantics. `senderType`/`receiverType` enum omits `"Warehouse"` even though transfer semantics require it, forcing transfers to use the generic `"System"` value and losing which warehouse was the counterpart.
4. **Missing Fields:** `lotNumber`/`batchNumber` (nowhere in the entire model set — see §3 for the traceability implication); a snapshot of the unit-conversion factor actually applied at that point in time.
5. **Incorrect Fields:** The duplicate `"ProductionOut"` enum value.
6. **Redundant Fields:** The duplicate enum entry itself.
7. **Relationship Problems:** `senderType`/`receiverType` should include `"Warehouse"`.
8. **Recommended Changes:** Fix the duplicate enum value (rename one, e.g. `"ProductionConsume"` vs `"ProductionYield"`); add `"Warehouse"` to sender/receiver enums; add `lotNumber`.
9. **Priority:** Critical.

#### `inventory/stock-transfer-request/stock-transfer-request.model.js` — StockTransferRequest
1. **Purpose:** Inter-warehouse transfer approval/execution workflow.
2. **Strengths:** Full approval workflow with reject reason; links `outDocument`/`inDocument` to WarehouseDocument.
3. **Weaknesses:** `referenceId` has **no `ref`/`refPath`** despite a companion `referenceType` string — and that enum's values (`"Production"`, `"Consumption"`) don't even match real model names (`ProductionOrder`, `Consumption`), so fixing the `refPath` alone wouldn't be enough without also correcting the enum values.
4. **Missing Fields:** Proper `refPath`; unit-cost fields on transfer items for direct reporting.
5. **Incorrect Fields:** `referenceType` enum values don't match real model names.
6. **Redundant Fields:** None.
7. **Relationship Problems:** Polymorphic `referenceId` is unusable for population as written.
8. **Recommended Changes:** Fix `referenceId` to use `refPath: "referenceType"` with values aligned to actual model names.
9. **Priority:** Medium.

#### `inventory/warehouse/warehouse.model.js` — Warehouse
1. **Purpose:** Physical/virtual storage location master data.
2. **Strengths:** `isVirtual` flag; `allowReceiving`/`allowIssuing`; `storekeepers[]`; branch-scoped unique code.
3. **Weaknesses:** No `production`-type value in the `type` enum despite ProductionOrder/ProductionRecord both requiring a `warehouse` presumably meant to represent a production/prep area. No `parentWarehouse` for hierarchy. No `defaultCostMethod` override per warehouse.
4. **Missing Fields:** Production-type enum value; partial unique index enforcing one `isDefault` warehouse per branch (currently unenforced — multiple defaults possible).
5. **Incorrect Fields:** None.
6. **Redundant Fields:** None.
7. **Relationship Problems:** None.
8. **Recommended Changes:** Add the missing `isDefault` uniqueness guard.
9. **Priority:** Medium.

#### `inventory/warehouse-document/warehouse-document.model.js` — WarehouseDocument
1. **Purpose:** Formal accounting document (IN/OUT/TRANSFER/ADJUSTMENT) driving StockLedger entries and journal postings.
2. **Strengths:** Clean document-header/lines pattern; `journalEntry` link; brand+branch scoped unique `documentNumber`.
3. **Weaknesses:** `items[].unitCost`/`totalCost` are unconditionally `required` even for OUT documents, where cost should be *derived* by the costing engine at posting time, not manually entered — invites data-entry errors or manual-override fraud risk. No conditional validation ensuring TRANSFER documents require both source and destination warehouse.
4. **Missing Fields:** `lotNumber`/`expirationDate` per item (needed to properly flow into StockLedger's expiry support).
5. **Incorrect Fields:** Unconditional `required` cost fields.
6. **Redundant Fields:** None.
7. **Relationship Problems:** Correct Warehouse/StockItem references.
8. **Recommended Changes:** Add conditional-required validation keyed on `documentType`; add lot/expiry fields per item.
9. **Priority:** High.

#### `inventory/consumption/consumption.model.js` — Consumption
1. **Purpose:** Shift-based theoretical-vs-actual consumption reconciliation per preparation section.
2. **Strengths:** Good theoretical/actual/variance triad; ties to `shift` and `preparationSection`.
3. **Weaknesses:** **Field named `Warehouse` (capital W)** breaks the lowercase-`warehouse` convention used everywhere else — any code querying `doc.warehouse` will get `undefined`, a real bug waiting to surface. No soft-delete fields at all. No `updatedBy` (only `openedBy`/`closedBy`).
4. **Missing Fields:** `ref: "WarehouseDocument"` entirely missing on `receivedDuringShift[].document` (present only as a comment); soft-delete triple; `costImpact`; any compound index at all (no index block in the file).
5. **Incorrect Fields:** `Warehouse` field casing (line 15).
6. **Redundant Fields:** None.
7. **Relationship Problems:** `receivedDuringShift.document` cannot be populated (missing `ref`).
8. **Recommended Changes:** Rename `Warehouse`→`warehouse`; add the missing `ref`; add soft-delete + cost-impact fields; add a compound index.
9. **Priority:** High.

### 2.6 Production

#### `production/production-order/production-order.model.js` — ProductionOrder
1. **Purpose:** Request/plan to produce a stock item, prior to execution.
2. **Strengths:** Priority/status workflow; links `stockItem`+`warehouse`+`preparationSection`.
3. **Weaknesses:** **No reference to Recipe/ProductionRecipe at all** — the order can be approved with zero BOM validation; the recipe only appears later, at execution time, in `ProductionRecord`. This is a severe planning-stage gap. `orderStatus` enum mixes `"Pending"` (capitalized) with lowercase values — careless enum authorship.
4. **Missing Fields:** `productionRecipe` reference; unique `orderNumber` index (currently none at all); soft-delete triple; `estimatedCost`.
5. **Incorrect Fields:** Enum casing inconsistency.
6. **Redundant Fields:** None.
7. **Relationship Problems:** Missing Recipe/ProductionRecipe linkage — the intended Order→Recipe→StockItem chain simply isn't wired at the planning stage.
8. **Recommended Changes:** Add a required `productionRecipe` reference; add unique `{brand, branch, orderNumber}` index; add soft-delete triple.
9. **Priority:** Critical.

#### `production/production-recipe/production-recipe.model.js` — ProductionRecipe (StockItem → StockItem BOM)
1. **Purpose:** BOM for internally-produced stock items (semi-finished goods), distinct from the customer-facing `menu/Recipe`.
2. **Strengths:** Versioning via auto-increment on save; partial unique index (one active recipe per stockItem); waste percentage per ingredient.
3. **Weaknesses:** This creates **two parallel, disconnected "Recipe" concepts** in the codebase (`menu/recipe` = Product→StockItem, `production/production-recipe` = StockItem→StockItem) with no shared schema, no cross-reference, and no cost-rollup mechanism — if a Product's Recipe consumes a semi-finished item (e.g., "house sauce"), that item's own ProductionRecipe cost is never rolled up anywhere, a real risk for multi-level BOM costing in central-kitchen setups. The version auto-increment `pre('save')` hook queries by `stockItem` alone with no brand/branch scoping in the query itself (mitigated somewhat by StockItem already being brand-specific, but fragile).
4. **Missing Fields:** `totalCost`/`costPerUnit`; soft-delete triple (`isActive` exists, `isDeleted`/`deletedAt`/`deletedBy` do not).
5. **Incorrect Fields:** None type-wise.
6. **Redundant Fields:** Conceptual duplication with `menu/recipe` (architecture-level, not field-level).
7. **Relationship Problems:** No linkage between the two Recipe concepts.
8. **Recommended Changes:** Add cost fields; explicitly document/unify the relationship between the two Recipe concepts with shared cost-rollup logic.
9. **Priority:** High.

#### `production/production-record/production-record.model.js` — ProductionRecord
1. **Purpose:** Actual execution record of a production run — materials consumed, operation cost, resulting quantity/cost.
2. **Strengths:** Good separation of `materialsUsed` (direct cost) vs. `opertionCost` (labor/overhead — note the typo) for real manufacturing costing; links `productionOrder`+`productionRecipe`.
3. **Weaknesses:** **No `brand`/`branch` fields on this schema at all** — the only model found in the entire review with zero tenant scoping fields, only inferable transitively via `productionOrder`/`warehouse`. `productionCost` has no computation hook — nothing sums `materialsUsed`+`opertionCost` automatically, so it's silently `undefined` unless application code remembers to set it. `productionNumber` is a **global unique `Number`**, not tenant-scoped.
4. **Missing Fields:** `brand`, `branch`; a link to the `StockLedger`/`WarehouseDocument` rows this run should generate.
5. **Incorrect Fields:** Global-unique `productionNumber` (§1.1); `opertionCost` typo (will propagate through the API contract).
6. **Redundant Fields:** None.
7. **Relationship Problems:** No explicit link to the StockLedger entries a production run generates — Production→StockLedger is entirely implicit.
8. **Recommended Changes:** Add required `brand`/`branch`; scope `productionNumber` uniqueness; add `stockLedgerEntries`/`warehouseDocument` ref; add a cost-aggregation pre-save hook; fix the typo.
9. **Priority:** Critical (missing brand/branch is a severe multi-tenancy gap on top of the global-unique numbering bug).

### 2.7 Preparation

#### `preparation/preparation-section/preparation-section.model.js` — PreparationSection
1. **Purpose:** Kitchen/bar station configuration (capacity, auto-assignment).
2. **Strengths:** Sensible operational config (`maxParallelTickets`, `averagePreparationTime`, `allowPartialDelivery`); good soft-delete + unique index pattern.
3. **Weaknesses:** No explicit link to `Warehouse` — a section conceptually corresponds to a production/consumption warehouse but nothing formalizes that relationship.
4. **Missing Fields:** `defaultWarehouse` reference; `stationType` grouping enum.
5–7. No other significant issues.
8. **Recommended Changes:** Add `defaultWarehouse: {type: ObjectId, ref: "Warehouse"}`.
9. **Priority:** Medium.

#### `preparation/preparation-ticket/preparation-ticket.model.js` — PreparationTicket
1. **Purpose:** Kitchen ticket per order — one execution unit sent to a preparation section.
2. **Strengths:** Separates `preparationStatus` from `deliveryStatus`; `handoverEvents` audit trail; `items[].quantity` correctly marked `immutable`.
3. **Weaknesses:** **No reference to Recipe or StockItem consumption at all** — a ticket only carries `product`/`quantity`/`extras`, with zero inventory awareness. If a ticket is rejected/cancelled after stock has already been deducted (per `InventorySettings.autoDeductOnOrder`), there is no schema-level mechanism to trace or reverse that deduction.
4. **Missing Fields:** Stock-deduction linkage (`stockLedgerEntries`/`consumptionRecord`); `warehouse`.
5–6. No other significant issues.
7. **Relationship Problems:** Entirely disconnected from the inventory/production chain despite the system otherwise having detailed inventory costing infrastructure.
8. **Recommended Changes:** Add explicit linkage from ticket completion/cancellation to StockLedger/Consumption reversal.
9. **Priority:** High.

#### `preparation/preparation-return/preparation-return.model.js` — PreparationReturn
1. **Purpose:** Handles returned/rejected items post-preparation (waste/return-to-stock/resell decision).
2. **Strengths:** Good `decision` enum (`WASTE`/`RETURN_TO_STOCK`/`RESELLABLE`) directly modeling real workflows; ties to `SalesReturn`.
3. **Weaknesses:** Same inventory-disconnection gap as PreparationTicket — a `RETURN_TO_STOCK` decision implies a stock adjustment should occur, but there's no field recording the resulting WarehouseDocument/StockLedger entry.
4. **Missing Fields:** `stockLedgerEntry`/`warehouseDocument` linkage per decision.
5–7. No other significant issues.
8. **Recommended Changes:** Add reference field(s) for the resulting stock movement.
9. **Priority:** Medium.

#### `preparation/preparation-settings/preparation-return-settings.model.js` & `preparation-ticket-settings.model.js`
1. **Purpose:** Brand/branch/section policy for return handling and ticket numbering.
2. **Strengths:** `affectInventory` boolean correctly signals whether returns touch stock; self-contained ticket sequence generator.
3. **Weaknesses:** `ticketSequence.currentNumber` increments via a plain document field with **no atomic `$inc` guarantee visible at the schema level** — a classic race-condition risk under concurrent ticket creation, which could produce duplicate ticket numbers.
4–7. No other significant issues.
8. **Recommended Changes:** Ensure ticket-number generation uses atomic `findOneAndUpdate` with `$inc`, not read-modify-write.
9. **Priority:** Medium.

### 2.8 Sales

#### `sales/order/order.model.js` — Order
1. **Purpose:** Operational order/ticket — item lines with per-item kitchen status, explicitly "no accounting logic."
2. **Strengths:** Good separation of operational vs. financial concerns; granular per-item kitchen-status enum; `deliveryPolicy` for ticket-based delivery; price/extras snapshotting avoids retroactive drift.
3. **Weaknesses:** **`orderNum` is globally `unique: true`** (§1.1) despite a code comment claiming "unique per branch," and despite `OrderSettings.orderSequence` clearly being designed as a per-branch, daily-resetting sequence — two branches will produce identical `orderNum` values and the second insert throws a duplicate-key error. `quantity` on order items is hard-locked `immutable: true, default: 1` with a comment calling this "restaurant best practice" — a business-rule opinion baked into the schema that blocks the common "Coke x3" pattern, forcing bloated duplicate line items instead. No `session`/`visitId` to group multiple tickets under one table sitting despite `isSplit` implying exactly that need.
4. **Missing Fields:** `diningArea`, `guestsCount`; delivery-specific fields (`deliveryAddress`, `deliveryFee`, `deliveryMan`, `estimatedDeliveryTime` — these exist only on Invoice, the wrong layer for operational delivery assignment); `cancelReason`/`cancelledBy`/`cancelledAt`; `isDeleted`.
5. **Incorrect Fields:** `orderNum` global uniqueness; `iternalOrderCategory` typo.
6. **Redundant Fields:** `isActive` and `status` overlap ambiguously; `paymentStatus` duplicates state that should live authoritatively on Invoice, contradicting Order's own "no financial data" design intent.
7. **Relationship Problems:** No `promotion`/`appliedPromotions` reference — undocumented how order-time discounts flow into Invoice's flat `discount` number; no `diningArea`; one-directional `Reservation.linkedOrder` with no reverse `Order.reservation` field.
8. **Recommended Changes:** Scope `orderNum` uniqueness to `{branch, orderNum}`; add `diningArea`/`guestsCount`/`session`; move delivery fields to Order; add cancellation audit fields and `isDeleted`; add `appliedPromotions`; relax the qty=1 rigidity; fix the typo.
9. **Priority:** Critical (the orderNum bug is a guaranteed production failure on the second branch).

#### `sales/order-settings/order-settings.model.js` — OrderSettings
1. **Purpose:** Per-brand/branch order business rules (numbering, holds, splits, cancellation, kitchen auto-send).
2. **Strengths:** Correct `{brand,branch}` unique index; reasonable operational toggle coverage; full audit/soft-delete.
3. **Weaknesses:** Defines a proper per-branch `orderSequence`, but as noted above **Order.model.js's uniqueness doesn't actually honor branch scoping** — the settings and the model it configures are out of sync. `lastResetDate` is typed `String` rather than `Date`.
4. **Missing Fields:** Order-type-specific rule overrides (delivery vs. dine-in cancellation rules differ in practice).
5. **Incorrect Fields:** `lastResetDate: String`.
6–7. No other significant issues.
8. **Recommended Changes:** Change `lastResetDate` to `Date`; align the numbering design with `InvoiceSettings.invoiceSequence`'s more robust pattern; most importantly, fix `Order.orderNum`'s index to actually honor this setting's per-branch intent.
9. **Priority:** High (feeds directly into the Critical Order bug).

#### `sales/invoice/invoice.model.js` — Invoice
1. **Purpose:** Financial record generated from an Order — the accounting-facing bill.
2. **Strengths:** `paymentMethod[]` array genuinely supports split payments (cash+card) with per-line amount/currency/reference; `cashierShift` linkage for reconciliation; item-price snapshotting.
3. **Weaknesses:** **`serial` has a field-level global `unique: true` *and* a separate compound `{brand,branch,serial}` index** — a direct contradiction; the global constraint alone guarantees a collision the moment two branches both issue invoice `"000001"` (which `InvoiceSettings.resetPolicy` explicitly expects to happen routinely). `branch` is optional (`default: null`) despite virtually every other model requiring it — and because MongoDB's compound unique index still treats `null` as a comparable value, **only one branch-less invoice could ever exist per `{brand,serial}`** even if the global bug were fixed. `items[].price`/`totalprice` etc. use **`min: 1`, blocking zero-price/free items** — meaning a `Promotion`-driven BOGO/free item literally cannot be represented on an invoice without violating the schema. `items[].quantity` is capped `max: 1` with a comment "quantity x price" that self-contradicts the cap. `status` enum has no `PARTIALLY_PAID`/`UNPAID` despite the array-based payment structure clearly anticipating partial payment scenarios.
4. **Missing Fields:** Tax-line breakdown (`taxLines: [{taxConfig, rate, base, amount}]`) — only flat `salesTax`/`serviceTax` numbers exist; discount/promotion traceability (`appliedPromotions`); `isLocked`/`postedAt`/`voidedAt`/`voidedBy` for immutability after finalization (a setting, `SalesReturnSettings.immutableAfterFinalize`, already expects this to exist); `createdBy` (only `paidBy` exists).
5. **Incorrect Fields:** The `serial` double-index conflict; `min:1` on price fields; `quantity.max:1` contradiction; `branch` optionality.
6. **Redundant Fields:** None major beyond the tax/service-charge naming ambiguity noted in §1.10.
7. **Relationship Problems:** Invoice re-declares its own item/pricing data rather than deriving it from Order, with no version/hash to detect drift between the two; no dedicated `Payment` transaction model — `paymentMethod[]` embeds raw amounts with no link to an actual gateway/cash transaction record for reconciliation; `Invoice.order` is singular, so one invoice **cannot** represent multiple order tickets (multi-course dine-in) nor can one order be split into multiple invoices (split-by-guest) — directly contradicting the purpose of `Order.isSplit`.
8. **Recommended Changes:** Remove the field-level `unique:true` on `serial`; make `branch` required; add `PARTIALLY_PAID`/`UNPAID` status; change `min:1`→`min:0`; remove the quantity cap contradiction; add tax-line and promotion-traceability arrays; add immutability fields; add a real Payment transaction reference.
9. **Priority:** Critical (serial uniqueness bug + zero-price blocking bug are both concrete, reproducible production failures).

#### `sales/invoice-settings/invoice-settings.model.js` — InvoiceSettings
1. **Purpose:** Branch/brand invoice numbering, printing, display, layout configuration.
2. **Strengths:** Robust numbering scheme (`prefix/startNumber/padding/includeDate/separator/resetPolicy`) — actually the best-designed numbering pattern in the codebase and should be the template Order/SalesReturn are made to follow.
3. **Weaknesses:** **`showServiceCharge`, `showDeliveryFee`, `showTaxDetails` are declared twice** in the same schema literal (two separate "display" comment blocks) — harmless since identical, but indicates unreviewed copy-paste. **`numberOfCopies` and `copies` are two separate fields for the same real concept**, with no clarity on which one the printing code actually reads — a genuine, not just cosmetic, redundancy risk. Similarly `printOnPayment`/`autoPrintOnPayment` and `printOnOrderClose`/`autoPrintOnClose` are duplicated pairs.
4. **Missing Fields:** VAT/tax-registration-number display toggle linked to `TaxConfig`; fiscal/legal invoice-type field (simplified vs. full tax invoice, relevant for e-invoicing mandates).
5. **Incorrect Fields:** None type-wise — the duplicates are the defect.
6. **Redundant Fields:** As above (real, not cosmetic — whichever field the print code doesn't read will silently do nothing when a user changes it).
7–8. **Recommended Changes:** De-duplicate; pick one canonical name for each pair and delete the other; add a fiscal invoice-type field.
9. **Priority:** Medium.

#### `sales/promotion/promotion.model.js` — Promotion
1. **Purpose:** Discount/promotional campaign (order-wide, product-specific, Buy-X-Get-Y) with validity windows and usage limits.
2. **Strengths:** Multilingual name; clear `appliesTo` scoping; `activeFrom`/`activeTo` indexed; `usageLimit`/`usagePerCustomer`; full audit trail.
3. **Weaknesses:** `usageLimit`/`usagePerCustomer` exist with **no `usageCount` counter to actually enforce them** — enforcement would require querying order/invoice history every time with no atomic increment, a real race-condition risk for over-redemption. No `combinable`/`priority` field, so with `autoApply` promotions and no stacking rules, multiple eligible promotions have undefined precedence.
4. **Missing Fields:** `usageCount`, `combinable`, `orderType` restriction scoping, `maxDiscountAmount` cap, `isDeleted` (only `deletedAt`/`deletedBy` exist).
5. **Incorrect Fields:** No conditional-required validation tying `type: PERCENTAGE` to actually requiring `percentage` (a doc could save with neither/both populated ambiguously).
6–7. **Relationship Problems: Promotion is never referenced by Order or Invoice at all** — the single biggest structural gap for this model: a rich, well-designed discount-campaign engine with zero data-level trace connecting an actual sale back to the promotion(s) applied.
8. **Recommended Changes:** Add `usageCount` with atomic increments, `combinable`/`priority`, `orderType` scoping, `maxDiscountAmount`, `isDeleted`; critically, add `appliedPromotions` to Order and/or Invoice.
9. **Priority:** High.

#### `sales/promotion-settings/promotion-settings.model.js` — **EMPTY PLACEHOLDER**
See §1.6. **Priority: Critical if imported anywhere (crashes); High as a product gap regardless.**

#### `sales/sales-return/sales-return.model.js` — SalesReturn
1. **Purpose:** Refund/return transaction against a prior Invoice, full or partial.
2. **Strengths:** References both `originalInvoice` and `order`; `originalInvoiceItemId` per return line for traceability; `refundMethod[]` mirrors Invoice's split-payment pattern.
3. **Weaknesses:** Inherits the exact same `min:1`/`quantity.max:1` bugs as Invoice. **`serial` is worse than Invoice's**: field-level global `unique:true` with **no compound index defined at all in this file** to even partially mitigate it — the very first return of the day from two different branches will collide.
4. **Missing Fields:** `returnReason` text despite `SalesReturnSettings.requireReturnReason: true` expecting one to exist with nothing to enforce it against; `approvedBy`/approval linkage despite `SalesReturnSettings.requireManagerApproval`/`approvalThresholdAmount`; `createdBy`/`updatedBy` (absent entirely — no audit trail beyond timestamps and `paidBy`).
5. **Incorrect Fields:** `serial` global uniqueness (worse instance of §1.1).
6. **Redundant Fields:** Storing both `originalInvoice` and `order` with no validation that `order` actually matches `originalInvoice.order`.
7. **Relationship Problems:** `branch` is `required: true` here but `optional` on Invoice — a SalesReturn can reference an Invoice whose own branch is unset, an inconsistency between the paired documents.
8. **Recommended Changes:** Add `{brand,branch,serial}` compound unique index and drop the field-level one; add `returnReason`, `approvedBy`, `createdBy`/`updatedBy`; fix `min:1`→`min:0`; align `branch` requiredness with Invoice.
9. **Priority:** Critical.

#### `sales/rerturn-sales-settings/sales-return-settings.model.js` — SalesReturnSettings
1. **Purpose:** Branch/brand return/refund policy (time limits, approval thresholds, refund composition, GL entry generation).
2. **Strengths:** Good coverage — `maxReturnMinutes`, `decisionBy` (role-based array), `immutableAfterFinalize`, `generateAccountingEntry`.
3. **Weaknesses:** (Directory itself is misspelled `rerturn-sales-settings` — cosmetic but a real maintainability/searchability nuisance.) `immutableAfterFinalize: true` by default, but **neither Invoice nor SalesReturn has a field to enforce it against** — the policy exists with nothing to apply it to.
4–7. No other significant issues.
8. **Recommended Changes:** Add corresponding `isLocked`/`finalizedAt` enforcement fields to Invoice/SalesReturn; consider renaming the directory (low priority, breaking).
9. **Priority:** Medium.

### 2.9 Seating

#### `seating/table/table.model.js` — Table
1. **Purpose:** Physical table within a dining area.
2. **Strengths:** Good compound unique indexes (`branch+tableNumber`, `branch+tableCode`); sensible operational `status` enum including cleaning/maintenance/out_of_service.
3. **Weaknesses:** No `currentOrder`/`activeOrder` denormalized pointer — finding the current order on a table always requires a reverse query. No `isDeleted` boolean (only `deletedAt`), and no `deletedBy` at all.
4. **Missing Fields:** `currentOrder`, `isDeleted`, `deletedBy`.
5–7. No other significant issues.
8. **Recommended Changes:** Add the missing fields for consistency and POS table-map query efficiency.
9. **Priority:** Low/Medium.

#### `seating/dining-area/dining-area.model.js` — DiningArea
1. **Purpose:** Groups tables into a front-of-house zone controlling reservation/QR/manual-order eligibility.
2. **Strengths:** Multilingual name; `type` enum; granular per-area toggles; unique `{branch,code}`.
3. **Weaknesses:** `type` enum includes `"delivery"`/`"takeaway"` as *dining area* types — conceptually odd for a seating-zone entity, and since `Table.diningArea` is `required: true` for every table, delivery/takeaway "areas" would need dummy Table records to exist at all — meanwhile `Order` never actually references `DiningArea`, so this field is effectively dead for non-dine-in order types. No soft-delete triple at all (only `isActive`) — a third different soft-delete convention alongside Table's and Order's, all in the same closely-related chain.
4. **Missing Fields:** Soft-delete triple; a `waiterAssignment` field the model's own docstring mentions but never implements.
5–6. No other significant issues.
7. **Relationship Problems:** DiningArea is only referenced by Table, never by Order — unreachable for delivery/takeaway despite the type enum implying otherwise.
8. **Recommended Changes:** Restrict `type` to actual seating-zone types, or add an explicit Order→DiningArea reference if delivery/takeaway zones are intentional; standardize soft-delete pattern across Table/DiningArea/Order.
9. **Priority:** Medium.

#### `seating/reservation/reservation.model.js` — Reservation
1. **Purpose:** Table reservation lifecycle (pending → confirmed → seated → completed/cancelled/no-show).
2. **Strengths:** Good lifecycle enum; `endTime > startTime` custom validator; `linkedOrder` back-reference once seated.
3. **Weaknesses:** The index intended for "double booking prevention" (`table, startTime, endTime`) is a **plain non-unique index** — it does not actually prevent double-booking at the database level; the comment claiming prevention is misleading, and enforcement is entirely left to application logic. `cancelledBy` references `Employee` while `createdBy`/`updatedBy` reference `UserAccount` (§1.2).
4. **Missing Fields:** Real double-booking enforcement (partial-filter uniqueness or a timeslot-bucket doc); deposit fields; `source` channel (phone/walk-in/app/third-party).
5–6. No other significant issues.
7. **Relationship Problems:** One-directional `linkedOrder` — no reverse `reservation` field on Order.
8. **Recommended Changes:** Add genuine overlap-prevention mechanism; standardize actor refs; add `reservation` back-ref on Order.
9. **Priority:** Medium (the false sense of safety from the misleading index comment pushes this toward High from a data-integrity-perception standpoint).

### 2.10 Payments

#### `payments/payment-channel/payment-channel.model.js` — PaymentChannel
1. **Purpose:** Non-cash payment rail (POS terminal, wallet, gateway, collection company) with accounting clearing/settlement/fee account mapping.
2. **Strengths:** Good accounting linkage (`clearingAccount`/`settlementAccount`/`feeAccount`); `autoPost`; unique `{brand,branch,code}` index.
3. **Weaknesses:** **`requiresSettlement`'s default function references `this.paymentCategory`, but `PaymentChannel` has no `paymentCategory` field at all** (that field only exists on the sibling `PaymentMethod` model) — a copy-paste bug that means `requiresSettlement` **always silently defaults to `false`**, regardless of channel type. **This schema is missing `{ timestamps: true }` entirely** — `createdAt`/`updatedAt` are not tracked at all, a real audit gap on a financial-adjacent model, and inconsistent with virtually every other schema reviewed. **`code` has a field-level global `unique: true` in addition to the compound `{brand,branch,code}` index** — the same contradiction pattern as Invoice.serial/CashRegister.code — blocking two different brand tenants from both using `code: "VISA"`.
4. **Missing Fields:** `paymentCategory` (or fix the default function to reference the correct existing field); `timestamps`.
5. **Incorrect Fields:** Broken `requiresSettlement` default; global-unique `code`.
6–7. No other significant issues beyond the shallow linkage from Invoice noted in §3.
8. **Recommended Changes:** Add `paymentCategory` or repoint the default function; add `timestamps: true`; remove the field-level `unique` on `code`.
9. **Priority:** Critical (multi-tenant code-uniqueness bug + a financial model with no timestamps + a silently-broken computed default).

#### `payments/payment-method/payment-method.model.js` — PaymentMethod
1. **Purpose:** Customer-facing payment option (Cash/Card/Wallet/Gateway/Credit/Voucher/GiftCard), polymorphically backed by a CashRegister or PaymentChannel.
2. **Strengths:** Clean, correct `refPath` polymorphism; smart computed defaults based on `paymentCategory`/`paymentType`; `allowSplit` flag; a genuinely well-done partial unique index for `isDefault`; the most complete audit trail of any model in the sales/payments chain. This is the **cleanest-designed model found in the entire review.**
3. **Weaknesses:** No uniqueness on `{brand, branch, paymentCategory, name}` — duplicate "Cash" methods possible per branch. No fee/settlement snapshot captured on Invoice at time-of-use, so if `PaymentChannel.feesPercentage` changes later, historical invoices' effective cost can't be reconstructed (this gap really belongs to Invoice, flagged there too).
4–7. No significant relationship problems on this model itself.
8. **Recommended Changes:** Consider adding uniqueness on the name/category combination if duplicates are undesired.
9. **Priority:** Low (this specific model is solid; the cross-model gap is tracked under Invoice/§3).

#### `payments/payment-provider/payment-provider.model.js` — **COMPLETELY EMPTY (0 bytes)**
See §1.6. `PaymentChannel.providerName` being a free-text Map instead of a foreign key is a direct symptom of this model never having been implemented. **Priority: Critical.**

#### `payments/payment-settings/payment-settings.model.js` — **EMPTY PLACEHOLDER**
See §1.6. Combined with the empty `PaymentProvider`, **2 of the 4 files in the entire Payments module are unimplemented** — only `PaymentChannel` and `PaymentMethod` are real. **Priority: Critical.**

### 2.11 System Settings

#### `system/tax-settings/tax-config.model.js` — TaxConfig
1. **Purpose:** VAT/tax rules per brand/branch (rate, calculation method, price-inclusive flag, GL mapping).
2. **Strengths:** `calculationMethod` (BEFORE/AFTER discount) and `pricesIncludeTax` are genuinely important, correctly modeled accounting nuances; `vatReceivableAccount`/`vatPayableAccount` GL linkage is accounting-grade; correct `{brand,branch}` uniqueness.
3. **Weaknesses:** **A single flat `percentage` field supports only one tax rate per branch** — no support for multiple simultaneous rates (standard vs. reduced VAT, alcohol taxed differently from food), and no per-category exemption scoping. No effective-dated rate history — if `percentage` changes, all historical invoices become unauditable against the rate that was actually applied when they were created.
4. **Missing Fields:** Multi-rate table structure; `taxType` enum (VAT/GST/Sales Tax) for regulatory branching; effective-dated rate history.
5–6. No other significant issues.
7. **Relationship Problems: TaxConfig is never referenced by Order, Invoice, or SalesReturn** — all three just store a flat `salesTax` number with zero linkage back to the config that produced it, which is the central structural blocker to accounting-grade, auditable invoicing.
8. **Recommended Changes:** Add a `rates: [{category, percentage, account}]` sub-array, or accept single-rate as an intentional simplification but at minimum add a `taxConfig` reference + rate snapshot on Invoice.
9. **Priority:** High.

#### `system/discount-settings/discount-settings.model.js` — DiscountSettings
1. **Purpose:** Manual-discount limit and approval-threshold policy per brand/branch.
2. **Strengths:** Clean, focused; correct `{brand,branch}` uniqueness.
3. **Weaknesses:** `maxManualDiscount` and `approvalThreshold` both default to `20` — meaning approval only ever kicks in exactly at the hard cap, making the approval-threshold concept nearly meaningless by default. No cross-field validation ensures `approvalThreshold <= maxManualDiscount`.
4. **Missing Fields:** `maxManualDiscountFixedAmount` (percentage-only today); a policy flag governing interaction with `Promotion` stacking (currently zero shared governance — a cashier could apply a manual discount AND an auto-applying promotion simultaneously with no combined ceiling).
5–6. No other significant issues.
7. **Relationship Problems:** No connection to `Promotion` at all — two entirely separate discounting mechanisms with no shared cap.
8. **Recommended Changes:** Add a fixed-amount cap; add a `combineWithPromotions` policy flag.
9. **Priority:** Medium.

#### `system/service-charge-settings/service-charge.model.js` — ServiceCharge
1. **Purpose:** Automatic service-charge configuration (percentage or fixed) applied by order type.
2. **Strengths:** `appliesTo` scoped by order type is a genuinely good design; `calculationBase` (BEFORE_TAX/AFTER_TAX) mirrors TaxConfig's accounting-correct nuance; `roundingMode`; correct `{brand,branch}` uniqueness.
3. **Weaknesses:** Only one flat rate per brand/branch despite `appliesTo` implying multiple order types could plausibly need different rates. No single authoritative "calculation pipeline order" reconciling this setting's `calculationBase` against `TaxConfig.calculationMethod` — see §1.10.
4. **Missing Fields:** Per-order-type rate table; `minOrderAmount` threshold.
5–6. No other significant issues.
7. **Relationship Problems:** Like TaxConfig, never referenced from Order/Invoice — no audit trail for which config produced the stored `serviceTax` value.
8. **Recommended Changes:** Add a per-order-type rate array; add an explicit, centralized `calculationOrder` field spanning Tax/Discount/ServiceCharge/Promotion.
9. **Priority:** High (the calculation-order ambiguity is a real correctness risk for financial totals).

#### `system/notification-settings/notification-settings.model.js` — NotificationSettings
1. **Purpose:** Per-branch role/channel routing for operational notifications.
2. **Strengths:** Thorough categorization (orders/kitchen/inventory/finance/reservations/customer/system); correct `{brand,branch}` uniqueness with a documented prior-bug fix.
3. **Weaknesses:** Deeply nested role-keyed structure with no schema-level validation that role name strings (e.g. `cashier`, `storekeeper`) correspond to actual `Role`/`Employee` values — free-floating, easy to typo, silently no-op. `customer.promotions` channels include whatsapp/sms/email with **no corresponding consent field on either customer model** (GDPR concern, §2.12).
4. **Missing Fields:** `timezone` for schedule-based settings (`sendAt`, `delayMinutes` are timezone-ambiguous).
5–6. No other significant issues.
7. **Relationship Problems:** No consent linkage to customer models.
8. **Recommended Changes:** Add `timezone`; validate role-key strings against a real enum.
9. **Priority:** Low.

#### `system/print-settings/print-settings.model.js` — PrintSettings
1. **Purpose:** Per-branch printer/receipt configuration.
2. **Strengths:** Correct `{brand,branch}` uniqueness (comment notes this fixed a previously-missing constraint).
3. **Weaknesses:** `copies.cashier`/`copies.preparation` have no min/max bounds. No `printerName`/`ipAddress`/`connectionType` — a `printerType` enum alone is insufficient to actually drive a print job.
4–8. Minor.
9. **Priority:** Low.

### 2.12 CRM

#### `crm/message/message.model.js` — CustomerMessage
1. **Purpose:** Inbound customer messages/complaints routed to staff.
2. **Strengths:** Good tenant scoping; polymorphic sender via `refPath`; sensible workflow (`status`, `assignedTo`, `resolvedBy`/`resolvedAt`, `priority`); soft delete.
3. **Weaknesses:** `senderType` enum includes `"Table"` alongside customer types — mixing an entity type with customer types under one polymorphic path is a modeling smell. `phone`/`email` are captured as free-text fields even when `referenceId` links to a known customer record, duplicating data already on that customer with no sync mechanism (PII drift). No `channel` field despite the system elsewhere modeling whatsapp/sms/push channels explicitly.
4. **Missing Fields:** `channel`; a `response`/`replyText` field (this is a routing/status record, not a two-way conversation thread).
5–6. No other significant issues.
7. **Relationship Problems:** No validation that `referenceId` actually resolves given `senderType`.
8. **Recommended Changes:** Add `channel`; add a reply/thread mechanism; validate `referenceId` existence.
9. **Priority:** Medium.

#### `crm/offline-customer/offline-customer.model.js` & `crm/online-customer/online-customer.model.js` — OfflineCustomer / OnlineCustomer
1. **Purpose:** Walk-in/phone customer (staff-registered, no auth) vs. authenticated online-ordering customer.
2. **Strengths:** Correct unique `{phone,brand}`/`{email,brand}` indexes with soft-delete-aware partial filters; geospatial index on offline addresses; structured address schema on the online side; decent auth-security scaffolding on UserAccount-adjacent fields (login attempts, lockout, password reset).
3. **Weaknesses:** **Both models embed a `loyalty.{points,tier}` sub-object that fully duplicates the standalone `CustomerLoyalty` model** — two independent, unsynchronized sources of truth for the same points balance. **`OfflineCustomer.loyalty.tier` enum (`regular`/`vip` only) doesn't even support the `silver`/`gold` tiers that `LoyaltySettings.tiers` defines by default** — an offline customer can never reach those tiers through their own embedded field. The two models' `tags` enums use entirely different vocabularies for the same CRM-segmentation concept. Address structures are incompatible (free-text string on Offline vs. fully structured fields on Online), blocking any unified reporting/export.
4. **Missing Fields:** No `email` field on OfflineCustomer at all, yet CustomerMessage can capture email from any sender with nowhere to attach it back; no aggregate fields (`totalOrders`, `totalSpend`, `lastOrderAt`) despite tags like `"high_value"`/`"frequent_order"` implying they should be derivable from something.
5. **Incorrect Fields:** OfflineCustomer's `source` enum includes an empty string `""` as a valid member.
6. **Redundant Fields:** Near-total field overlap between the two models with incompatible shapes (§1.11).
7. **Relationship Problems: No link at all between OfflineCustomer and OnlineCustomer** — a walk-in who later signs up online becomes two fully independent identities with two independent loyalty balances and message histories. **Critically, `Order.model.js` references a `"Customer"` model and a `"User"` model that do not exist anywhere in the codebase** (the real registered names are `"OnlineCustomer"`/`"OfflineCustomer"`) — `.populate("customer")` on an Order will never resolve. This is a broken reference affecting the entire order-to-customer-to-loyalty chain.
8. **Recommended Changes:** Either unify into a single `Customer` collection with a `type` discriminator, or add a mandatory polymorphic reference pattern (matching `CustomerMessage`'s) used consistently across `CustomerLoyalty`/`Order`/`CustomerMessage`, plus a `linkedAccount`/`mergedInto` field for the online-signup-of-a-known-walk-in scenario; fix `Order.customer`/`Order.user` to reference the real model names.
9. **Priority:** High (identity fragmentation) / **Critical** (the dangling `Order.customer`/`Order.user` ref).

### 2.13 Loyalty

#### `loyalty/customer-loyalty/customer-loyalty.model.js` — CustomerLoyalty
1. **Purpose:** Per-customer points wallet/balance summary, keyed by phone.
2. **Strengths:** Minimal, clean wallet shape with `totalEarned`/`totalRedeemed` alongside `points`; unique `{brand,phone}`.
3. **Weaknesses:** **Keyed by raw `phone` string, not by any customer `ObjectId` reference at all** — no `customer`/`customerType` field whatsoever, the weakest possible join key given phone-formatting differences are unvalidated and can desync the wallet from either customer collection. `isSystemRole: Boolean` is a nonsensical field name for a loyalty wallet — almost certainly a copy-paste leftover from a User/Role schema. `tier` has **no enum constraint** at all (unlike both customer models, which do constrain it), risking arbitrary/typo'd values that won't match `LoyaltySettings.tiers`.
4. **Missing Fields:** Polymorphic `customer`/`customerType` ref (mirroring `CustomerMessage`'s pattern); `lastTransactionId`/`lastTransactionAt` reconciliation pointer; `branch` (present on `LoyaltyTransaction` but absent here).
5. **Incorrect Fields:** `isSystemRole` dead field; unconstrained `tier`.
6–7. **Relationship Problems (the central design flaw of the loyalty subsystem):** phone-string keying means (a) formatting differences between the two customer records can silently create duplicate wallets, (b) a customer's phone-number change orphans their entire loyalty history, (c) this model uses an entirely different identification mechanism than `CustomerMessage`'s polymorphic ref pattern — two unreconciled ways of "identifying a customer" in the same subsystem. `points`/`totalEarned`/`totalRedeemed` are freely mutable with **no schema-level guarantee they equal the sum of the `LoyaltyTransaction` ledger** — direct wallet writes (a common and likely pattern) will silently drift the balance away from ledger truth.
8. **Recommended Changes:** Add a polymorphic customer reference; remove `isSystemRole`; constrain `tier` to match `LoyaltySettings.tiers`; make `points` a derived/protected value updated only via transaction-based paths.
9. **Priority:** Critical.

#### `loyalty/loyalty-reward/loyalty-reward.model.js` — LoyaltyReward
1. **Purpose:** Catalog of redeemable rewards purchasable with points.
2. **Strengths:** Multilingual name/description; `maxRedemptionsPerCustomer`/`maxTotalRedemptions` + running counter for abuse prevention; time-boxing.
3. **Weaknesses:** `totalRedemptions` is a mutable counter with no atomic-increment guarantee and no independent verification against actual `LoyaltyTransaction` redemption records. No conditional-required validation (`product` required only when `rewardType==="product"`, etc.).
4–8. Minor.
9. **Priority:** Medium.

#### `loyalty/loyalty-settings/loyalty-settings.model.js` — LoyaltySettings
1. **Purpose:** Brand-level configuration for point-earning/redemption rules and tier thresholds.
2. **Strengths:** Good earning/redemption separation; correct unique `brand` (well-commented to avoid a redundant-index pitfall); sensible abuse caps.
3. **Weaknesses:** Default `tiers` map (`regular/silver/gold/vip`) is out of sync with `OfflineCustomer.loyalty.tier`'s narrower enum (§2.12). Brand-wide only, no per-branch override despite `LoyaltyTransaction`/`LoyaltyReward` both being branch-aware. No effective-dated history of rule changes — can't explain historically why a past order earned the points it did once rules change.
4–8. As above.
9. **Priority:** Medium.

#### `loyalty/loyalty-transaction/loyalty-transaction.model.js` — LoyaltyTransaction
1. **Purpose:** Ledger of all point movements (earn/redeem/adjustment/expiration) per wallet.
2. **Strengths:** Correct ledger shape (`points` + `balanceAfter` snapshot) *if* entries are truly immutable; good `type` enum; correctly references `customerLoyalty`, `reward`, `order`, `brand`, `branch`; `createdBy` required.
3. **Weaknesses:** **The presence of an `updatedBy` field on a supposedly append-only ledger directly implies entries are expected to be mutable** — a real ledger should only ever be corrected via new offsetting entries, never in-place edits, and nothing in the schema prevents mutation (no `pre('findOneAndUpdate')`/`pre('updateOne')` guard, unlike the correctly-immutable `AssetTransaction` model elsewhere in the codebase). `isUsed: Boolean` is ambiguous with no `remainingPoints` field to support proper FIFO-by-lot expiry consumption. No idempotency key to prevent duplicate "earn" entries from a retried order-completion event — a common real-world bug source for points ledgers.
4. **Missing Fields:** `previousBalance` (only `balanceAfter` exists, so `balanceAfter` can't be independently cross-checked); `reversalOf`/`reversedBy` self-reference for compensating entries; idempotency key.
5–6. No other significant issues.
7. **Relationship Problems:** Inherits `CustomerLoyalty`'s phone-based identity fragmentation one level removed; given `Order.customer` is a dangling ref (§2.12), the full chain Order→Customer→CustomerLoyalty→LoyaltyTransaction cannot be reliably traversed anywhere in this codebase.
8. **Recommended Changes:** Remove `updatedBy` and add immutability-enforcing hooks matching the `AssetTransaction` pattern; add `previousBalance`, `reversalOf`, and an idempotency key.
9. **Priority:** Critical (ledger append-only integrity is the single most important property of a points ledger, and it's unenforced).

### 2.14 Audit

#### `audit-log/audit-log.model.js` — AuditLog
1. **Purpose:** Request/action-level audit trail (who did what, on what, from where).
2. **Strengths:** Captures actor context well (`user`, `employee`, `ipAddress`, `userAgent`, `requestId`, `sessionId`); captures HTTP context (`method`, `path`, `resource`, `statusCode`); flexible `metadata: Mixed`; good time-series indexes.
3. **Weaknesses:** **No `targetId`/`targetModel` structured reference field** — the only way to know what specific document changed is to parse the `path` string, which is fragile and unindexable for "show me every audit event on record X" queries. **`metadata: Mixed, default: {}` is entirely optional and unstructured** — nothing guarantees any given entry actually contains a diff/before/after, so the audit trail's core forensic value is opt-in, not enforced. `event` enum includes a catch-all `"request"` alongside specific CRUD events, conflating generic API logging with domain-audit-worthy events and diluting signal.
4. **Missing Fields:** `targetModel`/`targetId` (or `refPath`); required structured `before`/`after`/`diff`; tamper-evidence (hash chain); `severity`/`category`.
5. **Incorrect Fields:** **`isDeleted`/`deletedAt`/`deletedBy` exist on this model** — this is backwards. An audit log should be append-only by definition; the mere existence of a way to soft-delete an entry means a compromised or malicious actor with delete permission could make incriminating log entries vanish from standard queries. This is the single most concerning field found anywhere in this review from a compliance/forensics standpoint.
6. **Redundant Fields:** None.
7. **Relationship Problems:** No structured link to the affected entity at all — cannot answer "show every audit event that touched customer X" without unreliable path string-matching.
8. **Recommended Changes:** **Remove `isDeleted`/`deletedAt`/`deletedBy` entirely** — use retention/archival jobs instead of soft delete; add `targetModel`/`targetId`; enforce structured `before`/`after`; consider a hash-chain for tamper evidence given this is a compliance-relevant ERP.
9. **Priority:** Critical.

---

## 3. Full-Chain Consistency Review

### 3.1 Brand → Branch → Table/DiningArea → Menu → Order → Kitchen → Inventory → Payments → Invoice → Accounting

This is the chain the review mandate specifically asked to trace. Walking it end to end:

- **Brand → Branch → DiningArea → Table:** Structurally sound. Correctly scoped, correctly indexed.
- **Table → Order:** Correct at the reference level, but Order has no `diningArea` denormalization and `DiningArea.type` includes delivery/takeaway values that Order never actually consults — DiningArea is functionally dead outside of dine-in.
- **Order → Kitchen:** Item-level kitchen status is the best-modeled part of the operational chain. But Order has no visible link to the separate `PreparationTicket`/`PreparationSection` module — the connection between an order item and its kitchen ticket is not represented in the Order schema at all, and `PreparationTicket` itself has zero awareness of Recipe/StockItem, so the chain the review was asked to verify (Product → Recipe → StockItem → ... → PreparationTicket) is **not actually wired at the ticket level**.
- **Order → Invoice:** Invoice duplicates rather than derives Order's item data, with no drift-detection mechanism, and is architecturally locked to a strict 1:1 relationship with Order — which directly contradicts `Order.isSplit`'s implied need for one order to become multiple invoices (split-by-guest), or multiple order tickets to consolidate into one invoice (multi-round dine-in).
- **Invoice → Payment:** No dedicated `Payment`/transaction model exists anywhere in the codebase; `paymentMethod[]` and `refundMethod[]` embed raw amounts with no link to gateway transaction IDs, settlement batches, or `CashTransaction` records — weak for reconciliation.
- **Invoice → Accounting:** The one place this chain should terminate cleanly (`JournalEntry`/`JournalLine`) is itself structurally broken (§1.4), and none of the source documents (`Invoice`, `PurchaseInvoice`, `CashTransaction`, `DailyExpense`) carry a `journalEntry` reference to prove they were ever posted (§1.3).
- **Order/Invoice → Inventory:** `InventorySettings.autoDeductOnOrder` implies automatic deduction happens, but there is no schema-level trace of which `StockLedger` rows a given Order/Invoice/PreparationTicket produced — entirely implicit, unauditable from the data alone.

**Verdict:** The chain is coherent in its early (operational/POS) segments and increasingly unwired the further it moves toward accounting. The single most consequential structural fact is that **three separate numbering schemes (`Order.orderNum`, `Invoice.serial`, `SalesReturn.serial`) all use global instead of brand/branch-scoped uniqueness**, which will cause guaranteed, reproducible production failures — not theoretical risks — the moment a second brand or branch is onboarded.

### 3.2 Multi-branch inventory, recipe costing, and valuation methods

- **Multi-branch inventory:** Correctly scoped for `Warehouse`, `Inventory`, `StockLedger`, `StockItem`, `Recipe`, `ProductionRecipe`, `PreparationSection`/`Ticket`. **`ProductionRecord` has no `brand`/`branch` at all** — the most severe individual multi-tenancy gap found in the inventory/production domain.
- **Recipe costing (COGS):** Not supported. Neither `Recipe` nor `ProductionRecipe` nor `Product` stores any cost field. All COGS math must be computed ad hoc, with no caching and no historical snapshot — past orders' true cost-at-time-of-sale can never be reconstructed once ingredient prices change.
- **Stock valuation methods (FIFO/weighted average):** Partially and inconsistently supported. `StockItem.costMethod` allows FIFO/LIFO/WeightedAverage and `StockLedger.remainingQuantity` supports FIFO layering, but `Inventory` (the materialized balance table) only has singular `avgUnitCost`/`totalCost` fields with no way to represent multiple open FIFO layers — a structural mismatch between the chosen method and the schema meant to reflect it.
- **Stock deduction on order/production:** Partially supported via settings flags, but with no schema-level trace of which ledger rows a given order/production run actually generated.
- **Unit conversions:** Weakly supported — exactly one conversion step on StockItem, free-text unvalidated units everywhere downstream (§1.8).
- **Expiry/batch tracking:** Weak. No `lotNumber`/`batchNumber` field anywhere in the entire model set — architecturally impossible to trace a specific received batch from purchase through consumption to sale, a hard requirement for food-safety recall traceability in real restaurant operations.

### 3.3 Accounting-grade bookkeeping

- **Double-entry balance enforcement:** Absent (§1.4).
- **Period locking:** Designed (`AccountingPeriod.isLocked`) but not enforced — no model has a pre-update/pre-delete guard checking period-lock or posted-status before permitting writes, in contrast to the correctly-implemented immutability guard on `AssetTransaction`. `AccountingSettings.fiscalPeriod.allowBackDateEntries` defaults to `true`.
- **Purchasing → Supplier → Inventory → Accounting:** The inventory side (Supplier/StockItem/Warehouse references on PurchaseInvoice) is solid; the accounting side is weak — no purchase-invoice variant carries a `journalEntry` reference, and `Supplier.name`/`Code` use global rather than brand-scoped uniqueness, an active multi-tenant onboarding blocker.
- **Asset depreciation → GL:** This is the **one clean example** in the codebase — `AssetDepreciation.journalEntryId` is correctly wired with a duplicate-posting guard. It's undermined by its own `Brand`/`Branch` casing bug and by using a disconnected free-text period string instead of referencing `AccountingPeriod`.
- **Cash register/shift reconciliation:** `CashierShift` has the best-designed reconciliation structure in the codebase (expected vs. actual vs. variance with approval), but has no link to the individual `CashTransaction` rows that make up its expected totals — the reconciliation numbers are unauditable proof-of-work.
- **Multi-currency:** Partial — `JournalLine` supports line-level currency conversion, but `Account`/`AccountBalance` carry no currency field at all, making the `accountPerCurrency` option in `AccountingSettings` non-functional as configured.

---

## 4. Final ERP Review

### 4.1 Scores

| Dimension | Score | Rationale |
|---|---|---|
| **Overall database architecture** | **52/100** | Individual models frequently show real accounting/ERP domain knowledge (control accounts, cost centers, immutable AssetTransaction, tokenized payroll formulas, GeoJSON delivery zones) — this is not a naive schema. But the connective tissue between domains is broken or missing in exactly the places that matter most (JournalEntry↔JournalLine, tenant-scoped uniqueness, cost data, customer identity). |
| **Restaurant operational compatibility** | 62/100 | Order/Table/DiningArea/Reservation/PreparationTicket cover day-to-day POS operations reasonably well. Kitchen ticket ↔ inventory disconnection and the qty-immutable=1 design are real operational friction points. |
| **Accounting compatibility** | 30/100 | The double-entry core is structurally unreliable, most money-movement documents don't reference their GL postings, and period-locking is unenforced. Not currently trustworthy for a real accountant. |
| **Multi-tenancy / scalability (multi-brand, multi-branch)** | 35/100 | At least a dozen fields across HR, Menu, Inventory, Production, Sales, and Payments use global instead of brand-scoped uniqueness. This is not a hypothetical scaling concern — it will break on the **second** tenant, not the thousandth. |
| **Maintainability** | 58/100 | Consistent conventions exist (soft-delete triple, brand/branch scoping, audit fields) but are applied inconsistently enough (§1.5, §1.2, §1.9) that a developer can't safely assume any given model follows them without checking. |
| **Future readiness / extensibility** | 45/100 | Good foundations exist to build on (control-account mapping, cost centers, tokenized payroll formulas, geo delivery zones), but core missing primitives (UOM conversion table, lot/batch tracking, unified customer identity, Payment transaction ledger) will require breaking schema changes to retrofit later rather than being extendable in place. |
| **Security / data integrity** | 40/100 | `AuditLog` being soft-deletable undermines the one subsystem whose entire purpose is tamper-evidence. Broken references (`Order.customer`→`"Customer"`, `AssetTransaction.referenceModel`→`"MaintenanceOrder"`, `Supplier.assetsSupplied`→`"assets"`) will silently fail to populate rather than error loudly. |
| **Performance / indexing** | 65/100 | Indexing is generally thoughtful (compound indexes matching real query shapes, partial-filter uniqueness used correctly in several places) — the main gaps are missing indexes on frequently-filtered fields (`status`) rather than a wholesale absence of index strategy. |
| **Reporting compatibility** | 40/100 | The absence of tax/discount/promotion traceability on Invoice and of cost data on Recipe/Product means most of the reports a real restaurant ERP needs (margin by dish, tax liability by rate, discount cost by campaign) cannot currently be built from stored data alone. |

### 4.2 What's genuinely good (worth preserving, not rewriting)

- `PaymentMethod`, `AssetCategory`, `AssetTransaction`, `AssetDepreciation`, `CashierShift`, `InvoiceSettings`'s numbering scheme, and the accounting control-account wiring in `AccountingSettings` are all well-designed and show real domain expertise — several of them (`AssetTransaction`'s immutability hooks, `PaymentMethod`'s polymorphic refPath + partial-unique-index pattern) should be the **template** other models are brought up to, not replaced.
- The soft-delete + audit-field convention, where applied, is done correctly (partial filter expressions correctly exclude soft-deleted docs from uniqueness checks in several models).
- Multilingual `Map<String,String>` fields are used consistently for restaurant-facing content.
- The `RESOURCE_ENUM`-driven RBAC design in `Role` is genuinely comprehensive.

### 4.3 Final Conclusion

**These models are not production-ready for a multi-tenant commercial launch, and should not be approved as-is.** The weaknesses are not stylistic — they are concrete, reproducible defects:

1. Two brands cannot coexist today without immediate duplicate-key failures across HR, Menu, Inventory, Production, Sales, and Payments (§1.1) — this alone blocks the stated goal of supporting multi-branch restaurants, franchise chains, and cloud SaaS.
2. The double-entry bookkeeping core (`JournalEntry`↔`JournalLine`) does not reliably work as coded (§1.4) — no accounting output from this system can currently be trusted without independent verification.
3. There is no cost data anywhere in the menu/recipe chain (§1.7) — margin reporting, a basic requirement for any restaurant owner, cannot be built from the current schema.
4. The audit log — the subsystem meant to provide tamper-evidence for the rest of the platform — can itself be soft-deleted (§2.14), which is close to a contradiction in terms for a compliance-relevant system.

None of this requires a rewrite. The architecture underneath — brand/branch tenancy, control-account mapping, cost-center dimensions, the RBAC resource model, GeoJSON delivery zones, the tokenized payroll-formula engine — is sound and worth keeping. What's needed is a **remediation pass focused on the cross-cutting patterns in §1** (which will fix the majority of individual findings at once, since most of them are the same handful of mistakes repeated across many files) before this schema should be considered frozen or used as the foundation for a second-tenant launch.

**Recommended order of remediation** (highest leverage first, since each of these patterns recurs across 5–15 models):
1. Fix all global-unique fields to brand/branch-scoped compound indexes (§1.1) — mechanical, low-risk, unblocks multi-tenancy immediately.
2. Fix `JournalEntry`/`JournalLine` (§1.4) and add `journalEntry` references to `CashTransaction`/`PurchaseInvoice`/`DailyExpense`/etc. (§1.3) — the accounting core must be trustworthy before anything is built on top of it.
3. Remove `isDeleted` from `AuditLog`; add `targetModel`/`targetId` and enforce structured before/after (§2.14).
4. Add cost fields to `Recipe`/`ProductionRecipe`/`Product` (§1.7) and a real unit-conversion table (§1.8).
5. Resolve customer-identity fragmentation and the dangling `Order.customer`/`Order.user` refs (§1.11, §2.12).
6. Standardize the soft-delete triple (§1.5) and the actor-reference target (§1.2) as documented conventions, then sweep the codebase against them.

No code was changed in the course of this review, per the review mandate.
