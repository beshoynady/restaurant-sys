import mongoose from "mongoose";
import throwError from "./throwError.js";

/**
 * BaseService - Generic Service Layer for all modules
 * Features:
 * - Multi-tenant (brand scoped)
 * - Soft delete
 * - Pagination & filtering
 * - Search
 * - Populate
 * - Unique validation
 * - Transactions
 * - Clean architecture ready
 */
class BaseService {
  constructor(model, options = {}) {
    this.model = model;

    // 🔹 Config
    this.brandScoped = options.brandScoped ?? true;
    this.enableSoftDelete = options.softDelete ?? true;

    this.defaultPopulate = options.defaultPopulate ?? [];
    this.searchFields = options.searchFields ?? [];
    this.defaultSort = options.defaultSort ?? { createdAt: -1 };
  }

  // =========================
  // 🔹 Helpers
  // =========================

  _baseQuery(brandId, includeDeleted = false) {
    const query = {};

    if (this.brandScoped && brandId) query.brand = brandId;

    if (this.enableSoftDelete) {
      query.isDeleted = includeDeleted ? { $in: [true, false] } : false;
    }

    return query;
  }

  _applyPopulate(query, populate = []) {
    const list = [...this.defaultPopulate, ...populate];
    list.forEach((p) => (query = query.populate(p)));
    return query;
  }

  _buildSearch(search) {
    if (!search || !this.searchFields.length) return {};

    return {
      $or: this.searchFields.map((field) => ({
        [field]: { $regex: search, $options: "i" },
      })),
    };
  }

  async _findOrFail(id, brandId, includeDeleted = false) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw throwError("Invalid ID", 400);
    }

    const doc = await this.model.findOne({
      _id: id,
      ...this._baseQuery(brandId, includeDeleted),
    });

    if (!doc) throw throwError("Record not found", 404);

    return doc;
  }

  async _checkUnique(brandId, data, uniqueFields = [], excludeId = null) {
    if (!uniqueFields.length) return;

    const query = {};

    uniqueFields.forEach((field) => {
      if (data[field] !== undefined) query[field] = data[field];
    });

    if (!Object.keys(query).length) return;

    if (this.brandScoped && brandId) query.brand = brandId;
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await this.model.findOne(query);

    if (exists) throw throwError("Duplicate record", 409);
  }

  _validateLangFields(data, fields = [], lang) {
    if (!fields.length || !lang) return;

    fields.forEach((field) => {
      const val = data[field];

      if (!val || typeof val !== "object") {
        throw throwError(`${field} must be multilingual object`, 400);
      }

      if (!val[lang]) {
        throw throwError(`${field} must include language ${lang}`, 400);
      }
    });
  }

  // =========================
  // 🔹 CREATE
  // =========================

  async create({
    brandId,
    data,
    createdBy,
    uniqueFields = [],
    fieldsWithLang = [],
    lang,
  }) {
    await this._checkUnique(brandId, data, uniqueFields);
    this._validateLangFields(data, fieldsWithLang, lang);

    const payload = {
      ...data,
      ...(this.brandScoped && brandId && { brand: brandId }),
      ...(createdBy && { createdBy }),
    };

    return this.model.create(payload);
  }

  // =========================
  // 🔹 READ
  // =========================

  async getAll({
    brandId,
    filter = {},
    page = 1,
    limit = 10,
    sort,
    search,
    populate = [],
    includeDeleted = false,
  }) {
    const skip = (page - 1) * limit;

    const query = {
      ...this._baseQuery(brandId, includeDeleted),
      ...filter,
      ...this._buildSearch(search),
    };

    let mongooseQuery = this.model
      .find(query)
      .sort(sort || this.defaultSort)
      .skip(skip)
      .limit(limit);

    mongooseQuery = this._applyPopulate(mongooseQuery, populate);

    const [data, total] = await Promise.all([
      mongooseQuery.lean(),
      this.model.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById({ id, brandId, populate = [], includeDeleted = false }) {
    let query = this.model.findOne({
      _id: id,
      ...this._baseQuery(brandId, includeDeleted),
    });

    query = this._applyPopulate(query, populate);

    const doc = await query.lean();

    if (!doc) throw throwError("Record not found", 404);

    return doc;
  }

  async findOne({
    brandId,
    filter = {},
    populate = [],
    includeDeleted = false,
  }) {
    let query = this.model.findOne({
      ...this._baseQuery(brandId, includeDeleted),
      ...filter,
    });

    query = this._applyPopulate(query, populate);

    const doc = await query.lean();

    if (!doc) throw throwError("Record not found", 404);

    return doc;
  }

  // =========================
  // 🔹 UPDATE
  // =========================

  async update({ id, brandId, data, updatedBy, uniqueFields = [] }) {
    await this._checkUnique(brandId, data, uniqueFields, id);

    const updated = await this.model.findOneAndUpdate(
      {
        _id: id,
        ...this._baseQuery(brandId),
      },
      {
        $set: {
          ...data,
          ...(updatedBy && { updatedBy }),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updated) throw throwError("Record not found", 404);

    return updated;
  }

  async findOneAndUpdate({ brandId, filter, data, updatedBy }) {
    const updated = await this.model.findOneAndUpdate(
      {
        ...this._baseQuery(brandId),
        ...filter,
      },
      {
        $set: {
          ...data,
          ...(updatedBy && { updatedBy }),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updated) throw throwError("Record not found", 404);

    return updated;
  }

  async toggleStatus({ id, brandId, userId }) {
    const doc = await this._findOrFail(id, brandId);

    if (!("isActive" in doc.toObject())) {
      throw throwError("Model does not support status toggle", 400);
    }

    doc.isActive = !doc.isActive;
    doc.updatedBy = userId;

    await doc.save();

    return doc;
  }

  // =========================
  // 🔹 DELETE
  // =========================

  async softDelete(id, brandId, userId) {
    if (!this.enableSoftDelete) {
      throw throwError("Soft delete disabled", 400);
    }

    const doc = await this._findOrFail(id, brandId);

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.deletedBy = userId;

    if ("isActive" in doc) doc.isActive = false;

    await doc.save();

    return doc;
  }

  async restore(id, brandId, userId) {
    const doc = await this._findOrFail(id, brandId, true);

    if (!doc.isDeleted) {
      throw throwError("Record is not deleted", 400);
    }

    doc.isDeleted = false;
    doc.deletedAt = null;
    doc.deletedBy = null;

    if ("isActive" in doc) doc.isActive = true;

    doc.updatedBy = userId;

    await doc.save();

    return doc;
  }

  async hardDelete(id, brandId) {
    const doc = await this._findOrFail(id, brandId, true);
    await doc.deleteOne();
    return true;
  }

  async bulkSoftDelete(ids = [], brandId, userId) {
    if (!ids.length) throw throwError("IDs required", 400);

    const result = await this.model.updateMany(
      {
        _id: { $in: ids },
        ...this._baseQuery(brandId),
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    );

    return result.modifiedCount;
  }

  async bulkHardDelete(ids = [], brandId) {
    if (!ids.length) throw throwError("IDs required", 400);

    const result = await this.model.deleteMany({
      _id: { $in: ids },
      ...this._baseQuery(brandId, true),
    });

    return result.deletedCount;
  }

  // =========================
  // 🔹 UTILITIES
  // =========================

  async count(brandId, filter = {}, includeDeleted = false) {
    return this.model.countDocuments({
      ...this._baseQuery(brandId, includeDeleted),
      ...filter,
    });
  }

  async exists(brandId, filter = {}) {
    const doc = await this.model
      .findOne({
        ...this._baseQuery(brandId),
        ...filter,
      })
      .select("_id")
      .lean();

    return !!doc;
  }

  async aggregate(pipeline = [], brandId, includeDeleted = false) {
    const baseMatch = this._baseQuery(brandId, includeDeleted);
    return this.model.aggregate([{ $match: baseMatch }, ...pipeline]);
  }

  async transaction(fn) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default BaseService;
