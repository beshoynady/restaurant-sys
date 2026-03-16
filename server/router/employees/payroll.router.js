import express from "express";
const router = express.Router();
import {
  createPayroll,
  getAllPayroll,
  getPayrollById,
  deletePayroll,
  updatePayroll,
  updatePayrollByEmployee,
} from "../../controllers/employees/payroll.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

router
  .route("/")
  .post(authenticateToken, createPayroll)
  .get(authenticateToken, getAllPayroll);

router
  .route("/:id")
  .get(authenticateToken, getPayrollById)
  .put(authenticateToken, updatePayroll)
  .delete(authenticateToken, deletePayroll);

router
  .route("/employee/:employeeId")
  .put(authenticateToken, updatePayrollByEmployee);

export default router;
