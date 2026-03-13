import express from "express";
const router = express.Router();
import payrollController from "../../controllers/employees/payroll.controller.js";
import {authenticateToken} from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";

router.route('/')
    .post(authenticateToken,payrollController.createPayroll)
    .get(authenticateToken,payrollController.getAllPayroll);

router.route('/:id')
    .get(authenticateToken,payrollController.getPayrollById)
    .put(authenticateToken,payrollController.updatePayroll)
    .delete(authenticateToken,payrollController.deletePayroll);

router.route('/employee/:employeeId').put(authenticateToken,payrollController.updatePayrollByEmployee)

export default router;
