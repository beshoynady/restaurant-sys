const express = require("express");
const router = express.Router();
const {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} = require("../../controllers/employees/department.controller");

const { authenticateToken } = require("../../middlewares/authenticate");

router
  .route("/")
  .post(authenticateToken, createDepartment)
  .get(authenticateToken, getAllDepartments);

router
  .route("/:id")
  .get(authenticateToken, getDepartmentById)
  .put(authenticateToken, updateDepartment)
  .delete(authenticateToken, deleteDepartment);

module.exports = router;
