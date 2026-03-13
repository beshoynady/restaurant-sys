const express = require('express');
const router = express.Router();
const {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift
} = require('../../controllers/employees/shift.controller');
const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
  .post(authenticateToken,createShift)
  .get(authenticateToken,getAllShifts);

router.route('/:id')

  .get(authenticateToken,getShiftById)
  .put(authenticateToken,updateShift)
  .delete(authenticateToken,deleteShift);

module.exports = router;
