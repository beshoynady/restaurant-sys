const JobTitleModel = require("../../models/employees/job-title.model");
const EmployeeModel = require("../../models/employees/employee.model");
const joi = require("joi");

/**
 * ==================================================
 * Helpers
 * ==================================================
 */

// Joi schema for multilingual Map fields
const mapLangSchema = joi
  .object()
  .pattern(joi.string().min(2), joi.string().trim().min(1).max(1000));

/**
 * ==================================================
 * Joi Validation Schemas
 * ==================================================
 */

const createJobTitleSchema = joi.object({
  brand: joi.string().required(),
  department: joi.string().required(),

  titleName: mapLangSchema.required(),
  description: mapLangSchema.optional(),
  responsibilities: mapLangSchema.optional(),
  requirements: mapLangSchema.optional(),
  status: joi
    .string()
    .valid("active", "inactive", "archived")
    .default("active"),
  createdBy: joi.string().required(),
});

const updateJobTitleSchema = joi.object({
  titleName: mapLangSchema.optional(),
  description: mapLangSchema.optional(),
  responsibilities: mapLangSchema.optional(),
  requirements: mapLangSchema.optional(),
  status: joi.string().valid("active", "inactive", "archived").optional(),
  updatedBy: joi.string().required(),
});

/**
 * ==================================================
 * Create Job Title
 * ==================================================
 * Creates a new job title within a department
 */
const createJobTitle = async (req, res) => {
  try {
    const { error } = createJobTitleSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });
    }

    const {
      brand,
      department,
      titleName,
      description,
      responsibilities,
      requirements,
      status,
    } = req.body;

    // Check for duplicate title name (per language) in same department
    const duplicate = await JobTitleModel.findOne({
      brand,
      department,
      isDeleted: false,
      $or: Object.entries(titleName).map(([lang, value]) => ({
        [`titleName.${lang}`]: value,
      })),
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Job title already exists in this department",
      });
    }

    const jobTitle = await JobTitleModel.create({
      brand,
      department,
      titleName,
      description,
      responsibilities,
      requirements,
      status,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Job title created successfully",
      data: jobTitle,
    });
  } catch (err) {
    console.error("Create Job Title Error:", err);
    return res.status(500).json({
      success: false,
      message: "Dine-in server error",
    });
  }
};

/**
 * ==================================================
 * Update Job Title
 * ==================================================
 * Updates job title data (only if not deleted)
 */
const updateJobTitle = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = updateJobTitleSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });
    }

    const jobTitle = await JobTitleModel.findOne({ _id: id, isDeleted: false });
    if (!jobTitle) {
      return res.status(404).json({
        success: false,
        message: "Job title not found",
      });
    }

    Object.assign(jobTitle, req.body, {
      updatedBy: req.user._id,
    });

    // Duplicate check if titleName is updated
    if (req.body.titleName) {
      const duplicate = await JobTitleModel.findOne({
        _id: { $ne: id },
        brand: jobTitle.brand,
        department: jobTitle.department,
        isDeleted: false,
        $or: Object.entries(req.body.titleName).map(([lang, value]) => ({
          [`titleName.${lang}`]: value,
        })),
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another job title with the same name already exists",
        });
      }
    }

    Object.assign(jobTitle, req.body, {
      updatedBy: req.user._id,
    });

    await jobTitle.save();

    return res.status(200).json({
      success: true,
      message: "Job title updated successfully",
      data: jobTitle,
    });
  } catch (err) {
    console.error("Update Job Title Error:", err);
    return res.status(500).json({
      success: false,
      message: "Dine-in server error",
    });
  }
};

/**
 * ==================================================
 * Get Job Titles (Filters + Pagination)
 * ==================================================
 */
const getJobTitles = async (req, res) => {
  try {
    const { brand, department, status, page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };

    if (brand) filter.brand = brand;
    if (department) filter.department = department;
    if (status) filter.status = status;

    const data = await JobTitleModel.find(filter)
      .populate("brand", "name")
      .populate("department", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await JobTitleModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Get Job Titles Error:", err);
    return res.status(500).json({
      success: false,
      message: "Dine-in server error",
    });
  }
};

/**
 * ==================================================
 * Get Job Title By ID
 * ==================================================
 */
const getJobTitleById = async (req, res) => {
  try {
    const jobTitle = await JobTitleModel.findOne({
      _id: req.params.id,
    })
      .populate("brand", "name")
      .populate("department", "name");

    if (!jobTitle) {
      return res.status(404).json({
        success: false,
        message: "Job title not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: jobTitle,
    });
  } catch (err) {
    console.error("Get Job Title By ID Error:", err);
    return res.status(500).json({
      success: false,
      message: "Dine-in server error",
    });
  }
};

/**
 * ==================================================
 * Soft Delete Job Title
 * ==================================================
 */
const softDeleteJobTitle = async (req, res) => {
  try {
    const jobTitle = await JobTitleModel.findById(req.params.id);

    if (!jobTitle || jobTitle.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job title not found",
      });
    }

    jobTitle.isDeleted = true;
    jobTitle.deletedAt = new Date();
    jobTitle.deletedBy = req.user._id;

    await jobTitle.save();

    return res.status(200).json({
      success: true,
      message: "Job title deleted successfully",
    });
  } catch (err) {
    console.error("Soft Delete Job Title Error:", err);
    return res.status(500).json({
      success: false,
      message: "Dine-in server error",
    });
  }
};

/**
 * ==================================================
 * Restore Soft Deleted Job Title
 * ==================================================
 */
const restoreJobTitle = async (req, res) => {
  try {
    const jobTitle = await JobTitleModel.findById(req.params.id);

    if (!jobTitle || !jobTitle.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job title not found or not deleted",
      });
    }

    jobTitle.isDeleted = false;
    jobTitle.deletedAt = null;
    jobTitle.deletedBy = null;
    jobTitle.updatedBy = req.user._id;

    await jobTitle.save();

    return res.status(200).json({
      success: true,
      message: "Job title restored successfully",
      data: jobTitle,
    });
  } catch (err) {
    console.error("Restore Job Title Error:", err);
    return res.status(500).json({
      success: false,
      message: "Dine-in server error",
    });
  }
};

/** * ==================================================
 * Delete Job Title Permanently
 * ==================================================
 */

const deleteJobTitle = async (req, res) => {
  try {
    const JobTitleId = req.params.id;
    // فحص وجد موظفين علي المسمي الوظيفي قبل الحذف
    const getEmployeesWithJobTitle = await EmployeeModel.findOne({
      jobTitle: JobTitleId,
    });
    if (getEmployeesWithJobTitle) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete job title assigned to employees",
      });
    }

    const jobTitle = await JobTitleModel.findByIdAndDelete(JobTitleId);
    if (!jobTitle) {
      return res.status(404).json({
        success: false,
        message: "Job title not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job title deleted successfully",
    });
  } catch (err) {
    console.error("Delete Job Title Error:", err);
    return res.status(500).json({
      success: false,
      message: "Dine-in server error",
    });
  }
};

/**
 * ==================================================
 * Exports
 * ==================================================
 */
module.exports = {
  createJobTitle,
  updateJobTitle,
  getJobTitles,
  getJobTitleById,
  softDeleteJobTitle,
  restoreJobTitle,
  deleteJobTitle,
};
