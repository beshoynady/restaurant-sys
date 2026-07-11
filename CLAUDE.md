# Restaurant ERP SaaS

**Required reading before working on this codebase:** [docs/PROJECT_VISION_ar.md](docs/PROJECT_VISION_ar.md)

That document is the architectural source of truth — SaaS multi-tenancy model (Platform → Brand → Branch → Department → Employee), Modular ERP / Feature Toggle design, Settings Driven Architecture, the Security Pipeline every request must pass through, Order lifecycle, Kitchen Display System, Inventory/Recipe/Production flow, Accounting, Multi-Tenancy scoping rules, and Audit requirements. Any new module or architectural decision must align with it.

**Language policy:** the project itself — code, code comments, and all documentation — is English only. (Chat with the assistant may happen in Arabic; that doesn't apply to anything committed to the repo.) `docs/PROJECT_VISION_ar.md` is a deliberate one-off exception (the owner's original vision doc, kept in Arabic); every other doc, including all module docs, must be English, professional, technical, and simple — written for a programmer who needs to read and modify the code, not a business audience.

## Repo layout

- `server/` — Node.js/Express/MongoDB backend (see `server/modules/<domain>/<entity>/` — each entity follows `model.js` + `service.js` + `controller.js` + `router.js` + `validation.js`, built on `server/utils/BaseService.js` / `server/utils/BaseController.js`).
- `app/` — frontend.
- `docs/` — project documentation. `docs/PROJECT_VISION_ar.md` is the architectural source of truth (Arabic, exception — see language policy above). Server-level technical docs and one doc per module are planned (English) — see "Documentation system" below.

## Documentation system

Two levels, English, technical and concise, aimed at a programmer picking up the code:

1. **Server-level doc** — [server/BACKEND_FOUNDATION.md](server/BACKEND_FOUNDATION.md). Covers the foundation layer: what changed in the 2026-07-11 review, why, how the request pipeline/`BaseService`/`BaseController`/RBAC/feature-toggle/multi-tenancy work now, and the mandatory checklist for building any new module on top of it. Read this before touching `server/`.
2. **Per-module doc** (one file per entity, e.g. `modules/hr/employee/EMPLOYEE.module.md` — already-existing examples to follow as the template): business purpose, schema field/relationship reference, endpoints with required permissions, non-CRUD business logic, related settings.

Per-module docs not yet written for most modules — build incrementally, matching the template, rather than inventing a new format per module.

## Foundation review (2026-07-11) — status

A full architectural review of the infrastructure layer (bootstrap, middlewares, `utils/BaseService.js`/`BaseController.js`, DB connection, RBAC, multi-tenancy, settings) was completed and the approved refactoring plan was implemented. Verified end-to-end: full server boot against a real MongoDB instance + smoke test of every mounted route group (all returned correct 401s, zero crashes).

**Resolved:**
1. ~~Broken `utils/AdvancedService.js` import (nonexistent file, used by ~82 files)~~ — fixed, all services import `utils/BaseService.js`.
2. ~~Request context contract bug~~ — `authenticate.js`/`.ts` now sets `req.user.brandId` / `req.user.branchId` / `req.user.userId` explicitly. Previously these were read everywhere (`BaseController`, most custom controllers) but never actually set, meaning `brandScoped` queries silently ignored the brand filter — **every list/read endpoint leaked data across all brands**. This was the most severe finding; it's fixed at the single source (`middlewares/authenticate.js`).
3. ~~RBAC not enforced~~ — `authorize(resource, action)` is now wired into every live router (~38 routers, ~350 call sites), in the order `authenticateToken → authorize → checkModuleEnabled → validate → controller`. Also fixed 3 routers (`brand`, `branch`, `branch-settings`) whose `authorize()` calls existed but used a broken single-argument signature (`authorize("brand:create")`) that would never match any permission — they were effectively locking out every user. `RESOURCE_ENUM` in `modules/iam/role/role.model.js` extended (additive only) to cover CRM, loyalty, seating, audit-log, brand-settings, account-balances, ledgers.
4. ~~No feature-toggle enforcement~~ — new `middlewares/checkModuleEnabled.js`, wired into every router group that maps to a `BrandSettings.modules.*` key. Fail-open by design (no BrandSettings doc, or module key absent → allowed) so no existing brand is affected until they explicitly configure settings. `organization/brand-settings` router (previously built but never mounted) is now live at `/organization/brand-settings`.
5. ~~No `branchScoped` option~~ — added to `BaseService` (opt-in, default `false`, fully backward compatible) and threaded through `BaseController` (`create/getAll/getOne/update/softDelete/restore/hardDelete/bulk*/count`). Also fixed two latent `BaseController` contract bugs found along the way: `hardDelete` never brand-scoped its delete (cross-tenant delete-by-ID was possible), and `bulkHardDelete` called `service.bulkHardDelete(ids)` with a raw array instead of the expected `{ids, brandId, branchId}` object (silently broken).
6. ~~DB connection race + unbounded retry~~ — `connectDB()` is now `await`ed before the app starts listening; retry uses capped exponential backoff (2s → 30s cap) instead of a flat 5s forever-loop; removed dead Mongoose 5 options.
7. ~~JS/TS duplicate infra files~~ — `utils/BaseService.ts`, `utils/pagination.ts`, `utils/joiFactory.ts` were unused, incomplete/incompatible reimplementations (confirmed zero consumers). Deleted rather than merged: TypeScript's `NodeNext` resolution treats a `.js` specifier inside a `.ts` file of the same basename as self-referential, so a thin re-export wrapper is not possible here without renaming — deletion was the safe option. `checkSubscription.ts` was left as-is (it's already the sole implementation; the `.js` sibling is fully commented out).

**Still open:**
8. Order → Invoice → Accounting → Inventory is not connected end-to-end — no code creates JournalEntry postings or deducts stock from invoices/orders yet.
9. JS↔TS migration strategy for the `modules/**` business layer (controllers/services/models/routers) is still undecided — that layer remains 100% JS by design for now.
10. Duplicate/legacy trees not yet resolved: `modules/setup/*` (legacy, mostly dead) vs `modules/system-setup/*` (live); `modules/audit-log/*` (live) vs `modules/system/audit-log/*` (abandoned scaffold).

**New pattern to follow for any new module going forward:** every router must chain `authenticateToken, authorize("<ResourceEnumValue>", "<action>"), checkModuleEnabled("<brandSettingsModuleKey>"), validate(schema), controller.method` — copy this order from any router under `modules/sales/`, `modules/accounting/`, etc.
