import asyncHandler from "../../utils/asyncHandler.js";
import setupService from "./setup.service.js";

/**
 * 🚀 System Setup Controller
 * ---------------------------------
 * First-time system initialization only:
 * Brand + Branch + Owner Role + Owner User
 */
export const initializeSystem = asyncHandler(async (req, res) => {
  // =============================
  // 1. CALL SERVICE
  // =============================
  const { brand, branch, user } = await setupService.initialize(req.body);

  // =============================
  // 2. BUILD SAFE RESPONSE
  // =============================
  return res.status(201).json({
    success: true,
    message: "System initialized successfully",

    data: {
      // =====================
      // BRAND
      // =====================
      brand: {
        id: brand._id,
        name: brand.name,
        slug: brand.slug,
        setupStatus: brand.setupStatus,

        // optional fields (safe exposure)
        legalName: brand.legalName || null,
        logo: brand.logo || null,
        currency: brand.currency,
        dashboardLanguages: brand.dashboardLanguages,
        defaultDashboardLanguage: brand.defaultDashboardLanguage,
        timezone: brand.timezone,
        countryCode: brand.countryCode,
        taxIdNumber: brand.taxIdNumber || null,
        companyRegister: brand.companyRegister || null,
      },

      // =====================
      // BRANCH
      // =====================
      branch: {
        id: branch._id,
        name: branch.name,
        slug: branch.slug,
        isMainBranch: branch.isMainBranch,

        address: branch.address,
        location: branch.location || null,
        postalCode: branch.postalCode || null,
        taxIdentificationNumber:
          branch.taxIdentificationNumber || null,
      },

      // =====================
      // OWNER USER (SAFE ONLY)
      // =====================
      user: {
        id: user._id,
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        brand: user.brand,
        branch: user.branch,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },

      // =====================
      // SYSTEM STATE
      // =====================
      system: {
        initialized: true,
        nextStep: "login",
        requiresLogin: true,
      },
    },
  });
});