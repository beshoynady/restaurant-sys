# Backend Foundation

Status of the infrastructure layer after the 2026-07-11 foundation review: what changed, why, how it works now, and the checklist every new module must follow.

This document covers **infrastructure only** — bootstrap, middlewares, `BaseService`/`BaseController`, multi-tenancy, RBAC, feature toggles, DB connection. It does not cover individual business modules (see each module's own `.module.md` where one exists, e.g. `modules/hr/employee/EMPLOYEE.module.md`).

---

## 1. What changed

| Area | Before | After |
|---|---|---|
| Request context | `authenticate.js` set `req.user` (raw Mongoose doc), `req.brandId`, `req.branchId`. Nothing set `req.user.brandId` / `req.user.userId`. | `authenticate.js`/`.ts` also sets `user.brandId`, `user.branchId`, `user.userId` directly on the attached user object. |
| Multi-tenant query scoping | `BaseService.buildBaseQuery` only applied a `brand` filter if `brandId` was truthy — it never was (see above), so brand scoping silently never activated on any `BaseController`-driven route. | Fixed at the source; brand scoping now actually applies wherever `brandScoped: true` (the default). |
| Branch-level isolation | No mechanism. Only `brandScoped` existed. | `branchScoped` option added to `BaseService` (opt-in, default `false`) and threaded through `BaseController`. |
| RBAC (`authorize()`) | Wired into exactly one router (`user-account`). Three other routers (`brand`, `branch`, `branch-settings`) called `authorize()` with a broken single-argument signature (`authorize("brand:create")`) that could never match any permission — those routes were unusable for every user, including owners. | `authorize(resource, action)` wired into all ~38 live routers (~350 call sites). The 3 broken-signature routers fixed. `RESOURCE_ENUM` (`modules/iam/role/role.model.js`) extended additively with the resources that were missing (Messages, OfflineCustomers, OnlineCustomers, CustomerLoyalty, Tables, Reservations, AccountBalances, Ledgers, AuditLogs, BrandSettings). |
| Feature toggles | `BrandSettings.modules.<key>.enabled` existed in the schema but nothing read it. The `brand-settings` router itself was built but never mounted. | New `middlewares/checkModuleEnabled.js`, wired into every router group that maps to a `BrandSettings.modules` key. `organization/brand-settings` router now mounted at `/api/v1/organization/brand-settings`. |
| `BaseController` contract bugs | `hardDelete` never passed `brandId` to the service (cross-tenant hard-delete-by-ID was possible). `bulkHardDelete` called `service.bulkHardDelete(ids)` with a bare array instead of `{ids, brandId, branchId}` — broken at the destructuring level. | Both fixed; `hardDelete`/`bulkHardDelete` now brand/branch-scoped like every other method. |
| DB connection | `connectDB()` called without `await` — Express could start accepting requests before Mongo connected. Retried every 5s forever, no cap. | `await connectDB()` before `app.listen`. Retry uses capped exponential backoff (2s → 30s max), infinite but bounded. Dead Mongoose 5 options (`useNewUrlParser`, `useUnifiedTopology`) removed. |
| `utils/BaseService.ts`, `utils/pagination.ts`, `utils/joiFactory.ts` | Independent, incomplete/incompatible reimplementations of the `.js` originals. Zero consumers (confirmed by search) — pure drift risk. | Deleted. (A re-export wrapper was tried first but TypeScript's `NodeNext` resolution treats a `.js` specifier inside a same-named `.ts` file as self-referential, causing a real circular import — confirmed by both `tsc` and a runtime `tsx` execution crash. Deletion was the safe fix since nothing imported them.) |

Everything above was verified by booting the server against a real MongoDB instance and smoke-testing every mounted route group (all returned the expected `401` with no token, zero `500`s, zero import errors).

---

## 2. Why it changed

- **The brand-scoping bug was a live cross-tenant data leak.** Any authenticated user's `GET` list/read requests through `BaseController` never actually filtered by brand, because `req.user.brandId` was always `undefined`. This is fixed at a single point (`authenticate.js`) rather than in every controller, so it can't regress module-by-module.
- **RBAC existed as a data model but wasn't enforced.** `Role.permissions` is a genuinely well-designed schema; not applying it left every financially-sensitive route (accounting, payroll, cash) gated only by "is logged in," not "is allowed to do this."
- **Feature toggles were schema-only.** A SaaS platform needs the module-enabled check to be real, or the whole "Brand subscribes to a subset of modules" model (see `docs/PROJECT_VISION_ar.md` §4) doesn't actually hold at the API layer.
- **The DB race and unbounded retry were operational risks**, not architecture — cheap to fix, worth fixing once while touching this layer.
- **The `.ts` duplicates were actively dangerous**: if anyone ever imported them (e.g. during a future real TS migration), they'd get materially different, broken behavior with no warning.

All fixes are backward compatible by design: existing brands with no `BrandSettings` document are unaffected (fail-open), `branchScoped` defaults to `false` so no existing service's query behavior changed, and no API request/response shape changed.

---

## 3. How the new architecture works

### 3.1 Request pipeline

```
HTTP request
  → Helmet / CORS / JSON body parsing / cookies         (server.ts)
  → Rate limiter                                          (/api/v1 only)
  → auditLogger                                            (logs on finish; never blocks the request)
  → router/v1/index.router.ts                              (mounts every module router)
      → authenticateToken       (middlewares/authenticate.js)
      → authorize(resource, action)   (middlewares/authorize.js)
      → checkModuleEnabled(moduleKey) (middlewares/checkModuleEnabled.js)
      → validate(joiSchema)      (middlewares/validate.js)
      → controller method        (extends BaseController, or custom)
  → notFound → errorHandler
```

Every live router follows this exact middleware order. `authorize` must run before `checkModuleEnabled` (permission is a harder gate than a feature toggle), and both must run after `authenticateToken` (they read `req.user`).

### 3.2 `authenticate.js` / `.ts` — the request context contract

After successful JWT verification, the middleware attaches:

```js
req.user            // full UserAccount Mongoose doc, populated with .role and .employee
req.user.brandId     // == req.user.brand
req.user.branchId    // == req.user.branch (may be null)
req.user.userId      // == req.user._id
req.brandId           // duplicate of req.user.brandId, for code that doesn't have req.user
req.branchId          // duplicate of req.user.branchId
```

**Any code that needs the current tenant/user context reads `req.user.brandId` / `req.user.branchId` / `req.user.userId`.** This is the one place these are set — don't derive them differently elsewhere (e.g. `req.user.brand.toString()`), or the two will drift again.

`authenticate-customer.js` is separate (for the Customer Portal) and only sets `req.customer` + `req.brandId` — customers don't have `Role`/`permissions`, so `authorize()` is never used on customer-authenticated routes.

### 3.3 `authorize(resource, action)` — RBAC

```js
authorize("Orders", "read")
```

- `resource` must be one of `RESOURCE_ENUM` in `modules/iam/role/role.model.js`.
- `action` is one of `create | read | update | delete | viewReports | approve | reject` (matches the boolean flags on `Role.permissions[]` entries). There is no `restore` action — soft-delete restore uses `update`.
- Checks `req.user.role.permissions` for an entry matching `resource` + `action === true`, optionally scoped to `perm.branch`.
- Throws `403 Forbidden` (synchronously, via `throwError` — Express's own dispatcher catches this and forwards it to `errorHandler`; this is expected, not a bug) if no matching permission exists.

**Always call it with two string arguments.** A single combined string (`"brand:create"`, `"loyalty_wallet_view"`) will never match anything — this is exactly the bug that was silently locking out 3 routers before this review.

### 3.4 `checkModuleEnabled(moduleKey)` — feature toggle

```js
checkModuleEnabled("accounting")
```

- `moduleKey` must be a key under `BrandSettings.modules` (see `modules/organization/brand-settings/brand-settings.model.js`): `menu, sales, preparation, seating, payments, delivery, inventory, crm, loyalty, hr, financial, accounting, analytics, purchasing, production, assets, reservations, feedback`.
- Reads the brand's `BrandSettings` document. **Fail-open**: if the brand has no `BrandSettings` document yet, or the specific key isn't present, the request is allowed. It only ever *restricts* once a brand has explicitly toggled a module off.
- Not applied to core tenancy/identity routes (`organization/brand`, `organization/branch`, `iam/*`, `audit-log`) — those aren't toggleable business modules, they're the platform itself.

### 3.5 `BaseService` / `BaseController` — generic CRUD

**2026-07-12 update:** `BaseService`'s actual implementation now lives in `utils/BaseRepository.ts`; `BaseService.js` is a thin, behavior-identical subclass kept for backward compatibility (see §4.3). Everything below is still accurate for `BaseService` as observed from a consuming module — nothing about its behavior or constructor signature changed.

`BaseService` (`utils/BaseService.js`) constructor options:

```js
new BaseService(Model, {
  brandScoped: true,       // default true — injects { brand: brandId } into every query/create
  branchScoped: false,      // default false — injects { branch: branchId } when true
  enableSoftDelete: true,   // default true
  defaultSort: { createdAt: -1 },
  searchableFields: [],     // used by the `search` query param — empty means search is a no-op
  defaultPopulate: [],
});
```

Set `branchScoped: true` for any entity that must never be visible/writable across branches within the same brand (e.g. warehouse-local stock, cashier shifts). Leave it `false` (default) for brand-wide entities (e.g. brand settings, roles, menu categories shared across branches).

Lifecycle hooks available for override in a subclass: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`. Use these for module-specific side effects (e.g. writing an audit trail row, recalculating a derived field) instead of putting business logic in the controller.

`BaseController` (`utils/BaseController.js`) is a thin HTTP adapter: it extracts `brandId`/`branchId`/`userId` from `req.user` and calls the matching `service` method, then formats the response as `{success, message, data, meta}`. It assumes the service exposes exactly the method signatures `BaseService` provides (`create`, `getAll`, `findById`, `update`, `softDelete`, `restore`, `hardDelete`, `bulkSoftDelete`, `bulkRestore`, `bulkHardDelete`, `count`). If a module's service doesn't implement one of these with a matching signature, that route will throw at request time, not at import time — there is no compile-time contract check (the module layer is JS).

### 3.6 Multi-tenancy model

```
Brand (tenant)
  └─ Branch (location, optional per-entity — null means "applies to the whole brand")
```

Every tenant-scoped model should carry `brand: ObjectId ref "Brand"` (required) and, where the entity is branch-specific, `branch: ObjectId ref "Branch"`. `brandScoped`/`branchScoped` on `BaseService` are what actually enforce this at query time — declaring the field on the schema alone does nothing without the service option.

---

## 4. How to build a new module on top of this

**Decided 2026-07-12: Repository Pattern is now mandatory for every module, superseding the "5-file, nothing more" rule for Tier 1 in §6 below.** Database access must never be implemented directly inside a service — every module gets a `repository.ts` that owns all Mongoose queries, and the service calls the repository instead of the model. This is a structural baseline requirement independent of tier; the tiering system in §6 still governs which *optional* files (`types`, `errors`, `domain`, `workflow`) a given module needs, but `repository.ts` is no longer optional for anyone.

Follow the standard 6-file pattern under `modules/<domain>/<entity>/`. Use `modules/accounting/journal-entry/` and `modules/accounting/journal-line/` as the reference implementation (first modules migrated to this standard).

### 4.1 Files

```
<entity>.model.ts         Mongoose schema. Include brand (required) and branch if entity is branch-specific.
<entity>.validation.ts    createSchema/updateSchema/paramsSchema/etc. from utils/joiFactory.js.
<entity>.repository.ts    ALL database access. See §4.3 for exact responsibilities.
<entity>.service.ts       Business rules, orchestration, calls one or more repositories. See §4.3.
<entity>.controller.ts    class extends BaseController — only add methods for non-CRUD business actions.
<entity>.routes.ts        wires the routes (see 4.2).
```

Optional, added only when the module's actual complexity justifies it (per §6's tiering — do not add these preemptively):

```
<entity>.types.ts         Shared interfaces/DTOs, when they'd otherwise clutter service.ts.
<entity>.errors.ts        Named error classes (e.g. UnbalancedEntryError), when generic throwError(msg, status) stops being precise enough for callers to branch on.
<entity>.domain.ts         Pure business-logic functions with no DB/HTTP dependency (e.g. balance computation, number formatting) — extracted from service.ts when they're complex enough to warrant isolated unit testing without a database.
<entity>.workflow.ts       Dedicated workflow/orchestration service for Tier 3 modules whose actions have consequences outside their own collection (see §6, Tier 3).
```

**Existing modules keep their current `.router.js`/`.router.ts` filename until they're next touched** — this is a naming convention going forward, not a mass-rename task; renaming every existing router file would touch every mount point in `router/v1/index.router.ts` for zero behavioral benefit. New modules and modules undergoing a Tier 2/3 refactor use `.routes.ts`.

### 4.2 Repository vs. Service responsibilities (mandatory split)

**Repository owns exclusively:**
- CRUD operations, MongoDB queries, aggregation pipelines, population, pagination, bulk operations
- Database-level transaction helpers (opening a session, passing it through) — not the decision of *when* to use one, or what happens inside it
- Nothing else — no business rules, no validation, no permission checks, no workflow logic, no notification logic

**Service owns exclusively:**
- Business rules and invariant enforcement (e.g. "an entry must balance," "a period must not be locked")
- Validation orchestration beyond the Joi schema (cross-field, cross-collection)
- Calling one or more repositories and composing their results
- Deciding when a transaction is needed and orchestrating it (via repository-provided session helpers)
- Integration between modules, workflow coordination
- Must not execute a raw Mongoose query directly unless genuinely unavoidable (and if it is, that's a signal the repository is missing a method, not a license to bypass it)

This split is what makes a service's business logic unit-testable without a database (mock the repository) and keeps a repository swappable/reusable without carrying business assumptions.

### 4.3 `BaseRepository` / `BaseService` — how the split works at the framework level

`utils/BaseRepository.ts` (added 2026-07-12) is now the real generic Mongoose CRUD engine — pagination, populate, bulk ops, soft-delete-aware queries, the `beforeCreate`/`afterCreate`/etc. lifecycle hooks — everything that used to live in `BaseService.js` directly. `utils/BaseService.js` is now a **thin, behavior-preserving subclass** of `BaseRepository` (`class BaseService extends BaseRepository {}`, nothing else) — it exists solely so the ~85 modules not yet migrated to this standard keep working completely unchanged via `new BaseService(Model, {...})`. `BaseController`'s generic constraint was widened from `BaseService<any>` to `BaseRepository<any>` (a pure widening — every existing `BaseService`-based service still satisfies it).

**For a new or migrated module:** `<entity>.repository.ts` extends `BaseRepository<T>` directly (not `BaseService`) and adds any custom query methods. `<entity>.service.ts` extends that concrete repository class (not `BaseRepository`/`BaseService` directly) and adds business-rule methods, containing zero raw Mongoose calls of its own. See `modules/accounting/journal-entry/` and `modules/accounting/journal-line/` for the reference implementation, and `REPOSITORY_PATTERN_MIGRATION_PLAN.md` for the full rollout plan and the "why extend, not compose" tradeoff explanation.

**Do not add new methods to `BaseService.js` or its `.d.ts`.** It is a compatibility shim now, not the place to extend the framework — extend `BaseRepository` instead.

### 4.4 Router middleware order (mandatory)

```js
import express from "express";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import entityController from "./entity.controller.js";
import { createEntitySchema, /* ... */ } from "./entity.validation.js";

const router = express.Router();

router.route("/")
  .post(
    authenticateToken,
    authorize("EntityResource", "create"),
    checkModuleEnabled("moduleKey"),
    validate(createEntitySchema),
    entityController.create,
  )
  .get(
    authenticateToken,
    authorize("EntityResource", "read"),
    checkModuleEnabled("moduleKey"),
    validate(queryEntitySchema),
    entityController.getAll,
  );

// repeat the same 4-middleware chain for :id GET/PUT/DELETE, soft-delete, restore, bulk-*
```

Checklist before opening a PR for a new module:

1. **Add the resource to `RESOURCE_ENUM`** in `modules/iam/role/role.model.js` if it doesn't already exist. This is additive-only — never remove or rename an existing entry (it would silently break every role that already references it).
2. **Pick the right `moduleKey`** from `BrandSettings.modules` (`modules/organization/brand-settings/brand-settings.model.js`). If the module doesn't map to any existing key, that's a signal to raise it rather than invent a mismatched key.
3. **Decide `branchScoped`** for the service: does this entity need to be isolated per branch, or shared across the brand?
4. **Mount the router** in `router/v1/index.router.ts`, following the existing grouped-by-domain layout with a comment header.
5. **Don't reuse the legacy trees** (`modules/setup/*`, `modules/system/audit-log/*`) as a reference — they're dead/abandoned; use `modules/system-setup/*` and `modules/audit-log/*` instead.
6. **Business logic goes in the service, database access goes in the repository** (§4.2/§4.3) — never business rules in the controller/router, never raw Mongoose queries in the service.
7. **Write the module entirely in TypeScript.** This is now decided (see §5 below) — every new module, and every existing module when it gets rebuilt, is 100% TypeScript. Never mix `.js` and `.ts` files within the same module folder.
8. Write module documentation as a single `<ENTITY>.module.md` in English next to the module's files, following `modules/hr/employee/EMPLOYEE.module.md` as the template (business purpose, schema reference, endpoints + required permissions, non-CRUD business logic, related settings).

---

## 5. TypeScript, Linting & Formatting Strategy

Added 2026-07-11 as a dedicated foundation-upgrade pass, separate from the middleware/RBAC work in §1–§4. Scope was deliberately narrow: tooling only — **no business module under `modules/**` was touched** to produce this section.

### 5.1 TypeScript version — pinned to 5.x, not the newest major

The project's `typescript` devDependency was `^7.0.2` (Microsoft's new native/Go-ported compiler line) before this pass. It was **downgraded to `^5.9.3`** (the latest stable 5.x release) and will intentionally stay on the 5.x line until the ecosystem catches up.

**Why:** `typescript-eslint` (and, when the testing phase is introduced later, `ts-jest`) declare a peer-dependency ceiling that TypeScript 7 already exceeds (`typescript-eslint@8.63.0` requires `>=4.8.4 <6.1.0`). Installing on top of TS7 would have required `--legacy-peer-deps`, silently accepting an unverified combination in a project where "stability first" was the explicit driver for this whole foundation-upgrade phase. TS7 is designed to be behaviorally compatible with TS5.x type-checking, so it likely would have worked — but "likely" isn't the bar for an ERP handling real money and stock movement. Re-evaluate this pin when `typescript-eslint` (and, later, the chosen test runner) officially support TypeScript 7.

### 5.2 Type-checking configuration (`tsconfig.json`)

Still `noEmit: true` — **there is no build/dist step and none is planned**; `tsx` remains the sole way the project runs, in dev and via `npm start` alike. `tsc` is used only as a type-checker (`npm run typecheck`), not a compiler. Added in this pass, all purely to make repeated type-checking faster/more informative without introducing a build step:
- `incremental: true` + `tsBuildInfoFile: "./.tsbuildinfo"` — caches type-check state between runs.
- `sourceMap: true` — accurate stack traces from any tool that reads them (editor, future test runner), even though nothing is emitted to disk today.

`NodeNext` module resolution (unchanged, already correct): relative imports in `.ts` files use a `.js` extension even when only a `.ts` file exists on disk (e.g. `import OrderModel from "./order.model.js"` when only `order.model.ts` exists) — this is standard NodeNext behavior, not a mistake. **This is different from the self-referential-import bug found and fixed in §1** (`utils/BaseService.ts` deleted): that bug was specifically about a `.ts` file importing a `.js` specifier while a `.js` file of the *identical* name also existed — a same-basename collision. A brand-new module where only the `.ts` file exists has no such collision and resolves correctly.

Path aliases (`@modules/*`, `@utils/*`, etc.) were considered and **deliberately deferred** — `tsx`/Node's ESM loader doesn't resolve TypeScript's `compilerOptions.paths` natively, and introducing aliases now (with zero TS business modules yet written) would add a second import convention with no real user. Revisit when the first module is actually rebuilt in TypeScript.

### 5.3 Module-by-module TypeScript migration rule

This is the authoritative rule — restated from §4.2 item 7:

- **Existing modules stay JavaScript** until they come up for rebuild/refactor in `IMPLEMENTATION_PLAN.md`'s module order. Nothing was converted in this pass.
- **Every new module, and every module rebuilt from now on, is written entirely in TypeScript** — model, service, controller, router, and validation files all `.ts`.
- **Confirmed: conversion means an actual file rename, not just TS-flavored syntax kept in a `.js` file.** `order.model.js` → `order.model.ts`, `order.service.js` → `order.service.ts`, and so on for every file in the module. The old `.js` file is removed as part of the same change, not left alongside its `.ts` replacement — a `.js` and a `.ts` file with the same basename must never coexist (this is also what the self-referential-import bug in §1 was specifically about).
- **A module must never contain a mix of `.js` and `.ts` files.** If a module is being rebuilt, convert all 5 files in the same change, not incrementally file-by-file.
- Infrastructure (`middlewares/`, `utils/`, `router/v1/`) is already TypeScript from the earlier foundation review and is unaffected by this rule.

### 5.4 ESLint (`eslint.config.js`, flat config)

Two independent rule sets in one config, split by file extension — this reflects that `.js` files are an established, unaudited legacy codebase and `.ts` files are held to the standard the project is committing to going forward:

- **`**/*.js`** — `@eslint/js` `recommended` rules, with `no-unused-vars`/`no-empty`/`no-constant-condition` downgraded to `warn` (not `error`) specifically because the existing ~570-file codebase predates this config and would otherwise fail loudly on established, working patterns. No type-aware rules apply (JS isn't type-checked).
- **`**/*.ts`** — `typescript-eslint`'s `strictTypeChecked` + `stylisticTypeChecked` presets (full strict, type-aware linting), using `parserOptions.projectService: true` against `tsconfig.json`.
- `eslint-config-prettier` is applied last, disabling any ESLint stylistic rule that would fight Prettier's formatting.
- **Introducing this config did not auto-fix anything.** Running `npm run lint` today will report real findings on the pre-existing `.ts` infrastructure files (e.g. `middlewares/authenticate.ts` — ~54 findings, mostly `no-unsafe-*`/`no-explicit-any` from `(req as any)` casts written before this lint config existed) and, more sparsely, on `.js` files. These are **known, accepted findings, not regressions** — they are not fixed as part of this pass (that would violate "don't touch business modules / don't auto-fix"); they're a worklist for whenever those specific files are next touched.

### 5.5 Prettier (`.prettierrc.json`, `.prettierignore`)

`semi: true, singleQuote: false, trailingComma: "all", printWidth: 100, tabWidth: 2, endOfLine: "lf"` — chosen to match the double-quote/semicolon style already dominant across the existing codebase, to minimize the diff on any file the moment `--write` is eventually run on it. `format`/`format:check` scripts exist; **neither was run against the existing codebase** — `format:check` will currently report differences on most files, same reasoning as §5.4.

### 5.6 npm scripts added

```
npm run typecheck     # tsc --noEmit -p tsconfig.json
npm run lint          # eslint .
npm run lint:fix      # eslint . --fix   (explicit opt-in, never run automatically)
npm run format        # prettier --write .   (explicit opt-in, never run automatically)
npm run format:check  # prettier --check .
```

No test script was added or changed in this pass — testing infrastructure (Jest/Vitest/Supertest/etc.) is explicitly postponed to a later phase per `IMPLEMENTATION_PLAN.md`.

### 5.7 Folder & import conventions (for future TypeScript modules)

- Folder layout unchanged: `modules/<domain>/<entity>/` — the TS migration does not change directory structure, only file extensions within already-established locations.
- Relative imports, `.js` extension on the specifier even in `.ts` source files (§5.2) — this matches the pattern already used by every existing `.ts` infrastructure file; do not deviate per-module.
- No path aliases yet (§5.2) — use relative paths (`../../../utils/BaseService.js` etc.) exactly as the JS modules do today, for consistency until aliases are revisited.
- Prefer real types over `any` in new TypeScript modules — `strictTypeChecked` will flag `any` usage; the existing `.ts` infra files' `any`-heavy patterns are legacy, not the standard to copy going forward.

---

## 6. Module Complexity Tiering (binding rule for all refactoring/rebuild work)

Decided 2026-07-11, during the Organization module review; **amended 2026-07-12** to make the Repository Pattern (§4.3) a mandatory baseline at every tier, not an optional Tier-3-only addition — that was the one part of this section the 2026-07-12 architecture standard explicitly overrode. Everything else below is unchanged: **do not add abstractions, layers, methods, files, or patterns beyond the mandatory baseline unless they solve a real problem in the specific module being worked on.** Prefer the simplest architecture that satisfies current business requirements while remaining extensible.

Every module falls into exactly one of three tiers. The tier determines how much structure it's allowed to carry **beyond the mandatory model/validation/repository/service/controller/routes baseline** — not a ceiling to reach for its own sake, a ceiling not to exceed without a concrete reason tied to that module's own requirements.

### Tier 1 — Simple CRUD
**Structure:** the mandatory 6-file baseline (§4.1) — `model` + `validation` + `repository` (thin: wraps the model in CRUD/query methods, nothing more) + `service` (thin `BaseService`-style orchestration, calling the repository) + `controller` (thin `BaseController` instance) + `routes`. Nothing more. No domain services, no event emission, no extra CRUD methods beyond what the repository already provides.
**Criteria:** no complex business rules, no workflow, changing it doesn't need to trigger anything elsewhere.
**Modules:** `JobTitle`, `Department`, `MenuCategory`, `StockCategory`, `CostCenter`, `PaymentMethod`, `PaymentChannel`, every Configuration-classified settings module (all 19 from the Settings review — `accounting-settings`, `order-settings`, `loyalty-settings`, etc.), `BrandSettings`, `BranchSettings`, `DeliveryArea` (once its current field-name bugs are fixed — the bugs are Tier 1-appropriate surgical fixes, not a reason to move it up a tier).

### Tier 2 — Business Modules
**Structure:** Tier 1's baseline plus real business-rule methods on the service (lifecycle hook overrides or named methods, calling one or more repository methods), transactions where a single logical operation touches more than one collection (orchestrated by the service, session mechanics provided by the repository), and audit-trail writes where the action is sensitive. Still no dedicated Domain/Workflow Service split, no event bus.
**Criteria:** real invariants to enforce (uniqueness beyond a DB index, cross-field validation, a state that must stay consistent), but the module's own boundary is where the consequences stop — it doesn't need to notify or trigger other modules.
**Modules:** `Brand`, `Branch`, `Employee`, `Supplier`, `Account`, `JournalEntry`, `Asset`, `PurchaseInvoice`, `SalesReturn`, `Table`, `Reservation`.

### Tier 3 — Workflow Modules
**Structure:** full separation per the Architecture Review's Module Interfaces (§6) and Business Events catalog (§7) — CRUD stays in the repository/service pair, but the actual workflow lives in a dedicated Domain/Workflow Service (e.g. `OrderWorkflowService`, `KitchenQueueService`) that the CRUD service and controller call into, not the other way around. Add `.types.ts`/`.errors.ts`/`.domain.ts` (§4.1) only when the module actually grows large enough that a single service file becomes hard to navigate — not preemptively.
**Criteria:** the action has consequences outside the module's own collection — matches `IMPLEMENTATION_PLAN.md`'s Phase 2–4 modules.
**Modules:** `Order`, `Invoice`, `Preparation`/Kitchen, `Inventory` (deduction/reservation), `Payments`, `Loyalty`, `Payroll`, `CashierShift`, `Accounting` (posting).

### How to apply this
When a module comes up for rebuild (per `IMPLEMENTATION_PLAN.md`'s module order, or `REPOSITORY_PATTERN_MIGRATION_PLAN.md`'s rollout order for the repository-extraction pass specifically), look it up in the table above (or classify it the same way if it's not listed — cross-reference `ARCHITECTURE_REVIEW.md` §6 Module Classification/§12 Readiness first) before writing any code, and build to that tier only, on top of the now-mandatory repository baseline. If the work reveals the module actually needs a tier higher than assigned here (a Tier 1 module turns out to need a transaction, say), that's a signal to update this table, not to quietly over-build every future Tier 1 module "just in case."

---

## References

- `docs/PROJECT_VISION_ar.md` — business/architecture vision (Arabic, source of truth for product decisions).
- `CLAUDE.md` — repo-wide entry point, language policy, list of still-open architectural decisions (Order→Invoice→Accounting chain, module-layer JS↔TS strategy, legacy tree cleanup).
