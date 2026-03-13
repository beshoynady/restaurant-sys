import express from "express";
const router = express.Router();
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../../controllers/employees/department.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

router
  .route("/")
  .post(authenticateToken, createDepartment)
  .get(authenticateToken, getAllDepartments);

router
  .route("/:id")
  .get(authenticateToken, getDepartmentById)
  .put(authenticateToken, updateDepartment)
  .delete(authenticateToken, deleteDepartment);

export default router;
