import mongoose from "mongoose";

import RoleModel from "../../models/employees/role.model.js";

const createPermission = async (req, res) => {
  try {
    const { employee, Role } = req.body;
    const createdBy = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return res.status(400).json({ message: "معرف الموظف غير صالح." });
    }

    if (!Role || Role.length === 0) {
      return res.status(400).json({ message: "الرجاء توفير الصلاحيات." });
    }

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(400).json({ message: "معرف المنشئ غير صالح." });
    }

    const newPermission = await RoleModel.create({
      employee,
      Role,
      createdBy,
    });

    if (!newPermission) {
      return res.status(500).json({ message: "فشل في إنشاء الصلاحية." });
    }

    res.status(201).json(newPermission);
  } catch (error) {
    console.error("Error creating permission:", error);
    res.status(500).json({ message: error.message, error });
  }
};

const getAllRole = async (req, res) => {
  try {
    const role = await RoleModel.find().populate(
      "employee",
      "_id fullname username role"
    );

    if (!role || role.length === 0) {
      return res.status(404).json({ message: "لا توجد صلاحيات." });
    }

    res.status(200).json(role);
  } catch (error) {
    console.error("Error in getAllRole:", error);
    res.status(500).json({ message: "خطأ في الخادم الداخلي.", error });
  }
};

const getPermissionById = async (req, res) => {
  try {
    const permission = await RoleModel.findById(req.params.id).populate(
      "employee",
      "_id fullname username role"
    );

    if (!permission) {
      return res.status(404).json({ message: "الصلاحية غير موجودة" });
    }

    res.status(200).json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPermissionByEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;

    if (!employeeId) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }

    const permission = await RoleModel.findOne({
      employee: employeeId,
    }).populate("employee", "_id fullname username role");

    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    res.status(200).json(permission);
  } catch (error) {
    console.error("Error fetching permission:", error);
    res.status(500).json({ message: error.message });
  }
};

const updatePermissionById = async (req, res) => {
  try {
    const { Role } = req.body;
    const updatedBy = req.user.id;

    // Check for required data
    if (!Role || Role.length === 0) {
      return res
        .status(400)
        .json({ message: "Please provide valid information for update." });
    }

    const updatedPermission = await RoleModel.findByIdAndUpdate(
      req.params.id,
      { Role, updatedBy },
      { new: true }
    );

    if (!updatedPermission) {
      return res.status(404).json({ message: "Permission not found." });
    }

    res.status(200).json(updatedPermission);
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};

const deletePermissionById = async (req, res) => {
  try {
    const id = await req.params.id;
    const deletedPermission = await RoleModel.findByIdAndDelete(id);

    if (!deletedPermission) {
      return res.status(404).json({ message: "الصلاحية غير موجودة" });
    }

    res.status(200).json({ message: "تم حذف الصلاحية بنجاح" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export  {
  createPermission,
  getAllRole,
  getPermissionById,
  getPermissionByEmployee,
  updatePermissionById,
  deletePermissionById,
};
