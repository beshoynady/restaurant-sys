import { AppError } from "../../utils/AppError.js";

/**
 * Advanced CRUD Service (Production Ready)
 */
class AdvancedService {
  constructor(model, options = {}) {
    this.model = model;

    this.brandScoped = options.brandScoped ?? true;
    this.softDelete = options.softDelete ?? true;
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

    if (this.softDelete) {
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
    const record = await this.model.findOne({
      _id: id,
      ...this._baseQuery(brandId, includeDeleted),
    });

    if (!record) throw new AppError("Record not found", 404);

    return record;
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
    if (exists) throw new AppError("Duplicate record", 409);
  }

  _validateLangFields(data, fieldsWithLang = [], lang) {
    if (!fieldsWithLang.length || !lang) return;

    fieldsWithLang.forEach((field) => {
      const val = data[field];

      if (!val || typeof val !== "object") {
        throw new AppError(`${field} must be multilingual object`, 400);
      }

      if (!val[lang]) {
        throw new AppError(`${field} must include language ${lang}`, 400);
      }
    });
  }

  // =========================
  // 🔹 CREATE
  // =========================

  async create({
    brandId,
    data,
    createdBy = null,
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

  async findAll({
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

  async findById(id, { brandId, populate = [], includeDeleted = false } = {}) {
    let query = this.model.findOne({
      _id: id,
      ...this._baseQuery(brandId, includeDeleted),
    });

    query = this._applyPopulate(query, populate);

    const record = await query.lean();

    if (!record) throw new AppError("Record not found", 404);

    return record;
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

    const record = await query.lean();

    if (!record) throw new AppError("Record not found", 404);

    return record;
  }

  // =========================
  // 🔹 UPDATE
  // =========================

  async update({
    id,
    brandId,
    data,
    updatedBy = null,
    uniqueFields = [],
  }) {
    await this._checkUnique(brandId, data, uniqueFields, id);

    const record = await this._findOrFail(id, brandId);

    Object.assign(record, data);

    if (updatedBy) record.updatedBy = updatedBy;

    await record.save();

    return record;
  }

  async findOneAndUpdate({ brandId, filter, data }) {
    const record = await this.model.findOneAndUpdate(
      {
        ...this._baseQuery(brandId),
        ...filter,
      },
      data,
      { new: true, runValidators: true }
    );

    if (!record) throw new AppError("Record not found", 404);

    return record;
  }

  async toggleStatus(id, brandId, userId) {
    const record = await this._findOrFail(id, brandId);

    if (!("isActive" in record.toObject())) {
      throw new AppError("Model does not support status toggle", 400);
    }

    record.isActive = !record.isActive;
    record.updatedBy = userId;

    await record.save();

    return record;
  }

  // =========================
  // 🔹 DELETE
  // =========================

  async softDelete(id, brandId, userId) {
    if (!this.softDelete) {
      throw new AppError("Soft delete disabled", 400);
    }

    const record = await this._findOrFail(id, brandId);

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = userId;

    if ("isActive" in record) record.isActive = false;

    await record.save();

    return record;
  }

  async restore(id, brandId, userId) {
    const record = await this._findOrFail(id, brandId, true);

    if (!record.isDeleted) {
      throw new AppError("Record is not deleted", 400);
    }

    record.isDeleted = false;
    record.deletedAt = null;
    record.deletedBy = null;

    if ("isActive" in record) record.isActive = true;

    record.updatedBy = userId;

    await record.save();

    return record;
  }

  async hardDelete(id, brandId) {
    const record = await this._findOrFail(id, brandId, true);
    await record.deleteOne();
    return true;
  }

  async bulkSoftDelete(ids = [], brandId, userId) {
    if (!ids.length) throw new AppError("IDs required", 400);

    const result = await this.model.updateMany(
      {
        _id: { $in: ids },
        ...this._baseQuery(brandId),
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      }
    );

    return result.modifiedCount;
  }

  async bulkHardDelete(ids = [], brandId) {
    if (!ids.length) throw new AppError("IDs required", 400);

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
}

export default AdvancedService;