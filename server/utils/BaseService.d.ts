// Type declarations for utils/BaseService.js.
//
// 2026-07-12: BaseService.js is now a thin subclass of BaseRepository (see
// that file's header comment and BACKEND_FOUNDATION.md §4.3) — its type
// declaration follows suit rather than re-declaring every method signature
// again. This is a `.d.ts` file, not a `.ts` file, for the same reason as
// before: it carries no runtime code, so it does not hit the
// self-referential-import bug (a `.ts` and a `.js` file of the identical
// basename both existing) described in BACKEND_FOUNDATION.md §1/§5.

import BaseRepository, {
  type BaseRepositoryOptions,
  type PaginationResult,
  type GetAllOptions,
  type FindByIdOptions,
  type CreateOptions,
  type UpdateOptions,
  type ScopedIdOptions,
  type SoftDeleteOptions,
  type BulkOptions,
  type CountOptions,
} from "./BaseRepository.js";
import type { Document } from "mongoose";

// Re-exported for existing modules that import these type names from
// "./BaseService.js" — unchanged public type surface.
export type {
  BaseRepositoryOptions as BaseServiceOptions,
  PaginationResult,
  GetAllOptions,
  FindByIdOptions,
  CreateOptions,
  UpdateOptions,
  ScopedIdOptions,
  SoftDeleteOptions,
  BulkOptions,
  CountOptions,
};

export default class BaseService<T extends Document = Document> extends BaseRepository<T> {}
