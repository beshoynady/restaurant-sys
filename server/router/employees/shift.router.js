const express = require('express');
const router = express.Router();
const {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift
} = require('../../controllers/shift.controller');
const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
  .post(authenticateToken, checkSubscription, createShift)
  .get(authenticateToken, checkSubscription, getAllShifts);

router.route('/:id')

  .get(authenticateToken, checkSubscription, getShiftById)
  .put(authenticateToken, checkSubscription, updateShift)
  .delete(authenticateToken, checkSubscription, deleteShift);

module.exports = router;
