# Shift (HR) Module Documentation

## Overview
This module manages **Shift** resources used for HR scheduling and operational planning inside restaurants.
It is:
- **Brand-scoped** (each operation is limited to `req.user.brandId`)
- **Soft delete enabled** (supports delete/restore)
- Supports **pagination/search/filtering** via `BaseController` + `BaseService`

## Notes (EN) - Multilang Map
`name` is stored as a **Map** with languages (e.g. `{ EN, AR }`).
When searching using the `search` query param, use language-specific dot-notation like:
- `name.EN`
- `name.AR`

---

## Endpoints

All endpoints require authentication (`authenticateToken`).

### Create Shift
**POST** `/api/v1/hr/shift`

**Body**
```json
{
  "branch": "<branchId>",
  "name": { "EN": "Morning Shift", "AR": "وردية الصباح" },
  "code": "MOR",
  "shiftType": "morning",
  "startMinutes": 480,
  "endMinutes": 960,
  "status": "active",
  "notes": "Optional notes"
}
```

---

### Get All Shifts (List / Search / Filters)
**GET** `/api/v1/hr/shift`

**Query Params**
- `page` (default: `1`)
- `limit` (default: `10`)
- `search` (string - regex search on service `searchableFields`)
- `includeDeleted` (boolean)
- `sort` (string)
- `select` (string)

#### Supported HR Filters (important)
- `branch` (ObjectId as string)
- `code` (string)
- `status` (string: draft/active/inactive/archived)
- `shiftType` (morning/afternoon/night/custom/flexible/other)

**Example**
```http
GET /api/v1/hr/shift?branch=<branchId>&status=active&shiftType=morning&search=MOR
```

---

### Count Shifts (same filters as list)
**GET** `/api/v1/hr/shift/count`

**Query Params**
Same filters as `GET /api/v1/hr/shift`.

**Response**
```json
{
  "success": true,
  "data": { "total": 12 }
}
```

---

### Get One Shift
**GET** `/api/v1/hr/shift/:id`

**Response**
```json
{ "success": true, "data": { } }
```

---

### Update Shift
**PUT** `/api/v1/hr/shift/:id`

**Body**
- Partial update supported by Joi update schema.

---

## Soft Delete / Restore

### Soft Delete
**PATCH** `/api/v1/hr/shift/soft-delete/:id`

### Restore
**PATCH** `/api/v1/hr/shift/restore/:id`

---

## Bulk Operations

### Bulk Soft Delete
**PATCH** `/api/v1/hr/shift/bulk-soft-delete`
```json
{ "ids": ["<id1>", "<id2>"] }
```

### Bulk Hard Delete
**DELETE** `/api/v1/hr/shift/bulk-delete`
```json
{ "ids": ["<id1>", "<id2>"] }
```

---

## Implementation Notes (EN)
This module uses the generic patterns already present in the repository:
- `shift.service.js` is a `BaseService` instance with:
  - `brandScoped: true`
  - `enableSoftDelete: true`
  - `searchableFields` enabled for `search`
- `shift.validation.js` extends `querySchema()` with filter keys so strict Joi validation won’t reject filters.
