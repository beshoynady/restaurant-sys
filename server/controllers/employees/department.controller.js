import DepartmentModel from "../../models/employees/department.model.js";
import BrandModel from "../../models/core/brand.model.js";
import BranchModel from "../../models/core/branch.model.js";
import Joi from "joi";

// --------------------------- Joi Schemas ---------------------------
const createDepartmentSchema = Joi.object({
  brand: Joi.string().required(),
  branches: Joi.array().items(Joi.string()),
  name: Joi.object().pattern(/.*/, Joi.string().min(2).max(100)).required(),
  classification: Joi
    .string()
    .valid(
      "preparation",
      "service",
      "management",
      "support",
      "delivery",
      "security"
    )
    .required(),
  description: Joi.object().pattern(/.*/, Joi.string().max(300)).allow(null),
  code: Joi.string().max(20).uppercase().allow(null, ""),
  parentDepartment: Joi.string().allow(null),
  isActive: Joi.boolean().default(true),
  createdBy: Joi.string().required(),
});

const updateDepartmentSchema = Joi.object({
  brand: Joi.string(),
  branches: Joi.array().items(Joi.string()),
  name: Joi.object().pattern(/.*/, Joi.string().min(2).max(100)),
  classification: Joi
    .string()
    .valid(
      "preparation",
      "service",
      "management",
      "support",
      "delivery",
      "security"
    ),
  description: Joi.object().pattern(/.*/, Joi.string().max(300)),
  code: Joi.string().max(20).uppercase(),
  parentDepartment: Joi.string().allow(null),
  isActive: Joi.boolean(),
  updatedBy: Joi.string().required(),
});

// --------------------------- Controllers ---------------------------

// ✅ Create a new department
const createDepartment = async (req, res) => {
  try {
    const createdBy = req.user?.id;
    if (!createdBy)
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Employee ID is required.",
      });

    const { error } = createDepartmentSchema.validate(
      { ...req.body, createdBy },
      { abortEarly: false }
    );
    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });

    const {
      brand,
      branches,
      name,
      code,
      description,
      classification,
      parentDepartment,
      isActive,
    } = req.body;

    // Check brand exists
    const brandExists = await BrandModel.findById(brand);
    if (!brandExists)
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });

    // Check branches exist
    if (branches?.length) {
      const validBranches = await BranchModel.find({ _id: { $in: branches } });
      if (validBranches.length !== branches.length)
        return res.status(400).json({
          success: false,
          message: "One or more branch IDs are invalid",
        });
    }

    // Check duplicate name
    const nameKeys = Object.keys(name);
    const nameQueries = nameKeys.map((k) => ({ [`name.${k}`]: name[k] }));
    const existingByName = await DepartmentModel.findOne({
      brand,
      $or: nameQueries,
    });
    if (existingByName)
      return res.status(409).json({
        success: false,
        message: "A department with this name already exists in this brand",
      });

    // Check duplicate code
    if (code) {
      const existingCode = await DepartmentModel.findOne({ brand, code });
      if (existingCode)
        return res.status(409).json({
          success: false,
          message: "A department with this code already exists in this brand",
        });
    }

    const newDept = await DepartmentModel.create({
      name,
      classification,
      description,
      code,
      brand,
      branches,
      parentDepartment: parentDepartment || null,
      isActive,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: newDept,
    });
  } catch (error) {
    console.error("❌ Error creating department:", error);
    res.status(500).json({
      success: false,
      message: "Dine-in server error while creating department",
      error: error.message,
    });
  }
};

// ✅ Update department
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user?.id;
    if (!updatedBy)
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Employee ID is required.",
      });

    const { error } = updateDepartmentSchema.validate(
      { ...req.body, updatedBy },
      { abortEarly: false }
    );
    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });

    const department = await DepartmentModel.findById(id);
    if (!department)
      return res.status(404).json({
        success: false,
        message: `No department found with ID: ${id}`,
      });

    const {
      name,
      code,
      branches,
      parentDepartment,
      classification,
      description,
      isActive,
    } = req.body;

    // Validate branches if provided
    if (branches?.length) {
      const validBranches = await BranchModel.find({ _id: { $in: branches } });
      if (validBranches.length !== branches.length)
        return res.status(400).json({
          success: false,
          message: "One or more branch IDs are invalid",
        });
    }

    // Check duplicate name
    if (name) {
      const nameKeys = Object.keys(name);
      const nameQueries = nameKeys.map((k) => ({ [`name.${k}`]: name[k] }));
      const existingByName = await DepartmentModel.findOne({
        brand: department.brand,
        _id: { $ne: id },
        $or: nameQueries,
      });
      if (existingByName)
        return res.status(409).json({
          success: false,
          message: "A department with this name already exists in this brand",
        });
    }

    // Check duplicate code
    if (code) {
      const existingCode = await DepartmentModel.findOne({
        brand: department.brand,
        _id: { $ne: id },
        code,
      });
      if (existingCode)
        return res.status(409).json({
          success: false,
          message: "A department with this code already exists in this brand",
        });
    }

    // Update fields
    const updated = await DepartmentModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(name && { name }),
          ...(classification && { classification }),
          ...(description && { description }),
          ...(code && { code }),
          ...(branches && { branches }),
          ...(parentDepartment !== undefined && { parentDepartment }),
          ...(isActive !== undefined && { isActive }),
          updatedBy,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error updating department:", error);
    res.status(500).json({
      success: false,
      message: "Dine-in server error while updating department",
      error: error.message,
    });
  }
};

// ✅ Get all departments
const getAllDepartments = async (req, res) => {
  try {
    const { brand } = req.query;
    const filter = brand ? { brand } : {};
    const departments = await DepartmentModel.find(filter)
      .populate("brand", "_id brandName")
      .populate("branches", "_id branchName")
      .populate("parentDepartment", "name code")
      .populate("createdBy", "_id fullname username role")
      .populate("updatedBy", "_id fullname username role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Departments retrieved successfully",
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    console.error("❌ Error retrieving departments:", error);
    res.status(500).json({
      success: false,
      message: "Dine-in server error while fetching departments",
      error: error.message,
    });
  }
};

// ✅ Get single department
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await DepartmentModel.findById(id)
      .populate("brand", "_id brandName")
      .populate("branches", "_id branchName")
      .populate("parentDepartment", "name code")
      .populate("createdBy", "_id fullname username role")
      .populate("updatedBy", "_id fullname username role");

    if (!department)
      return res.status(404).json({
        success: false,
        message: `No department found with ID: ${id}`,
      });

    res.status(200).json({
      success: true,
      message: "Department retrieved successfully",
      data: department,
    });
  } catch (error) {
    console.error("❌ Error retrieving department:", error);
    res.status(500).json({
      success: false,
      message: "Dine-in server error while retrieving department",
      error: error.message,
    });
  }
};

// ✅ Delete department
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await DepartmentModel.findById(id);
    if (!department)
      return res.status(404).json({
        success: false,
        message: `No department found with ID: ${id}`,
      });

    const hasChildren = await DepartmentModel.findOne({ parentDepartment: id });
    if (hasChildren)
      return res.status(400).json({
        success: false,
        message: "Cannot delete a department that has sub-departments",
      });

    await DepartmentModel.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Department deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting department:", error);
    res.status(500).json({
      success: false,
      message: "Dine-in server error while deleting department",
      error: error.message,
    });
  }
};

// --------------------------- export  ---------------------------
export  {
  createDepartment,
  updateDepartment,
  getAllDepartments,
  getDepartmentById,
  deleteDepartment,
};
