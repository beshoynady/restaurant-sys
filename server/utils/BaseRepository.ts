/* -------------------------------------------------------------------------- */
/*                               BaseRepository                               */
/* -------------------------------------------------------------------------- */
/*
 * Generic Mongoose data-access layer — the real implementation of everything
 * a "repository" is allowed to contain per BACKEND_FOUNDATION.md §4.3: CRUD
 * operations, queries, pagination, population, bulk operations, and
 * transaction-session *pass-through* (never the decision of when to use one).
 *
 * This is what used to be `BaseService.js`'s entire implementation. Moved
 * here verbatim (same behavior, same method signatures) as part of the
 * 2026-07-12 Repository Pattern adoption — see REPOSITORY_PATTERN_MIGRATION_PLAN.md.
 * `BaseService` (utils/BaseService.js) now extends this class as a thin,
 * behavior-preserving shim, purely so the ~85 modules not yet migrated to a
 * dedicated `repository.ts` keep working unchanged via `new BaseService(Model, {...})`.
 *
 * New/migrated modules extend `BaseRepository` directly in their
 * `<entity>.repository.ts`, and `<entity>.service.ts` extends that concrete
 * repository class (see journal-entry/journal-line for the reference
 * implementation). The lifecycle hooks below (`beforeCreate`/`afterCreate`/
 * etc.) are the one deliberate exception to "repository contains no business
 * logic": they are template-method extension points a Service subclass
 * overrides to inject business rules into the generic `create`/`update`
 * flow — the hook *call site* lives here (that's plumbing), but the hook
 * *implementation* a real module relies on always lives in the Service
 * subclass that overrides it. This is the existing, unchanged mechanism
 * every module in this codebase's business customization already depends on
 * (e.g. OrderService/InvoiceService override `beforeCreate` for DB-007's
 * atomic number generation) — preserved exactly as-is, not reinvented.
 *
 * Pure TypeScript, no `.js` sibling: unlike BaseService, BaseRepository has
 * no legacy JS consumers to support, so it doesn't need the `.js`+`.d.ts`
 * split — see BACKEND_FOUNDATION.md §5.3 for why that split exists at all.
 */

import mongoose, { type Document, type FilterQuery, type Model } from "mongoose";
import throwErrorJs from "./throwError.js";

const throwError = throwErrorJs as (message: string, statusCode?: number) => never;

const escapeRegex = (text = ""): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface BaseRepositoryOptions {
  brandScoped?: boolean;
  // Opt-in only: most modules apply branch isolation manually today.
  // Defaulting to false keeps every existing module's behavior unchanged;
  // set `branchScoped: true` for models that must never leak data across
  // branches within the same brand.
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
  session?: mongoose.ClientSession | null;
}

export interface UpdateOptions<TInput = Record<string, unknown>> {
  id: string;
  brandId?: string | null;
  branchId?: string | null;
  data: TInput;
  updatedBy?: string | null;
  session?: mongoose.ClientSession | null;
}

export interface ScopedIdOptions {
  id: string;
  brandId?: string | null;
  branchId?: string | null;
  session?: mongoose.ClientSession | null;
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

export default class BaseRepository<T extends Document = Document> {
  model: Model<T>;
  brandScoped: boolean;
  branchScoped: boolean;
  enableSoftDelete: boolean;
  defaultSort: Record<string, 1 | -1>;
  searchableFields: string[];
  defaultPopulate: string[];

  constructor(model: Model<T>, options: BaseRepositoryOptions = {}) {
    const {
      brandScoped = true,
      branchScoped = false,
      enableSoftDelete = true,
      defaultSort = { createdAt: -1 },
      searchableFields = [],
      defaultPopulate = [],
    } = options;

    this.model = model;

    this.brandScoped = brandScoped;
    this.branchScoped = branchScoped;
    this.enableSoftDelete = enableSoftDelete;

    this.defaultSort = defaultSort;
    this.searchableFields = searchableFields;
    this.defaultPopulate = defaultPopulate;
  }

  /* -------------------------------------------------------------------------- */
  /*                               Helper Methods                               */
  /* -------------------------------------------------------------------------- */

  validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throwError("Invalid resource ID", 400);
    }
  }

  buildBaseQuery({
    brandId = null,
    branchId = null,
    includeDeleted = false,
    filters = {},
  }: {
    brandId?: string | null;
    branchId?: string | null;
    includeDeleted?: boolean;
    filters?: Record<string, unknown>;
  } = {}): FilterQuery<T> {
    const query: Record<string, unknown> = { ...filters };

    if (this.brandScoped && brandId) {
      query.brand = brandId;
    }

    if (this.branchScoped && branchId) {
      query.branch = branchId;
    }

    if (this.enableSoftDelete) {
      query.isDeleted = includeDeleted ? { $in: [true, false] } : false;
    }

    return query as FilterQuery<T>;
  }

  applySearch(query: FilterQuery<T>, search: string): FilterQuery<T> {
    if (!search || !this.searchableFields.length) {
      return query;
    }

    const keyword = escapeRegex(search.trim());

    (query as Record<string, unknown>).$or = this.searchableFields.map((field) => ({
      [field]: {
        $regex: keyword,
        $options: "i",
      },
    }));

    return query;
  }

  sanitizeUpdatePayload(data: Record<string, unknown> = {}): Record<string, unknown> {
    const payload = { ...data };

    ["_id", "__v", "brand", "createdAt", "createdBy", "deletedAt", "deletedBy", "isDeleted"].forEach(
      (field) => delete payload[field],
    );

    return payload;
  }

  applyPopulate<Q extends { populate: (path: string) => Q }>(query: Q, populate: string[] = []): Q {
    const finalPopulate = populate.length > 0 ? populate : this.defaultPopulate;

    for (const item of finalPopulate) {
      query = query.populate(item);
    }

    return query;
  }

  /* -------------------------------------------------------------------------- */
  /*                   Lifecycle hooks (Service extension points)               */
  /* -------------------------------------------------------------------------- */
  /* See the class-level comment: these are template-method hooks a Service   */
  /* subclass overrides to inject business logic — not business logic itself. */

  async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return data;
  }

  async afterCreate(document: T): Promise<T> {
    return document;
  }

  async beforeUpdate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return data;
  }

  async afterUpdate(document: T): Promise<T> {
    return document;
  }

  async beforeDelete(document: T): Promise<T> {
    return document;
  }

  async afterDelete(document: T): Promise<T> {
    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Create                                    */
  /* -------------------------------------------------------------------------- */

  async create<TInput = Record<string, unknown>>(opts: CreateOptions<TInput>): Promise<T> {
    const { brandId, branchId = null, data, createdBy = null, session = null } = opts;
    let payload: Record<string, unknown> = { ...(data as Record<string, unknown>) };

    if (this.brandScoped) {
      payload.brand = brandId;
    }

    if (this.branchScoped && branchId) {
      payload.branch = branchId;
    }

    if (createdBy) {
      payload.createdBy = createdBy;
    }

    payload = await this.beforeCreate(payload);

    const [document] = await this.model.create([payload], { session: session ?? undefined });

    return this.afterCreate(document);
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Get All                                  */
  /* -------------------------------------------------------------------------- */

  async getAll(opts: GetAllOptions = {}): Promise<PaginationResult<T>> {
    const {
      brandId,
      branchId = null,
      search = "",
      filters = {},
      sort = null,
      select = null,
      populate = [],
      includeDeleted = false,
    } = opts;

    const page = Math.max(Number(opts.page) || 1, 1);
    const limit = Math.min(Math.max(Number(opts.limit) || 10, 1), 100);

    const skip = (page - 1) * limit;

    let query = this.buildBaseQuery({
      brandId,
      branchId,
      includeDeleted,
      filters,
    });

    query = this.applySearch(query, search);

    let mongooseQuery = this.model.find(query);

    if (select) {
      mongooseQuery = mongooseQuery.select(select);
    }

    mongooseQuery = this.applyPopulate(mongooseQuery, populate);

    mongooseQuery = mongooseQuery
      .sort(sort || this.defaultSort)
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      mongooseQuery.lean(),
      this.model.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as T[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Find One                                  */
  /* -------------------------------------------------------------------------- */

  async findById(opts: FindByIdOptions): Promise<T> {
    const { id, brandId, branchId = null, select = null, populate = [], includeDeleted = false } = opts;
    this.validateObjectId(id);

    // `.select()` narrows the Mongoose Query's projected-field type, which doesn't reassign
    // cleanly to a `let`-bound variable typed from the pre-projection query — loosened to `any`
    // for this local chain only (same tradeoff BaseRepository already makes elsewhere for
    // Mongoose query-builder interop).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = this.model.findOne({
      _id: id,
      ...this.buildBaseQuery({ brandId, branchId, includeDeleted }),
    } as FilterQuery<T>);

    if (select) {
      query = query.select(select);
    }

    query = this.applyPopulate(query, populate);

    const document = await query.lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return document as unknown as T;
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Update                                   */
  /* -------------------------------------------------------------------------- */

  async update<TInput = Record<string, unknown>>(opts: UpdateOptions<TInput>): Promise<T> {
    const { id, brandId, branchId = null, data, updatedBy = null, session = null } = opts;
    this.validateObjectId(id);

    let payload = this.sanitizeUpdatePayload(data as Record<string, unknown>);

    if (updatedBy) {
      payload.updatedBy = updatedBy;
    }

    payload = await this.beforeUpdate(payload);

    const document = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.buildBaseQuery({ brandId, branchId }) } as FilterQuery<T>,
        { $set: payload },
        { new: true, runValidators: true, session: session ?? undefined },
      )
      .lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return this.afterUpdate(document as unknown as T);
  }

  /* -------------------------------------------------------------------------- */
  /*                                Soft Delete                                 */
  /* -------------------------------------------------------------------------- */

  async softDelete(opts: SoftDeleteOptions): Promise<T> {
    const { id, brandId, branchId = null, deletedBy = null, session = null } = opts;
    this.validateObjectId(id);

    const document = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.buildBaseQuery({ brandId, branchId }) } as FilterQuery<T>,
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
        { new: true, session: session ?? undefined },
      )
      .lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return document as unknown as T;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Restore                                   */
  /* -------------------------------------------------------------------------- */

  async restore(opts: ScopedIdOptions): Promise<T> {
    const { id, brandId, branchId = null, session = null } = opts;
    this.validateObjectId(id);

    const document = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.buildBaseQuery({ brandId, branchId, includeDeleted: true }) } as FilterQuery<T>,
        { $set: { isDeleted: false, deletedAt: null, deletedBy: null } },
        { new: true, session: session ?? undefined },
      )
      .lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return document as unknown as T;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Hard Delete                                 */
  /* -------------------------------------------------------------------------- */

  // Loosely typed on purpose: several modules legitimately override this to
  // return the affected document(s) instead of a raw Mongo delete result.
  async hardDelete(opts: ScopedIdOptions): Promise<unknown> {
    const { id, brandId = null, branchId = null, session = null } = opts;
    this.validateObjectId(id);

    return this.model
      .deleteOne({
        _id: id,
        ...(this.brandScoped && brandId ? { brand: brandId } : {}),
        ...(this.branchScoped && branchId ? { branch: branchId } : {}),
      } as FilterQuery<T>)
      .session(session ?? null);
  }

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Soft Delete                               */
  /* -------------------------------------------------------------------------- */

  async bulkSoftDelete(opts: BulkOptions): Promise<unknown> {
    const { ids, brandId, branchId = null, deletedBy = null } = opts;

    return this.model.updateMany(
      { _id: { $in: ids }, ...this.buildBaseQuery({ brandId, branchId }) } as FilterQuery<T>,
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               Bulk Restore                                 */
  /* -------------------------------------------------------------------------- */

  async bulkRestore(opts: BulkOptions): Promise<unknown> {
    const { ids, brandId, branchId = null } = opts;

    return this.model.updateMany(
      {
        _id: { $in: ids },
        ...this.buildBaseQuery({ brandId, branchId, includeDeleted: true }),
      } as FilterQuery<T>,
      { $set: { isDeleted: false, deletedAt: null, deletedBy: null } },
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Hard Delete                               */
  /* -------------------------------------------------------------------------- */

  async bulkHardDelete(opts: BulkOptions): Promise<unknown> {
    const { ids, brandId = null, branchId = null } = opts;

    return this.model.deleteMany({
      _id: { $in: ids },
      ...(this.brandScoped && brandId ? { brand: brandId } : {}),
      ...(this.branchScoped && branchId ? { branch: branchId } : {}),
    } as FilterQuery<T>);
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Exists                                   */
  /* -------------------------------------------------------------------------- */

  async exists(opts: { id: string; brandId?: string | null; branchId?: string | null }): Promise<boolean> {
    const { id, brandId, branchId = null } = opts;

    return Boolean(
      await this.model.exists({
        _id: id,
        ...this.buildBaseQuery({ brandId, branchId }),
      } as FilterQuery<T>),
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                    Count                                   */
  /* -------------------------------------------------------------------------- */

  async count(opts: CountOptions): Promise<number> {
    const { brandId, branchId = null, filters = {}, includeDeleted = false } = opts;

    return this.model.countDocuments(
      this.buildBaseQuery({ brandId, branchId, includeDeleted, filters }),
    );
  }
}
