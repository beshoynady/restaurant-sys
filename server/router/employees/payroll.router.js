const express = require('express');
const router = express.Router();
const payrollController = require('../../controllers/employees/payroll.controller');
const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
    .post(authenticateToken,payrollController.createPayroll)
    .get(authenticateToken,payrollController.getAllPayroll);

router.route('/:id')
    .get(authenticateToken,payrollController.getPayrollById)
    .put(authenticateToken,payrollController.updatePayroll)
    .delete(authenticateToken,payrollController.deletePayroll);

router.route('/employee/:employeeId').put(authenticateToken,payrollController.updatePayrollByEmployee)

module.exports = router;
