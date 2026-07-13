# Department (HR) Module Documentation

## Overview
Organizational department (kitchen, service, management, ...) within a brand, optionally scoped to
specific branches, with an optional hierarchical `parentDepartment`. Brand-scoped, soft-delete
enabled.

## Business rules
- **No circular hierarchy**: a department cannot be set as its own parent, and setting
  `parentDepartment` cannot create a cycle through an intermediate ancestor (e.g. A → B → A).
  Enforced in `department.service.js`.
- **Cannot delete a department with active employees**: both soft-delete and hard-delete are
  blocked with `400` if any non-deleted `Employee` still has this department assigned
  (`employeeService.count({filters: {department}})`, delegated through the HR domain's Employee
  service rather than querying the Employee model directly).
- **`{brand, code}` uniqueness**: `code` is unique per brand only when actually set. Previously used
  a naive `sparse: true` compound index, which does not behave as "sparse" for a compound index in
  MongoDB (only excludes a document missing *all* indexed fields) — two departments in the same
  brand with no `code` collided. Fixed with a `partialFilterExpression` that only indexes documents
  where `code` is an actual string.

## Integration with the rest of HR
- `Employee.department` → this model (required). `Employee.jobTitle`'s own `department` must match
  (enforced in `employee.service.js`, not here — see `HR_TECHNICAL_DEBT.md`).
- `JobTitle.department` → this model (required).
- Referenced by nothing outside HR/Organization (`brand`, `branches`).

## Base Endpoints

Base path: `/api/v1/hr/departments` (confirm against `router/v1/index.router.js` before assuming —
several HR modules' own docs previously stated the wrong, singular path).

Standard CRUD + soft-delete/restore + bulk-soft-delete/bulk-hard-delete, following the same
BaseController conventions as every other HR module (see `EMPLOYEE.module.md` for the full
request/response shape reference — identical here).

**Known issue (Foundation, not Department-specific — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is currently unreachable — it is shadowed by the `/:id` DELETE route
registered earlier in `department.router.js`, and any `DELETE /bulk-delete` request is consumed by
the single-item `hardDelete` handler instead. Not fixed as part of this module's rollout (Foundation
issue, fixed in a dedicated pass after HR is complete).

**Query filters**: `classification`, `parentDepartment`, `isActive` (in addition to the generic
page/limit/search/includeDeleted/sort/select).

## Implementation Notes
- Repository Pattern (`department.repository.js` extends `BaseRepository`; `department.service.js`
  extends the repository and adds the business rules above) — previously this module instantiated
  `BaseRepository` directly with no repository file, and the service passed the wrong option key
  names (`softDelete`/`searchFields` instead of `enableSoftDelete`/`searchableFields`), which
  silently disabled search entirely.
- Search now covers `code` plus every `SUPPORTED_LANGUAGES` key of `name` (`utils/multilingualSearch.js`).
