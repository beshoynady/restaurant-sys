# Backend Foundation — Technical Debt

Issues affecting shared infrastructure (`utils/BaseController.js`, `utils/BaseRepository.js`,
router conventions, `utils/joiFactory.js`, shared middlewares) discovered while implementing a
specific module, but out of scope to fix at that point — fixing shared infrastructure mid-rollout
of a domain (e.g. HR) risks destabilizing every other already-verified module. Tracked here instead
and fixed as a dedicated pass once the domain currently in progress is complete.

Do not fix these opportunistically inside module-specific work. Each entry states which module
first surfaced it, but the fix (when scheduled) must be verified against every consumer, not just
the module that found it.

---

## FT-001 — Router convention: a literal-path bulk route placed after `/:id` is unreachable

**Found while reviewing:** `hr/employee` (Employee module, post-implementation review).

**The bug:** In `employee.router.js`, `router.route("/:id").delete(...)` is registered before
`router.route("/bulk-delete").delete(...)`. Express matches router layers in registration order —
`/:id` matches any single path segment, including the literal string `"bulk-delete"`. Confirmed
empirically (inspected the compiled Express router stack directly): a `DELETE /bulk-delete`
request always matches the `/:id` layer first and is consumed by the single-item `hardDelete`
handler (which then fails with a 400 "Invalid resource ID" trying to treat `"bulk-delete"` as an
ObjectId) — the actual bulk-delete handler is **never reached**.

**Impact:** Any module whose router follows this same declaration order (`/:id` DELETE handler
registered before a literal `/bulk-delete` DELETE route) has a completely dead bulk-hard-delete
endpoint. `PATCH /bulk-soft-delete` and `PATCH /bulk-restore` are unaffected in modules that don't
also define a PATCH handler on `/:id` (Employee's `/:id` only has GET/PUT/DELETE) — but any module
that *did* add a PATCH handler on `/:id` would have the same collision for its bulk-PATCH routes
too. This needs a repo-wide grep across all routers once scheduled, not just a one-line reorder in
whichever module happens to be found broken.

**Recommended fix:** Either (a) register all literal-path routes (`/bulk-*`, `/count`, `/search`,
etc.) before `/:id` in every router — the convention `/count` and `/search` already correctly
follow in several modules — or (b) constrain `/:id`'s param pattern (e.g. `/:id([0-9a-fA-F]{24})`)
so it structurally cannot match a non-ObjectId literal path segment. (b) is more robust (survives
future literal routes being added in the wrong order by mistake) but is a wider behavioral change
worth its own review.

**Status:** Recorded, not fixed. Employee's own `/bulk-delete` route is currently broken as a
direct consequence — accepted as-is per explicit instruction not to fix Foundation issues mid-HR-rollout.

---

## FT-002 — `BaseController.count()` ignores every query filter

**Found while reviewing:** `hr/employee` (Employee module, post-implementation review).

**The bug:** `utils/BaseController.js`'s `count` method:
```js
count = asyncHandler(async (req, res) => {
  const { brandId, branchId } = req.user;
  const total = await this.service.count({ brandId, branchId });
  ...
});
```
never reads `req.query` — every filter a module's `query*Schema` validates for the `/count` route
(status, department, jobTitle, etc. in Employee's case) is silently dropped. `GET /count?status=active`
returns the total count of *all* records, not just active ones.

**Impact:** Every module mounting `GET /count` behind `BaseController.count()` (confirmed present in
Employee, Shift, and likely others following the same router template) makes a false promise in its
own documentation/route comments ("supports the same filters as the list endpoint"). Any dashboard
widget built against a filtered count is silently wrong, not erroring — the more dangerous kind of bug.

**Recommended fix:** `count()` should build the same `filters` extraction `getAll()` already does
(`{...req.query}` minus page/limit/search/includeDeleted/sort/select) and pass it through to
`this.service.count({brandId, branchId, filters})` — `BaseRepository.count()` already accepts a
`filters` option, so this is a `BaseController`-only change, not a `BaseRepository` change.

**Status:** Recorded, not fixed. Affects every module using the generic `count` — deferred until
the dedicated Foundation tech-debt pass.

---

## FT-003 — `sparse: true` on a compound unique index does not mean what it looks like it means

**Found while reviewing:** `hr/department` (confirmed and fixed there — `{brand, code}` with
`sparse: true` let two departments in the same brand with no `code` collide, since sparse on a
*compound* index only excludes a document missing **all** indexed fields, not just one; fixed there
with `partialFilterExpression: { code: { $exists: true, $type: "string" } }`).

**Wider impact — `organization/branch` confirmed and fixed; `organization/delivery-area` still open.**
The identical `{scope, code}` / `{scope, slug}` + `sparse: true` pattern was used this same session
for `organization/branch` (`{brand, code}`). This stopped being a theoretical concern while
implementing `hr/shift`: that module's own integration test needs two branches in one brand to
exist, and creating the second one hit exactly this bug live (`E11000 ... branches index:
brand_1_code_1 ... {brand: X, code: null}`). Fixed in the same pass as Shift (same
`partialFilterExpression` pattern, synced against the real dev database with explicit approval) —
this was a targeted, one-index fix, not a reopening of the Organization domain broadly.

`organization/delivery-area`'s equivalent indexes (`{branch, code}`, `{branch, slug}`) are **still
unverified/unfixed** — nothing in the HR rollout has exercised them yet. Still flagged here for the
eventual Foundation tech-debt pass, or fix opportunistically if an HR (or other domain) module's own
test happens to hit it first, same as what happened with Branch.
