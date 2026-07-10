# Employee (HR) Module Documentation

## Overview
This module manages **Employee** resources inside the HR domain. It is **brand-scoped** and supports **soft delete**.

Employee core fields include:
- Personal info (multilang maps): `firstName`, `middleName`, `lastName`
- Contact: `phone`, `whatsapp`, `email`
- Employment: `department`, `jobTitle`, `shift`, `hireDate`, `contractType`, etc.
- HR status: `status`, `terminationDate`, `isVerified`, `hasAccount`
- Documents and images

> **Multilang note (EN/AR):**
> `firstName`, `middleName`, `lastName`, `brand`, and other localized fields are stored as a **Map** with languages (e.g. `{ EN, AR }`).
> When searching by name using `search` query param, use `search` text, and the backend will match supported fields (e.g. `firstName.EN`, `firstName.AR`).

---

## Base Endpoints

All requests require authentication (`authenticateToken`) and are brand-scoped via `req.user.brandId`.

### Create Employee
**POST** `/api/v1/hr/employee`

**Body (JSON)**
```json
{
  "branches": ["<branchId>", "..."],
  "defaultBranch": "<branchId>",
  "firstName": { "EN": "John", "AR": "جون" },
  "middleName": { "EN": "A", "AR": "أ" },
  "lastName": { "EN": "Doe", "AR": "دو" },
  "gender": "male",
  "dateOfBirth": "1995-01-01",
  "nationalID": "1234567890",
  "department": "<departmentId>",
  "jobTitle": "<jobTitleId>",
  "shift": "<shiftId>",
  "phone": "+201234567890"
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
**GET** `/api/v1/hr/employee`

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
- `status` (string)
- `workMode` (string)
- `contractType` (string)
- `hasAccount` (boolean)
- `isVerified` (boolean)
- `isOwner` (boolean)

**Example**
```http
GET /api/v1/hr/employee?department=...&shift=...&status=active&search=John&page=1&limit=20
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
**GET** `/api/v1/hr/employee/:id`

**Response**
```json
{ "success": true, "data": { } }
```

---

### Update Employee
**PUT** `/api/v1/hr/employee/:id`

**Body**
- Partial update allowed (uses update schema)

**Response**
```json
{ "success": true, "message": "Updated successfully", "data": { } }
```

---

## Delete / Restore (Soft Delete)

### Soft Delete
**PATCH** `/api/v1/hr/employee/soft-delete/:id`

### Restore
**PATCH** `/api/v1/hr/employee/restore/:id`

**Response**
```json
{ "success": true, "message": "Deleted successfully", "data": { } }
```

---

## Bulk Operations

### Bulk Soft Delete
**PATCH** `/api/v1/hr/employee/bulk-soft-delete`
**Body**
```json
{ "ids": ["<id1>", "<id2>"] }
```

### Bulk Hard Delete (permanent)
**DELETE** `/api/v1/hr/employee/bulk-delete`
**Body**
```json
{ "ids": ["<id1>", "<id2>"] }
```

### Bulk Restore
> (If you use bulk restore, ensure route exists in your router; BaseController supports it.)

---

## Count Endpoint
### Get Count
**GET** `/api/v1/hr/employee/count`

**Query Params**
- Same filters as list endpoint (filters + includeDeleted when enabled)

**Response**
```json
{ "success": true, "data": { "total": 12 } }
```

---

## Implementation Notes
- Service is based on `BaseService`:
  - Brand scoping: `brandScoped: true`
  - Soft delete: `enableSoftDelete: true`
  - Default populate fields are applied on listing/getting
- Searching:
  - Search is performed using MongoDB regex on configured `searchableFields`.
  - For multilang maps, searchable fields should target language keys (e.g. `firstName.EN`).
