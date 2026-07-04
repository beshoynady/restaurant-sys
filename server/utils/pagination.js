// utils/pagination.js

/* A generic pagination utility for Mongoose models
  * Usage:  
    const { data, pagination } = await paginate(Model, queryParams, options);
  * queryParams: { page, limit, sort, fields, search, ...filters }
  * options: { populate: [{ path: "field", select: "name" }] }
*/

const paginate = async (model, queryParams = {}, options = {}) => {
  const page = Math.max(parseInt(queryParams.page) || 1, 1);
  const limit = Math.min(parseInt(queryParams.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const queryObj = { ...queryParams };
  ["page", "limit", "sort", "fields", "search"].forEach(
    (f) => delete queryObj[f],
  );

  let mongoQuery = model.find(queryObj);

  // search
  if (queryParams.search) {
    mongoQuery = mongoQuery.find({
      $or: [
        { name: { $regex: queryParams.search, $options: "i" } },
        { description: { $regex: queryParams.search, $options: "i" } },
      ],
    });
  }

  // sort
  mongoQuery = queryParams.sort
    ? mongoQuery.sort(queryParams.sort.split(",").join(" "))
    : mongoQuery.sort("-createdAt");

  // fields
  if (queryParams.fields) {
    mongoQuery = mongoQuery.select(queryParams.fields.split(",").join(" "));
  }

  if (options.populate) mongoQuery = mongoQuery.populate(options.populate);

  const total = await model.countDocuments(mongoQuery.getFilter());

  const data = await mongoQuery.skip(skip).limit(limit);

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
