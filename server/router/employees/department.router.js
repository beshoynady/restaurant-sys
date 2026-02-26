const express = require("express");
const router = express.Router();
const {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");

const { authenticateToken } = require("../middlewares/authenticate");
const checkSubscription = require("../middlewares/checkSubscription");

router
  .route("/")
  .post(authenticateToken, checkSubscription, createDepartment)
  .get(authenticateToken, checkSubscription, getAllDepartments);

router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getDepartmentById)
  .put(authenticateToken, checkSubscription, updateDepartment)
  .delete(authenticateToken, checkSubscription, deleteDepartment);

module.exports = router;
