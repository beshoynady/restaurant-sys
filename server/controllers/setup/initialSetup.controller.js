import mongoose from "mongoose";
import userAccountModel from "../../models/employees/user-account.model.js";
import brandModel from "../../models/core/brand.model.js";
import roleModel from "../../models/employees/role.model.js";
import branchModel from "../../models/core/branch.model.js";
import warehouseModel from "../../models/inventory/warehouse.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";

import joi from "joi";

// ------------------------
// Joi validation schema
// ------------------------
const setupValidationSchema = joi.object({
  username: joi.string().alphanum().min(3).max(30).required(),
  email: joi.string().email().max(100).required(),
  phone: joi.string().max(20).required(),
  password: joi.string().min(6).max(128).required(),
  dashboardLanguages: joi
    .array()
    .items(
      joi.string().valid("EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU"),
    )
    .min(1)
    .max(5)
    .default(["EN", "AR"])
    .required(),
  defaultDashboardLanguage: joi
    .string()
    .valid("EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU")
    .default("EN"),
  brandName: joi
    .object()
    .pattern(
      joi.string().valid("EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU"),
      joi.string().min(2).max(100),
    )
    .required(),
});

// ------------------------
// Initial Setup Controller
// ------------------------
const initialSetupController = asyncHandler(async (req, res) => {
  // 1️⃣ Validate request
  const { error, value } = setupValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2️⃣ Check if system is already initialized
    const existingUser = await userAccountModel.findOne().session(session);
    if (existingUser) throw new Error("System already initialized");

    const {
      username,
      email,
      phone,
      password,
      dashboardLanguages,
      defaultDashboardLanguage,
      brandName,
    } = value;

    // 3️⃣ Validate default language
    const defaultLang = defaultDashboardLanguage || dashboardLanguages[0];
    if (!dashboardLanguages.includes(defaultLang)) {
      throw new Error(
        "defaultDashboardLanguage must be one of the dashboardLanguages",
      );
    }

    // 4️⃣ Check brandName languages count & uniqueness
    const langs = Object.keys(brandName);
    langs.forEach((lang) => {
      if (!dashboardLanguages.includes(lang)) {
        throw new Error(
          `brandName language ${lang} must be included in dashboardLanguages`,
        );
      }
    });

    if (langs.length > dashboardLanguages.length) {
      throw new Error("brandName languages exceed dashboardLanguages");
    }
    const normalizedValues = Object.values(brandName).map((v) =>
      v.trim().toLowerCase(),
    );
    if (new Set(normalizedValues).size !== normalizedValues.length) {
      throw new Error("brandName values must be unique across languages");
    }

    // 5️⃣ Create Brand
    const brandSlugSource =
      brandName.EN || brandName.AR || Object.values(brandName)[0];
    const slug = brandSlugSource
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
    const [brand] = await brandModel.create(
      [
        {
          name: brandName,
          slug,
          dashboardLanguages,
          defaultDashboardLanguage: defaultLang,
        },
      ],
      { session },
    );

    // Create Branch (main)
    const branchName = brandName.EN
      ? { EN: `${brandName.EN} Main Branch` }
      : { AR: `${brandName.AR} الفرع الرئيسي` };

    const branchSlugSource = brandName.EN
      ? `${brandName.EN} main branch`
      : `${brandName.AR} الفرع الرئيسي`;

    const slugBranch = branchSlugSource
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");

    const [branch] = await branchModel.create(
      [
        {
          brand: brand._id,
          name: branchName,
          slug: slugBranch,
          isMain: true,
        },
      ],
      { session },
    );

    // 9️⃣ Create Owner User
    const hashedPassword = await bcrypt.hash(password, 12);

    const [user] = await userAccountModel.create(
      [
        {
          brand: brand._id,
          username,
          email,
          phone,
          password: hashedPassword,
        },
      ],
      { session },
    );

    // 10️⃣ Update Brand createdBy
    brand.createdBy = user._id;
    await brand.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Initial setup completed successfully",
      data: { brand, branch, user },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

export default initialSetupController;
