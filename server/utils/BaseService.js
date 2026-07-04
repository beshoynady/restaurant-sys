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

class BaseService {
  constructor(
    model,
    {
      brandScoped = true,
      enableSoftDelete = true,
      defaultSort = { createdAt: -1 },
      searchableFields = [],
      defaultPopulate = [],
    } = {},
  ) {
    this.model = model;

    this.brandScoped = brandScoped;
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
    includeDeleted = false,
    filters = {},
  } = {}) {
    const query = { ...filters };

    if (this.brandScoped && brandId) {
      query.brand = brandId;
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

    query.$or = this.searchableFields.map((field) => ({
      [field]: {
        $regex: search,
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

    delete payload.createdAt;
    delete payload.createdBy;

    delete payload.deletedAt;
    delete payload.deletedBy;
    delete payload.isDeleted;

    return payload;
  }

  /**
   * Apply populate options.
   */
  applyPopulate(query, populate = []) {
    const finalPopulate = populate.length > 0 ? populate : this.defaultPopulate;

    finalPopulate.forEach((item) => {
      query.populate(item);
    });

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

  /* -------------------------------------------------------------------------- */
  /*                                  Create                                    */
  /* -------------------------------------------------------------------------- */

  async create({ brandId, data, createdBy = null, session = null }) {
    let payload = { ...data };

    if (this.brandScoped) {
      payload.brand = brandId;
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
    page = 1,
    limit = 10,
    search = "",
    filters = {},
    sort = null,
    select = null,
    populate = [],
    includeDeleted = false,
  } = {}) {
    const skip = (page - 1) * limit;

    let query = this.buildBaseQuery({
      brandId,
      includeDeleted,
      filters,
    });

    query = this.applySearch(query, search);

    let mongooseQuery = this.model
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort(sort || this.defaultSort);

    if (select) {
      mongooseQuery.select(select);
    }

    mongooseQuery = this.applyPopulate(mongooseQuery, populate);

    const [data, total] = await Promise.all([
      mongooseQuery,
      this.model.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
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
    select = null,
    populate = [],
    includeDeleted = false,
  }) {
    this.validateObjectId(id);

    let query = this.model.findOne({
      _id: id,
      ...this.buildBaseQuery({
        brandId,
        includeDeleted,
      }),
    });

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

  async update({ id, brandId, data, updatedBy = null, session = null }) {
    this.validateObjectId(id);

    let payload = this.sanitizeUpdatePayload(data);

    if (updatedBy) {
      payload.updatedBy = updatedBy;
    }

    payload = await this.beforeUpdate(payload);

    const document = await this.model.findOneAndUpdate(
      {
        _id: id,
        ...this.buildBaseQuery({
          brandId,
        }),
      },
      {
        $set: payload,
      },
      {
        new: true,
        session,
        runValidators: true,
      },
    );

    if (!document) {
      throw throwError("Resource not found", 404);
    }

    return this.afterUpdate(document);
  }

  /* -------------------------------------------------------------------------- */
  /*                                Soft Delete                                 */
  /* -------------------------------------------------------------------------- */

  async softDelete({ id, brandId, deletedBy = null, session = null }) {
    this.validateObjectId(id);

    const document = await this.model.findOneAndUpdate(
      {
        _id: id,
        ...this.buildBaseQuery({
          brandId,
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
    );

    if (!document) {
      throw throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Restore                                   */
  /* -------------------------------------------------------------------------- */

  async restore({ id, brandId, session = null }) {
    this.validateObjectId(id);

    const document = await this.model.findOneAndUpdate(
      {
        _id: id,
        ...this.buildBaseQuery({
          brandId,
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
    );

    if (!document) {
      throw throwError("Resource not found", 404);
    }

    return document;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Hard Delete                                 */
  /* -------------------------------------------------------------------------- */

  async hardDelete({ id, session = null }) {
    this.validateObjectId(id);

    return this.model.deleteOne({ _id: id }, { session });
  }

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Soft Delete                               */
  /* -------------------------------------------------------------------------- */

  async bulkSoftDelete({ ids, brandId, deletedBy = null }) {
    return this.model.updateMany(
      {
        _id: { $in: ids },
        ...this.buildBaseQuery({
          brandId,
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

  async bulkRestore({ ids, brandId }) {
    return this.model.updateMany(
      {
        _id: { $in: ids },
        ...this.buildBaseQuery({
          brandId,
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

  async bulkHardDelete(ids) {
    return this.model.deleteMany({
      _id: { $in: ids },
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Exists                                   */
  /* -------------------------------------------------------------------------- */

  async exists({ id, brandId }) {
    return this.model.exists({
      _id: id,
      ...this.buildBaseQuery({
        brandId,
      }),
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                    Count                                   */
  /* -------------------------------------------------------------------------- */

  async count({ brandId, filters = {} }) {
    return this.model.countDocuments(
      this.buildBaseQuery({
        brandId,
        filters,
      }),
    );
  }
}

export default BaseService;
