import Joi from "joi";

// Backward-compatible single-shot payload — unchanged shape (SYSTEM_SETUP_AUDIT.md Finding 1.5:
// this schema previously existed but was never wired into the request path; it is now actually
// enforced by setup.router.js). One additive, optional field: `ownerIdentity`, defaulted by the
// engine to Scenario A ("OWNER_ONLY") when omitted — see ONBOARDING_API_DESIGN.md §6, this is the
// one unavoidable shape addition and it changes nothing for a caller that doesn't send it.
export const setupSchema = Joi.object({
  owner: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).max(100).required(),
    email: Joi.string().email().allow(null, ""),
    phone: Joi.string().allow(null, ""),
  }).required(),

  brand: Joi.object({
    name: Joi.object({
      EN: Joi.string().min(2).max(100).required(),
      AR: Joi.string().min(2).max(100).required(),
    }).required(),
    legalName: Joi.string().min(2).max(150).required(), // matches Brand.model.js's actual required field (audit Finding 1.6, now reconciled)
    logo: Joi.string().uri().allow(null, ""),
    currency: Joi.object({
      code: Joi.string().valid("USD", "EUR", "GBP", "EGP", "SAR", "AED", "JPY", "CNY").default("EGP"),
      symbol: Joi.string().max(2).default("£"),
      decimalPlaces: Joi.number().min(0).max(4).default(2),
    }).default(),
    dashboardLanguages: Joi.array().items(Joi.string().valid("EN", "AR")).default(["EN", "AR"]),
    defaultDashboardLanguage: Joi.string().valid("EN", "AR").default("EN"),
    timezone: Joi.string().default("Africa/Cairo"),
    countryCode: Joi.string().length(2).default("EG"),
    taxIdNumber: Joi.string().allow(null, ""),
    companyRegister: Joi.string().allow(null, ""),
  }).required(),

  branch: Joi.object({
    name: Joi.object({
      EN: Joi.string().min(2).max(100).required(),
      AR: Joi.string().min(2).max(100).required(),
    }).required(),
    address: Joi.object({
      EN: Joi.object({ country: Joi.string().min(2).required(), city: Joi.string().min(2).required(), area: Joi.string().min(2).required(), street: Joi.string().min(2).required() }).required(),
      AR: Joi.object({ country: Joi.string().min(2).required(), city: Joi.string().min(2).required(), area: Joi.string().min(2).required(), street: Joi.string().min(2).required() }).required(),
    }).required(),
    location: Joi.object({
      type: Joi.string().valid("Point"),
      coordinates: Joi.array().items(Joi.number()).length(2),
    }).custom((value, helpers) => {
      if (value?.type && !value?.coordinates) return helpers.error("any.invalid");
      return value;
    }).optional(),
    postalCode: Joi.string().allow(null, ""),
    taxIdentificationNumber: Joi.string().allow(null, ""),
  }).required(),

  ownerIdentity: Joi.object({
    scenario: Joi.string().valid("OWNER_ONLY", "OWNER_AS_EMPLOYEE", "DECIDE_LATER").default("OWNER_ONLY"),
  }).default({ scenario: "OWNER_ONLY" }),

  employeeProfile: Joi.object({
    firstName: Joi.object().pattern(Joi.string(), Joi.string()).required(),
    lastName: Joi.object().pattern(Joi.string(), Joi.string()).required(),
    gender: Joi.string().valid("male", "female").required(),
    dateOfBirth: Joi.date().required(),
    nationalID: Joi.string().min(10).max(30).required(),
    phone: Joi.string().min(7).max(20).required(),
  }).when("ownerIdentity.scenario", { is: "OWNER_AS_EMPLOYEE", then: Joi.required(), otherwise: Joi.optional() }),

  tax: Joi.object({
    taxName: Joi.string().optional(),
    percentage: Joi.number().min(0).max(100).optional(),
    enabled: Joi.boolean().optional(),
  }).optional(),
}).unknown(false);

export const paramsTokenSchema = Joi.object({
  token: Joi.string().required(),
});

export const paramsTokenStepSchema = Joi.object({
  token: Joi.string().required(),
  stepKey: Joi.string().min(1).max(50).required(),
});

export const stepDataSchema = Joi.object().unknown(true);
