import mongoose from "mongoose";

import PermissionsModel from "../../models/employees/permissions.model.js";

const createPermission = async (req, res) => {
  try {
    const { employee, Permissions } = req.body;
    const createdBy = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return res.status(400).json({ message: "معرف الموظف غير صالح." });
    }

    if (!Permissions || Permissions.length === 0) {
      return res.status(400).json({ message: "الرجاء توفير الصلاحيات." });
    }

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(400).json({ message: "معرف المنشئ غير صالح." });
    }

    const newPermission = await PermissionsModel.create({
      employee,
      Permissions,
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

const getAllPermissions = async (req, res) => {
  try {
    const permissions = await PermissionsModel.find().populate(
      "employee",
      "_id fullname username role"
    );

    if (!permissions || permissions.length === 0) {
      return res.status(404).json({ message: "لا توجد صلاحيات." });
    }

    res.status(200).json(permissions);
  } catch (error) {
    console.error("Error in getAllPermissions:", error);
    res.status(500).json({ message: "خطأ في الخادم الداخلي.", error });
  }
};

const getPermissionById = async (req, res) => {
  try {
    const permission = await PermissionsModel.findById(req.params.id).populate(
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

    const permission = await PermissionsModel.findOne({
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
    const { Permissions } = req.body;
    const updatedBy = req.user.id;

    // Check for required data
    if (!Permissions || Permissions.length === 0) {
      return res
        .status(400)
        .json({ message: "Please provide valid information for update." });
    }

    const updatedPermission = await PermissionsModel.findByIdAndUpdate(
      req.params.id,
      { Permissions, updatedBy },
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
    const deletedPermission = await PermissionsModel.findByIdAndDelete(id);

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
  getAllPermissions,
  getPermissionById,
  getPermissionByEmployee,
  updatePermissionById,
  deletePermissionById,
};
