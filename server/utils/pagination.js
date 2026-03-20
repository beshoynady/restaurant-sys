/**
 * Pagination Service (Controller-based)
 */
const paginate = async (model, queryParams = {}, options = {}) => {
  // ==============================
  // 1. Extract params
  // ==============================
  const page = Math.max(parseInt(queryParams.page) || 1, 1);
  const limit = Math.min(parseInt(queryParams.limit) || 10, 100);
  const skip = (page - 1) * limit;

  // ==============================
  // 2. Filtering
  // ==============================
  const queryObj = { ...queryParams };

  const excludeFields = ["page", "limit", "sort", "fields", "search"];
  excludeFields.forEach((field) => delete queryObj[field]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  let mongoQuery = model.find(JSON.parse(queryStr));

  // ==============================
  // 3. Search
  // ==============================
  if (queryParams.search) {
    mongoQuery = mongoQuery.find({
      $or: [
        { name: { $regex: queryParams.search, $options: "i" } },
        { description: { $regex: queryParams.search, $options: "i" } },
      ],
    });
  }

  // ==============================
  // 4. Sorting
  // ==============================
  if (queryParams.sort) {
    const sortBy = queryParams.sort.split(",").join(" ");
    mongoQuery = mongoQuery.sort(sortBy);
  } else {
    mongoQuery = mongoQuery.sort("-createdAt");
  }

  // ==============================
  // 5. Field Limiting
  // ==============================
  if (queryParams.fields) {
    const fields = queryParams.fields.split(",").join(" ");
    mongoQuery = mongoQuery.select(fields);
  }

  // ==============================
  // 6. Custom Options (IMPORTANT)
  // ==============================
  if (options.populate) {
    mongoQuery = mongoQuery.populate(options.populate);
  }

  if (options.select) {
    mongoQuery = mongoQuery.select(options.select);
  }

  if (options.filter) {
    mongoQuery = mongoQuery.find(options.filter);
  }

  // ==============================
  // 7. Total Count
  // ==============================
  const total = await model.countDocuments(mongoQuery.getFilter());

  // ==============================
  // 8. Pagination
  // ==============================
  mongoQuery = mongoQuery.skip(skip).limit(limit);

  const data = await mongoQuery;

  return {
    success: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    results: data.length,
    data,
  };
};

export default paginate;