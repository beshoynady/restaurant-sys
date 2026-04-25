// utils/generateUniqueSlug.js

import slugify from "slugify";

/**
 * Generate UNIQUE slug for ANY model
 */
const generateUniqueSlug = async ({
  name = {},
  model,
  brandId,
  field = "slug",
  excludeId = null,
  includeDeleted = false,
}) => {
  // -----------------------------
  // 1. Choose best language
  // -----------------------------
  let source = null;

  if (name.EN) {
    source = name.EN;
  } else {
    const nonArabic = Object.entries(name).find(
      ([key, value]) => key !== "AR" && value
    );

    source = nonArabic?.[1] || name.AR;
  }

  if (!source) source = "item";

  // -----------------------------
  // 2. Generate base slug
  // -----------------------------
  let baseSlug = slugify(source, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!baseSlug) {
    baseSlug = `item-${Date.now()}`;
  }

  // -----------------------------
  // 3. Prepare query
  // -----------------------------
  const baseQuery = {
    ...(brandId && { brand: brandId }),
    ...(excludeId && { _id: { $ne: excludeId } }),
  };

  if (!includeDeleted) {
    baseQuery.isDeleted = false;
  }

  // -----------------------------
  // 4. Find all similar slugs ONCE
  // -----------------------------
  const existingSlugs = await model
    .find({
      ...baseQuery,
      [field]: { $regex: `^${baseSlug}` },
    })
    .select(field)
    .lean();

  if (!existingSlugs.length) return baseSlug;

  const slugSet = new Set(existingSlugs.map((doc) => doc[field]));

  let counter = 1;
  let slug = baseSlug;

  while (slugSet.has(slug)) {
    slug = `${baseSlug}-${counter++}`;

    // safety limit
    if (counter > 1000) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
};

export default generateUniqueSlug;