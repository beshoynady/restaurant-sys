// Type declarations for utils/BaseService.js.
//
// This is a `.d.ts` file, not a `.ts` file — it carries no runtime code, so
// it does NOT hit the self-referential-import bug described in
// BACKEND_FOUNDATION.md §1/§5 (that bug was specifically about a `.ts` file
// and a `.js` file of the identical basename both existing; a `.d.ts`
// sibling providing types for a `.js` implementation is the standard,
// supported pattern and creates no such collision).
//
// Kept intentionally close to the real runtime behavior in BaseService.js —
// update both together if the implementation changes.

import { Model, Document, FilterQuery } from "mongoose";

export interface BaseServiceOptions {
  brandScoped?: boolean;
  branchScoped?: boolean;
  enableSoftDelete?: boolean;
  defaultSort?: Record<string, 1 | -1>;
  searchableFields?: string[];
  defaultPopulate?: string[];
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GetAllOptions {
  brandId?: string | null;
  branchId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, unknown>;
  sort?: Record<string, 1 | -1> | null;
  select?: string | null;
  populate?: string[];
  includeDeleted?: boolean;
}

export interface FindByIdOptions {
  id: string;
  brandId?: string | null;
  branchId?: string | null;
  select?: string | null;
  populate?: string[];
  includeDeleted?: boolean;
}

export interface CreateOptions<TInput = Record<string, unknown>> {
  brandId?: string | null;
  branchId?: string | null;
  data: TInput;
  createdBy?: string | null;
  session?: unknown;
}

export interface UpdateOptions<TInput = Record<string, unknown>> {
  id: string;
  brandId?: string | null;
  branchId?: string | null;
  data: TInput;
  updatedBy?: string | null;
  session?: unknown;
}

export interface ScopedIdOptions {
  id: string;
  brandId?: string | null;
  branchId?: string | null;
  session?: unknown;
}

export interface SoftDeleteOptions extends ScopedIdOptions {
  deletedBy?: string | null;
}

export interface BulkOptions {
  ids: string[];
  brandId?: string | null;
  branchId?: string | null;
  deletedBy?: string | null;
}

export interface CountOptions {
  brandId?: string | null;
  branchId?: string | null;
  filters?: Record<string, unknown>;
  includeDeleted?: boolean;
}

export default class BaseService<T extends Document = Document> {
  model: Model<T>;
  brandScoped: boolean;
  branchScoped: boolean;
  enableSoftDelete: boolean;
  defaultSort: Record<string, 1 | -1>;
  searchableFields: string[];
  defaultPopulate: string[];

  constructor(model: Model<T>, options?: BaseServiceOptions);

  validateObjectId(id: string): void;
  buildBaseQuery(opts?: {
    brandId?: string | null;
    branchId?: string | null;
    includeDeleted?: boolean;
    filters?: Record<string, unknown>;
  }): FilterQuery<T>;
  applySearch(query: FilterQuery<T>, search: string): FilterQuery<T>;
  sanitizeUpdatePayload(data?: Record<string, unknown>): Record<string, unknown>;
  applyPopulate<Q>(query: Q, populate?: string[]): Q;

  beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  afterCreate(document: T): Promise<T>;
  beforeUpdate(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  afterUpdate(document: T): Promise<T>;
  beforeDelete(document: T): Promise<T>;
  afterDelete(document: T): Promise<T>;

  create<TInput = Record<string, unknown>>(opts: CreateOptions<TInput>): Promise<T>;
  getAll(opts?: GetAllOptions): Promise<PaginationResult<T>>;
  findById(opts: FindByIdOptions): Promise<T>;
  update<TInput = Record<string, unknown>>(opts: UpdateOptions<TInput>): Promise<T>;
  softDelete(opts: SoftDeleteOptions): Promise<T>;
  restore(opts: ScopedIdOptions): Promise<T>;
  // Loosely typed on purpose: the real BaseService.js returns a raw Mongo
  // delete/update result, but several modules legitimately override these
  // to return the affected document(s) instead (see branch.service.ts) —
  // typing this narrowly would make every such override a type error.
  hardDelete(opts: ScopedIdOptions): Promise<unknown>;
  bulkSoftDelete(opts: BulkOptions): Promise<unknown>;
  bulkRestore(opts: BulkOptions): Promise<unknown>;
  bulkHardDelete(opts: BulkOptions): Promise<unknown>;
  exists(opts: { id: string; brandId?: string | null; branchId?: string | null }): Promise<boolean>;
  count(opts: CountOptions): Promise<number>;
}
