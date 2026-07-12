/* -------------------------------------------------------------------------- */
/*                               BaseRepository                               */
/* -------------------------------------------------------------------------- */
/*
 * Generic Mongoose data-access layer used by every module's <entity>.repository.js
 * (or, for modules not yet migrated to the Repository Pattern, directly by
 * <entity>.service.js) — CRUD operations, queries, pagination, population,
 * aggregation, transactions, and bulk operations.
 *
 * Renamed from BaseService.js (2026-07-12) for clarity: this class owns 100%
 * of database access per BACKEND_FOUNDATION.md §4.3's Repository/Service
 * split, so "Repository" is the accurate name — "Service" was left over from
 * before that split existed. This is a rename only, not a re-architecture:
 * the class stays a single, self-contained file with no other class to
 * extend. Do NOT confuse this with the old `utils/BaseRepository.ts`, a
 * *different*, separate class that `BaseService.js` used to extend — that
 * file was deleted in an earlier cleanup pass and broke ~90 modules that
 * depended on it transitively (see REPOSITORY_PATTERN_MIGRATION_PLAN.md).
 * This file is that incident's fix, kept in place under its new name: one
 * plain-JS class, no `.ts` dependency, safely importable from any `.js` or
 * `.ts` module under this project's `tsx` runtime.
 */

import mongoose from "mongoose";
import throwError from "./throwError.js";

const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class BaseRepository {
  constructor(model, options = {}) {
    const {
      brandScoped = true,
      // Opt-in only: most modules apply branch isolation manually today.
      // Defaulting to false keeps every existing module's behavior
      // unchanged; set `branchScoped: true` for models that must never
      // leak data across branches within the same brand.
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

  validateObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throwError("Invalid resource ID", 400);
    }
  }

  buildBaseQuery({ brandId = null, branchId = null, includeDeleted = false, filters = {} } = {}) {
    const query = { ...filters };

    if (this.brandScoped && brandId) {
      query.brand = brandId;
    }

    if (this.branchScoped && branchId) {
      query.branch = branchId;
    }

    if (this.enableSoftDelete) {
      query.isDeleted = includeDeleted ? { $in: [true, false] } : false;
    }

    return query;
  }

  applySearch(query, search) {
    if (!search || !this.searchableFields.length) {
      return query;
    }

    const keyword = escapeRegex(search.trim());

    query.$or = this.searchableFields.map((field) => ({
      [field]: {
        $regex: keyword,
        $options: "i",
      },
    }));

    return query;
  }

  sanitizeUpdatePayload(data = {}) {
    const payload = { ...data };

    ["_id", "__v", "brand", "createdAt", "createdBy", "deletedAt", "deletedBy", "isDeleted"].forEach(
      (field) => delete payload[field],
    );

    return payload;
  }

  applyPopulate(query, populate = []) {
    const finalPopulate = populate.length > 0 ? populate : this.defaultPopulate;

    for (const item of finalPopulate) {
      query = query.populate(item);
    }

    return query;
  }

  /* -------------------------------------------------------------------------- */
  /*                   Lifecycle hooks (Service extension points)               */
  /* -------------------------------------------------------------------------- */
  /* Template-method hooks a Service subclass overrides to inject business    */
  /* rules into the generic create/update flow — not business logic itself.   */

  async beforeCreate(data) {
    return data;
  }

  async afterCreate(document) {
    return document;
  }

  async beforeUpdate(data) {
    return data;
  }

  async afterUpdate(document) {
    return document;
  }

  async beforeDelete(document) {
    return document;
  }

  async afterDelete(document) {
    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Create                                    */
  /* -------------------------------------------------------------------------- */

  async create(opts) {
    const { brandId, branchId = null, data, createdBy = null, session = null } = opts;
    let payload = { ...data };

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

  async getAll(opts = {}) {
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

    let query = this.buildBaseQuery({ brandId, branchId, includeDeleted, filters });

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
      data,
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
  /*                                  Find By Id                                */
  /* -------------------------------------------------------------------------- */

  async findById(opts) {
    const { id, brandId, branchId = null, select = null, populate = [], includeDeleted = false } = opts;
    this.validateObjectId(id);

    let query = this.model.findOne({
      _id: id,
      ...this.buildBaseQuery({ brandId, branchId, includeDeleted }),
    });

    if (select) {
      query = query.select(select);
    }

    query = this.applyPopulate(query, populate);

    const document = await query.lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Update                                   */
  /* -------------------------------------------------------------------------- */

  async update(opts) {
    const { id, brandId, branchId = null, data, updatedBy = null, session = null } = opts;
    this.validateObjectId(id);

    let payload = this.sanitizeUpdatePayload(data);

    if (updatedBy) {
      payload.updatedBy = updatedBy;
    }

    payload = await this.beforeUpdate(payload);

    const document = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.buildBaseQuery({ brandId, branchId }) },
        { $set: payload },
        { new: true, runValidators: true, session: session ?? undefined },
      )
      .lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return this.afterUpdate(document);
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Find One                                  */
  /* -------------------------------------------------------------------------- */

  async findOne(opts) {
    const { brandId, branchId = null, filters = {}, select = null, populate = [], includeDeleted = false } = opts;

    let query = this.model.findOne(this.buildBaseQuery({ brandId, branchId, includeDeleted, filters }));

    if (select) {
      query = query.select(select);
    }

    query = this.applyPopulate(query, populate);

    return query.lean();
  }

  /* -------------------------------------------------------------------------- */
  /*                                Soft Delete                                 */
  /* -------------------------------------------------------------------------- */

  async softDelete(opts) {
    const { id, brandId, branchId = null, deletedBy = null, session = null } = opts;
    this.validateObjectId(id);

    const document = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.buildBaseQuery({ brandId, branchId }) },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
        { new: true, session: session ?? undefined },
      )
      .lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Restore                                   */
  /* -------------------------------------------------------------------------- */

  async restore(opts) {
    const { id, brandId, branchId = null, session = null } = opts;
    this.validateObjectId(id);

    const document = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.buildBaseQuery({ brandId, branchId, includeDeleted: true }) },
        { $set: { isDeleted: false, deletedAt: null, deletedBy: null } },
        { new: true, session: session ?? undefined },
      )
      .lean();

    if (!document) {
      throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Hard Delete                                 */
  /* -------------------------------------------------------------------------- */

  // Loosely defined on purpose: several modules legitimately override this to
  // return the affected document(s) instead of a raw Mongo delete result.
  async hardDelete(opts) {
    const { id, brandId = null, branchId = null, session = null } = opts;
    this.validateObjectId(id);

    return this.model
      .deleteOne({
        _id: id,
        ...(this.brandScoped && brandId ? { brand: brandId } : {}),
        ...(this.branchScoped && branchId ? { branch: branchId } : {}),
      })
      .session(session ?? null);
  }

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Soft Delete                               */
  /* -------------------------------------------------------------------------- */

  async bulkSoftDelete(opts) {
    const { ids, brandId, branchId = null, deletedBy = null } = opts;

    return this.model.updateMany(
      { _id: { $in: ids }, ...this.buildBaseQuery({ brandId, branchId }) },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               Bulk Restore                                 */
  /* -------------------------------------------------------------------------- */

  async bulkRestore(opts) {
    const { ids, brandId, branchId = null } = opts;

    return this.model.updateMany(
      { _id: { $in: ids }, ...this.buildBaseQuery({ brandId, branchId, includeDeleted: true }) },
      { $set: { isDeleted: false, deletedAt: null, deletedBy: null } },
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Hard Delete                               */
  /* -------------------------------------------------------------------------- */

  async bulkHardDelete(opts) {
    const { ids, brandId = null, branchId = null } = opts;

    return this.model.deleteMany({
      _id: { $in: ids },
      ...(this.brandScoped && brandId ? { brand: brandId } : {}),
      ...(this.branchScoped && branchId ? { branch: branchId } : {}),
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Exists                                   */
  /* -------------------------------------------------------------------------- */

  async exists(opts) {
    const { id, brandId, branchId = null } = opts;

    return Boolean(
      await this.model.exists({ _id: id, ...this.buildBaseQuery({ brandId, branchId }) }),
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                    Count                                   */
  /* -------------------------------------------------------------------------- */

  async count(opts) {
    const { brandId, branchId = null, filters = {}, includeDeleted = false } = opts;

    return this.model.countDocuments(this.buildBaseQuery({ brandId, branchId, includeDeleted, filters }));
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Distinct                                  */
  /* -------------------------------------------------------------------------- */

  async distinct(field, opts = {}) {
    const { brandId = null, branchId = null, filters = {}, includeDeleted = false } = opts;

    return this.model.distinct(field, this.buildBaseQuery({ brandId, branchId, includeDeleted, filters }));
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Upsert                                    */
  /* -------------------------------------------------------------------------- */

  // Scoped by the same {brandId, branchId, filters} shape as findOne — the caller
  // supplies the match criteria via `filters`, not just an `_id`, since "find this
  // exact document or create it" is inherently a filter-based operation.
  async upsert(opts) {
    const {
      brandId = null,
      branchId = null,
      filters = {},
      data,
      createdBy = null,
      session = null,
    } = opts;

    let payload = { ...data };
    if (createdBy) {
      payload.updatedBy = createdBy;
    }

    const setOnInsert = {};
    if (this.brandScoped && brandId) setOnInsert.brand = brandId;
    if (this.branchScoped && branchId) setOnInsert.branch = branchId;
    if (createdBy) setOnInsert.createdBy = createdBy;

    return this.model
      .findOneAndUpdate(
        this.buildBaseQuery({ brandId, branchId, filters }),
        { $set: payload, $setOnInsert: setOnInsert },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true, session: session ?? undefined },
      )
      .lean();
  }

  /* -------------------------------------------------------------------------- */
  /*                                 Aggregate                                  */
  /* -------------------------------------------------------------------------- */

  // Raw aggregation escape hatch for reporting/analytics pipelines that don't fit
  // the find()-based methods above. Tenant scoping is the caller's responsibility
  // (via an explicit $match stage) since aggregation pipelines are inherently
  // custom shapes — buildBaseQuery's filter merging doesn't generalize to them.
  async aggregate(pipeline, opts = {}) {
    const { session = null } = opts;

    let query = this.model.aggregate(pipeline);
    if (session) {
      query = query.session(session);
    }

    return query;
  }

  /* -------------------------------------------------------------------------- */
  /*                          Transactions (mechanics only)                     */
  /* -------------------------------------------------------------------------- */
  /* Database-level transaction primitives only. The DECISION of when to open a */
  /* transaction, what to write inside it, and how to react to failure belongs  */
  /* to the service layer — see journal-entry.service.js for the reference use. */

  async startSession() {
    return mongoose.startSession();
  }

  // Runs `fn(session)` inside a started transaction, committing on success and
  // aborting on any thrown error; always ends the session. `fn` performs its own
  // writes via the passed-in session — this only owns the start/commit/abort/end
  // lifecycle, not what happens inside it.
  async withTransaction(fn) {
    const session = await this.startSession();

    try {
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default BaseRepository;
