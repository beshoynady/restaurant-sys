# Module Template

The literal starting point for every new module in this ERP, per `ERP_DEVELOPMENT_STANDARD.md`
(read that document first — this template is its Phase 2 output, not a standalone reference).

## How to use this

1. Copy this whole folder to `modules/<domain>/<entity>/` (flat — no subfolders unless the entity
   genuinely has independent business sub-domains; see `ERP_DEVELOPMENT_STANDARD.md` §2 and
   `server/DOMAIN_ENGINE_ARCHITECTURE_MIGRATION_PLAN.md` before ever creating one).
2. Rename every file's `entity`/`Entity`/`ENTITY` placeholder to your real entity name
   (`kebab-case` for filenames, `PascalCase` for the class/model name, `camelCase` for variables).
3. **Read the model-first policy before touching anything else**: fully read and validate every
   *existing* model this new module will reference (not just the one you're creating) before writing
   a line of service logic against it.
4. Work through the files in this order — it mirrors how every Financial Domain module was actually
   built, not an arbitrary convention:
   1. `entity.model.js` — the schema. Get this right first; everything else depends on it.
   2. Decide: repository pattern or plain `AdvancedService`? (`ERP_DEVELOPMENT_STANDARD.md` §2).
      Delete `entity.repository.js` if you don't need it, and change `entity.service.js` to extend
      `AdvancedService` (`utils/BaseRepository.js`) directly instead.
   3. `entity.service.js` — business verbs, transitions, accounting integration if any.
   4. `entity.controller.js` — thin, `sendResponse()`, `req.user` only.
   5. `entity.validation.js` — Joi schemas matching the model exactly.
   6. `entity.router.js` — the full middleware chain, static routes before `/:id`.
   7. Add the resource to `RESOURCE_ENUM` (`modules/iam/role/role.model.js`) — additive only.
   8. Mount the router in `router/v1/index.router.js`.
   9. Boot-check (a temp `.boot-check.mjs` importing every new file + the full router, run with
      `npx tsx`, deleted after).
   10. Write the integration test — copy `entity-engine.test.ts.template` into
       `tests/integration/<entity>-engine.test.ts`, rename, fill in.
   11. Run the new test file alone until green.
   12. Run the full suite in the background — confirm zero regressions before writing docs.
   13. Write `ENTITY.module.md` — copy `ENTITY.module.md.template`, fill in every section, name
       every real gap explicitly (see the Standard §7's "non-negotiable content" rule).
5. Delete this `README.md` from the copied module folder — it's a template instruction file, not
   module documentation.

## Files in this template

| File | Purpose |
|---|---|
| `entity.model.js` | Mongoose schema — required/derived/immutable field patterns annotated inline |
| `entity.repository.js` | Repository-pattern skeleton — delete if not needed (see step 2 above) |
| `entity.service.js` | Service layer skeleton — both repository-pattern and plain-`AdvancedService` variants shown, delete the one you don't use |
| `entity.controller.js` | Thin controller skeleton |
| `entity.validation.js` | Joi validation skeleton |
| `entity.router.js` | Router skeleton with the full mandatory middleware chain |
| `ENTITY.module.md.template` | The 14-section documentation template |
| `entity-engine.test.ts.template` | Integration test skeleton matching this codebase's actual test conventions |
