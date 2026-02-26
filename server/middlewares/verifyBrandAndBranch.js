const BrandModel = require("../models/core/brand.model");
const BranchModel = require("../models/core/branch.model");

/**
 * Middleware: Verify Brand and Optional Branch
 */
const verifyBrandAndBranch = async (req, res, next) => {
  try {
    const { brand: brandId, branch: branchId } = req.body;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: "Brand ID is required",
      });
    }

    const brand = await BrandModel.findOne({ _id: brandId, isDeleted: false });
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found or deleted",
      });
    }

    req.brand = brand;

    if (branchId) {
      const branch = await BranchModel.findOne({
        _id: branchId,
        brand: brandId,
        isDeleted: false,
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found, deleted, or does not belong to brand",
        });
      }
      req.branch = branch;
    } else {
      req.branch = null;
    }

    next();
  } catch (err) {
    console.error("Verify Brand and Branch Middleware Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error verifying brand and branch",
    });
  }
};

module.exports = { verifyBrandAndBranch };
