# Default Role Architecture (System Setup V2)

Status: **implemented.** See `modules/iam/role-template/` — `role-template.model.js` (§2), `role-domain-groups.js` (§4's domain-group table and the expansion function), `role-template.seed.js` (all eleven templates from §6, byte-for-byte the same grants), `role-template.service.js` (`ensureSeeded()`/`instantiate()`). Seeded idempotently on every server boot (`server.js`). The Owner role itself (not a template, §6) is created directly by `onboarding-engine.service.js`'s `_toDefaultRolesCreated` — with one deliberate improvement over the prior implementation caught during implementation: the Owner role now also grants `reverse` (Journal Entry reversal), which the original `buildOwnerRole()` omitted entirely, a real gap, not a preserved behavior.

---

## 1. First-principles question: should onboarding auto-create 12 roles?

No. Re-evaluating from the actual restaurant-operations need: at the moment onboarding completes, exactly **one** role is required for the platform to be usable — the Owner's own role. Every other role (Cashier, Kitchen, Waiter, Delivery, Accountant, HR, Purchasing, Inventory, Customer Support, Branch Manager, Administrator) is only needed once the Owner actually hires that kind of staff and wants to create a `UserAccount` for them.

Auto-creating all twelve at onboarding time for every brand, regardless of what kind of restaurant it is, directly violates the stated principle "nothing should be created merely because it exists" (stated for Settings, applies identically here): a small takeaway-only operation with no dine-in service has no use for a "Waiter" role or a "Table"-adjacent permission set; a single-branch brand has no use for a "Branch Manager" role distinct from "Owner." Materializing twelve `Role` documents nobody assigns to anyone just clutters the role list with entries the Owner then has to understand, ignore, or manually delete — the opposite of "immediately usable."

**Design decision: onboarding auto-creates only the Owner role. Everything else becomes a Role Template Catalog** — predefined, reviewed permission blueprints the Owner instantiates on demand ("Create role from template: Cashier") rather than pre-populated real roles. This matches how the reference platforms named in the original request actually do this (Foodics, Toast, Square all offer role *templates* you apply when you need them, not a pre-populated role list you clean up).

---

## 2. Role Template Catalog — mechanism

A **template is not a `Role` document.** It's a versioned, platform-owned blueprint, proposed as a new collection `RoleTemplate` (platform-scoped, not brand-scoped — a shared catalog every brand reads from, like a product catalog, not tenant data):

| Field | Purpose |
|---|---|
| `key` | Stable identifier (`"cashier"`, `"branch_manager"`, ...), never reused for a different meaning once shipped. |
| `name` / `description` (Map, i18n) | Display text. |
| `category` | Grouping for UI presentation (`"Front of House"`, `"Back of House"`, `"Finance"`, `"Management"`). |
| `domainGrants` | The role's access, expressed as domain-group → access-level pairs (§4), not a raw per-resource list — see §3 for why. |
| `defaultScope` | `"ALL_BRANCHES"` or `"ASSIGNED_BRANCHES"` — the template's *suggested* starting scope (§5), always editable at instantiation time. |
| `isSystemTemplate` | `true` for the platform-shipped set defined in this document; reserves the namespace for a future `false` (Owner-authored custom templates), not built now. |
| `recommendedFor` | Optional free-form hint array (e.g. `["quick_service","cafe"]`) for future UX filtering by restaurant type — metadata only, no enforcement. |

**Instantiation** = an authenticated, permissioned operation (available to whoever holds `Roles: create`, i.e. Owner or Administrator once one exists) that copies a template's resolved permission set into a brand-scoped `Role` document at that moment. **No ongoing link between the template and the instantiated role** — if the platform later revises the "Cashier" template (e.g., tightens a default), every brand's already-created Cashier role is unaffected. Silently changing a tenant's live security posture because a shared template changed would be a serious, undiscoverable behavior change happening without that tenant's consent — the opposite of "Owner Controlled." A template is a starting point the Owner can freely edit afterward, not a managed, synced policy.

---

## 3. Why domain groups, not a per-role, per-resource matrix

`RESOURCE_ENUM` currently lists ~90 individual resources and has grown repeatednly over this project's history (its own comments record multiple additive extensions). A design that hand-lists every one of those ~90 resources' CRUD/approve/reject/reverse flags, once per role, for twelve roles, would be:

- **~1,000+ individually-authored permission entries** to design, review, and keep correct.
- **Guaranteed to drift**: the next time `RESOURCE_ENUM` gains an entry (which, per its own history, happens often), every one of twelve hand-authored role definitions needs revisiting, and nothing forces that to happen — exactly the kind of duplicated-responsibility, driftable design this whole initiative's principles explicitly reject ("No Duplicate Data," "no hidden defaults").

**Resolution: two smaller, single-source-of-truth tables instead of one giant one.**

1. **Domain-group → resource-list mapping** (§4) — a single, maintained table classifying every `RESOURCE_ENUM` entry into exactly one domain group. Adding a new resource to `RESOURCE_ENUM` now comes with one new obligation: classify it into a domain group in this one place. Proposed as an explicit extension to the existing "RESOURCE_ENUM is additive-only" convention already documented in `role.model.js` — additive, and now also *classified*.
2. **Template → domain-group access-level mapping** (§6) — each of the eleven non-Owner templates is defined as which domain groups it touches and at what access level, not as a raw resource list. This is what an implementation mechanically expands (domain group → its resource list → CRUD/approve flags at the stated access level) into the actual `permissions` array at instantiation time.

This is the concrete "enterprise RBAC best practice" being asked for: role-to-capability-group mapping, not role-to-individual-permission-string mapping. It is also what makes "avoid duplicates" meaningful — permission *overlap* between roles (e.g., both Cashier and Waiter can read `Products`) is normal and expected in RBAC (shared minimal necessary access is not duplication in the harmful sense); what's actually avoided here is *duplicated maintenance effort* — the same resource's access rule being hand-authored in twelve different places.

---

## 4. Domain groups

Derived directly from `RESOURCE_ENUM`'s own existing section comments (already a de facto grouping, just never formalized into a queryable structure):

| Domain group | `RESOURCE_ENUM` members |
|---|---|
| `ORG_CORE` | Brands, BrandSettings, Branches, BranchSettings, DeliveryAreas |
| `HR_STAFF` | Employees, Departments, JobTitles, Shifts, AttendanceRecords, AttendanceSettings, CashierShifts, LeaveRequests, EmployeeSettings |
| `HR_PAYROLL` | Payrolls, PayrollItems, PayrollSettings, EmployeeFinancial, EmployeeTransactions, EmployeeAdvances |
| `IAM` | UserAccounts, Roles, AuthCredentials, AuthenticationSettings, Sessions, Devices, SecurityEvents |
| `MENU_SALES` | MenuCategories, MenuSettings, Products, Recipes, Orders, Invoices, InvoiceSettings, OrderSettings, SalesReturns, SalesReturnSettings, Promotions, ProductReviews |
| `KITCHEN` | PreparationTickets, PreparationSections, PreparationReturns, PreparationReturnSettings, PreparationTicketSettings |
| `INVENTORY` | StockItems, StockCategories, Inventory, InventorySettings, InventoryCounts, StockLedgers, StockTransferRequests, Warehouses, WarehouseDocuments, Consumptions |
| `CASH_FINANCE` | CashRegisters, CashTransactions, CashTransfers, BankAccounts |
| `ACCOUNTING` | Accounts, JournalEntries, JournalLines, AccountingPeriods, AccountingSettings, CostCenters, AccountBalances, Ledgers |
| `ASSETS` | Assets, AssetCategories, AssetTransactions, AssetDepreciations, AssetMaintenances, AssetPurchaseInvoices |
| `PURCHASING` | Suppliers, SupplierTransactions, PurchaseInvoices, PurchaseReturns, PurchaseSettings |
| `SYSTEM_CONFIG` | DiscountSettings, NotificationSettings, PrintSettings, ServiceCharges, ShiftSettings, TaxConfigs |
| `REPORTS` | SalesReports, InventoryReports, FinancialReports, EmployeeReports, OperationalReports |
| `CRM` | Messages, OfflineCustomers, OnlineCustomers |
| `LOYALTY` | CustomerLoyalty, LoyaltySettings, LoyaltyRewards, LoyaltyTransactions |
| `SEATING` | Tables, Reservations |
| `AUDIT` | AuditLogs |

Access levels used below: **None** (no permissions), **Read** (`read` only), **Operate** (`create`+`read`+`update`, no `delete`), **Manage** (`create`+`read`+`update`+`delete`+`viewReports`), **Full** (`Manage` + `approve`+`reject`+`reverse` where applicable to that domain).

---

## 5. Branch scoping — a template property, always overridable

`Role.allBranchesAccess`/`branchAccess` already exists and is reused unmodified. Each template below states a **default** scope; instantiation always lets the Owner override it (e.g., an Owner who wants one "Cashier" role usable at every branch, or a chain that wants per-branch Branch Manager instances, can do either without needing a different template).

---

## 6. The eleven templates

### Owner (not a template — auto-created at onboarding, unchanged mechanism)

Full access to every domain group, `allBranchesAccess: true`, `isSystemRole: true`. Reaffirming `OWNER_IDENTITY_DESIGN.md` §1: **holding the Owner role is an authorization fact, not the same thing as being `Brand.owner`.** A trusted co-founder could hold the Owner role's full permission set without ever being the `Brand.owner` pointer — those are independent axes by design. Only one thing is true of the Owner role specifically at onboarding: it's the only role created automatically, and it's granted to the one `UserAccount` created during onboarding.

### Administrator

| Domain | Level | Rationale |
|---|---|---|
| ORG_CORE, MENU_SALES, KITCHEN, INVENTORY, CASH_FINANCE, ACCOUNTING, ASSETS, PURCHASING, HR_STAFF, HR_PAYROLL, SYSTEM_CONFIG, REPORTS, CRM, LOYALTY, SEATING | Full | Day-to-day operational and configuration authority across the business. |
| IAM | Read | **Deliberate separation of duties**: an Administrator can see who has what access but cannot create/edit Roles or grant themselves more power — that stays with Owner. Prevents privilege escalation through the "Administrator" seat. |
| AUDIT | Read | Can review the audit trail; cannot alter or purge it. |

Default scope: `ALL_BRANCHES`.

### Branch Manager

| Domain | Level | Rationale |
|---|---|---|
| MENU_SALES, KITCHEN, SEATING | Full | Runs day-to-day floor operations for their branch. |
| INVENTORY | Operate | Can receive/adjust/count stock; cannot delete inventory history. |
| CASH_FINANCE | Operate | Manages branch registers/transactions; no BankAccount-level authority (centralized). |
| HR_STAFF | Full, own branch only | Approves leave/attendance for their branch's staff — matches "approve" being meaningful for `LeaveRequests`. |
| REPORTS | Read | Branch-scoped reporting. |
| ACCOUNTING, HR_PAYROLL, PURCHASING, IAM, AUDIT, ASSETS | None | Centralized/HQ concerns, out of a single branch manager's authority. |

Default scope: `ASSIGNED_BRANCHES` (this is the one template where branch scoping is the entire point).

### Cashier

| Domain | Level | Rationale |
|---|---|---|
| MENU_SALES | Operate (create Orders/Invoices, read Products/MenuCategories) | Front-line sales entry, no delete authority over financial records. |
| CASH_FINANCE | Operate, own register | Handles their own till. |
| SEATING | Operate | Seats/updates table status when acting as host too (common in smaller operations). |
| Everything else | None | |

**Known limitation, not solved by this document:** "own register"/"own shift" scoping is a row-level restriction — `RESOURCE_ENUM`'s permission model only supports branch-level scoping today, not row/record-level ("only records this specific cashier created"). This is the same gap already tracked as a future roadmap item (field/row-level permissions) in the IAP Phase 5 Enterprise Permission Roadmap objective — not addressed here, just re-confirmed as still open and directly relevant to this role.

Default scope: `ASSIGNED_BRANCHES`.

### Kitchen

| Domain | Level | Rationale |
|---|---|---|
| KITCHEN | Full | Owns ticket lifecycle. |
| INVENTORY | Operate (Consumptions create, StockItems/Ledgers read) | Records consumption as items are used; doesn't manage stock levels/procurement. |
| MENU_SALES | Read (Products, Recipes only) | Needs to know what to prepare, not sales/pricing authority. |
| Everything else | None | |

Default scope: `ASSIGNED_BRANCHES`.

### Waiter

| Domain | Level | Rationale |
|---|---|---|
| SEATING | Full | Owns table/reservation assignment for their section. |
| MENU_SALES | Operate (create Orders, read Products/MenuCategories/Invoices) | Takes orders; whether they also collect payment (vs. handing off to Cashier) is an `OrderSettings`/`InvoiceSettings` workflow choice, not a role concern — this template grants order-taking regardless. |
| KITCHEN | Read | Checks ticket status for their tables. |
| Everything else | None | |

Default scope: `ASSIGNED_BRANCHES`.

### Delivery

| Domain | Level | Rationale |
|---|---|---|
| MENU_SALES | Operate, limited (read assigned Orders, update delivery status) | Narrowest of the front-of-house templates — no menu/pricing/invoice authority. |
| CRM | Read | Needs customer address/contact for the delivery, not full CRM authority. |
| CASH_FINANCE | Operate, limited (CashTransactions create only) | Cash-on-delivery collection recording. |
| Everything else | None | |

Default scope: `ASSIGNED_BRANCHES`.

### Accountant

| Domain | Level | Rationale |
|---|---|---|
| ACCOUNTING | Full (including `reverse`) | Owns the ledger, including the sensitive Journal Entry reversal permission — already modeled in `role.model.js` as its own flag distinct from `approve`, precisely for this kind of separation. |
| CASH_FINANCE, ASSETS | Full | Reconciliation and fixed-asset accounting are accounting-department functions. |
| REPORTS | Full (Financial focus) | |
| MENU_SALES, PURCHASING | Read | Needs visibility into invoices/purchase invoices to reconcile, not authority to create/edit the underlying operational transactions — **separation of duties**: the person who books a purchase invoice into the ledger should not be the same permission-holder who created that purchase invoice in the first place. |
| Everything else | None | |

Default scope: `ALL_BRANCHES` (accounting is typically centralized even in multi-branch chains).

### HR

| Domain | Level | Rationale |
|---|---|---|
| HR_STAFF, HR_PAYROLL | Full | Owns the employee lifecycle and payroll processing. |
| REPORTS | Full (Employee focus) | |
| IAM | Operate on `UserAccounts` only (create/update, not delete), Read on `Roles` | Can onboard a new hire's login and assign them an **existing** role, but cannot create or edit Roles themselves — the same separation-of-duties reasoning as Administrator's IAM restriction: HR shouldn't be able to invent a more powerful permission set and grant it to someone. |
| Everything else | None | |

Default scope: `ALL_BRANCHES`.

### Purchasing

| Domain | Level | Rationale |
|---|---|---|
| PURCHASING | Full | Owns supplier relationships and purchase documents. |
| INVENTORY | Operate (read stock levels, create receiving documents) | Needs to know what to buy and record receipt, not full warehouse authority. |
| REPORTS | Read (Inventory focus) | |
| ACCOUNTING | None | Purchasing creates the purchase invoice; Accounting posts/reconciles it — same separation-of-duties pattern as Accountant's read-only Purchasing access, viewed from the other side. |
| Everything else | None | |

Default scope: `ALL_BRANCHES`.

### Inventory

| Domain | Level | Rationale |
|---|---|---|
| INVENTORY | Full | Owns stock records, counts, transfers, warehouse documents. |
| PURCHASING | Read | Receives against purchase orders without purchasing authority itself. |
| MENU_SALES | Read (Recipes only) | Understands consumption drivers. |
| Everything else | None | |

Default scope: `ALL_BRANCHES` (a chain's warehouse function is typically centralized) — can be narrowed to specific branches at instantiation for a brand that wants branch-local inventory control instead.

### Customer Support

| Domain | Level | Rationale |
|---|---|---|
| CRM, LOYALTY | Full | Owns the customer relationship and loyalty program. |
| MENU_SALES | Read (Orders, Invoices) | Needs order history to answer customer questions, no authority to alter operational records. |
| Everything else | None | |

Default scope: `ALL_BRANCHES` (customer support is typically centralized regardless of how many physical branches exist).

---

## 7. What this document does not do

- Does not create the `RoleTemplate` collection or any of the eleven template documents.
- Does not change `role.model.js`, `RESOURCE_ENUM`, or the Owner-role creation logic in `setup.service.js`.
- Does not implement the domain-group → resource-list classification as executable code (§4's table is the design; the classification itself is an implementation task).
- Does not decide the exact `RoleTemplate` API surface (list templates, instantiate, preview resolved permissions before creating) — left to implementation, consistent with this document being architecture, not an API spec.

## 8. Summary of decisions

| Decision | Status |
|---|---|
| Onboarding auto-creates only the Owner role; everything else is a template catalog, instantiated on demand | Decided |
| Templates are platform-owned, versioned blueprints with no ongoing sync to instantiated roles | Decided |
| Role definitions are expressed as domain-group access levels, not hand-authored per-resource lists | Decided — the core mechanism avoiding the ~1,000-entry duplication problem |
| `RESOURCE_ENUM`'s additive-only convention is extended: new entries must also be classified into a domain group | Decided, becomes an engineering checklist item |
| Eleven templates fully specified (Administrator, Branch Manager, Cashier, Kitchen, Waiter, Delivery, Accountant, HR, Purchasing, Inventory, Customer Support) | Decided (§6) |
| Separation-of-duties applied deliberately in three places: Administrator/HR get IAM read-only (no self-escalation), Accountant/Purchasing are mutually read-only on each other's documents | Decided, stated rationale each time |
| Row/record-level scoping (e.g. "only this cashier's own transactions") is a known, unresolved gap | Explicitly documented, not solved here — same gap as the IAP Phase 5 Permission Roadmap |

Nothing in this document modifies any model, service, controller, or router.
