import Joi from "joi";

export const setupSchema = Joi.object({
  // =============================
  // OWNER ACCOUNT (MIN REQUIRED)
  // =============================
  owner: Joi.object({
    username: Joi.string().min(3).max(30).required(),

    password: Joi.string().min(6).max(100).required(),

    email: Joi.string().email().allow(null, ""),

    phone: Joi.string().allow(null, ""),
  }).required(),

  // =============================
  // BRAND
  // =============================
  brand: Joi.object({
    name: Joi.object({
      EN: Joi.string().min(2).max(100).required(),
      AR: Joi.string().min(2).max(100).required(), // ✅ now required
    }).required(),

    legalName: Joi.string().min(2).max(150).allow(null, ""), // ✅ optional

    logo: Joi.string().uri().allow(null, ""),

    currency: Joi.object({
      code: Joi.string()
        .valid("USD", "EUR", "GBP", "EGP", "SAR", "AED", "JPY", "CNY")
        .default("EGP"),

      symbol: Joi.string().max(2).default("£"),

      decimalPlaces: Joi.number().min(0).max(4).default(2),
    }).default(),

    dashboardLanguages: Joi.array()
      .items(Joi.string().valid("EN", "AR"))
      .default(["EN", "AR"]),

    defaultDashboardLanguage: Joi.string()
      .valid("EN", "AR")
      .default("EN"),

    timezone: Joi.string().default("Africa/Cairo"),

    countryCode: Joi.string().length(2).default("EG"),

    taxIdNumber: Joi.string().allow(null, ""),
    companyRegister: Joi.string().allow(null, ""),
  }).required(),

  // =============================
  // MAIN BRANCH
  // =============================
  branch: Joi.object({
    name: Joi.object({
      EN: Joi.string().min(2).max(100).required(),
      AR: Joi.string().min(2).max(100).required(), // ✅ now required
    }).required(),

    address: Joi.object({
      EN: Joi.object({
        country: Joi.string().min(2).required(),
        city: Joi.string().min(2).required(),
        area: Joi.string().min(2).required(),
        street: Joi.string().min(2).required(),
      }).required(),

      AR: Joi.object({
        country: Joi.string().min(2).required(),
        city: Joi.string().min(2).required(),
        area: Joi.string().min(2).required(),
        street: Joi.string().min(2).required(),
      }).required(),
    }).required(), // ✅ بالكامل required

    location: Joi.object({
      type: Joi.string().valid("Point").default("Point"),
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2), // [lng, lat]
    }).allow(null),

    postalCode: Joi.string().allow(null, ""),

    taxIdentificationNumber: Joi.string().allow(null, ""),
  }).required(),
});