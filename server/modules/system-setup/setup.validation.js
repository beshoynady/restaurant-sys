import Joi from "joi";

export const setupSchema = Joi.object({
  // =============================
  // BRAND
  // =============================
  brand: Joi.object({
    name: Joi.object({
      EN: Joi.string().min(2).max(100).required(),
      AR: Joi.string().min(2).max(100).optional(),
    }).required(),

    legalName: Joi.string().min(2).max(150).required(),

    logo: Joi.string().uri().optional(),

    currency: Joi.object({
      code: Joi.string()
        .valid("USD", "EUR", "GBP", "EGP", "SAR", "AED", "JPY", "CNY")
        .default("EGP"),

      symbol: Joi.string().max(2).default("£"),

      decimalPlaces: Joi.number().min(0).max(4).default(2),
    }).optional(),

    dashboardLanguages: Joi.array()
      .items(Joi.string().valid("EN", "AR"))
      .default(["EN", "AR"]),

    defaultDashboardLanguage: Joi.string()
      .valid("EN", "AR")
      .default("EN"),

    timezone: Joi.string().default("Africa/Cairo"),

    countryCode: Joi.string().length(2).default("EG"),

    taxIdNumber: Joi.string().optional(),
    companyRegister: Joi.string().optional(),
  }).required(),

  // =============================
  // OWNER ACCOUNT
  // =============================
  owner: Joi.object({
    username: Joi.string().min(3).max(30).required(),

    password: Joi.string().min(6).max(100).required(),

    email: Joi.string().email().optional(),

    phone: Joi.string().optional(),
  }).required(),

  // =============================
  // MAIN BRANCH
  // =============================
  branch: Joi.object({
    name: Joi.object({
      EN: Joi.string().min(2).max(100).required(),
      AR: Joi.string().min(2).max(100).optional(),
    }).required(),

    address: Joi.object({
      EN: Joi.object({
        country: Joi.string().optional(),
        city: Joi.string().optional(),
        area: Joi.string().optional(),
        street: Joi.string().optional(),
      }).optional(),

      AR: Joi.object({
        country: Joi.string().optional(),
        city: Joi.string().optional(),
        area: Joi.string().optional(),
        street: Joi.string().optional(),
      }).optional(),
    }).optional(),

    location: Joi.object({
      type: Joi.string().valid("Point").default("Point"),
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2)
        .optional(), // [lng, lat]
    }).optional(),

    postalCode: Joi.string().optional(),

    taxIdentificationNumber: Joi.string().optional(),
  }).required(),
  
});