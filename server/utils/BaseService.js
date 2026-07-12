/* -------------------------------------------------------------------------- */
/*                                BaseService                                 */
/* -------------------------------------------------------------------------- */
/*
 * Generic Mongoose data-access layer used by every module not yet migrated to
 * its own dedicated `<entity>.repository.ts` — CRUD operations, queries,
 * pagination, population, bulk operations, and transaction-session
 * *pass-through* (never the decision of when to use one).
 *
 * Self-contained plain JavaScript, on purpose: this used to extend a
 * `utils/BaseRepository.ts` class, but that `.ts` file was removed from the
 * project (see git history) and this project is staying on JavaScript for
 * now (TypeScript conversion deferred). Since this file is imported by
 * ~90 modules across the entire backend, it cannot depend on any `.ts`
 * source — the full CRUD engine lives directly here instead.
 */

import mongoose from "mongoose";
import throwError from "./throwError.js";

const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class BaseService {
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
}

export default BaseService;
