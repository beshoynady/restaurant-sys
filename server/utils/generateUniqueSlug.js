import slugify from "slugify";

/**
 * Generate UNIQUE slug for ANY model
 *
 * @param {Object} options
 * @param {Object} options.name - multilingual name object { EN, AR, ... }
 * @param {mongoose.Model} options.model - mongoose model
 * @param {String} options.brandId - brand scope
 * @param {String} options.field - slug field name (default: "slug")
 */
export const generateUniqueSlug = async ({
  name = {},
  model,
  brandId,
  field = "slug",
}) => {
  // -----------------------------
  // 1. Choose best language
  // -----------------------------

  let source = null;

  // 1️⃣ EN first
  if (name.EN) {
    source = name.EN;
  } else {
    // 2️⃣ any NON-Arabic
    const nonArabic = Object.entries(name).find(([key, value]) => {
      return key !== "AR" && value;
    });

    if (nonArabic) {
      source = nonArabic[1];
    } else {
      // 3️⃣ fallback Arabic
      source = name.AR;
    }
  }

  // fallback safety
  if (!source) {
    source = "item";
  }

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
  // 3. Ensure uniqueness
  // -----------------------------
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = {
      [field]: slug,
    };

    if (brandId) {
      query.brand = brandId;
    }

    const exists = await model.exists(query);

    if (!exists) break;

    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
};