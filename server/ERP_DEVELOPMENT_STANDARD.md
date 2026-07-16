# ERP Development Standard

**Status:** Mandatory for every new module and every module rebuild, starting with Menu / Kitchen /
Production. Extracted from the Financial Domain (Accounting, Finance, Assets, Expense, Budget
Control, Recurring Expenses) — see `FINANCIAL_DOMAIN_CERTIFICATION.md` for the certification this
extraction is based on. Every pattern named below is cited against a real file in that domain, not
invented for this document; every gap is named as a gap, not glossed over.

**How to use this document:** read it once before starting a new module, then use
`templates/module-template/` (Phase 2 of this extraction) as the literal starting point — copy it,
rename the placeholders, delete what doesn't apply, and build from there rather than from a blank
file.

---

## 0. Foundation Files (already exist — read, don't reinvent)

| File | Purpose |
|---|---|
| `utils/BaseRepository.js` | Generic CRUD + brand/branch scoping + soft delete + `lockedUpdateFields` + transactions. Every repository/service extends this. |
| `utils/BaseController.js` | Generic CRUD HTTP handlers + `sendResponse()`. Every controller extends this. |
| `utils/TransitionGuard.js` | `createTransitionGuard({state: [allowedNextStates]})` — the one shared state-machine implementation. |
| `utils/joiFactory.js` | `objectId()`, `multiLang()`, `createSchema()`, `updateSchema()`, `paramsSchema()`, `paramsIdsSchema()`, `querySchema()`. |
| `utils/throwError.js` | `throwError(message, statusCode)` — the one error-construction helper; never `throw new Error()` directly in a service. |
| `utils/asyncHandler.js` | Wraps an async route handler so a thrown/rejected error reaches Express's error middleware instead of hanging the request. |
| `utils/domainEvents.js` | In-process pub/sub (`DomainEvent` catalog + `emit`/`on`). Exists platform-wide; **not used anywhere in the Financial Domain** — see §8. |
| `utils/audit/AuditContext.js` + `modules/audit-log/` | A tamper-evident append-only audit log collection and context builder. Exists platform-wide; **has zero writers today, including in the Financial Domain** — see §12. |
| `middlewares/authenticate.js`, `authorize.js`, `checkModuleEnabled.js`, `validate.js` | The mandatory router middleware chain — see §5. |

---

## 1. Model Standards

**Required fields on every tenant-scoped model:**
- `brand: { type: ObjectId, ref: "Brand", required: true }` — always.
- `branch: { type: ObjectId, ref: "Branch", ... }` — see "Ownership" below for `required` vs `default: null`.
- `createdBy: { type: ObjectId, ref: "UserAccount", required: true }`.
- `updatedBy: { type: ObjectId, ref: "UserAccount", default: null }` on anything editable post-creation.

**Ownership — three identifier classes, not one rule** (the `DATABASE_ARCHITECTURE_REDESIGN.md`
finding, re-confirmed by every Phase 6 model this pass):
1. **A document that inherently belongs to one branch** (`Asset`, `DailyExpense`,
   `AssetDisposal`, `RecurringExpenseTemplate`) → `branch: { required: true }`.
2. **A field that is an optional branch-specific *override* of a brand-wide default**
   (`Account.branch`, `Budget.branch`, `CostCenter.branch`) → `branch: { default: null }`, and
   `null` means brand-wide, **not** "unscoped" or "invalid." This was a real bug (`Account.branch`
   was once treated as a full chart-of-accounts partition, silently returning zero accounts for a
   branch-scoped query) — fixed via `financial-statements.service.js#_accountFilter()`'s
   `$or: [{branch: null}, {branch}]` pattern. Reuse that pattern; do not re-derive it.
3. **Global-unique fields must be brand-scoped, not globally unique** — a `code`/`slug`/`number`
   field's uniqueness index must always include `brand` (`{brand, code}`, unique), never `{code}`
   alone — a platform-wide gap the 2026-07-11 foundation review found and fixed everywhere it
   existed; do not reintroduce it in a new model.

**Derived fields** (a value computed from other fields, never trusted from client input):
- Compute in `beforeCreate()`/a dedicated service method, never in the schema's `default`.
- Example: `Asset.accumulatedDepreciation`/`bookValue` — `asset.service.js#beforeCreate` forces
  `accumulatedDepreciation: 0, bookValue: purchaseCost` regardless of client payload.
- Example: `BudgetLine.annualAmount`/`Budget.totalAnnualAmount` — recomputed from
  `monthlyAmounts` on every write, never accepted directly.
- **A derived field must also be in `lockedUpdateFields`** (see below) — `beforeCreate` alone
  only guards `create()`, not `update()`.

**Immutable fields** — anything that represents a decision already made (a workflow status, a
posted GL reference, an audit-trail snapshot) is listed in the repository's `lockedUpdateFields`
array (a `BaseRepository` constructor option, added specifically for this), stripped from every
`update()` payload by `sanitizeUpdatePayload()`. This is the fix for the single most-repeated defect
class found across the whole Financial Domain build: **"generic PUT bypasses business rules"** —
found and fixed independently on `Order`, `Invoice`, `CashierShift`, `DailyExpense`, `Asset`,
`AssetDisposal`, `Budget`, and `RecurringExpenseTemplate`. Assume every new transactional model needs
this; the question is which fields, not whether.

**Indexes** — every model needs, at minimum:
- The tenant-scoping compound index matching its dominant query shape (`{brand, branch, status,
  date}` style — see `DailyExpense`'s `{brand, branch, status, date: -1}`).
- Any field a report/dashboard filters or sorts by — audited and fixed platform-wide this session
  (`Asset` had **zero indexes** before the Financial Domain audit; `JournalLine.existsForSource()`
  — called on every single GL posting platform-wide — had none either, the single most severe
  performance finding of that audit).
- A back-reference used for "every X that produced this Y" lookups gets its own index
  (`DailyExpense.recurringExpenseTemplate`, `AssetDisposal`'s unique index on `asset`).

**Validation** — schema-level for shape/type/enum; cross-field business rules (XOR pairs like
`cashRegister`/`bankAccount`, "Custom frequency requires customIntervalDays") belong in the
**service** layer (`beforeCreate`/`beforeUpdate` or a dedicated `_validateX()` method), not the
schema — Mongoose cannot express conditional-on-another-field rules cleanly, and every attempt to
force it into the schema in this codebase's history made the rule harder to find, not easier.

**Lifecycle / state machines** — every model with a status field beyond a boolean gets a
`createTransitionGuard({fromState: [toStates]})` instance in its service file, and every status
transition goes through an **atomic-claim** `findOneAndUpdate({_id, ...tenant, status: fromStatus},
{$set: {status: toStatus}})` — never a read-then-write pair. This is the TOCTOU-safe pattern used
by every terminal transition built this session with zero exceptions (`AssetDisposal`'s one-time
claim, `Budget`'s approval workflow, `RecurringExpenseTemplate`'s cancel, `DailyExpense`'s extended
approval chain). A guard's edge list should be **additive when extending an existing model's
enum** — `DailyExpense.status` grew from 3 states to 6 by adding new edges to the existing guard,
never removing or renaming the original ones, so every pre-existing caller keeps working unchanged.
Verify additive-safety before extending a shared enum: grep every consumer for an assumption of an
exhaustive value set (`status === "X"` is safe; `[Draft,Posted,Cancelled].includes(status)` used as
a completeness check is not) — done for `DailyExpense` before its Phase 6 extension, confirmed safe.

**Search fields** — `searchableFields` (a `BaseRepository` option) lists which fields
`applySearch()` regex-matches against `?search=`. Leave empty (`[]`) for anything without a natural
free-text field (most transactional/financial documents); populate it for anything a user would
actually type a name into (`name`, `code`).

**Reporting fields** — denormalize a field onto a "line" collection specifically to avoid an
aggregation-time join, when the access pattern is known in advance. `JournalLine.period`/`date` are
denormalized from the parent `JournalEntry` for exactly this reason (`DB-008`) — the report access
pattern ("every line for account X in period Y") needs an indexed, line-centric query path, not a
join at read time. Don't denormalize speculatively; denormalize when a real report's query shape
demands it.

---

## 2. Repository Standards

**Responsibilities**: 100% of database access for its model. Zero raw Mongoose calls are allowed to
escape into the service layer — the one standing exception is a report/dashboard service reading a
*different* module's model directly for aggregation (`budget.service.js` reads `JournalLineModel`
directly for `getBudgetVsActual()`; `ledger.service.js`/`finance-reports.service.js` do the same
against their own source collections) — "a report reads its source ledger," not "a service
manipulates another domain's writes."

**Allowed operations**: generic CRUD (inherited from `BaseRepository` — `create`, `getAll`,
`getOne`/`findById`, `update`, `softDelete`, `restore`, `hardDelete`, bulk variants, `count`) plus
whatever extra primitives the module's specific transactional needs require:
`insertX(data, session)` (insert one document within an existing session),
`findByIdScoped(id, brand, session)` (a tenant-scoped read that also accepts a session — needed
before every transition-guard check), `transitionStatus(id, brand, fromStatus, updateFields,
session)` (the atomic-claim primitive above, generalized). Mirror `journal-entry.repository.js`'s
shape exactly when a module needs this — it is the canonical example.

**When to use the Repository Pattern vs. a plain `AdvancedService`-only class**: this is a judgment
call, not a rule with one right answer — and Phase 6 deliberately made it both ways in the same
domain. Use a separate `<entity>.repository.js` (extended by `<entity>.service.js`) when the module
needs multi-document transactional writes (`Budget`/`BudgetLine` together, `JournalEntry`/
`JournalLine` together) or session-aware primitives a plain `create()`/`update()` call can't express.
Skip it (a single `class XService extends AdvancedService` calling `super(Model, options)` directly)
when the module is straightforward CRUD plus a few atomic-claim transitions on its own single
collection (`Asset`, `AssetDisposal`, `CostCenter`, `RecurringExpenseTemplate`). Both are correct;
picking the simpler one when the complexity doesn't warrant the split is itself the standard — do
not default to the Repository Pattern "because it's more enterprise."

**Transaction handling**: `BaseRepository.startSession()`/`withTransaction(fn)` are the only
transaction primitives to use — `withTransaction` starts, commits on success, aborts on any thrown
error, and always ends the session; the **decision** of what belongs inside one transaction is a
service-layer call, not a repository one. **Known limitation, inherited, not solved by any Phase 6
module**: cross-*service* atomicity (e.g. claiming a `RecurringExpenseTemplate`'s schedule, then
calling `dailyExpenseService.create()`, which itself opens its own independent transaction inside
`_postExpenseAccounting`) cannot be wrapped in one shared session without deeper surgery on the
called service's internals — this codebase's accepted convention is "claim first, create second,
document the resulting accepted risk" (see `RECURRING_EXPENSE.module.md` §13), not "avoid the
situation." Follow that convention rather than attempting ad-hoc nested-session tricks.

**Soft delete policy**: `enableSoftDelete: true` for master/config data (`CostCenter`,
`ExpenseSettings`, `RecurringExpenseTemplate` — nothing catastrophic happens if it's hidden and
later restored). `enableSoftDelete: false` for transactional/financial documents with their own
explicit lifecycle status (`JournalEntry`, `AssetDisposal`, `DailyExpense`, `Budget` — a `Rejected`/
`Cancelled` status already models "this is inactive," and soft-delete would be a second, redundant,
possibly-conflicting way to say the same thing — the exact defect class found and fixed on `Asset`
this session, where `softDelete: true` was a silently-ignored typo the strict-validation change in
`BaseRepository`'s constructor now catches immediately at boot instead of silently).

**Pagination**: `BaseRepository.getAll()`'s own inline `page`/`limit`/`skip` logic
(`page = max(Number(page)||1, 1)`, `limit = min(max(Number(limit)||10, 1), 100)`) is the **only**
pagination implementation to use. `utils/pagination.js` is a separate, standalone helper with zero
consumers anywhere in the codebase — confirmed by grep before writing this document — **do not use
it**; it is dead code from before `BaseRepository` absorbed pagination internally, left unremoved.
Response shape is always `{data: [...], meta: {page, limit, total, totalPages}}` — inherited free
from `BaseController.getAll()`, never hand-rolled.

**Filtering**: `req.query` minus the reserved keys (`page`, `limit`, `search`, `sort`, `select`,
`includeDeleted`) becomes the `filters` object, passed straight through to `buildBaseQuery()`. A
module needing a filter Mongo can't express as a direct equality match (a date range, an `$in` list)
adds a dedicated service method or query-schema transform — never a second ad-hoc filtering path
bolted onto the controller.

**Aggregation**: raw `Model.aggregate([...])` calls are the one place `BaseRepository`'s automatic
ObjectId casting does **not** apply — `.find()`/`.countDocuments()` auto-cast a string `brand` to
`ObjectId`, `.aggregate()`'s `$match` stage does not. **Every aggregation `$match` on a
tenant/reference field must explicitly wrap the value in `new mongoose.Types.ObjectId(...)`** — a
bug class found and fixed 2-3 times independently in `ledger.service.js`/`finance-reports.service.js`
before this became a standing rule; `budget.service.js#getBudgetVsActual()` was written with this
guard from the start specifically because of that history. Verify this every time an aggregation
pipeline is written — it is the single most-repeated silent-failure bug in this codebase's history.

---

## 3. Service Standards

**Business verbs, not CRUD**: a service's most important methods are named for what a user is
*doing* (`scrapAsset`, `sellAsset`, `approveBudget`, `generateDueOccurrences`), not generic
`create`/`update` calls with a status field buried in the payload. Generic CRUD remains available
(inherited) for the cases that are genuinely just data entry — the judgment call is whether the
action represents a business decision (verb) or a field edit (generic update), and every Phase 6
module drew that line explicitly, then locked the fields a verb owns against the generic path.

**Workflow orchestration**: a service method that spans multiple documents/collections is
responsible for deciding what belongs inside one transaction, in what order, and what the accepted
failure modes are if something can't be made fully atomic (see Repository Standards' "Transaction
handling" above) — and for **documenting that decision** in the module's own `.module.md`
"Architecture Decisions" section, not leaving it implicit in the code.

**Accounting integration**: a module that has a real financial/operational consequence posts through
`journalEntryService.postFromSource({sourceType, brand, branch, date, description, lines,
createdBy, sourceRef})` — never constructs a `JournalEntry`/`JournalLine` pair by hand. Two
standing rules, both load-bearing across every posting engine built this session:
1. **GL posting is best-effort/non-blocking** — wrap it in its own `try/catch`; an unconfigured
   `AccountingSettings` or missing GL account must never block the primary business operation, only
   skip the (optional, catchable) journal entry, logged via `console.error`.
2. **A real-world operational fact must never be coupled inside that same try/catch.** Cash leaving
   a register, an asset depreciating, a settlement balance being credited — these happen
   *unconditionally*, separate from the optional GL posting. This exact bug (an operational balance
   left silently stale because it was gated on GL posting succeeding) was found and fixed
   independently on `AssetDepreciation`, `DailyExpense`, and `AssetDisposal` — three times before it
   became a standing rule instead of a recurring discovery. When adding a new posting engine,
   assume this bug exists until you've explicitly separated the two concerns.
3. **The mapped-back reference must be applied to the in-memory object being returned**, not just
   persisted to the database — a posting method that does
   `await this.model.updateOne({_id}, {$set: {journalEntry: entry._id}})` must also set
   `document.journalEntry = entry._id` on the object it returns, or the caller sees a stale
   response. Found and fixed independently on `CashierShift`, `AssetDepreciation`; proactively
   avoided (not rediscovered) on `AssetDisposal` by naming the pattern in advance.

**Validation responsibilities**: schema-level Joi validation (shape/type/required) happens at the
router via `validate(schema)`; cross-field/cross-document business rules (does this account belong
to this brand, is this the right account category, is exactly one of two optional refs set) happen
in the service, because they require a database read or knowledge of more than one field's Joi
schema at once.

**Event publishing**: `domainEvents.emit(DomainEvent.SOME_EVENT, payload)` for a state change other
domains might want to react to *without* this service needing to know who's listening — the pattern
is proven (used by `PurchaseOrder`/`GoodsReceipt`/`Order`/`ProductionOrder` in the Supply Chain and
Order domains). **The Financial Domain built this session emits zero domain events** — every
cross-module interaction (Budget reading `JournalLine`, Recurring Expenses calling
`dailyExpenseService.create()` directly) was a direct call, not an event, because every consumer
needed a synchronous result in the same request. This was the correct choice for those modules, not
an oversight — but a future module with a genuinely async/best-effort side effect (a notification, a
dashboard cache invalidation) should reach for `domainEvents.emit()` rather than a direct call. See
§8 for the honest state of this infrastructure.

---

## 4. Controller Standards

**Thin controllers**: a controller method's job is (1) pull `brand`/`branch`/`actorId` from
`req.user` — **never from `req.body`/`req.query`/`req.params`**, verified by direct grep across
every Phase 6 controller with zero exceptions found — (2) call exactly one service method, (3) shape
the HTTP response. No business logic, no database access, no multi-step orchestration in a
controller, ever.

**DTO mapping**: this codebase does not use a formal DTO class layer — the Joi-validated `req.body`
*is* the input shape, and a service method's plain-object parameter list *is* the "DTO." Keep it
that way; introducing a separate DTO-mapping layer on top of an already-validated payload would be
new ceremony without a corresponding gap it closes.

**Error handling**: every controller method is wrapped in `asyncHandler()` — never a manual
`try/catch` that duplicates what `asyncHandler` already does. A business-rule violation is signaled
with `throwError(message, statusCode)` from the service, caught by `asyncHandler`, forwarded to
Express's error middleware. Controllers themselves throw nothing.

**Authorization**: never in the controller — `authorize(resource, action)` is a router-level
middleware, checked before the controller method ever runs (see §5).

**Response format**: `BaseController.sendResponse(res, {success, message, data, meta,
statusCode})` is the canonical shape (`{success, message, data, meta}`). **Known deviation, found
in this session's own Phase 6 work**: every custom business-verb controller method
(`scrapAsset`, `approveBudget`, `generateDueOccurrences`, etc.) used a hand-written
`res.status(201).json({success: true, data})` instead of calling the inherited `sendResponse()` —
functionally compatible (same `success`/`data` keys) but missing the `message`/`meta: null` fields
`sendResponse()` always includes, so the shape isn't byte-identical across every endpoint in the
platform. **This standard requires every new controller method — generic or custom — to call
`this.sendResponse(res, {...})`**, closing this inconsistency going forward; it is not being
retrofitted onto the 30+ existing Phase 6 endpoints in this pass (a mechanical, low-risk cleanup, not
urgent enough to justify touching that much already-tested surface area for a cosmetic gain).

---

## 5. API Standards

**REST conventions**: `POST /` create, `GET /` list, `GET /:id` single, `PUT /:id` update
(business-verb-locked fields stripped automatically), `DELETE /:id` hard delete, `PATCH
/soft-delete/:id` + `PATCH /restore/:id` for soft-deletable resources, `DELETE /bulk-delete` +
`PATCH /bulk-soft-delete` for bulk variants. Business-verb actions are `POST /:id/<verb>`
(`/:id/approve`, `/:id/pause`, `/:id/generate-now`) — never overload `PUT /:id` with a status field
to trigger a business action.

**The mandatory middleware chain, zero exceptions**: every route is
```
authenticateToken, authorize("<Resource>", "<action>"), checkModuleEnabled("<brandSettingsModuleKey>"), validate(schema[, "params"|"query"]), controller.method
```
`<Resource>` must already exist in (or be added additively to) `RESOURCE_ENUM`
(`modules/iam/role/role.model.js`) — verified against **114 entries, zero duplicates** as of the
Financial Domain certification; check for an existing entry before adding a new one, and never
remove/rename an existing one (additive-only, matching every other enum-extension rule in this
document). `<brandSettingsModuleKey>` must match the sibling routers in the same domain **exactly**
— verified by reading a sibling router before writing a new one, not assumed (`asset-*` routers use
`"assets"`, `accounting/*` uses `"accounting"`, `expense/*` uses `"financial"` — inconsistent
*naming* across domains by history, but internally consistent within each; do not invent a new key
for a domain that already has one).

**Filtering / Pagination / Sorting / Search**: inherited automatically from `BaseController.getAll`
+ `BaseRepository.getAll` — see §2. A custom report/summary endpoint (not generic CRUD) defines its
own query-parameter Joi schema (`querySchema(extra)` or a bespoke `Joi.object({...})`) and validates
it explicitly with `validate(schema, "query")`.

**Lookup APIs**: no dedicated lookup/autocomplete endpoint pattern exists yet anywhere in this
domain — standard `GET /` with `?search=` and a small `?limit=` has been sufficient at the current
chart-of-accounts/cost-center scale (~50-200 rows). Flagged, not built: a genuinely large lookup set
(1000+ rows) would need a dedicated `/lookup` endpoint returning only `{_id, label}` pairs — build
one only when a real module's data volume demands it, not preemptively.

**Dashboard / Summary APIs**: the proven pattern is **pure composition** —
`executive-dashboard.service.js` never re-derives a figure another report service already computes;
it calls `financial-statements`/`finance-reports`/`expense-reports`/`asset-reports`/`budget` and
assembles the results. `budget.service.js#getCurrentBudgetsSummary()` follows the identical
convention (calls its own `getBudgetVsActual()` once per budget, aggregates). **A static sibling
route (`/summary`, `/generate-due`) must be registered before any `/:id`-shaped route in the same
router** — otherwise Express captures the literal path segment as an `:id` parameter. Verified
explicitly in both `budget.router.js` and `recurring-expense-template.router.js`; check this every
time a new static route is added alongside an existing `/:id` pattern.

**Export APIs**: not built anywhere in the Financial Domain. Every report returns clean, fully-
computed JSON (verified: no raw balance/sign left for a client to interpret, across the entire
domain) — export-ready in shape, but no CSV/PDF generation exists. A real gap if the frontend needs
it; not addressed by this standard, named so it isn't silently assumed to exist.

---

## 6. Frontend Standards

Every module's API surface must let a React frontend build a table, a form, a dashboard tile, and a
report **without a backend change** — verified for the whole Financial Domain by re-reading every
service for any place a raw number/sign is left for the client to compute (found none). Concretely:

- **Tables**: `GET /` with `{data, meta: {page, limit, total, totalPages}}` — a table component
  needs nothing else to paginate.
- **Forms**: `POST /` / `PUT /:id` validated against the same Joi schema the backend enforces — the
  frontend's own client-side validation should mirror it (e.g. the sale/cashRegister-XOR-bankAccount
  rule), but the backend is always the source of truth; never trust a client-side-only check.
- **Dashboards / Charts**: a composed dashboard endpoint (`GET /executive-dashboard`, `GET
  /accounting/budgets/summary`) returns pre-aggregated, pre-signed numbers — a chart component maps
  data directly to pixels, it does not compute variance/percentage/sign itself.
- **Lookups / Autocomplete**: standard `GET /?search=&limit=` today (see §5) — sufficient at current
  scale, a named future gap at larger scale.
- **Reports**: every report service returns a fully-shaped, documented response object (see each
  module's own `.module.md` §7 "API Documentation" for the exact shape) — a frontend report view is
  a direct render, not a second computation layer.

---

## 7. Documentation Standards

**One file per module: `<ENTITY>.module.md`**, following the 14-section template already
established and used consistently across all 9+ Financial Domain modules (see any of
`ASSET_DISPOSAL.module.md`, `BUDGET_CONTROL.module.md`, `RECURRING_EXPENSE.module.md`,
`ASSET_DEPRECIATION.module.md` as reference examples — pick whichever is closest to the new module's
shape). This decision was confirmed explicitly for this Standard (not assumed) — see this document's
own introduction. The 14 sections, and how they map onto the 8 topics originally requested for this
Standard's documentation section:

| # | Section | Covers |
|---|---|---|
| 1 | Overview | (maps to `README.md`) |
| 2 | Business Purpose | (maps to `README.md`) |
| 3 | Database Design | (maps to `DATABASE.md`) |
| 4 | Relationships | (maps to `DATABASE.md`) |
| 5 | Business Rules | (maps to `BUSINESS_RULES.md`) |
| 6 | Workflow | (maps to `BUSINESS_RULES.md`) |
| 7 | API Documentation | (maps to `API.md`) |
| 8 | Frontend Guide | (maps to `FRONTEND.md`) |
| 9 | Integration | (maps to `API.md`/`DATABASE.md`) |
| 10 | Security | (maps to `API.md`) |
| 11 | Reporting | (maps to `API.md`/`FRONTEND.md`) |
| 12 | Future Extensions | (maps to `FUTURE.md`) |
| 13 | Architecture Decisions | (no direct requested equivalent — this section is what makes the doc worth reading a second time; keep it) |
| 14 | Developer Notes | (maps to `TESTING.md`) |

There is no dedicated `CHANGELOG.md` per module in this convention — a module's own git history is
the changelog; a `.module.md`'s "Architecture Decisions" section is where a *reasoned* history of
what changed and why lives (e.g. `ASSET_DISPOSAL.module.md`'s §5/§12 history of the settlement-
balance-crediting gap being found and fixed within the same pass), which is more useful than a bare
chronological log.

**Non-negotiable content, regardless of section layout**: every module doc must name what it does
**not** do, not just what it does — every `.module.md` built this session has a "Future
Extensions"/"Known Limitations" section naming real, specific gaps (not "TODO: improve later"). This
is the single most valuable habit extracted from the Financial Domain build: a gap named in the doc
at the time it's found costs nothing; a gap discovered later by someone who assumed the doc was
exhaustive costs much more.

---

## 8. Domain Events — honest current state

`utils/domainEvents.js` is real, tested (`domain-event-dispatcher.test.ts`), and has live
publishers/subscribers in the Supply Chain, Order, and Production domains
(`PURCHASE_ORDER_APPROVED`, `GOODS_RECEIPT_CONFIRMED`, `INVENTORY_BELOW_REORDER_POINT`,
`ORDER_CONFIRMED`, `ORDER_ITEM_CANCELLED`, `PRODUCTION_ORDER_APPROVED`/`_COMPLETED`). **Zero Financial
Domain module emits or subscribes to a domain event** — every cross-module call in Accounting/
Finance/Assets/Expense/Budget/Recurring Expenses is a direct, synchronous service call, because
every consumer in that domain needed the result within the same request (a GL posting's success/
failure must be known before the caller decides what to return). This was a deliberate, correct
choice for a financial-consistency-critical domain, not a gap. A future Menu/Kitchen/Production
module with a genuinely fire-and-forget side effect (e.g. "notify the kitchen display when a recipe
cost recalculates") should use `domainEvents.emit()` — follow the existing catalog convention
(`DomainEvent.SOME_EVENT` added additively, a subscriber wired in `registerEventHandlers.js` in the
same change that ships it, never pre-wired for an engine that doesn't exist yet).

---

## 9. Testing Standards

**Integration tests, not unit tests, are this codebase's primary test type** — `tests/integration/
*.test.ts`, Jest with `ts-jest`/ESM, a single worker (`maxWorkers: 1`) against one real MongoDB
instance (no mocking of the database — the Financial Domain's own stated policy, and the reason
several real bugs, like the `.aggregate()` ObjectId-casting gap, were caught by tests instead of
surviving to production). Fixtures live in `tests/integration/fixtures.ts`
(`createBaseFixture`, `createAccountFixture`, `createAccountingSettingsFixture`,
`createAccountingPeriodFixture`, `createWarehouseFixture`, `createStockItemFixture`,
`cleanupFixture`) — extend this file with a new `create<Entity>Fixture` helper when a new module
needs a reusable fixture shape, rather than duplicating setup inline across many test files.

**What every module's test file must cover** (the pattern every Phase 6 test file follows):
1. Every business rule named in the module's own `.module.md` §5 — one `it()` per rule, not one
   giant test that asserts everything.
2. Every terminal/illegal state transition explicitly rejected (not just the happy path).
3. The `lockedUpdateFields` lockdown — a generic `update()` call attempting to set a locked field,
   asserting the field is unchanged.
4. Any GL-posting engine: a balanced entry (`totalDebit === totalCredit`), and — critically — the
   *specific* debit/credit lines and amounts, not just "an entry exists." Pre-verify the posting
   math algebraically before writing the implementation for anything with more than two possible
   line-combination shapes (adopted after `AssetDisposal`'s four-shape gain/loss/break-even math was
   verified this way before implementation, catching what would have been a costly post-hoc debug).
5. **Test isolation across `it()` blocks in the same file, especially for scheduling/date-driven
   engines**: a template/document created in one test that remains `Active`/uncancelled can be
   picked up by a *later* test's own date-range query in the same brand/branch — found and fixed
   three times while writing `recurring-expense-engine.test.ts` in this pass. Either scope each
   test's fixtures to a date range no other test in the file will ever query, or explicitly
   cancel/clean up anything left `Active` at the end of a test that creates schedulable state.

**Business Rule Tests**: covered by (1) above — not a separate test type, a description of what
each `it()` in the file should be testing.

**Regression Tests**: the full suite (`node --experimental-vm-modules
node_modules/jest/bin/jest.js`) run in the background (it exceeds the 120s default tool timeout;
~150-260s observed) **after every module is completed**, before moving to the next — never batch
multiple modules' worth of changes before the first regression run. Every Phase 6 module was
verified this way individually (Asset Disposal: 73 suites green before Budget Control started;
Budget Control: 74 suites green before Recurring Expenses started; Recurring Expenses: 74 suites
green before this Standard was written) — catching a regression immediately, against a small diff,
rather than after three modules' worth of changes have accumulated.

---

## 10. Definition of Done

A module is not complete until every item below is true — this is the exact checklist the Financial
Domain's own certification was scored against, not a new invention for this document:

- [ ] **Model reviewed** — read and validated in full *before* writing any service/controller logic
  against it (the standing "model-first" policy — every Phase 6 module started with a full read of
  every model it touched, including pre-existing ones like `AssetCategory`, before writing a line of
  new service code).
- [ ] **Business workflow reviewed** — every status/lifecycle transition mapped to a
  `TransitionGuard` table before implementation, not discovered ad hoc while writing service methods.
- [ ] **Repository completed** — or explicitly, consciously skipped per §2's judgment call, not
  defaulted into.
- [ ] **Services completed** — business-verb methods named for what they do; GL posting (if any)
  follows the best-effort/non-blocking + unconditional-operational-fact split from §3, with no
  exceptions.
- [ ] **Controllers completed** — thin, `brand`/`branch`/`actorId` sourced only from `req.user`,
  every method uses `sendResponse()`.
- [ ] **APIs completed** — full middleware chain on every route, static routes before `/:id` routes,
  `RESOURCE_ENUM` extended additively.
- [ ] **Tests completed** — every business rule, every illegal transition, `lockedUpdateFields`,
  posting-math verification if applicable, test isolation checked.
- [ ] **Documentation completed** — `<ENTITY>.module.md`, all 14 sections, named gaps not hidden
  gaps.
- [ ] **Reports supported** — if the module has a natural reporting/dashboard consumer, it is wired
  in via composition (§5/§6), not left as a future TODO with no seam for it.
- [ ] **Frontend ready** — verified per §6: no raw number/sign left for a client to compute.
- [ ] **Audit reviewed** — `createdBy`/`updatedBy`/`approvedBy`/`rejectedBy`-style fields present on
  every transactional document (the Financial Domain's actual audit-trail mechanism — see §12 for
  why this, not the platform's `AuditLog` collection, is what "audit reviewed" means today).
- [ ] **Full regression passed** — the complete suite, run after this module and confirmed green,
  before starting the next one.

---

## 11. Foundation Gaps Carried Forward (do not silently rebuild around these — they are known)

1. **No background-job/scheduler infrastructure exists anywhere in this platform.**
   `AssetDepreciation.generateForPeriod()`, `RecurringExpenseTemplate.generateDueOccurrences()`, and
   any future Menu/Kitchen/Production equivalent (e.g. a nightly menu-costing recalculation) must be
   triggered externally (an admin action, a future cron endpoint) until this is built. Design every
   "engine" method to be trivially callable from a future scheduler — this has been true of every
   generation engine built this session — rather than assuming one exists.
2. **`utils/audit/AuditContext.js` + `modules/audit-log/` exist but have zero writers anywhere in
   the codebase**, confirmed by grep before writing this document. The Financial Domain's actual
   audit trail is per-document `createdBy`/`updatedBy`/`approvedBy`/`rejectedBy`/timestamp fields,
   not this collection. Wiring `AuditLog` in platform-wide is real, valuable future work — it is not
   something to assume is already happening.
3. **No multi-currency revaluation** — `JournalLine.currency`/`exchangeRate`/`convertedDebit`/
   `convertedCredit` fields exist but nothing populates or revalues them; single-currency operation
   only, in practice.
4. **No formal period-closing journal entry mechanism** — mitigated for interim reporting by the
   Balance Sheet's computed "Current Period Earnings" line, not a substitute for a real closing
   entry.
5. **`utils/pagination.js` is dead code** (§2) — do not use it, do not extend it; `BaseRepository`'s
   inline pagination is the only implementation in active use.

---

*This document is the direct output of Phase 0/Phase 1 of the "Enterprise ERP Foundation Baseline"
extraction (2026-07-16), performed against the certified Financial Domain. See
`templates/module-template/` (Phase 2) for the literal starting point every new module should copy.*
