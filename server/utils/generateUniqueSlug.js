// utils/generateUniqueSlug.js
import slugify from "slugify";

const generateUniqueSlug = async ({
  name = {},
  model,
  brandId,
  field = "slug",
  excludeId = null,
  includeDeleted = false,
}) => {
  let source =
    name.EN ||
    Object.entries(name).find(([k]) => k !== "AR")?.[1] ||
    name.AR ||
    "item";

  let baseSlug = slugify(source, {
    lower: true,
    strict: true,
  });

  const query = {
    ...(brandId && { brand: brandId }),
    ...(excludeId && { _id: { $ne: excludeId } }),
    ...(includeDeleted ? {} : { isDeleted: false }),
  };

  const existing = await model
    .find({ ...query, [field]: new RegExp(`^${baseSlug}`) })
    .select(field)
    .lean();

  if (!existing.length) return baseSlug;

  const set = new Set(existing.map((x) => x[field]));

  let i = 1;
  let slug = baseSlug;

  while (set.has(slug)) {
    slug = `${baseSlug}-${i++}`;
  }

  return slug;
};

export default generateUniqueSlug;
