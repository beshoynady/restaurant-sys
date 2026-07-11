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

Follow the existing 5-file pattern under `modules/<domain>/<entity>/`. Use any live module as a template (e.g. `modules/sales/order/`, `modules/accounting/account/`).

### 4.1 Files

```
<entity>.model.js        Mongoose schema. Include brand (required) and branch if entity is branch-specific.
<entity>.service.js       new BaseService(Model, {...}) or a subclass overriding lifecycle hooks.
<entity>.controller.js    class extends BaseController — only add methods for non-CRUD business actions.
<entity>.router.js         wires the routes (see 4.2).
<entity>.validation.js     createSchema/updateSchema/paramsSchema/etc. from utils/joiFactory.js.
```

### 4.2 Router middleware order (mandatory)

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
6. **Business logic goes in the service** (lifecycle hooks or custom methods), never in the controller or router.
7. Keep the module JS (not TS) for now, consistent with every other module — the module-layer TS migration is a separate, not-yet-decided initiative (see `CLAUDE.md`).
8. Write module documentation as a single `<ENTITY>.module.md` in English next to the module's files, following `modules/hr/employee/EMPLOYEE.module.md` as the template (business purpose, schema reference, endpoints + required permissions, non-CRUD business logic, related settings).

---

## References

- `docs/PROJECT_VISION_ar.md` — business/architecture vision (Arabic, source of truth for product decisions).
- `CLAUDE.md` — repo-wide entry point, language policy, list of still-open architectural decisions (Order→Invoice→Accounting chain, module-layer JS↔TS strategy, legacy tree cleanup).
