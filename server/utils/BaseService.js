/* -------------------------------------------------------------------------- */
/*                                BaseService                                 */
/* -------------------------------------------------------------------------- */
/*
 * Generic service layer for all Mongoose models.
 *
 * Features:
 * - CRUD operations
 * - Brand scoping
 * - Soft delete
 * - Search
 * - Filtering
 * - Pagination
 * - Sorting
 * - Populate
 * - Field selection
 * - Bulk operations
 * - Transaction support
 * - Audit fields support
 * - Extensible lifecycle hooks
 */

import mongoose from "mongoose";
import throwError from "./throwError.js";

const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class BaseService {
  constructor(
    model,
    {
      brandScoped = true,
      // Opt-in only: most modules apply branch isolation manually today.
      // Defaulting to false keeps every existing module's behavior unchanged;
      // set `branchScoped: true` for models that must never leak data across
      // branches within the same brand.
      branchScoped = false,
      enableSoftDelete = true,
      defaultSort = { createdAt: -1 },
      searchableFields = [],
      defaultPopulate = [],
    } = {},
  ) {
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

  /**
   * Validate MongoDB ObjectId.
   */
  validateObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw throwError("Invalid resource ID", 400);
    }
  }

  /**
   * Generate base query.
   */
  buildBaseQuery({
    brandId = null,
    branchId = null,
    includeDeleted = false,
    filters = {},
  } = {}) {
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

  /**
   * Apply search conditions.
   */
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

  /**
   * Remove protected fields from update payload.
   */
  sanitizeUpdatePayload(data = {}) {
    const payload = { ...data };

    [
      "_id",
      "__v",

      "brand",

      "createdAt",
      "createdBy",

      "deletedAt",
      "deletedBy",
      "isDeleted",
    ].forEach((field) => delete payload[field]);

    return payload;
  }

  /**
   * Apply populate options.
   */
  applyPopulate(query, populate = []) {
    const finalPopulate = populate.length > 0 ? populate : this.defaultPopulate;

    for (const item of finalPopulate) {
      query.populate(item);
    }

    return query;
  }

  /**
   * Lifecycle hooks.
   */
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

  async create({ brandId, branchId = null, data, createdBy = null, session = null }) {
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

    const [document] = await this.model.create([payload], { session });

    return this.afterCreate(document);
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Get All                                  */
  /* -------------------------------------------------------------------------- */

  async getAll({
    brandId,
    branchId = null,
    page = 1,
    limit = 10,
    search = "",
    filters = {},
    sort = null,
    select = null,
    populate = [],
    includeDeleted = false,
  } = {}) {
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

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
      .limit(limit)
      .lean();

    const [data, total] = await Promise.all([
      mongooseQuery,
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
  /*                                  Find One                                  */
  /* -------------------------------------------------------------------------- */

  async findById({
    id,
    brandId,
    branchId = null,
    select = null,
    populate = [],
    includeDeleted = false,
  }) {
    this.validateObjectId(id);

    let query = this.model
      .findOne({
        _id: id,
        ...this.buildBaseQuery({
          brandId,
          branchId,
          includeDeleted,
        }),
      })
      .lean();

    if (select) {
      query.select(select);
    }

    query = this.applyPopulate(query, populate);

    const document = await query;

    if (!document) {
      throw throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Update                                   */
  /* -------------------------------------------------------------------------- */

  async update({ id, brandId, branchId = null, data, updatedBy = null, session = null }) {
    this.validateObjectId(id);

    let payload = this.sanitizeUpdatePayload(data);

    if (updatedBy) {
      payload.updatedBy = updatedBy;
    }

    payload = await this.beforeUpdate(payload);

    const document = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          ...this.buildBaseQuery({
            brandId,
            branchId,
          }),
        },
        {
          $set: payload,
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      )
      .lean();

    if (!document) {
      throw throwError("Resource not found", 404);
    }

    return this.afterUpdate(document);
  }

  /* -------------------------------------------------------------------------- */
  /*                                Soft Delete                                 */
  /* -------------------------------------------------------------------------- */

  async softDelete({ id, brandId, branchId = null, deletedBy = null, session = null }) {
    this.validateObjectId(id);

    const document = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          ...this.buildBaseQuery({
            brandId,
            branchId,
          }),
        },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
          },
        },
        {
          new: true,
          session,
        },
      )
      .lean();

    if (!document) {
      throw throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Restore                                   */
  /* -------------------------------------------------------------------------- */

  async restore({ id, brandId, branchId = null, session = null }) {
    this.validateObjectId(id);

    const document = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          ...this.buildBaseQuery({
            brandId,
            branchId,
            includeDeleted: true,
          }),
        },
        {
          $set: {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
          },
        },
        {
          new: true,
          session,
        },
      )
      .lean();

    if (!document) {
      throw throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Hard Delete                                 */
  /* -------------------------------------------------------------------------- */

  async hardDelete({ id, brandId = null, branchId = null, session = null }) {
    this.validateObjectId(id);

    return this.model
      .deleteOne({
        _id: id,
        ...(this.brandScoped && brandId ? { brand: brandId } : {}),
        ...(this.branchScoped && branchId ? { branch: branchId } : {}),
      })
      .session(session);
  }

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Soft Delete                               */
  /* -------------------------------------------------------------------------- */

  async bulkSoftDelete({ ids, brandId, branchId = null, deletedBy = null }) {
    return this.model.updateMany(
      {
        _id: { $in: ids },
        ...this.buildBaseQuery({
          brandId,
          branchId,
        }),
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
      },
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               Bulk Restore                                 */
  /* -------------------------------------------------------------------------- */

  async bulkRestore({ ids, brandId, branchId = null }) {
    return this.model.updateMany(
      {
        _id: { $in: ids },
        ...this.buildBaseQuery({
          brandId,
          branchId,
          includeDeleted: true,
        }),
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
      },
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Hard Delete                               */
  /* -------------------------------------------------------------------------- */

  async bulkHardDelete({ ids, brandId = null, branchId = null }) {
    return this.model.deleteMany({
      _id: { $in: ids },
      ...(this.brandScoped && brandId ? { brand: brandId } : {}),
      ...(this.branchScoped && branchId ? { branch: branchId } : {}),
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Exists                                   */
  /* -------------------------------------------------------------------------- */

  async exists({ id, brandId, branchId = null }) {
    return this.model.exists({
      _id: id,
      ...this.buildBaseQuery({
        brandId,
        branchId,
      }),
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                    Count                                   */
  /* -------------------------------------------------------------------------- */

  async count({ brandId, branchId = null, filters = {}, includeDeleted = false }) {
    return this.model.countDocuments(
      this.buildBaseQuery({
        brandId,
        branchId,
        includeDeleted,
        filters,
      }),
    );
  }
}

export default BaseService;
