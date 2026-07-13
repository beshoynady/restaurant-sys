# Employee (HR) Module Documentation

## Overview
This module manages **Employee** resources inside the HR domain. It is **brand-scoped** and supports **soft delete**.

Employee core fields include:
- Personal info (multilang maps): `firstName`, `middleName` (optional), `lastName`
- Contact: `phone`, `whatsapp`, `email`, `address` (multilang map of nested address objects)
- Employment: `department`, `jobTitle`, `shift`, `reportsTo`, `hireDate`, `contractType`, etc.
- HR status: `status`, `terminationDate`, `isVerified`, `hasAccount`
- Documents and images

> **`hasAccount` note:** currently a plain manually-managed boolean — nothing
> in this module or `iam/user-account` sets it automatically today. TODO:
> automatically synchronized with IAM/UserAccount during future IAM-HR
> integration.

> **Multilang note:**
> `firstName`, `middleName`, `lastName`, `address` and other localized fields are stored as a **Map** keyed by any of the platform's supported languages (`utils/languages.js` — not just EN/AR).
> When searching by name using `search` query param, the backend matches every supported-language key of every searchable field (e.g. `firstName.EN`, `firstName.FR`, ...), not a hardcoded subset.

## Business rules
- **JobTitle/Department consistency**: an Employee's `jobTitle` must belong to the same `department` as the Employee itself. Enforced in `employee.service.js` (`beforeCreate`/`beforeUpdate`) — violating this returns `400 "Job title does not belong to the selected department"`. On update, this is only re-checked when both `jobTitle` and `department` are present in the same payload.
- **Minimum age**: `dateOfBirth` must be at least 14 years in the past (a general sanity floor, not a specific jurisdiction's labor-law minimum — real per-country rules belong in `employee-settings` once that policy surface is built).
- **`usesCustomLeavePolicy`** (HR_TECHNICAL_DEBT.md HD-003, fixed at `hr/employee-settings`' own turn — module 8): if this flag is falsy, `annualLeaveDays`/`emergencyLeaveDays`/`sickLeaveDays` are filled from `EmployeeSettings.leavePolicy` at creation time for any of the three the caller didn't explicitly supply (`employee-settings.service.js#resolveLeavePolicyDefaults`, called from this module's own `beforeCreate` via `applyToNewEmployee`). Fail-open: no `EmployeeSettings` document yet → Employee's own schema defaults apply, unchanged. They remain a point-in-time snapshot, not a live link — no automatic re-sync exists yet if brand policy changes after the employee was created (see `EMPLOYEE_SETTINGS.module.md` §12).
- **`employeeCode` is now optional in the create request body** (still `required` on the Mongoose schema itself): if omitted and the brand's `EmployeeSettings.employeeCode.autoGenerate` is enabled, one is generated server-side (`employee-settings.service.js#generateEmployeeCode`, also called from this module's `beforeCreate`) before the Mongoose-level `required` check ever runs. A brand with auto-generation disabled (or no `EmployeeSettings` document) still effectively requires the client to supply it.
- **`requiredFields` policy**: if the brand's `EmployeeSettings.requiredFields` marks `email`/`address`/`profileImage`/`emergencyContact` as required (none of these are `required` on the Employee schema itself), creation is rejected with `400 '"<field>" is required by this brand's employee policy'` when that field is missing. `nationalID` is checked too for completeness even though it's already schema-required. See `EMPLOYEE_SETTINGS.module.md` §5.

---

## Base Endpoints

All requests require authentication (`authenticateToken`) and are brand-scoped via `req.user.brandId`. Base path: **`/api/v1/hr/employees`** (plural — confirmed against `router/v1/index.router.js`; this doc previously said `/employee`, singular, which does not match the actual mount).

### Create Employee
**POST** `/api/v1/hr/employees`

**Body (JSON)**
```json
{
  "branches": ["<branchId>", "..."],
  "defaultBranch": "<branchId>",
  "firstName": { "EN": "John", "AR": "جون" },
  "lastName": { "EN": "Doe", "AR": "دو" },
  "gender": "male",
  "dateOfBirth": "1995-01-01",
  "nationalID": "1234567890",
  "department": "<departmentId>",
  "jobTitle": "<jobTitleId>",
  "shift": "<shiftId>",
  "reportsTo": "<employeeId>",
  "phone": "+201234567890",
  "address": { "EN": { "country": "Egypt", "city": "Cairo" } }
  /* plus remaining model fields */
}
```

**Response**
- `201 Created`
```json
{
  "success": true,
  "message": "Created successfully",
  "data": { }
}
```

---

### Get Employees (with pagination, filters, search)
**GET** `/api/v1/hr/employees`

**Query Params**
- `page` (default: `1`)
- `limit` (default: `10`)
- `search` (text search - matches configured searchable fields)
- `includeDeleted` (boolean; default: false)
- `sort` (string)
- `select` (string)

**HR Filters (supported by validation)**
- `department` (ObjectId)
- `jobTitle` (ObjectId)
- `shift` (ObjectId)
- `reportsTo` (ObjectId)
- `status` (string)
- `workMode` (string)
- `contractType` (string)
- `hasAccount` (boolean)
- `isVerified` (boolean)
- `isOwner` (boolean)

**Example**
```http
GET /api/v1/hr/employees?department=...&shift=...&status=active&search=John&page=1&limit=20
```

**Response**
```json
{
  "success": true,
  "data": [ { }, { } ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 34,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### Get Employee by ID
**GET** `/api/v1/hr/employees/:id`

**Response**
```json
{ "success": true, "data": { } }
```

---

### Update Employee
**PUT** `/api/v1/hr/employees/:id`

**Body**
- Partial update allowed (uses update schema)

**Response**
```json
{ "success": true, "message": "Updated successfully", "data": { } }
```

---

## Delete / Restore (Soft Delete)

### Soft Delete
**PATCH** `/api/v1/hr/employees/soft-delete/:id`

### Restore
**PATCH** `/api/v1/hr/employees/restore/:id`

**Response**
```json
{ "success": true, "message": "Deleted successfully", "data": { } }
```

---

## Bulk Operations

### Bulk Soft Delete
**PATCH** `/api/v1/hr/employees/bulk-soft-delete`
**Body**
```json
{ "ids": ["<id1>", "<id2>"] }
```

### Bulk Hard Delete (permanent)
**DELETE** `/api/v1/hr/employees/bulk-delete`
**Body**
```json
{ "ids": ["<id1>", "<id2>"] }
```

### Bulk Restore
**PATCH** `/api/v1/hr/employees/bulk-restore`
**Body**
```json
{ "ids": ["<id1>", "<id2>"] }
```

---

## Count Endpoint
### Get Count
**GET** `/api/v1/hr/employees/count`

**Query Params**
- Same filters as list endpoint (filters + includeDeleted when enabled)

**Response**
```json
{ "success": true, "data": { "total": 12 } }
```

---

## Implementation Notes
- Repository Pattern (`employee.repository.js` extends `BaseRepository`; `employee.service.js` extends the repository and adds business rules) — previously this module instantiated `BaseRepository` directly with no repository file at all.
  - Brand scoping: `brandScoped: true`
  - Soft delete: `enableSoftDelete: true`
  - Default populate fields are applied on listing/getting (includes `reportsTo` now)
- Searching:
  - Search is performed using MongoDB regex (escaped — safe from regex-injection) on configured `searchableFields`.
  - For multilang maps, every `SUPPORTED_LANGUAGES` key is searched (`utils/multilingualSearch.js`), not a hardcoded EN/AR subset.
