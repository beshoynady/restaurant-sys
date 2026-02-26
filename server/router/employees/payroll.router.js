const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
    .post(authenticateToken, checkSubscription, payrollController.createPayroll)
    .get(authenticateToken, checkSubscription, payrollController.getAllPayroll);

router.route('/:id')
    .get(authenticateToken, checkSubscription, payrollController.getPayrollById)
    .put(authenticateToken, checkSubscription, payrollController.updatePayroll)
    .delete(authenticateToken, checkSubscription, payrollController.deletePayroll);

router.route('/employee/:employeeId').put(authenticateToken, checkSubscription, payrollController.updatePayrollByEmployee)

module.exports = router;
